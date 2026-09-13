/**
 * BANC — la limitation de débit compte par visiteur, et ne se contourne pas
 * =========================================================================
 *
 * Mesuré en production le 13/09/2026, avant d'écrire une ligne :
 *
 *   · 21 requêtes vers `/api/coupons/validate` (limite annoncée : 20/min)
 *     sous une même adresse déclarée → 1 seul 429, le 21ᵉ. Le compteur
 *     fonctionne.
 *   · puis **une** requête avec une adresse déclarée différente → **encore
 *     429**.
 *
 * La clé n'était donc pas celle du visiteur : `TRUST_PROXY` valant `false`,
 * `req.ip` renvoyait l'adresse du proxy Vercel. **Un seul seau pour toute la
 * planète.** Conséquences : 300 requêtes/min pour l'ensemble des visiteurs
 * sur `/api`, et 20/min sur la création de session de paiement — une seule
 * machine peut bloquer tous les paiements du site, une minute à la fois.
 *
 * La correction ne devait pas ouvrir la porte d'à-côté : se fier à la
 * **première** entrée de `X-Forwarded-For`, c'est permettre à n'importe qui
 * de changer de seau à chaque requête en falsifiant un en-tête. D'où l'ordre
 * retenu, et les tests ci-dessous.
 *
 * Ce que ce banc interdit :
 *   1. compter tout le monde dans le même seau ;
 *   2. croire une adresse déclarée par le client ;
 *   3. laisser fuir la mémoire d'un processus longue durée.
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import type { Request } from 'express';

process.env.KURLA_STORE_MODE = 'memory';
process.env.KURLA_TEST_NO_SERVER = 'true';

const {
  adresseClient,
  rateLimit,
  rateLimitBuckets,
  SEUIL_PURGE
} = await import('../src/server/http');

let verifications = 0;
function ok(label: string, fn: () => void): void {
  fn();
  verifications += 1;
  console.log(`  ✓ ${label}`);
}

function requete(headers: Record<string, string>, ip = '10.0.0.1'): Request {
  return { headers, ip, socket: { remoteAddress: ip } } as unknown as Request;
}

// ---------------------------------------------------------------------------
// 1. L'ordre des sources
// ---------------------------------------------------------------------------

ok('x-real-ip prime : c\'est la plateforme qui le pose, pas le client', () => {
  const r = adresseClient(requete({ 'x-real-ip': '203.0.113.9', 'x-forwarded-for': '1.2.3.4' }));
  assert.equal(r.cle, '203.0.113.9');
  assert.equal(r.source, 'x-real-ip');
});

ok('sans x-real-ip, la DERNIÈRE entrée de x-forwarded-for : celle que notre proxy a vue', () => {
  const r = adresseClient(requete({ 'x-forwarded-for': '1.2.3.4, 198.51.100.7, 203.0.113.9' }));
  assert.equal(r.cle, '203.0.113.9');
  assert.equal(r.source, 'x-forwarded-for');
});

ok('sans en-tête de plateforme, repli sur la socket — en le disant', () => {
  const r = adresseClient(requete({}, '10.0.0.1'));
  assert.equal(r.cle, '10.0.0.1');
  assert.equal(r.source, 'socket', 'le repli doit être identifiable : derrière un proxy, il est partagé');
});

ok('une même adresse donne une même clé, quelle que soit sa forme', () => {
  const a = adresseClient(requete({ 'x-real-ip': '203.0.113.9:51234' })).cle;
  const b = adresseClient(requete({ 'x-real-ip': '203.0.113.9' })).cle;
  assert.equal(a, b, 'le port d\'origine n\'identifie pas un client');
  assert.equal(adresseClient(requete({ 'x-real-ip': '[::1]' })).cle, '::1');
  assert.equal(adresseClient(requete({ 'x-real-ip': 'AbCd::0001' })).cle, 'abcd::0001');
});

// ---------------------------------------------------------------------------
// 2. Le contournement : changer d'adresse déclarée ne change pas de seau
// ---------------------------------------------------------------------------

ok('falsifier x-forwarded-for ne change pas de seau (x-real-ip fait foi)', () => {
  const fixe = adresseClient(requete({ 'x-real-ip': '203.0.113.9', 'x-forwarded-for': '1.1.1.1' })).cle;
  const falsifiee = adresseClient(requete({ 'x-real-ip': '203.0.113.9', 'x-forwarded-for': '9.9.9.9' })).cle;
  assert.equal(fixe, falsifiee);
});

ok('à défaut de x-real-ip, falsifier la chaîne ne change pas la dernière entrée', () => {
  const a = adresseClient(requete({ 'x-forwarded-for': '1.1.1.1, 203.0.113.9' })).cle;
  const b = adresseClient(requete({ 'x-forwarded-for': '2.2.2.2, 8.8.8.8, 203.0.113.9' })).cle;
  assert.equal(a, b, 'ce que le client déclare à gauche ne doit pas compter');
});

// ---------------------------------------------------------------------------
// 3. Le garde-fou de régression : deux visiteurs, deux seaux
// ---------------------------------------------------------------------------

const app = express();
app.get('/limite', rateLimit('banc-limite', 3, 60_000), (_req, res) => res.json({ ok: true }));
const serveur = http.createServer(app);
await new Promise<void>((resolve) => serveur.listen(0, '127.0.0.1', () => resolve()));
const base = `http://127.0.0.1:${(serveur.address() as AddressInfo).port}`;

const appeler = async (adresse: string, supplementaires: Record<string, string> = {}) => {
  const reponse = await fetch(`${base}/limite`, { headers: { 'x-real-ip': adresse, ...supplementaires } });
  return reponse.status;
};

try {
  rateLimitBuckets.clear();

  const codesA: number[] = [];
  for (let i = 0; i < 4; i += 1) codesA.push(await appeler('198.51.100.1'));
  assert.deepEqual(codesA, [200, 200, 200, 429], `la limite doit tomber au 4ᵉ appel, obtenu ${codesA.join(' ')}`);
  verifications += 1;
  console.log('  ✓ la limite tombe bien au-delà du seuil (3 appels, le 4ᵉ en 429)');

  // Même socket, autre adresse réelle : le seau doit être indépendant.
  const autreVisiteur = await appeler('198.51.100.2');
  assert.equal(autreVisiteur, 200, 'un second visiteur ne doit pas hériter du seau du premier — c\'est la panne mesurée en production');
  verifications += 1;
  console.log('  ✓ un second visiteur a son propre seau, malgré la même socket');

  // Le même visiteur qui falsifie x-forwarded-for reste limité.
  const falsifiee = await appeler('198.51.100.1', { 'x-forwarded-for': '1.2.3.4' });
  assert.equal(falsifiee, 429, 'changer d\'adresse déclarée ne doit pas rendre des essais');
  verifications += 1;
  console.log('  ✓ falsifier x-forwarded-for ne rend pas d\'essais : x-real-ip fait foi');

  assert.equal(await appeler('198.51.100.1'), 429, 'le premier visiteur reste limité');
  assert.equal(await appeler('198.51.100.3'), 200, 'un troisième visiteur passe');
  verifications += 1;
  console.log('  ✓ les seaux restent indépendants après coup');
} finally {
  await new Promise<void>((resolve) => serveur.close(() => resolve()));
}

// ---------------------------------------------------------------------------
// 4. La mémoire : un compteur par visiteur ne doit pas devenir une fuite
// ---------------------------------------------------------------------------

ok('les seaux expirés sont purgés au-delà du seuil', () => {
  rateLimitBuckets.clear();
  const maintenant = Date.now();
  for (let i = 0; i < SEUIL_PURGE + 10; i += 1) {
    rateLimitBuckets.set(`banc:fuite:${i}`, { count: 1, resetAt: maintenant - 1_000 });
  }
  rateLimitBuckets.set('banc:vivant', { count: 1, resetAt: maintenant + 60_000 });
  assert.ok(rateLimitBuckets.size > SEUIL_PURGE, 'le seuil doit être dépassé pour déclencher la purge');

  // Une requête suffit : le nettoyage se fait dans le middleware.
  const requeteDeTest = requete({ 'x-real-ip': '203.0.113.9' });
  const middleware = rateLimit('banc-purge', 1000, 60_000);
  middleware(requeteDeTest, { setHeader() {} } as never, (() => {}) as never);

  assert.ok(rateLimitBuckets.size <= SEUIL_PURGE, `${rateLimitBuckets.size} seaux après purge, attendu ≤ ${SEUIL_PURGE}`);
  assert.ok(rateLimitBuckets.has('banc:vivant'), 'un seau encore valide ne doit pas être purgé');
  rateLimitBuckets.clear();
});

// ---------------------------------------------------------------------------
// 5. /api/health dit quelle clé est utilisée — sinon la panne est invisible
// ---------------------------------------------------------------------------

const { app: application } = await import('../server');
const ecoute = http.createServer(application);
await new Promise<void>((resolve, reject) => {
  ecoute.once('listening', () => resolve());
  ecoute.once('error', reject);
  ecoute.listen(0, '127.0.0.1');
});

try {
  const reponse = await fetch(`http://127.0.0.1:${(ecoute.address() as AddressInfo).port}/api/health`);
  const corps = await reponse.json();
  assert.ok(corps.limitation, '/api/health doit dire comment le débit est limité');
  assert.equal(corps.limitation.source, 'socket', 'sans en-tête de plateforme, le repli est la socket — et doit être nommé comme tel');
  assert.equal(corps.limitation.partagee, false, 'tant qu\'aucun compteur partagé n\'existe, le dire au lieu de le laisser croire');
  assert.equal(typeof corps.limitation.seaux, 'number');
  verifications += 1;
  console.log('  ✓ /api/health rapporte la source de la clé et l\'absence de compteur partagé');
} finally {
  await new Promise<void>((resolve, reject) => ecoute.close((e) => (e ? reject(e) : resolve())));
}

console.log(`\n[PASS] Limitation par visiteur : ${verifications} vérifications — la clé vient de la plateforme et non du client, falsifier x-forwarded-for ne rend pas d'essais, deux visiteurs ont deux seaux malgré la même socket, les seaux expirés sont purgés, et /api/health dit quelle clé est employée.`);
