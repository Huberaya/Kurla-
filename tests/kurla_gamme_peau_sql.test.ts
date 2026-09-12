import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { estFicheCiblePeau } from '../src/lib/skinRangeTarget';
import { isCatalogPubliclyListable } from '../src/lib/catalogTruth';
import { KURLA_SKIN_RANGE, EXISTING_SKIN_PRODUCTS, FULL_SKIN_RANGE } from '../src/lib/kurlaSkinRange';
import { serverDb } from '../src/lib/serverDb';

/**
 * La gamme peau : ce que le SQL pose, et ce que la route en sert.
 *
 * Mesuré le 12/09/2026 : `/api/peau/gamme` répondait `count=0` en production —
 * le seul silence critique de la sonde. La cause n'était pas une donnée
 * manquante mais une contradiction entre deux exigences :
 *
 *   · `getSkinRangeTargets` exigeait `catalog_status = 'published'` et
 *     `is_active <> false` — des états de mise sur le marché ;
 *   · `scripts/generate-skin-range-sql.ts` pose les fiches en `draft` et
 *     inactives, et `tests/kurla_catalog_truth.test.ts` l'exige
 *     (« la gamme interne doit être générée en brouillon »).
 *
 * Une formule cible n'est pas sur le marché : lui demander un état commercial
 * pour être lue la condamnait à ne jamais être servie. Le correctif porte sur
 * la route, pas sur les données — aucun statut n'est basculé.
 *
 * Ce banc vérifie les deux volets :
 *   A. le SQL généré pose bien des cibles non vendables ;
 *   B. `getSkinRangeTargets` sert une cible en brouillon et inactive, et ne
 *      sert ni une fiche de démonstration ni un accessoire.
 */

// ── A. Le SQL généré ────────────────────────────────────────────────────────
const sql = execFileSync('npx', ['tsx', 'scripts/generate-skin-range-sql.ts'], {
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024
});

// Le générateur émet UN INSERT par fiche, pas un INSERT multi-lignes.
const statements = sql.split('INSERT INTO public.products (').slice(1);
assert.equal(statements.length, 13,
  `13 instructions INSERT attendues, ${statements.length} trouvées`);

/** Découpe les champs d'un tuple en respectant chaînes et ARRAY[…]. */
function fields(block: string): string[] {
  const out: string[] = [];
  let field = '';
  let inString = false;
  let brackets = 0;
  for (let i = 0; i < block.length; i += 1) {
    const c = block[i];
    if (inString) {
      if (c === "'") {
        if (block[i + 1] === "'") { field += "''"; i += 1; continue; }
        inString = false;
      }
      field += c;
      continue;
    }
    if (c === "'") { inString = true; field += c; continue; }
    if (c === '[') { brackets += 1; field += c; continue; }
    if (c === ']') { brackets -= 1; field += c; continue; }
    if (c === ',' && brackets === 0) { out.push(field.trim()); field = ''; continue; }
    field += c;
  }
  out.push(field.trim());
  return out;
}

function toValue(raw: string): unknown {
  if (raw === 'TRUE') return true;
  if (raw === 'FALSE') return false;
  if (raw === 'NULL') return null;
  if (raw.startsWith('ARRAY[')) {
    const inner = raw.slice('ARRAY['.length, raw.indexOf(']'));
    return inner.trim() === '' ? [] : fields(inner).map(v => toValue(v));
  }
  if (raw.startsWith("'")) return raw.slice(1, -1).replace(/''/g, "'");
  const n = Number(raw);
  return Number.isFinite(n) ? n : raw;
}

const rows = statements.map(statement => {
  const columns = statement.slice(0, statement.indexOf(') VALUES ('))
    .split(',').map(c => c.trim()).filter(Boolean);
  const valuesStart = statement.indexOf(') VALUES (') + ') VALUES ('.length;
  const valuesEnd = statement.indexOf('\n  )\n  ON CONFLICT (id) DO UPDATE SET');
  assert.ok(valuesEnd > valuesStart, 'la fin du bloc VALUES doit être identifiable');
  const values = fields(statement.slice(valuesStart, valuesEnd));
  assert.equal(values.length, columns.length,
    `${values.length} valeurs pour ${columns.length} colonnes`);
  return Object.fromEntries(columns.map((c, i) => [c, toValue(values[i])]));
});

