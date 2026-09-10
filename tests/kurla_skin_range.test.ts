/**
 * BANC — GAMME PEAU (B-01) : « rendre les recommandations achetables »
 * ====================================================================
 *
 * Ce banc ne vérifie pas qu'une liste existe. Il vérifie que ce qui est
 * conseillé à l'écran existe en boutique, que la gamme couvre les six
 * préoccupations, et que les codes de besoins portés par les fiches sont
 * réellement reconnus par le moteur d'adéquation.
 *
 * Ce dernier point n'est pas théorique : avant ce chantier, `barriere_cutanee`
 * était porté par des fiches publiées sans exister dans `RECOGNIZED_NEED_CODES`.
 * Un code absent ne rencontre aucune branche et compte donc comme besoin non
 * couvert : les produits concernés étaient pénalisés au score, silencieusement.
 *
 * Exécution : KURLA_STORE_MODE=memory KURLA_TEST_NO_SERVER=true npx tsx tests/kurla_skin_range.test.ts
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  KURLA_SKIN_RANGE,
  EXISTING_SKIN_PRODUCTS,
  FULL_SKIN_RANGE,
  SKIN_CONCERN_COVERAGE,
} from '../src/lib/kurlaSkinRange';
import { RECOGNIZED_NEED_CODES } from '../src/lib/kurlaFit';
import { PEAU_KITS } from '../src/lib/peauKits';
import { SKIN_KNOWLEDGE } from '../src/lib/knowledge/skin';
import { resolveCatalogueProduct, normalizeProductName } from '../src/lib/catalogueMatch';
import { SKIN_RANGE_ILLUSTRATIONS } from '../scripts/skinRangeImages';

let checks = 0;
const ok = (label: string, fn: () => void) => {
  fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
};

/** La gamme complète, au format attendu par le résolveur. */
const CATALOGUE = FULL_SKIN_RANGE.map(p => ({ id: p.id, slug: p.id, name: p.name }));

/** Un catalogue volontairement hors sujet : sert à éprouver les faux positifs. */
const FOREIGN = [
  { id: 'x1', slug: 'x1', name: 'Baume Apaisant Anti-Poils Incarnés' },
  { id: 'x2', slug: 'x2', name: 'Shampoing Doux Sans Sulfates — 250ml' },
  { id: 'x3', slug: 'x3', name: 'Bonnet Satin Microfibre Premium' },
];

console.log('\n=== B-01 — Gamme peau ===\n');

// ── 1. Intégrité des fiches ────────────────────────────────────────────────
ok('chaque fiche porte un identifiant et un slug uniques', () => {
  const ids = KURLA_SKIN_RANGE.map(p => p.id);
  const slugs = KURLA_SKIN_RANGE.map(p => p.slug);
  assert.equal(new Set(ids).size, ids.length, `identifiants dupliqués : ${ids}`);
  assert.equal(new Set(slugs).size, slugs.length, `slugs dupliqués : ${slugs}`);
  // Aucun chevauchement avec les fiches déjà publiées.
  for (const existing of EXISTING_SKIN_PRODUCTS) {
    assert.ok(!ids.includes(existing.id), `${existing.id} est déjà publié`);
  }
});

ok('chaque fiche est publiable : prix, contenance, étape, image', () => {
  for (const p of KURLA_SKIN_RANGE) {
    assert.ok(p.price > 0, `${p.id} : prix ${p.price}`);
    assert.ok(p.sizeLabel.length > 0, `${p.id} : contenance manquante`);
    assert.ok(p.routineStep.length > 0, `${p.id} : étape de routine manquante`);
    assert.ok(p.description.length > 80, `${p.id} : description trop courte`);
    assert.ok(p.howToUse.length > 30, `${p.id} : mode d'emploi trop court`);
  }
});

ok('chaque fiche porte une composition INCI — aucune fiche nue', () => {
  // B-02 en fait une obligation réglementaire ; une fiche publiée sans
  // composition est un passif juridique, pas une fiche incomplète.
  for (const p of KURLA_SKIN_RANGE) {
    assert.ok(p.inci.trim().length > 20, `${p.id} : INCI absent ou trop court`);
    assert.ok(p.keyIngredients.length > 0, `${p.id} : actifs clés absents`);
  }
});

