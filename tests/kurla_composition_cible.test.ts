/**
 * BANC — B-08 : « une formulation cible n'est pas une composition »
 * =================================================================
 *
 * Constat : les 16 produits KURLA Skincare sont des précommandes, donc des
 * produits non fabriqués. Ils affichaient pourtant, sous le titre « INCI »,
 * une liste d'ingrédients précise : la formulation spécifiée au laboratoire.
 * Rien n'indiquait que c'était une cible et non la composition d'un produit
 * existant.
 *
 * Le même champ servait aussi de note aux accessoires, qui n'ont aucune
 * composition cosmétique : « Accessoire capillaire — aucun ingrédient
 * cosmétique. » s'affichait comme une liste.
 *
 * Ce banc verrouille :
 *   1. la reconnaissance — une cible et un accessoire sont identifiés comme
 *      tels, et une vraie liste n'est pas dégradée ;
 *   2. la couverture — les 16 fiches concernées sont marquées par la
 *      migration, sans quoi l'affichage mentirait encore ;
 *   3. la réversibilité — la migration est idempotente : la rejouer ne
 *      préfixe pas deux fois.
 *
 * Exécution : KURLA_STORE_MODE=memory KURLA_TEST_NO_SERVER=true npx tsx tests/kurla_composition_cible.test.ts
 * Avec contrôle de production : KURLA_LIVE_CATALOG_URL=https://kurlabeauty.vercel.app npx tsx tests/kurla_composition_cible.test.ts
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  compositionKind,
  inciListe,
  hasConfirmedComposition,
  MARQUEUR_CIBLE,
  MARQUEUR_ACCESSOIRE,
} from '../src/lib/cosmeticCompliance';
import { FULL_SKIN_RANGE } from '../src/lib/kurlaSkinRange';

let checks = 0;
function ok(label: string, fn: () => void): void {
  fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
}

const MIGRATION = 'supabase/migrations/20260915000000_composition_cible.sql';
const brut = readFileSync(join(process.cwd(), MIGRATION), 'utf-8');
/** Le SQL sans ses commentaires : un motif cité en explication ne doit pas
 *  compter comme une instruction. */
const sql = brut
  .split('\n')
  .filter(l => !l.trim().startsWith('--'))
  .join('\n');

const VRAIE_LISTE = 'Aqua, Glycerin, Squalane, Ceramide NP, Phenoxyethanol';
const cible = { inci: `${MARQUEUR_CIBLE} ${VRAIE_LISTE}` };
const accessoire = { inci: `${MARQUEUR_ACCESSOIRE} Accessoire capillaire — aucun ingrédient cosmétique.` };
const confirme = { inci: VRAIE_LISTE };
const muet = { inci: '' };

console.log('\nBANC B-08 — une formulation cible n’est pas une composition\n');

// ── 1. La reconnaissance ────────────────────────────────────────────────────
ok('une vraie composition reste une vraie composition', () => {
  assert.equal(compositionKind(confirme), 'liste');
  assert.equal(hasConfirmedComposition(confirme), true);
  assert.equal(inciListe(confirme), VRAIE_LISTE);
});

ok('une formulation cible est reconnue comme telle', () => {
  assert.equal(compositionKind(cible), 'cible');
  assert.equal(hasConfirmedComposition(cible), false, 'une cible n’est pas une composition établie');
  assert.equal(inciListe(cible), VRAIE_LISTE, 'la liste doit rester lisible sous le marqueur');
});

ok('un accessoire n’est pas traité comme un cosmétique composé', () => {
  assert.equal(compositionKind(accessoire), 'accessoire');
  assert.equal(hasConfirmedComposition(accessoire), false);
  assert.equal(inciListe(accessoire), 'Accessoire capillaire — aucun ingrédient cosmétique.');
});

ok('un produit sans composition reste sans composition', () => {
  assert.equal(compositionKind(muet), 'absente');
  assert.equal(compositionKind({}), 'absente');
  assert.equal(hasConfirmedComposition(muet), false);
});

// ── 2. La couverture ────────────────────────────────────────────────────────
ok('les 16 fiches de la gamme peau sont marquées par la migration', () => {
  // Les 13 créées en B-01 et les 3 qui préexistaient : dans les deux cas, un
  // produit non fabriqué n'a pas de composition, il a une cible.
  assert.equal(FULL_SKIN_RANGE.length, 16, `${FULL_SKIN_RANGE.length} fiches attendues dans la gamme`);
  for (const p of FULL_SKIN_RANGE) {
    assert.ok(sql.includes(`'${p.id}'`), `${p.id} : non couvert par la migration`);
  }
});

