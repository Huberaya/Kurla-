/**
 * CHARGEMENT PARTAGÉ DE LA LISTE PRODUITS — contrat du regroupement.
 *
 * L'onglet « Catalogue produits » montait trois panneaux qui demandaient la
 * même liste (mesuré : les trois URL ne différaient que par des paramètres que
 * le serveur ignore, l'en-tête d'espace étant prioritaire). `fetchAdminCatalogProducts`
 * les regroupe. Ce banc couvre ce qui pourrait casser en silence :
 *
 *   - la clé distingue deux espaces (jamais de réponse partagée entre espaces),
 *   - N appels simultanés → UNE requête réseau, N copies indépendantes,
 *   - deux appels SUCCESSIFS → deux requêtes (aucun cache périmé après écriture),
 *   - l'échec est propagé à tous les appelants et ne laisse rien dans le tableau,
 *   - un HTTP non-OK remonte l'erreur du serveur, pas un message générique.
 */
import { strict as assert } from 'node:assert';
import {
  ADMIN_CATALOG_PRODUCTS_URL,
  fetchAdminCatalogProducts,
  productsRequestKey,
  readWorkspaceHeader,
  type Inflight,
} from '../src/lib/adminCatalogProducts';

function jsonResponse(payload: unknown, ok = true, status = ok ? 200 : 400) {
  return {
    ok,
    status,
    json: async () => payload,
  } as unknown as Response;
}

/* 1. Clé : l'espace fait partie de l'identité de la requête. */
{
  assert.equal(productsRequestKey('/api/x', 'skin'), '/api/x#skin');
  assert.equal(productsRequestKey('/api/x', ' SKIN '), '/api/x#skin', 'espace normalisé');
  assert.equal(productsRequestKey('/api/x'), '/api/x#aucun');
  assert.notEqual(productsRequestKey('/api/x', 'skin'), productsRequestKey('/api/x', 'hair'), 'deux espaces → deux clés');
  assert.notEqual(productsRequestKey('/api/x', 'skin'), productsRequestKey('/api/y', 'skin'), 'deux URL → deux clés');
  console.log('✓ clé = URL + espace : deux espaces ne partagent jamais une réponse');
}

/* 2. Lecture de l'en-tête d'espace : objet simple, Headers, liste de paires. */
{
  assert.equal(readWorkspaceHeader({ 'X-Kurla-Workspace': 'hair' }), 'hair', 'objet (casse réelle d’adminHeaders)');
  assert.equal(readWorkspaceHeader({ 'x-kurla-workspace': 'skin' }), 'skin');
  assert.equal(readWorkspaceHeader(new Headers({ 'X-Kurla-Workspace': 'skin' })), 'skin', 'instance Headers');
  assert.equal(readWorkspaceHeader([['X-Kurla-Workspace', 'hair']]), 'hair', 'liste de paires');
  assert.equal(readWorkspaceHeader({ Authorization: 'Bearer x' }), '', 'absent → chaîne vide');
  assert.equal(readWorkspaceHeader(undefined), '', 'pas d’en-têtes → chaîne vide');
  console.log('✓ en-tête d’espace lu dans les trois formes acceptées par fetch');
}

/* 3. Trois appels simultanés (les trois panneaux) → UNE requête, trois copies. */
{
  const inflight: Inflight = new Map();
  let calls = 0;
  const payload = { products: [{ id: 'p1', name: 'Sérum', needs: [] }], count: 1, scope: 'skin' };
  const fetchImpl = (async () => {
    calls += 1;
    return jsonResponse(payload);
  }) as unknown as typeof fetch;

  const headers = { 'X-Kurla-Workspace': 'skin' };
  const [a, b, c] = await Promise.all([
    fetchAdminCatalogProducts(headers, { inflight, fetchImpl }),
    fetchAdminCatalogProducts(headers, { inflight, fetchImpl }),
    fetchAdminCatalogProducts(headers, { inflight, fetchImpl }),
  ]);

  assert.equal(calls, 1, 'une seule requête réseau pour trois panneaux');
  assert.deepEqual(a.products, payload.products, 'contenu fidèle');
  assert.deepEqual(b.products, payload.products);
  assert.deepEqual(c.products, payload.products);
  assert.notEqual(a, b, 'chaque appelant reçoit sa copie');
  a.products[0].name = 'modifié par un panneau';
  assert.equal(b.products[0].name, 'Sérum', 'la copie du voisin n’est pas salie');
  assert.equal(inflight.size, 0, 'tableau vidé après résolution');
  console.log('✓ 3 appels simultanés → 1 requête, 3 copies indépendantes, tableau vidé');
}