ok('aucune allégation thérapeutique dans les textes visibles', () => {
  // Règlement cosmétique CE 1223/2009 : un cosmétique n'a pas d'effet
  // thérapeutique et ne peut pas le revendiquer.
  const forbidden = /\b(traiter|traité|guérir|guérit|soigner|élimine|éliminer|supprime|supprimer|détruit|dissout|médicalement)\b/i;
  for (const p of KURLA_SKIN_RANGE) {
    const texts = [p.name, p.description, p.benefitPrimary, p.howToUse, p.forWho, p.notIdealIf, p.warnings || ''];
    for (const t of texts) {
      const hit = t.match(forbidden);
      assert.equal(hit, null, `${p.id} : « ${hit?.[0]} » dans « ${t.slice(0, 60)}… »`);
    }
  }
});

// ── 2. Codes de besoins reconnus par le moteur ─────────────────────────────
ok('tous les codes de besoins de la gamme sont reconnus par kurlaFit', () => {
  const recognized = new Set<string>(RECOGNIZED_NEED_CODES);
  for (const p of KURLA_SKIN_RANGE) {
    assert.ok(p.concerns.length > 0, `${p.id} : aucun besoin déclaré`);
    for (const c of p.concerns) {
      assert.ok(recognized.has(c), `${p.id} porte « ${c} », absent de RECOGNIZED_NEED_CODES : le produit serait pénalisé au score`);
    }
  }
});

ok('les six préoccupations exigées par B-01 sont portées par la gamme', () => {
  for (const concern of SKIN_CONCERN_COVERAGE) {
    const carriers = FULL_SKIN_RANGE.filter(p => p.concerns.includes(concern));
    assert.ok(carriers.length >= 2, `« ${concern} » : ${carriers.length} produit(s), 2 attendus`);
    const traitements = carriers.filter(p => p.stepGroup === 'traitement' || p.stepGroup === 'hydratant');
    assert.ok(traitements.length >= 1, `« ${concern} » : aucun produit de soin (traitement/hydratant)`);
  }
});

// ── 3. Couverture d'une routine complète ───────────────────────────────────
ok('la gamme couvre les quatre temps : nettoyant, traitement, hydratant, SPF', () => {
  const groups = new Set(FULL_SKIN_RANGE.map(p => p.stepGroup));
  for (const g of ['nettoyant', 'traitement', 'hydratant', 'spf']) {
    assert.ok(groups.has(g as never), `aucune fiche pour l'étape « ${g} »`);
  }
});

ok('chaque préoccupation dispose d’une routine complète nettoyant → traitement → SPF', () => {
  // Règle retenue, et assumée : le nettoyant et le SPF sont des temps
  // universels — un gel nettoyant doux convient à toutes les préoccupations.
  // Ce qui doit être spécifique, c'est le soin. On exige donc au moins deux
  // soins propres à la préoccupation, plus l'existence d'un nettoyant et d'un
  // SPF dans la gamme.
  const has = (group: string) => FULL_SKIN_RANGE.some(p => p.stepGroup === group);
  assert.ok(has('nettoyant') && has('spf') && has('hydratant'));
  for (const concern of SKIN_CONCERN_COVERAGE) {
    const soins = FULL_SKIN_RANGE.filter(
      p => p.concerns.includes(concern) && (p.stepGroup === 'traitement' || p.stepGroup === 'hydratant'),
    );
    assert.ok(soins.length >= 2, `« ${concern} » : ${soins.length} soin(s) spécifique(s), 2 attendus`);
  }
});

// ── 4. Ce que l'application recommande existe réellement ───────────────────
ok('chaque produit recommandé par PEAU_KITS correspond à une fiche', () => {
  const names = PEAU_KITS.flatMap(k => k.products.map(p => p.name));
  assert.ok(names.length >= 7, `PEAU_KITS : ${names.length} produits`);
  for (const name of names) {
    const match = resolveCatalogueProduct(name, CATALOGUE);
    assert.ok(match, `« ${name} » ne correspond à aucune fiche du catalogue`);
  }
});

ok('chaque produit cité par les profils de connaissance correspond à une fiche', () => {
  for (const profile of Object.values(SKIN_KNOWLEDGE)) {
    for (const name of profile.keyProducts) {
      const match = resolveCatalogueProduct(name, CATALOGUE);
      assert.ok(match, `profil « ${profile.name} » : « ${name} » ne correspond à aucune fiche`);
    }
  }
});

// ── 5. Le résolveur ne raconte pas d'histoires ─────────────────────────────
ok('le résolveur tolère casse, accents et contenance', () => {
  const variants = [
    'serum niacinamide 5%',
    'SÉRUM NIACINAMIDE 5%',
    'Sérum Niacinamide 5 %',
    'sérum-niacinamide 5%',
  ];
  for (const v of variants) {
    const match = resolveCatalogueProduct(v, CATALOGUE);
    assert.ok(match, `« ${v} » non résolu`);
    assert.equal(match?.product.id, 'peau-ess-006', `« ${v} » résolu vers ${match?.product.id}`);
  }
});

