/**
 * Catalogue partagé (15/09/2026) — un seul téléchargement, trois fois moins de JSON.
 * ===============================================================================
 *
 * Mesuré sur téléphone (iPhone, processeur ralenti 4×, réseau 4G lente) :
 * `GET /api/products` partait **trois fois** sur la page d'accueil. Le panier,
 * la recherche et l'aperçu boutique appellent chacun `useProducts()`, et le
 * hook déclenchait sa propre requête. Trois fois 159 Ko décodés — 477 Ko de
 * JSON à analyser — pour un catalogue identique, au même instant.
 *
 * Contrat verrouillé :
 *   1. des appels simultanés partagent un seul vol : une requête, pas trois,
 *      et tous reçoivent la même liste ;
 *   2. un catalogue lu depuis moins de trente secondes est réutilisé — c'est
 *      ce qui évite la requête de la section qui se monte en retard ;
 *   3. « rafraîchir » reste un ordre : il relance une lecture même si le
 *      catalogue est frais, et même pendant un vol en cours ;
 *   4. `reinitialiserCataloguePublic` oublie tout (sortie de session, mode
 *      test) et la lecture suivante retourne au réseau ;
 *   5. un échec n'est pas mémorisé : le vol suivant repart de zéro au lieu de
 *      faire échouer toute la page, et un échec n'invalide pas la fraîcheur
 *      d'un succès antérieur.
 */

import assert from 'node:assert/strict';

process.env.KURLA_TEST_NO_SERVER = 'true';

let appels: string[] = [];
let reponses: Array<{ ok: boolean; json: () => Promise<unknown> }> = [];

const vraiFetch = globalThis.fetch;

function fauxFetch(url: string): Promise<{ ok: boolean; json: () => Promise<unknown> }> {
  appels.push(String(url));
  const reponse = reponses.shift();
  assert.ok(reponse, `requête imprévue vers ${url} : le catalogue aurait dû être réutilisé`);
  return Promise.resolve(reponse);
}

function reinitialiser(suites: Array<{ ok: boolean; corps: unknown }>): void {
  appels = [];
  reponses = suites.map((s) => ({
    ok: s.ok,
    json: () => Promise.resolve(s.corps),
  }));
}

const CATALOGUE = { products: [{ id: 'p1', name: 'Crème' }], skinKits: [] };

async function main(): Promise<void> {
  const { getProductsFromSupabase, reinitialiserCataloguePublic } =
    await import('../src/services/productService');

  // 1. Trois appelants au même instant : une seule requête.
  reinitialiserCataloguePublic();
  reinitialiser([{ ok: true, corps: CATALOGUE }]);
  const [a, b, c] = await Promise.all([
    getProductsFromSupabase(),
    getProductsFromSupabase(),
    getProductsFromSupabase(),
  ]);
  assert.equal(appels.length, 1, `une seule requête attendue, ${appels.length} parties`);
  assert.equal(a.products.length, 1);
  assert.equal(b.products.length, 1, 'le deuxième appelant doit recevoir la même liste');
  assert.equal(c.products.length, 1, 'le troisième appelant doit recevoir la même liste');
  assert.equal(a.error, null);
  assert.equal(b.error, null);
  assert.equal(c.error, null);

  // 2. Catalogue encore frais : réutilisé, aucune requête. Aucune réponse
  //    n'est préparée, donc la moindre requête fait échouer le banc.
  reinitialiser([]);
  const reuse = await getProductsFromSupabase();
  assert.equal(appels.length, 0, 'un catalogue frais doit être réutilisé sans requête');
  assert.equal(reuse.products.length, 1);

  // 3. « Rafraîchir » relance une lecture malgré la fraîcheur.
  reinitialiser([{ ok: true, corps: CATALOGUE }]);
  const force = await getProductsFromSupabase(true);
  assert.equal(appels.length, 1, 'un rafraîchissement explicite doit relancer une requête');
  assert.equal(force.products.length, 1);

  // 3 bis. Et même pendant un vol en cours.
  reinitialiser([{ ok: true, corps: CATALOGUE }, { ok: true, corps: CATALOGUE }]);
  const volEnCours = getProductsFromSupabase(true);
  const forcePendantVol = await getProductsFromSupabase(true);
  await volEnCours;
  assert.equal(appels.length, 2, 'deux rafraîchissements = deux requêtes, même simultanés');
  assert.equal(forcePendantVol.products.length, 1);

  // 4. Réinitialisation : la lecture suivante retourne au réseau.
  reinitialiser([{ ok: true, corps: CATALOGUE }]);
  reinitialiserCataloguePublic();
  const apresReset = await getProductsFromSupabase();
  assert.equal(appels.length, 1, 'après réinitialisation, on doit relire');
  assert.equal(apresReset.products.length, 1);

  // 5. Un échec n'est pas mémorisé : la lecture suivante repart de zéro.
  reinitialiserCataloguePublic();
  reinitialiser([
    { ok: false, corps: {} },
    { ok: true, corps: CATALOGUE },
  ]);
  const echec = await getProductsFromSupabase();
  assert.ok(echec.error, 'un échec doit être signalé, pas transformé en liste vide');
  assert.equal(echec.products.length, 0);
  const reprise = await getProductsFromSupabase();
  assert.equal(reprise.products.length, 1, 'après un échec, la lecture suivante doit réussir');
  assert.equal(appels.length, 2, 'un échec ne doit pas être servi depuis le cache');

  console.log('[PASS] Catalogue partagé : 3 appelants 1 requête, fraîcheur 30 s réutilisée, « rafraîchir » et réinitialisation relisent, échec non mémorisé.');
}

globalThis.fetch = fauxFetch as unknown as typeof fetch;

main()
  .then(() => {
    globalThis.fetch = vraiFetch;
  })
  .catch((erreur: unknown) => {
    globalThis.fetch = vraiFetch;
    console.error(erreur);
    process.exit(1);
  });
