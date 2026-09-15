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
 *   2. rien n'est mis en cache : un appel lancé après la fin du vol relit
 *      vraiment, sinon la boutique afficherait un catalogue périmé ;
 *   3. « rafraîchir » reste un ordre : il relance une lecture même pendant
 *      qu'un vol est en cours ;
 *   4. un échec n'est pas mémorisé : le vol suivant repart de zéro au lieu
 *      de faire échouer toute la page.
 */

import assert from 'node:assert/strict';

process.env.KURLA_TEST_NO_SERVER = 'true';

type Appel = { url: string };

let appels: Appel[] = [];
let reponses: Array<{ ok: boolean; json: () => Promise<unknown> }> = [];

const vraiFetch = globalThis.fetch;

function fauxFetch(url: string): Promise<{ ok: boolean; json: () => Promise<unknown> }> {
  appels.push({ url: String(url) });
  const reponse = reponses.shift();
  assert.ok(reponse, `requête imprévue vers ${url}`);
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
  const { getProductsFromSupabase } = await import('../src/services/productService');

  // 1. Trois appelants au même instant : une seule requête.
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

  // 2. Aucune mise en cache : après la fin du vol, on relit vraiment.
  reinitialiser([{ ok: true, corps: CATALOGUE }]);
  await getProductsFromSupabase();
  assert.equal(appels.length, 1, 'un montage après le vol doit relire, pas servir du périmé');

  // 3. « Rafraîchir » relance une lecture même pendant un vol en cours.
  reinitialiser([{ ok: true, corps: CATALOGUE }, { ok: true, corps: CATALOGUE }]);
  const volEnCours = getProductsFromSupabase();
  const force = await getProductsFromSupabase(true);
  await volEnCours;
  assert.equal(appels.length, 2, 'un rafraîchissement explicite doit relancer une requête');
  assert.equal(force.products.length, 1);

  // 4. Un échec n'est pas mémorisé : le vol suivant repart de zéro.
  reinitialiser([
    { ok: false, corps: {} },
    { ok: true, corps: CATALOGUE },
  ]);
  const echec = await getProductsFromSupabase();
  assert.ok(echec.error, 'un échec doit être signalé, pas transformé en liste vide');
  assert.equal(echec.products.length, 0);
  const reprise = await getProductsFromSupabase();
  assert.equal(reprise.products.length, 1, 'après un échec, la lecture suivante doit réussir');
  assert.equal(appels.length, 2);

  console.log('[PASS] Catalogue partagé : 3 appelants, 1 requête ; rien n\'est mis en cache ; « rafraîchir » relit ; un échec n\'est pas mémorisé.');
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
