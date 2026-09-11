/**
 * BANC — C-06 : « seize fiches visibles sans être achetables »
 * ============================================================
 *
 * Constat : les 16 fiches peau sont publiées et actives en base, mais la porte
 * de publiabilité les écarte — leur source porte « formulation interne », donc
 * l'application les classe `formulation_target`. C'est exact : ce sont des
 * formules cibles, pas des produits fabriqués.
 *
 * Elles étaient donc invisibles. Les rendre visibles en les poussant dans le
 * catalogue aurait consisté à forcer leurs champs de preuve à « verified » et
 * à garder leurs visuels d'emprunt — c'est-à-dire à fabriquer les preuves
 * réglementaires de cosmétiques non fabriqués, CPNP et CPSR compris.
 *
 * La réponse retenue est une surface dédiée qui les montre comme ce qu'elles
 * sont. Ce banc verrouille les trois dérives qui guettent cette page :
 *
 *   1. L'identité — une fiche de démonstration ou un soin tiers ne doit pas
 *      être présenté comme une cible KURLA. Mesuré : 20 fiches de catégorie
 *      peau, 16 cibles réelles, 4 démonstrations (dont Black Girl Sunscreen
 *      et Eadem, deux marques tierces).
 *   2. L'habillage — aucun visuel, aucune disponibilité, aucun champ qui
 *      puisse se lire comme une composition arrêtée.
 *   3. Le référencement — une page de soins non vendables ne doit pas entrer
 *      dans le sitemap ni émettre de schéma Product.
 *
 * Exécution : KURLA_STORE_MODE=memory KURLA_TEST_NO_SERVER=true npx tsx tests/kurla_gamme_peau_cible.test.ts
 * Avec contrôle de production : KURLA_LIVE_CATALOG_URL=https://kurlabeauty.vercel.app npx tsx tests/kurla_gamme_peau_cible.test.ts
 */

import assert from 'node:assert/strict';
import {
  AVERTISSEMENT_CIBLE,
  estFicheCiblePeau,
  groupeEtapePeau,
  projeterFicheCiblePeau,
  trierFichesCibles,
  rangGroupeEtape,
  type FicheCiblePeau,
} from '../src/lib/skinRangeTarget';
import { normalizeWaitlistSource, WAITLIST_SOURCES, DEFAULT_WAITLIST_SOURCE } from '../src/lib/waitlistSources';
import { ROUTE_META } from '../src/lib/routeMeta';

let checks = 0;
function ok(label: string, fn: () => void): void {
  fn();
  checks += 1;
  console.log(`  \u2713 ${label}`);
}

/** Une cible réelle : la source porte le marqueur posé en B-08. */
const cible = {
  id: 'peau-ess-006',
  slug: 'serum-niacinamide-5-30ml',
  name: 'Sérum Niacinamide 5% — 30ml',
  category: 'peau',
  subcategory: 'Éclat & Uniformité',
  brand: 'KURLA Skincare',
  catalog_status: 'published',
  is_active: true,
  source_supplier: 'KURLA Skincare — formulation interne (précommande)',
  routine_step: 'Sérum niacinamide',
  size_label: '30ml',
  price: 15.9,
  inci: 'Aqua, Niacinamide, Zinc PCA, Panthenol',
  ingredients: ['Niacinamide 5%', 'Zinc PCA'],
  concerns: ['imperfections_acne', 'taches_hyperpigmentation'],
  skin_types: ['mixte', 'grasse'],
  image_url: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=800',
  stock_quantity: 0,
  in_stock: false,
};

/**
 * Une fiche de démonstration, catégorie peau elle aussi.
 *
 * Elle n'a aucune preuve vérifiée : `commercialState` vaut donc
 * `'formulation_target'` pour elle aussi. C'est précisément le piège que ce
 * banc ferme — se fier à l'état au lieu du marqueur afficherait « Black Girl
 * Sunscreen » dans la gamme en cours de formulation KURLA.
 */
const demonstration = {
  id: 'p15',
  name: 'Black Girl Sunscreen Broad Spectrum SPF 30 (Démo)',
  category: 'peau',
  brand: 'Black Girl Sunscreen',
  catalog_status: 'published',
  is_active: true,
  source_supplier: 'Fiche de démonstration — aucun sourcing réel ; canal presse',
  inci: 'Avocado Oil, Jojoba Oil',
};

const accessoire = {
  id: 'launch-p18',
  name: 'Flacon vaporisateur brume continue (300 ml)',
  category: 'accessoires',
  brand: 'KURLA',
  catalog_status: 'published',
  is_active: true,
  source_supplier: 'Grossiste — fiche sourcée',
};

// ── 1. L'identité ───────────────────────────────────────────────────────────
ok('une fiche de formulation cible est reconnue comme telle', () => {
  assert.equal(estFicheCiblePeau(cible), true);
});

ok('une fiche de démonstration n’est pas une cible de formulation', () => {
  // Même catégorie, même statut publié, même absence de preuves vérifiées :
  // seul le marqueur de formulation les distingue.
  assert.equal(estFicheCiblePeau(demonstration), false,
    'une démonstration tierce ne doit pas entrer dans la gamme KURLA');
});

ok('un produit d’une autre catégorie n’est jamais une cible peau', () => {
  assert.equal(estFicheCiblePeau(accessoire), false);
  assert.equal(estFicheCiblePeau(null), false);
  assert.equal(estFicheCiblePeau({}), false);
});

// ── 2. L'habillage ──────────────────────────────────────────────────────────
const projetee: FicheCiblePeau = projeterFicheCiblePeau(cible);

