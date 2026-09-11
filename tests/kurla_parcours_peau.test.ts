/**
 * BANC — C-07 : « un diagnostic peau ne recommande pas un bonnet chauffant »
 * ==========================================================================
 *
 * Constat, mesuré et non supposé : le rayon peau est VIDE.
 * 63 produits publics — 28 accessoires, 25 cheveux, 10 kits — et aucun soin
 * peau. Les 16 fiches de la gamme sont des formules cibles, écartées à juste
 * titre par la porte de publiabilité (C-06).
 *
 * Le résultat du diagnostic peau sélectionnait pourtant ses produits ainsi :
 *
 *   products.filter(p => p.category === 'peau'
 *     || (p.needs || []).some(n => /peau|tache|spf|hydrater|uniform/i.test(n)))
 *
 * Le besoin des produits cheveux s'appelle `hydrater_cheveux`. L'expression le
 * captait. Mesuré sur le cataloguepublic : **22 produits, tous cheveux ou
 * accessoires** — bonnet chauffant, beurre de karité, flacon vaporisateur,
 * brosse vapeur. Quelqu'un qui vient de répondre à un questionnaire sur son
 * visage se voyait proposer cela, sans qu'un mot ne le signale.
 *
 * Deux autres fabrications du même bloc, corrigées ici :
 *   · la sélection « SPF sans trace blanche » retenait tout produit dont le
 *     nom contenait « protection » — les protecteurs thermiques cheveux ;
 *   · le « kit recommandé pour votre diagnostic » sortait de `recommendKit`,
 *     un recommandeur de kits CAPILLAIRES, alimenté par le type de peau
 *     (`texture: skinType`) : un kit 4C proposé à une peau sèche.
 *
 * Ce banc verrouille le discriminant, les trois sélections, et l'état vide qui
 * doit dire l'absence au lieu de promettre un mouvement qui n'a pas lieu.
 *
 * Exécution : KURLA_STORE_MODE=memory KURLA_TEST_NO_SERVER=true npx tsx tests/kurla_parcours_peau.test.ts
 * Avec contrôle de production : KURLA_LIVE_CATALOG_URL=https://kurlabeauty.vercel.app npx tsx tests/kurla_parcours_peau.test.ts
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { estBesoinPeau, estProduitPeau } from '../src/lib/skinTaxonomy';

let checks = 0;
function ok(label: string, fn: () => void): void {
  fn();
  checks += 1;
  console.log(`  \u2713 ${label}`);
}

/** Le catalogue public, tel qu'il est réellement composé (63 produits). */
const catalogue = [
  { id: 'p18', name: 'Flacon vaporisateur brume continue (300 ml)', category: 'accessoires', needs: ['hydrater_cheveux', 'definir_boucles'] },
  { id: 'p44', name: 'Bonnet chauffant soin profond (thermal, micro-ondes)', category: 'accessoires', needs: ['hydrater_cheveux', 'cuir_chevelu'] },
  { id: 'p46', name: 'Durag satin (waves, protection nuit & traction)', category: 'accessoires', needs: ['proteger_nuit'] },
  { id: 'p21', name: 'Brosse vapeur nano-mist électrique', category: 'accessoires', needs: ['hydrater_cheveux'] },
  { id: 'c01', name: 'Cantu Shea Butter Hydrating Cream Conditioner', category: 'cheveux', needs: ['hydrater_cheveux', 'reduire_casse'] },
  { id: 'c02', name: 'Beurre de karité brut 100 % (200 g)', category: 'cheveux', needs: ['hydrater_cheveux'] },
  { id: 'c03', name: 'Spray de protection thermique avant lissage', category: 'cheveux', needs: ['proteger_chaleur'] },
  { id: 'k06', name: 'Kit — Routine complète 4C (toute la ligne)', category: 'kits', needs: ['hydrater_cheveux'] },
];

