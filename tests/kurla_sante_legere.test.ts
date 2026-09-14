/**
 * Santé légère (14/09/2026) — un indicateur qui coûte moins que ce qu'il mesure.
 * ============================================================================
 *
 * Mesuré le 14/09/2026 : `/api/health` répondait en 0,45 seconde. La cause
 * n'était pas un enchaînement séquentiel (les trois lectures étaient déjà en
 * `Promise.all`) : c'était `getProducts()`. Cinq tables lues, et les 96
 * produits mappés un par un avec variantes, images, stock et preuves CPNP,
 * **pour en afficher le nombre**.
 *
 * La route est la plus sondée du site : la sonde l'appelle toutes les quinze
 * minutes, et `verifier-deploiement.mjs` attend sa réponse avant de sonder
 * quoi que ce soit d'autre. Un indicateur de santé qui coûte un chargement
 * complet du catalogue finit par ressembler à une charge de trafic.
 *
 * Contrat verrouillé :
 *   1. `/api/health` donne le nombre de produits **sans** lire le catalogue —
 *      la preuve est faite en rendant `getProducts` en échec pendant l'appel ;
 *   2. le compte ne compte que les produits actifs, dans les deux chemins
 *      (base et mémoire) : avant, les deux chemins ne disaient pas la même
 *      chose, et un même champ avait deux vérités ;
 *   3. la forme reste celle des autres compteurs : le nombre **et** sa
 *      source, `null` quand la lecture a échoué, jamais un faux `0`.
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

process.env.KURLA_TEST_NO_SERVER = 'true';

const { serverDb } = await import('../src/lib/serverDb');
const serverModule = await import('../server');

const ACTIF_1 = 'sante-actif-001';
const ACTIF_2 = 'sante-actif-002';
const ACTIF_3 = 'sante-actif-003';
const INACTIF = 'sante-inactif-001';

function fiche(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    slug: id,
    title: `Produit ${id}`,
    name: `Produit ${id}`,
    brand: 'KURLA Botanicals',
    category: 'peau',
    subcategory: 'serum',
    price: 12.5,
    in_stock: true,
    stock_quantity: 3,
    image_url: `https://images.example.org/${id}.jpg`,
    country_availability: ['FR'],
    is_active: true,
    catalog_status: 'draft',
    ingredients: [],
    inci: '',
    ...extra
  };
}

serverDb.inMemoryProducts = [
  fiche(ACTIF_1),
  fiche(ACTIF_2),
  fiche(ACTIF_3),
  fiche(INACTIF, { is_active: false })
] as never[];

async function requestApp(path: string) {
  const listener = http.createServer(serverModule.app);
  await new Promise<void>(resolve => listener.listen(0, '127.0.0.1', () => resolve()));
  const port = (listener.address() as AddressInfo).port;
  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`);
    return { status: response.status, json: await response.json() };
  } finally {
    await new Promise<void>(resolve => listener.close(() => resolve()));
  }
}

// ---------------------------------------------------------------------------
// 1. Le compte : les produits actifs, et leur source.
// ---------------------------------------------------------------------------
{
  const compte = await serverDb.compterProduitsActifs();
  assert.equal(compte.compte, 3, 'trois produits actifs, le quatrième est désactivé');
  assert.equal(compte.source, 'memoire', 'sans base, la source doit le dire');
}

// ---------------------------------------------------------------------------
// 2. /api/health ne lit PLUS le catalogue.
//
// La preuve n'est pas une assertion sur du code : on rend `getProducts` en
// échec, et la route doit répondre quand même. Si elle retombe un jour sur
// un chargement complet, ce banc échoue.
// ---------------------------------------------------------------------------
{
  const getProductsOriginal = (serverDb as any).getProducts;
  assert.equal(typeof getProductsOriginal, 'function', 'getProducts doit exister pour être neutralisé');
  (serverDb as any).getProducts = async () => {
    throw new Error('getProducts ne doit pas être appelé par /api/health');
  };

  let sante: { status: number; json: any };
  try {
    sante = await requestApp('/api/health');
  } finally {
    (serverDb as any).getProducts = getProductsOriginal;
  }

  assert.equal(sante.status, 200, 'la santé ne dépend pas du catalogue');
  assert.equal(sante.json.productsCount, 3, 'le compte reste juste sans charger le catalogue');
  assert.equal(sante.json.produits.source, 'memoire', 'la source du compte est exposée');
  assert.equal(sante.json.status, 'ok');

  // Le reste de la réponse n'a pas bougé : on n'a pas cassé l'indicateur en
  // l'allégeant.
  assert.ok(sante.json.monitoring, 'le bloc de remontée des erreurs est toujours là');
  assert.ok('incidents24h' in sante.json.monitoring, 'le nombre d’incidents reste sondable');
  assert.ok(sante.json.limitation, 'la limitation de débit reste annoncée');
  assert.ok('commit' in sante.json, 'le commit servi reste exposé : sans lui, rien n’est prouvable');
}

// ---------------------------------------------------------------------------
// 3. La règle du compteur : jamais un faux zéro.
// ---------------------------------------------------------------------------
{
  serverDb.inMemoryProducts = [] as never[];
  const vide = await serverDb.compterProduitsActifs();
  assert.equal(vide.compte, 0, 'un catalogue vide compte zéro — et c’est un vrai zéro');
  assert.equal(vide.source, 'memoire', 'la source distingue « zéro lu » de « rien à compter »');

  serverDb.inMemoryProducts = [
    fiche(ACTIF_1),
    fiche(ACTIF_2),
    fiche(ACTIF_3),
    fiche(INACTIF, { is_active: false })
  ] as never[];
}