ok('la projection ne porte aucun visuel', () => {
  // La fiche source a une image (Unsplash). La servir reviendrait à montrer
  // le flacon d'un autre produit à la place d'un soin qui n'existe pas.
  assert.equal(projetee.image, '');
  assert.ok(cible.image_url.length > 0, 'la fiche source doit bien avoir une image pour que le contrôle ait un sens');
});

ok('aucun champ ne peut se lire comme une composition arrêtée', () => {
  const cles = Object.keys(projetee);
  for (const interdite of ['inci', 'composition', 'ingredients']) {
    assert.ok(!cles.includes(interdite),
      `« ${interdite} » ne doit pas sortir tel quel : on lirait une cible comme une composition`);
  }
  assert.equal(projetee.formuleCible, cible.inci);
});

ok('aucune disponibilité ne fuit dans la projection', () => {
  const cles = Object.keys(projetee);
  for (const cle of cles) {
    assert.ok(!/stock|disponib|achetab|panier|cart|inStock/i.test(cle),
      `« ${cle} » n’a rien à faire dans une fiche qui n’est pas en vente`);
  }
  assert.equal(projetee.availabilityState, 'formulation_target');
});

ok('la fiche dit explicitement qu’elle n’est pas en vente', () => {
  assert.ok(/n’est pas en vente|n'est pas en vente|Aucun de ces soins n’est en vente/.test(AVERTISSEMENT_CIBLE));
  assert.equal(projetee.avertissement, AVERTISSEMENT_CIBLE);
});

// ── 3. Le rangement ─────────────────────────────────────────────────────────
ok('le masque est un soin ponctuel, pas un hydratant quotidien', () => {
  // « 1 à 2 fois par semaine » : le ranger dans l'hydratation le ferait
  // passer pour un geste de tous les jours.
  assert.equal(groupeEtapePeau('Masque apaisant', 'Masque Apaisant Barrière — 50ml'), 'traitement');
  assert.equal(groupeEtapePeau('Nettoyant doux'), 'nettoyant');
  assert.equal(groupeEtapePeau('SPF 50+ invisible'), 'spf');
  assert.equal(groupeEtapePeau('Hydratant céramides'), 'hydratant');
});

ok('le tri suit l’ordre d’une routine, pas l’ordre alphabétique', () => {
  const fiches = trierFichesCibles([
    projeterFicheCiblePeau({ ...cible, id: 'a', name: 'SPF 50 Invisible', routine_step: 'SPF 50+ invisible' }),
    projeterFicheCiblePeau({ ...cible, id: 'b', name: 'Gel Nettoyant', routine_step: 'Nettoyant doux' }),
    projeterFicheCiblePeau({ ...cible, id: 'c', name: 'Crème Hydratante', routine_step: 'Hydratant céramides' }),
  ]);
  assert.deepEqual(fiches.map(f => f.groupe), ['nettoyant', 'hydratant', 'spf']);
  const rangs = fiches.map(f => rangGroupeEtape(f.groupe));
  assert.deepEqual(rangs, [...rangs].sort((x, y) => x - y), 'les groupes doivent être croissants');
});

// ── 4. Le référencement et la relance ───────────────────────────────────────
ok('la page est hors indexation : pas de schéma Product pour des soins non vendables', () => {
  const entree = ROUTE_META.find(meta => meta.path === '/peau/gamme');
  assert.ok(entree, 'la route doit être déclarée dans routeMeta');
  assert.equal(entree.indexable, false,
    'indexer une page de produits non achetables la ferait paraître comme une offre');
});

ok('la source de liste d’attente est déclarée, pas ramenée au défaut', () => {
  // `normalizeWaitlistSource` est sur liste fermée : une source inconnue
  // retombe sur `home_waitlist`, et la relance ne pourrait plus distinguer
  // « j’attends ces soins » de « je veux la newsletter ».
  assert.ok(WAITLIST_SOURCES.includes('gamme_peau_cible'));
  assert.equal(normalizeWaitlistSource('gamme_peau_cible'), 'gamme_peau_cible');
  assert.equal(normalizeWaitlistSource('invention'), DEFAULT_WAITLIST_SOURCE);
});

// ── 5. L’écart dépôt / production, mesurable à la demande ───────────────────
async function controleProduction(): Promise<void> {
  const base = process.env.KURLA_LIVE_CATALOG_URL;
  if (!base) {
    console.log('  · contrôle de production ignoré (KURLA_LIVE_CATALOG_URL non défini)');
    return;
  }
  const reponse = await fetch(`${base.replace(/\/$/, '')}/api/peau/gamme`);
  assert.equal(reponse.ok, true, `/api/peau/gamme a répondu ${reponse.status}`);
  const corps = await reponse.json() as { fiches?: FicheCiblePeau[]; count?: number };
  const fiches = corps.fiches ?? [];
  assert.equal(fiches.length, 16, `${fiches.length} fiches attendues en production`);
  for (const fiche of fiches) {
    assert.equal(fiche.image, '', `${fiche.id} : un visuel ne doit jamais sortir`);
    assert.equal(fiche.availabilityState, 'formulation_target');
  }
  console.log(`  ✓ production : ${fiches.length} fiches servies, sans visuel, sans disponibilité`);
  checks += 1;
}

controleProduction()
  .then(() => {
    console.log(`\n${checks} contrôles passés — gamme peau cible : visible, jamais vendable\n`);
  })
  .catch(error => {
    console.error('\n✗ ÉCHEC —', error instanceof Error ? error.message : error);
    process.exit(1);
  });