const ids = rows.map(r => String(r.id));
assert.deepEqual(ids.slice().sort(), KURLA_SKIN_RANGE.map(f => f.id).slice().sort(),
  'le SQL doit couvrir exactement les fiches de KURLA_SKIN_RANGE');
assert.equal(FULL_SKIN_RANGE.length, 16, 'la gamme complète compte 16 fiches (3 historiques + 13)');

for (const row of rows) {
  const id = String(row.id);
  assert.equal(row.category, 'peau', `${id} : la catégorie doit être « peau »`);
  assert.equal(estFicheCiblePeau(row), true,
    `${id} : estFicheCiblePeau doit être vrai, sinon la route ne sert pas la fiche`);

  // Le contrat gardé par kurla_catalog_truth : brouillon et inactive.
  assert.equal(row.catalog_status, 'draft',
    `${id} : une formule cible doit rester en brouillon — c'est ce que kurla_catalog_truth.test.ts exige`);
  assert.equal(row.is_active, false, `${id} : une formule cible doit rester inactive`);

  // Et surtout : jamais achetable.
  assert.equal(isCatalogPubliclyListable(row), false,
    `${id} : une formule cible ne doit jamais être publiquement listable`);
}

// ── B. La route sert une cible en brouillon ─────────────────────────────────
const cible = (extra: Record<string, unknown> = {}) => ({
  id: 'peau-ess-006',
  slug: 'serum-niacinamide-5-30ml',
  name: 'Sérum Niacinamide 5% — 30ml',
  category: 'peau',
  subcategory: 'Éclat & Uniformité',
  brand: 'KURLA Skincare',
  price: 15.9,
  inci: 'Aqua, Niacinamide, Zinc PCA, Panthenol',
  ingredients: ['Niacinamide', 'Zinc PCA'],
  source_supplier: 'KURLA Skincare — formulation interne (précommande)',
  badges: ['formulation-target'],
  routine_step: 'Sérum niacinamide',
  size_label: '30ml',
  country_availability: ['FR'],
  image_url: 'https://example.com/serum.jpg',
  // Brouillon et inactive : l'état réel d'une formule cible.
  catalog_status: 'draft',
  is_active: false,
  ...extra
});

const saved = serverDb.inMemoryProducts;
try {
  serverDb.inMemoryProducts = [
    cible(),
    // Même catégorie, même brouillon, mais sans marqueur de formulation :
    // une fiche de démonstration ne doit pas passer pour une cible KURLA.
    cible({ id: 'peau-demo', slug: 'peau-demo', source_supplier: 'Grossiste — fiche sourcée', badges: [] }),
    // Un accessoire publié et actif : hors catégorie, jamais servi ici.
    cible({ id: 'launch-p18', slug: 'vaporisateur', category: 'accessoires', catalog_status: 'published', is_active: true })
  ] as never[];

  const fiches = await serverDb.getSkinRangeTargets();
  assert.deepEqual(fiches.map(f => f.id), ['peau-ess-006'],
    'seule la cible de formulation doit être servie — ni la démonstration, ni l’accessoire');
  assert.equal(fiches[0].image, '', 'la projection ne doit porter aucun visuel');
  assert.equal(fiches[0].availabilityState, 'formulation_target');

  // Contrôle négatif intégré : si le filtre d'état commercial revenait, la
  // cible en brouillon disparaîtrait et la gamme redeviendrait vide.
  const publiee = await (async () => {
    serverDb.inMemoryProducts = [cible({ catalog_status: 'published', is_active: true })] as never[];
    return serverDb.getSkinRangeTargets();
  })();
  assert.deepEqual(publiee.map(f => f.id), ['peau-ess-006'],
    'une cible publiée doit rester servie : le correctif élargit, il ne restreint pas');
} finally {
  serverDb.inMemoryProducts = saved;
}

console.log(`[PASS] Gamme peau : le SQL couvre ${rows.length} fiches de KURLA_SKIN_RANGE, chacune en brouillon + inactive (contrat de kurla_catalog_truth), reconnue par estFicheCiblePeau et jamais publiquement listable ; getSkinRangeTargets sert une cible en brouillon et écarte démonstration et accessoire — la gamme complète compte ${FULL_SKIN_RANGE.length} fiches dont ${EXISTING_SKIN_PRODUCTS.length} historiques.`);