ok('le marqueur de cible est écrit tel que le code le lit', () => {
  assert.ok(sql.includes(`'[Formulation cible] '`), 'marqueur absent ou différent');
  assert.ok(sql.includes(`'[Accessoire] '`), 'marqueur accessoire absent');
});

ok('les accessoires sont couverts sans être confondus avec les cosmétiques', () => {
  assert.ok(/category = 'accessoires'/.test(sql), 'la règle accessoire doit viser la catégorie');
  assert.ok(/OR inci LIKE 'Accessoire %'/.test(sql), 'la mention existante doit être reprise');
});

// ── 3. La réversibilité ─────────────────────────────────────────────────────
ok('la migration est idempotente', () => {
  // Rejouer la migration ne doit pas produire '[Formulation cible] [Formulation
  // cible] …' : c'est la garde NOT LIKE '[%' qui l'empêche.
  const gardes = (sql.match(/NOT LIKE '\[%'/g) || []).length;
  const majs = (sql.match(/UPDATE public\.products/g) || []).length;
  assert.equal(majs, 2, 'deux mises à jour attendues');
  assert.equal(gardes, 2, 'chaque mise à jour doit porter la garde d’idempotence');
});

ok('aucune composition n’est réécrite sans provenance', () => {
  const sources = (sql.match(/inci_source = '/g) || []).length;
  assert.equal(sources, 2, 'chaque réécriture doit tracer son origine');
  assert.ok(/inci_sourced_at = now\(\)/.test(sql));
});

// ── 4. L’écart base / dépôt, mesurable à la demande ─────────────────────────
async function controleProduction(): Promise<void> {
  const base = process.env.KURLA_LIVE_CATALOG_URL;
  if (!base) {
    console.log('  · contrôle de production ignoré (KURLA_LIVE_CATALOG_URL non défini)');
    return;
  }
  const reponse = await fetch(`${base.replace(/\/$/, '')}/api/products`);
  assert.ok(reponse.ok, `API publique inaccessible : ${reponse.status}`);
  const corps = (await reponse.json()) as { products?: unknown[] } | unknown[];
  const servis = (Array.isArray(corps) ? corps : corps.products || []) as Array<{
    brand?: string;
    inci?: string;
    name?: string;
    category?: string;
  }>;
  // Deux familles sont concernées : les précommandes non fabriquées (cible) et
  // les accessoires (mention, jamais une liste). Un contrôle qui ne viserait
  // que la première passerait à vide : aucune fiche cible n'est servie
  // aujourd'hui, la porte de publiabilité les écarte déjà.
  const ciblesServies = servis.filter(p => (p.brand || '').toLowerCase() === 'kurla skincare');
  const ciblesNues = ciblesServies.filter(p => !(p.inci || '').startsWith(MARQUEUR_CIBLE));
  ok(`${ciblesServies.length} produit(s) KURLA Skincare servis, tous marqués comme cible`, () => {
    assert.equal(
      ciblesNues.length,
      0,
      `${ciblesNues.length} produit(s) affichent une cible comme une composition : ${ciblesNues
        .slice(0, 4)
        .map(p => p.name)
        .join(', ')}`,
    );
  });

  const accessoires = servis.filter(p => p.category === 'accessoires' && (p.inci || '').trim() !== '');
  const accessoiresNus = accessoires.filter(p => !(p.inci || '').startsWith(MARQUEUR_ACCESSOIRE));
  ok(`${accessoires.length} accessoire(s) servis, tous marqués comme sans composition`, () => {
    assert.equal(
      accessoiresNus.length,
      0,
      `${accessoiresNus.length} accessoire(s) affichent une mention sous le titre INCI : ${accessoiresNus
        .slice(0, 4)
        .map(p => p.name)
        .join(', ')}`,
    );
  });
  console.log(`  · contrôle de production effectué sur ${base}`);
}

controleProduction().then(
  () => {
    console.log(`\n${checks} contrôles passés — composition cible et accessoires marqués\n`);
  },
  (erreur: unknown) => {
    console.error(`\n✗ ${(erreur as Error).message}\n`);
    process.exit(1);
  },
);