/** L'expression fautive, conservée pour prouver qu'elle attrape bien. */
const ANCIENNE_EXPRESSION = /peau|tache|spf|hydrater|uniform/i;
const ANCIEN_FILTRE_SPF = /spf|solair|protection|invisible|trace/i;

const diagnostic = readFileSync(new URL('../src/pages/DiagnosticResultPage.tsx', import.meta.url), 'utf8');
const modeleResultat = readFileSync(new URL('../src/lib/diagnosticResult.ts', import.meta.url), 'utf8');
const routeReco = readFileSync(new URL('../src/server/routes/recommendations.ts', import.meta.url), 'utf8');
const boutique = readFileSync(new URL('../src/pages/BoutiquePage.tsx', import.meta.url), 'utf8');

// ── 1. Le discriminant ──────────────────────────────────────────────────────
ok('« hydrater_cheveux » n’est pas un besoin peau', () => {
  assert.equal(estBesoinPeau('hydrater_cheveux'), false, 'c’est le besoin qui a causé le bug');
  assert.equal(estBesoinPeau('reduire_casse'), false);
});

ok('les besoins peau sont reconnus, dans les deux vocabulaires', () => {
  assert.equal(estBesoinPeau('hydrater'), true);
  assert.equal(estBesoinPeau('hydrater_peau'), true, 'le vocabulaire de la base est suffixé _peau');
  assert.equal(estBesoinPeau('spf'), true);
});

ok('le vocabulaire long de la base est couvert par la catégorie, pas par le besoin', () => {
  // La base porte `taches_hyperpigmentation`, `imperfections_acne`,
  // `barriere_cutanee` : ces formes ne portent pas le suffixe `_peau` et ne
  // font pas partie de SKIN_NEEDS. Le discriminant ne les reconnaît donc pas
  // comme besoins — volontairement : élargir la règle aux sous-chaînes
  // (« taches », « peau ») rouvrirait la porte à `hydrater_cheveux`.
  //
  // Elles restent couvertes, par la catégorie : un soin peau réel est de
  // catégorie « peau ». Le discriminant sous-sélectionne, jamais il ne
  // sur-sélectionne — c'est le sens du défaut corrigé.
  assert.equal(estBesoinPeau('taches_hyperpigmentation'), false);
  assert.equal(estProduitPeau({ category: 'peau', concerns: ['taches_hyperpigmentation'] }), true);
});

// ── 2. La sélection du diagnostic ───────────────────────────────────────────
ok('aucun produit cheveux ni accessoire n’entre dans la sélection peau', () => {
  for (const produit of catalogue) {
    assert.equal(estProduitPeau(produit), false,
      `${produit.id} (${produit.category}) ne doit pas être présenté comme un soin peau`);
  }
});

ok('l’ancienne expression attrapait des produits cheveux — preuve du défaut', () => {
  // Sans ce contrôle, le correctif ressemble à une préférence de style. Il
  // mesure l'écart : l'ancienne expression en retenait 6 sur 8, la nouvelle 0.
  const anciens = catalogue.filter(p => (p.needs || []).some(n => ANCIENNE_EXPRESSION.test(n)));
  const nouveaux = catalogue.filter(estProduitPeau);
  assert.ok(anciens.length >= 5, `${anciens.length} produits attendus avec l’ancienne expression`);
  assert.equal(nouveaux.length, 0, 'la nouvelle sélection ne doit rien retenir de ce catalogue');
});

ok('un soin peau réel est reconnu quand il existe', () => {
  assert.equal(estProduitPeau({ category: 'peau', needs: [] }), true);
  assert.equal(estProduitPeau({ category: 'cheveux', needs: ['hydrater_peau'] }), true);
});

// ── 3. Ce que le code fait maintenant ───────────────────────────────────────
//
// La consolidation C0-C4 a réécrit la page de résultat : elle ne sélectionne
// plus les produits elle-même, elle délègue à `buildDiagnosticResultModel`.
// Le défaut d'origine a donc disparu avec la réécriture — ces contrôles
// verrouillent la nouvelle architecture pour qu'il ne revienne pas.