/* 4. Deux espaces simultanés → deux requêtes (pas de mélange). */
{
  const inflight: Inflight = new Map();
  const seen: string[] = [];
  const fetchImpl = (async (url: string, init: any) => {
    seen.push(String(init?.headers?.['X-Kurla-Workspace']));
    return jsonResponse({ products: [{ id: init?.headers?.['X-Kurla-Workspace'] }] });
  }) as unknown as typeof fetch;

  const [skin, hair] = await Promise.all([
    fetchAdminCatalogProducts({ 'X-Kurla-Workspace': 'skin' }, { inflight, fetchImpl }),
    fetchAdminCatalogProducts({ 'X-Kurla-Workspace': 'hair' }, { inflight, fetchImpl }),
  ]);
  assert.deepEqual(seen.sort(), ['hair', 'skin'], 'une requête par espace');
  assert.equal(skin.products[0].id, 'skin');
  assert.equal(hair.products[0].id, 'hair');
  console.log('✓ deux espaces simultanés → deux requêtes distinctes');
}

/* 5. Appels successifs → deux requêtes : aucun cache après une écriture. */
{
  const inflight: Inflight = new Map();
  let calls = 0;
  const fetchImpl = (async () => {
    calls += 1;
    return jsonResponse({ products: [{ id: `v${calls}` }] });
  }) as unknown as typeof fetch;

  const first = await fetchAdminCatalogProducts({}, { inflight, fetchImpl });
  const second = await fetchAdminCatalogProducts({}, { inflight, fetchImpl });
  assert.equal(calls, 2, 'le deuxième appel recharge réellement');
  assert.equal(first.products[0].id, 'v1');
  assert.equal(second.products[0].id, 'v2', 'données fraîches, pas de cache');
  console.log('✓ appels successifs → rechargement réel (aucune donnée périmée)');
}

/* 6. Échec : propagé à tous les appelants, tableau nettoyé. */
{
  const inflight: Inflight = new Map();
  let calls = 0;
  const fetchImpl = (async () => {
    calls += 1;
    throw new Error('réseau coupé');
  }) as unknown as typeof fetch;

  const results = await Promise.allSettled([
    fetchAdminCatalogProducts({}, { inflight, fetchImpl }),
    fetchAdminCatalogProducts({}, { inflight, fetchImpl }),
  ]);
  assert.equal(calls, 1, 'l’échec aussi est partagé, pas rejoué');
  assert.equal(results[0].status, 'rejected');
  assert.equal(results[1].status, 'rejected');
  assert.equal(inflight.size, 0, 'une promesse rejetée ne reste pas dans le tableau');

  // Et un appel ultérieur retente vraiment.
  const after = await fetchAdminCatalogProducts({}, {
    inflight,
    fetchImpl: (async () => jsonResponse({ products: [] })) as unknown as typeof fetch,
  });
  assert.deepEqual(after.products, [], 'l’échec n’empoisonne pas les appels suivants');
  console.log('✓ échec partagé, tableau nettoyé, appel suivant retenté');
}

/* 7. HTTP non-OK → l’erreur du serveur, pas un message générique. */
{
  const inflight: Inflight = new Map();
  const fetchImpl = (async () => jsonResponse({ error: 'Session expirée.' }, false, 401)) as unknown as typeof fetch;
  await assert.rejects(
    () => fetchAdminCatalogProducts({}, { inflight, fetchImpl }),
    /Session expirée\./,
    'le message du serveur remonte'
  );
  assert.equal(inflight.size, 0);
  console.log('✓ HTTP non-OK → message du serveur propagé');
}

/* 8. L’URL par défaut est la bonne. */
{
  assert.equal(ADMIN_CATALOG_PRODUCTS_URL, '/api/admin/catalog/products');
  let url = '';
  await fetchAdminCatalogProducts({}, {
    inflight: new Map(),
    fetchImpl: (async (u: string) => { url = u; return jsonResponse({ products: [] }); }) as unknown as typeof fetch,
  });
  assert.equal(url, '/api/admin/catalog/products', 'URL par défaut = la route admin réelle');
  console.log('✓ URL par défaut = /api/admin/catalog/products');
}

console.log('\n8 blocs de contrôles validés — clé, en-tête, regroupement concurrentiel, copies, absence de cache, erreurs.');
