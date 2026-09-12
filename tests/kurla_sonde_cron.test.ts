import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { readFile } from 'node:fs/promises';

/**
 * Le cron de sonde horaire.
 *
 * Ce banc existe pour une propriété précise : **une sonde qui échoue ne répond
 * jamais 200.** C'est la leçon du 11/09/2026 — les notifications push
 * échouaient dans un `.catch` qui se contentait d'une ligne de journal, et la
 * fonctionnalité a paru marcher pendant des jours. Ici le signal est le statut
 * HTTP, donc Vercel classe l'invocation en échec.
 *
 * Couvert :
 *  1. sans `CRON_SECRET`, 503 et non une exécution publique ;
 *  2. mauvais secret, 401 ;
 *  3. sans `VITE_APP_URL`, 503 en nommant la variable — pas un « tout va bien » ;
 *  4. production injoignable → **500**, avec les routes en erreur nommées ;
 *  5. production saine → 200, compteurs et résumé cohérents ;
 *  6. GARDE : `vercel.json` déclare bien le cron, sur le chemin de la route.
 */

process.env.KURLA_STORE_MODE = 'memory';
process.env.KURLA_TEST_NO_SERVER = 'true';
delete process.env.CRON_SECRET;
delete process.env.VITE_APP_URL;

const { app } = await import('../server');
const listener = http.createServer(app);
await new Promise<void>((resolve, reject) => {
  listener.once('listening', () => resolve());
  listener.once('error', reject);
  listener.listen(0, '127.0.0.1');
});
const { port } = listener.address() as AddressInfo;
const base = `http://127.0.0.1:${port}`;

// Production factice mais saine : tout répond, rien n'est vide.
const saine = http.createServer((req, res) => {
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ ok: true, id: 'produit-sain', items: [1, 2, 3], count: 3 }));
});
await new Promise<void>(resolve => saine.listen(0, '127.0.0.1', resolve));
const baseSaine = `http://127.0.0.1:${(saine.address() as AddressInfo).port}`;

const sonder = async (secret?: string) => {
  const headers: Record<string, string> = {};
  if (secret !== undefined) headers.authorization = `Bearer ${secret}`;
  const response = await fetch(`${base}/api/cron/sonde`, { headers });
  return { status: response.status, body: await response.json() as any };
};

try {
  // --- 1. Sans secret, pas d'exécution publique ---------------------------
  const sansSecret = await sonder();
  assert.equal(sansSecret.status, 503, `sans CRON_SECRET, attendu 503, reçu ${sansSecret.status}`);
  assert.equal(sansSecret.body.code, 'CRON_NOT_CONFIGURED');

  // --- 2. Mauvais secret --------------------------------------------------
  process.env.CRON_SECRET = 'secret-du-banc';
  const mauvais = await sonder('autre-secret');
  assert.equal(mauvais.status, 401, 'un secret erroné doit être refusé');
  const anonyme = await fetch(`${base}/api/cron/sonde`);
  assert.equal(anonyme.status, 401, 'un appel sans en-tête doit être refusé');

  // --- 3. Sans URL publique, le dire plutôt que rassurer ------------------
  delete process.env.VITE_APP_URL;
  const sansUrl = await sonder('secret-du-banc');
  assert.equal(sansUrl.status, 503, `sans VITE_APP_URL, attendu 503, reçu ${sansUrl.status}`);
  assert.equal(sansUrl.body.code, 'APP_URL_MISSING');
  assert.match(sansUrl.body.note || '', /VITE_APP_URL/, 'la réponse doit nommer la variable manquante');

  // --- 4. Production injoignable : 500, jamais 200 ------------------------
  // Port 1 : rien n'écoute. Chaque route tombe en erreur réseau.
  process.env.VITE_APP_URL = 'http://127.0.0.1:1';
  const tombee = await sonder('secret-du-banc');
  assert.equal(tombee.status, 500,
    `une production injoignable doit faire répondre 500, reçu ${tombee.status} — un 200 ici réintroduirait le silence`);
  assert.equal(tombee.body.ok, false);
  assert.ok(tombee.body.compteurs.erreurs > 0, 'les erreurs doivent être comptées');
  assert.ok(Array.isArray(tombee.body.erreurs) && tombee.body.erreurs.length > 0,
    'les routes en erreur doivent être nommées, pas seulement comptées');
  assert.ok(tombee.body.erreurs.every((e: any) => typeof e.chemin === 'string' && e.chemin.startsWith('/api/')),
    'chaque erreur doit porter son chemin');

  // --- 5. Production saine : 200 et compteurs cohérents -------------------
  process.env.VITE_APP_URL = baseSaine;
  const saineReponse = await sonder('secret-du-banc');
  assert.equal(saineReponse.status, 200,
    `une production saine doit répondre 200, reçu ${saineReponse.status} : ${JSON.stringify(saineReponse.body).slice(0, 300)}`);
  assert.equal(saineReponse.body.ok, true);
  const c = saineReponse.body.compteurs;
  assert.equal(c.silences, 0);
  assert.equal(c.erreurs, 0);
  assert.ok(c.ok > 0, 'au moins une route doit être sondée');
  assert.match(saineReponse.body.resume, /^\d+ ok · \d+ silence\(s\) · /, 'le résumé doit suivre le format de resumer()');
  assert.equal(saineReponse.body.base, baseSaine, 'la réponse doit dire quelle production a été sondée');

  // --- 6. GARDE : le cron est déclaré, sur le chemin de la route ----------
  const vercel = JSON.parse(await readFile('vercel.json', 'utf8'));
  const cron = (vercel.crons || []).find((entry: any) => entry.path === '/api/cron/sonde');
  assert.ok(cron, 'vercel.json doit déclarer le cron /api/cron/sonde');
  assert.equal(cron.schedule, '0 8 * * *', 'quotidien : le plan Hobby rejette tout cron plus fréquent (mesuré le 12/09/2026)');
  // Le chemin doit exister : un cron qui vise une route absente renvoie 404 en
  // silence, ce qui est précisément le défaut que ce banc interdit.
  const routeInconnue = await fetch(`${base}/api/cron/sonde-inexistante`);
  assert.equal(routeInconnue.status, 404, 'une route de cron absente doit répondre 404, pas 200');
} finally {
  await new Promise<void>((resolve, reject) => listener.close(e => (e ? reject(e) : resolve())));
  await new Promise<void>(resolve => saine.close(() => resolve()));
}

console.log('[PASS] Cron de sonde : sans CRON_SECRET il refuse en 503, un secret erroné donne 401, sans VITE_APP_URL il nomme la variable manquante au lieu de rassurer, une production injoignable fait répondre 500 avec les routes nommées — jamais 200 —, une production saine répond 200 avec compteurs et résumé, et vercel.json déclare le cron horaire sur un chemin qui existe.');
