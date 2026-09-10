/**
 * BANC — B-02 : « aucune fiche publiée sans composition »
 * =======================================================
 *
 * Critère d'acceptation : 0 produit publié sans INCI renseigné, contrôlé de
 * façon bloquante.
 *
 * Ce banc ne vérifie pas qu'un fichier existe. Il vérifie trois choses qui
 * comptent :
 *
 *   1. la donnée est honnête — chaque composition est sourcée, ou déduite de
 *      la définition d'un produit monocomposant, ou renvoie vers les fiches
 *      d'un kit ; aucune n'est reconstituée au jugé ;
 *   2. la règle tient — un produit dont la composition n'a pu être sourcée ne
 *      reste pas en vente : la migration le dépublie, et le banc le vérifie en
 *      lisant le SQL réellement généré ;
 *   3. l'écart entre la base et le dépôt est mesurable — avec
 *      KURLA_LIVE_CATALOG_URL, le banc interroge l'API publique et échoue
 *      s'il reste un produit servi sans composition.
 *
 * Le point 2 n'est pas théorique : avant ce chantier, 34 fiches publiées
 * s'affichaient sans composition, et la porte de publiabilité les laissait
 * passer parce qu'elle acceptait un tableau d'ingrédients — faux — à la place
 * d'une liste INCI.
 *
 * Exécution : KURLA_STORE_MODE=memory KURLA_TEST_NO_SERVER=true npx tsx tests/kurla_catalogue_inci.test.ts
 * Avec contrôle de production : KURLA_LIVE_CATALOG_URL=https://kurlabeauty.vercel.app npx tsx tests/kurla_catalogue_inci.test.ts
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOGUE_INCI, CATALOGUE_INCI_PAR_ID } from '../src/data/catalogueInci';
import { LAUNCH_PRODUCTS, LAUNCH_KITS } from '../src/lib/launchCatalog';

let checks = 0;
function ok(label: string, fn: () => void): void {
  fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
}

/** Seuil de `cosmeticCompliance.hasInci` : en dessous, la composition est vide. */
const LONGUEUR_MINIMALE = 10;
const INVISIBLES = /[\u200b-\u200d\ufeff]/;
const MIGRATION = 'supabase/migrations/20260913000000_catalogue_inci.sql';

const idsConnus = new Set([
  ...LAUNCH_PRODUCTS.map(p => `launch-${p.id}`),
  ...LAUNCH_KITS.map(k => `launch-${k.id}`),
]);
const sourcables = CATALOGUE_INCI.filter(e => e.provenance !== 'introuvable');
const introuvables = CATALOGUE_INCI.filter(e => e.provenance === 'introuvable');

console.log('\nBANC B-02 — compositions INCI du catalogue\n');

// ── 1. La donnée existe et couvre le manque ─────────────────────────────────
ok('le fichier couvre les produits sans composition', () => {
  assert.ok(sourcables.length >= 34, `${sourcables.length} compositions, attendu au moins 34`);
});

ok('aucune composition n’est vide, sauf produit déclaré introuvable', () => {
  for (const e of CATALOGUE_INCI) {
    if (e.provenance === 'introuvable') {
      assert.equal(e.inci, '', `${e.productId} : introuvable mais porte une composition`);
    } else {
      assert.ok(e.inci.length >= LONGUEUR_MINIMALE, `${e.productId} : composition trop courte`);
    }
  }
});

ok('les identifiants sont uniques', () => {
  const ids = CATALOGUE_INCI.map(e => e.productId);
  assert.equal(new Set(ids).size, ids.length, 'identifiant en doublon');
});

// ── 2. La donnée est honnête ────────────────────────────────────────────────
ok('chaque composition sourcée cite la page consultée', () => {
  for (const e of CATALOGUE_INCI.filter(x => x.provenance === 'source')) {
    assert.ok(e.sourceUrl?.startsWith('https://'), `${e.productId} : source non citée`);
    assert.ok((e.sourceTitle || '').length > 3, `${e.productId} : titre source manquant`);
  }
});

ok('une composition déduite du produit est monocomposant', () => {
  // « Beurre de karité brut 100 % » ou « huile de ricin » : une seule
  // substance. Deux substances signifieraient que la composition n'est plus
  // déduite du produit mais supposée.
  for (const e of CATALOGUE_INCI.filter(x => x.provenance === 'definition')) {
    assert.equal(e.inci.includes(','), false, `${e.productId} : produit monocomposant mais liste multiple`);
    assert.ok((e.note || '').length > 20, `${e.productId} : justification absente`);
  }
});