ok('le résolveur refuse une correspondance partielle', () => {
  // Un nom dont la moitié des mots est absente n'est pas le produit conseillé.
  for (const foreign of FOREIGN) {
    const match = resolveCatalogueProduct('Baume Lèvres Céramides', [foreign]);
    assert.equal(match, null, `« ${foreign.name} » indûment retenu`);
  }
});

ok('le résolveur rend la main sur un nom sans rapport', () => {
  assert.equal(resolveCatalogueProduct('Bonnet Satin Microfibre Premium', CATALOGUE), null);
  assert.equal(resolveCatalogueProduct('', CATALOGUE), null);
  assert.equal(resolveCatalogueProduct('de la le et', CATALOGUE), null);
});

ok('la normalisation écarte les mots vides et les contenances', () => {
  assert.deepEqual(normalizeProductName('Gel Nettoyant Doux Sans Parfum — 150ml'), ['gel', 'nettoyant', 'doux', 'parfum']);
  assert.deepEqual(normalizeProductName('Baume Lèvres Céramides — 10ml'), ['baume', 'levres', 'ceramides']);
});

// ── 6. Les actifs à risque sont signalés ───────────────────────────────────
ok('les actifs exfoliants, rétinol et vitamine C portent une mention de prudence', () => {
  const risky = ['peau-ess-005', 'peau-ess-009', 'peau-ess-010'];
  for (const id of risky) {
    const p = KURLA_SKIN_RANGE.find(x => x.id === id);
    assert.ok(p, `${id} absent`);
    assert.ok(p?.warnings && p.warnings.length > 40, `${id} : mention de prudence absente`);
  }
});

ok('le rétinol mentionne la contre-indication grossesse', () => {
  const retinol = KURLA_SKIN_RANGE.find(p => p.id === 'peau-ess-010');
  assert.ok(retinol?.warnings?.toLowerCase().includes('grossesse'), 'la mention grossesse est obligatoire sur un rétinol');
  assert.ok(retinol?.notIdealIf.toLowerCase().includes('grossesse'));
});

ok('le SPF teinté revendique l’absence de trace blanche sans promettre une protection totale', () => {
  const spf = KURLA_SKIN_RANGE.find(p => p.id === 'peau-ess-014');
  assert.ok(spf, 'SPF teinté absent');
  assert.ok(/invisible|sans trace blanche/i.test(`${spf?.name} ${spf?.description}`));
  assert.ok(spf?.warnings?.toLowerCase().includes('100 %'), 'rappeler qu’aucun solaire ne protège à 100 %');
});

// ── 7. Honnêteté des visuels ───────────────────────────────────────────────
ok('chaque fiche possède une illustration, déclarée hors du code d’interface', () => {
  // Les visuels de marque passent par BRAND_IMAGES ; les visuels de catalogue
  // vivent en base. Ce banc vérifie donc qu'aucune fiche ne part sans visuel
  // et que l'URL n'a pas été codée en dur dans src/, règle du projet.
  const src = readFileSync(join(process.cwd(), 'src/lib/kurlaSkinRange.ts'), 'utf-8');
  assert.equal(/https?:\/\/images\.unsplash\.com/.test(src), false, 'URL d’image codée en dur dans src/ : interdit par kurla_visuals');
  for (const p of KURLA_SKIN_RANGE) {
    assert.ok(SKIN_RANGE_ILLUSTRATIONS[p.id], `${p.id} : aucune illustration déclarée`);
  }
});

ok('aucun visuel de la gamme ne se présente comme un packshot de marque', () => {
  // Le champ part en base avec 'illustrative' (voir le générateur SQL). On
  // vérifie ici que la gamme ne revendique nulle part une photo fournie par
  // la marque : le produit n'est pas fabriqué.
  const generator = readFileSync(join(process.cwd(), 'scripts/generate-skin-range-sql.ts'), 'utf-8');
  assert.ok(/s\('illustrative'\)/.test(generator), 'image_ownership_status doit valoir illustrative');
  assert.equal(/s\('brand_provided'\)/.test(generator), false, 'un packshot fourni par la marque serait un mensonge');
});

console.log(`\n${checks} contrôles passés — gamme peau ${FULL_SKIN_RANGE.length} fiches (${KURLA_SKIN_RANGE.length} nouvelles)\n`);