ok('la sélection se fait par identifiants explicites, plus par expression régulière', () => {
  assert.ok(modeleResultat.includes('handles.has(product.slug)'),
    'les produits doivent être ceux que le résultat cite nommément');
  assert.ok(!modeleResultat.includes('/peau|tache|spf|hydrater|uniform/'),
    'l’ancienne expression ne doit pas revenir');
  assert.ok(!diagnostic.includes('/peau|tache|spf|hydrater|uniform/'),
    'ni dans la page');
});

ok('un diagnostic peau ne remonte plus de candidats capillaires', () => {
  // `queryNeeds` ajoute « hydrater_cheveux » dès qu'un champ libre contient
  // « cheveu ». Sans la garde, un diagnostic peau pouvait proposer des
  // produits capillaires à l'IA, qui n'a le droit de citer que ces candidats.
  assert.ok(routeReco.includes('estBesoinPeau'),
    'la garde de rayon doit filtrer les candidats d’un diagnostic peau');
  assert.ok(/diagnosticType === 'skin'[\s\S]{0,200}estBesoinPeau/.test(routeReco),
    'la garde ne doit s’appliquer qu’au diagnostic peau');
});

ok('le diagnostic peau n’alimente plus un recommandeur de kits cheveux', () => {
  assert.ok(!diagnostic.includes('recommendKit({'),
    'la page ne doit plus appeler le recommandeur de kits capillaires');
});

ok('l’état vide du rayon peau ne promet plus un enrichissement qui n’a pas lieu', () => {
  // « la gamme s’enrichit chaque semaine » annonçait un mouvement inexistant :
  // aucun soin peau n’a été publié depuis l’écriture de ce texte.
  assert.ok(!boutique.includes('s’enrichit chaque semaine'),
    'une progression inventée est une urgence fabriquée');
  assert.ok(boutique.includes('/peau/gamme'), 'le rayon vide doit renvoyer vers la gamme en formulation');
});

// ── 5. L’écart dépôt / production, mesurable à la demande ───────────────────
async function controleProduction(): Promise<void> {
  const base = process.env.KURLA_LIVE_CATALOG_URL;
  if (!base) {
    console.log('  · contrôle de production ignoré (KURLA_LIVE_CATALOG_URL non défini)');
    return;
  }
  const reponse = await fetch(`${base.replace(/\/$/, '')}/api/products`);
  assert.equal(reponse.ok, true, `/api/products a répondu ${reponse.status}`);
  const corps = await reponse.json() as { products?: any[] };
  const produits = corps.products ?? [];

  // L'invariant, quel que soit l'avenir du catalogue : aucun produit qui
  // n'est pas de catégorie « peau » ne doit passer pour un soin peau.
  const fauxPositifs = produits.filter(p => p.category !== 'peau' && estProduitPeau(p));
  assert.equal(fauxPositifs.length, 0,
    `${fauxPositifs.length} produit(s) non-peau passent pour des soins peau : ${fauxPositifs.map(p => p.id).join(', ')}`);

  const soinsPeau = produits.filter(p => p.category === 'peau');
  const anciens = produits.filter(p => (p.needs || []).some((n: string) => ANCIENNE_EXPRESSION.test(n)));
  console.log(`  ✓ production : ${produits.length} produits publics, ${soinsPeau.length} soin(s) peau, `
    + `${anciens.length} qu’attrapait l’ancienne expression`);
  checks += 1;
}

controleProduction()
  .then(() => {
    console.log(`\n${checks} contrôles passés — parcours peau : plus aucun produit cheveux présenté comme un soin visage\n`);
  })
  .catch(error => {
    console.error('\n✗ ÉCHEC —', error instanceof Error ? error.message : error);
    process.exit(1);
  });