ok('un kit renvoie vers les fiches des produits inclus', () => {
  const kits = CATALOGUE_INCI.filter(x => x.provenance === 'kit');
  assert.ok(kits.length > 0, 'aucun kit traité');
  for (const k of kits) {
    assert.ok((k.components || []).length > 0, `${k.productId} : kit sans produit inclus`);
    assert.ok(k.inci.includes('[Kit]'), `${k.productId} : la composition d’un kit renvoie vers ses fiches`);
    for (const c of k.components || []) {
      const cible = CATALOGUE_INCI_PAR_ID[c];
      // Le composant est connu du fichier (composition sourcée ici) ou du
      // catalogue — dans les deux cas il porte sa propre liste.
      assert.ok(idsConnus.has(c) || cible, `${k.productId} : composant inconnu ${c}`);
      if (cible) assert.ok(cible.inci.length >= LONGUEUR_MINIMALE, `${c} : composant sans composition`);
    }
  }
});

ok('aucune composition ne contient de caractère invisible', () => {
  for (const e of sourcables) {
    assert.equal(INVISIBLES.test(e.inci), false, `${e.productId} : caractère invisible`);
  }
});

ok('aucune composition n’a été recopiée avec du balisage', () => {
  for (const e of sourcables) {
    assert.equal(/<[a-z/]|&[a-z]+;/i.test(e.inci), false, `${e.productId} : balisage dans la composition`);
  }
});

ok('les identifiants du catalogue de lancement sont exacts', () => {
  // Un identifiant fauté écrirait en base sans erreur : l'UPDATE ne toucherait
  // simplement aucune ligne et le produit resterait sans composition.
  for (const e of CATALOGUE_INCI) {
    if (!e.productId.startsWith('launch-')) continue;
    assert.ok(idsConnus.has(e.productId), `${e.productId} : inconnu du catalogue de lancement`);
  }
});

// ── 3. La règle tient : sans composition, pas de vente ──────────────────────
const sql = readFileSync(join(process.cwd(), MIGRATION), 'utf-8');

ok('la migration dépublie tout produit dont la composition est introuvable', () => {
  for (const e of introuvables) {
    const retire = new RegExp(`WHERE id IN \\([^)]*'${e.productId}'`, 'm').test(sql);
    assert.ok(retire, `${e.productId} : introuvable mais pas retiré de la vente`);
  }
  assert.ok(/catalog_status = 'unavailable'/.test(sql), 'la migration ne dépublie rien');
  assert.ok(/AND catalog_status = 'published'/.test(sql), 'la dépublication doit être ciblée');
});

ok('la migration ne renseigne aucune composition sans provenance', () => {
  // Comptage, pas découpage : une composition contient des virgules et des
  // flèches, et une liste de kit peut contenir ce qui ressemble à une fin
  // d'instruction. On compare donc le nombre d'affectations.
  const compositions = (sql.match(/\binci = '/g) || []).length;
  const sources = (sql.match(/\binci_source = '/g) || []).length;
  const horodatages = (sql.match(/inci_sourced_at = now\(\)/g) || []).length;
  // La dépublication écrit elle aussi une provenance : celle de l'absence de
  // composition, pour qu'on sache pourquoi le produit ne porte rien.
  const retraitSource = /SET catalog_status = 'unavailable'[\s\S]*?inci_source = '/.test(sql) ? 1 : 0;
  assert.ok(compositions >= sourcables.length, `${compositions} compositions écrites pour ${sourcables.length} sourcées`);
  assert.equal(sources, compositions + retraitSource, 'une composition est renseignée sans source');
  assert.equal(horodatages, sources, 'une provenance est renseignée sans date');
});

ok('aucune chaîne de la migration ne coupe une instruction', () => {
  // Un point-virgule dans une composition ferait échouer l'exécution par un
  // outil qui découpe naïvement les instructions.
  const chaines: string[] = sql.match(/'[^']*'/g) ?? [];
  const coupees = chaines.filter(c => c.includes(';'));
  assert.equal(coupees.length, 0, `${coupees.length} chaîne(s) contiennent un point-virgule`);
});

ok('la migration ajoute la colonne de provenance', () => {
  assert.ok(/ADD COLUMN IF NOT EXISTS inci_source TEXT/.test(sql));
  assert.ok(/ADD COLUMN IF NOT EXISTS inci_sourced_at TIMESTAMPTZ/.test(sql));
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
  const produits = (Array.isArray(corps) ? corps : corps.products || []) as Array<{
    id?: string;
    name?: string;
    inci?: string;
  }>;
  const sansComposition = produits.filter(p => (p.inci || '').trim().length < LONGUEUR_MINIMALE);
  ok(`${produits.length} produits servis, tous avec une composition`, () => {
    assert.equal(
      sansComposition.length,
      0,
      `${sansComposition.length} produit(s) servi(s) sans composition : ${sansComposition
        .slice(0, 5)
        .map(p => p.id || p.name)
        .join(', ')}`,
    );
  });
  console.log(`  · contrôle de production effectué sur ${base}`);
}

controleProduction().then(
  () => {
    console.log(
      `\n${checks} contrôles passés — ${sourcables.length} compositions sourcées, ${introuvables.length} produit(s) sans source\n`,
    );
  },
  (erreur: unknown) => {
    console.error(`\n✗ ${(erreur as Error).message}\n`);
    process.exit(1);
  },
);
