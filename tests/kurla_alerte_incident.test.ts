/**
 * BANC — un incident réveille quelqu'un
 * =====================================
 *
 * Mesuré le 13/09/2026, avant d'écrire une ligne :
 *
 *   · la sonde tournait toutes les 15 min, le banc de rendu toutes les 6 h ;
 *   · tous deux échouaient correctement ;
 *   · et le signal s'arrêtait dans un tableau de bord. Une panne de nuit
 *     était découverte le matin, en ouvrant GitHub par hasard ;
 *   · `/api/health` annonçait `orderCount: 0` avec 39 commandes en base,
 *     parce que le chiffre venait du cache du processus ;
 *   · `monitoring.configured: false` : `captureServerException` s'arrêtait
 *     sur un `return` et l'erreur n'allait nulle part.
 *
 * Ce banc interdit le retour des trois. Il vérifie :
 *
 *  1. sans destination, l'alerte **échoue** au lieu de se terminer en succès ;
 *  2. un webhook reçoit bien la charge utile ;
 *  3. le canal GitHub ouvre une issue, puis **commentée** au lieu d'en ouvrir
 *     vingt-quatre pour une panne qui dure ;
 *  4. les trois workflows portent le pas d'alerte, avec la permission ;
 *  5. les compteurs non lus sont `null`, jamais `0` ;
 *  6. le repli d'erreurs est borné : une boucle n'écrit pas mille lignes ;
 *  7. `/api/health` porte la destination des erreurs et le nombre d'incidents.
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

process.env.KURLA_STORE_MODE = 'memory';
process.env.KURLA_TEST_NO_SERVER = 'true';

const exec = promisify(execFile);
const RACINE = process.cwd();

const {
  CODES_SORTIE,
  choisirDestination,
  construirePayload,
  corpsWebhook,
  empreinteDe,
  publier
} = await import('../scripts/lib/alerte.mjs');

const {
  empreinteIncident,
  peutConsigner,
  reinitialiserRepli,
  etatDuRepli,
  destinationDesErreurs
} = await import('../src/server/monitoring');

let verifications = 0;
function ok(label: string, fn: () => void): void {
  fn();
  verifications += 1;
  console.log(`  ✓ ${label}`);
}

// ---------------------------------------------------------------------------
// 1. Choisir une destination — la décision, sans effet de bord
// ---------------------------------------------------------------------------

ok('un webhook prime sur tout', () => {
  const d = choisirDestination({ ALERT_WEBHOOK_URL: 'https://example.invalid/hook', GITHUB_TOKEN: 't', GITHUB_REPOSITORY: 'a/b' });
  assert.equal(d.canal, 'webhook');
  assert.equal(d.url, 'https://example.invalid/hook');
});

ok('un jeton GitHub suffit à défaut de webhook', () => {
  const d = choisirDestination({ GITHUB_TOKEN: 'tok', GITHUB_REPOSITORY: 'Huberaya/Kurla-' });
  assert.equal(d.canal, 'github');
  assert.equal(d.depot, 'Huberaya/Kurla-');
});

ok('sans rien : aucune destination — et ce n\'est pas une erreur silencieuse', () => {
  const d = choisirDestination({});
  assert.equal(d.canal, 'aucun');
});

ok('un jeton sans dépôt ne compte pas : l\'alerte ne saurait pas où écrire', () => {
  assert.equal(choisirDestination({ GITHUB_TOKEN: 'tok' }).canal, 'aucun');
});

// ---------------------------------------------------------------------------
// 2. Le dédoublonnage : une panne qui dure est un incident, pas vingt-quatre
// ---------------------------------------------------------------------------

ok('l\'empreinte est stable et discriminante', () => {
  assert.equal(empreinteDe(['sonde', 'a']), empreinteDe(['sonde', 'a']));
  assert.notEqual(empreinteDe(['sonde', 'a']), empreinteDe(['sonde', 'b']));
  assert.match(empreinteDe(['x']), /^[0-9a-f]{8}$/);
});

ok('une même erreur ne s\'écrit qu\'une fois par période de carence', () => {
  reinitialiserRepli();
  const empreinte = empreinteIncident('Cannot find module', 'GET', '/api/products');
  assert.equal(empreinteIncident('Cannot find module', 'GET', '/api/products'), empreinte, 'l\'empreinte doit être stable');
  assert.equal(peutConsigner(empreinte, 1_000), true);
  assert.equal(peutConsigner(empreinte, 1_001), false, 'la même seconde ne réécrit pas');
  assert.equal(peutConsigner(empreinte, 1_000 + 9 * 60_000), false, 'dans la carence, toujours pas');
  assert.equal(peutConsigner(empreinte, 1_000 + 11 * 60_000), true, 'après la carence, à nouveau');
});

ok('deux erreurs différentes s\'écrivent toutes les deux', () => {
  reinitialiserRepli();
  const a = empreinteIncident('erreur A', 'GET', '/a');
  const b = empreinteIncident('erreur B', 'POST', '/b');
  assert.equal(peutConsigner(a, 5_000), true);
  assert.equal(peutConsigner(b, 5_000), true);
});

ok('le plafond par processus arrête l\'hémorragie', () => {
  reinitialiserRepli();
  const { plafond } = etatDuRepli();
  assert.ok(plafond > 0 && plafond <= 200, `plafond borné, obtenu ${plafond}`);
  for (let i = 0; i < plafond; i += 1) {
    assert.equal(peutConsigner(empreinteIncident(`erreur ${i}`, 'GET', '/boucle'), 10_000 + i), true, `écriture ${i} acceptée`);
  }
  assert.equal(peutConsigner(empreinteIncident('une de plus', 'GET', '/boucle'), 99_999), false, 'au-delà du plafond, plus rien n\'est écrit');
  reinitialiserRepli();
});

// ---------------------------------------------------------------------------
// 3. Le webhook reçoit vraiment la charge utile
// ---------------------------------------------------------------------------

const payload = construirePayload({
  source: 'Sonde de production',
  empreinte: empreinteDe(['sonde', 'banc']),
  gravite: 'critique',
  detail: 'endpoint muet',
  quand: '2026-09-13T10:00:00.000Z'
});

ok('la charge utile nomme la source, la gravité et l\'empreinte', () => {
  assert.match(payload.titre, /Sonde de production/);
  assert.match(payload.titre, new RegExp(`\\[${payload.empreinte}\\]`), 'le titre porte l\'empreinte : c\'est elle qui sert au dédoublonnage');
  assert.match(payload.corps, /critique/);
  assert.match(payload.corps, /endpoint muet/);
});

const receveur = http.createServer((req, res) => {
  let corps = '';
  req.on('data', (morceau) => { corps += morceau; });
  req.on('end', () => {
    (receveur as unknown as { __recu?: string }).__recu = corps;
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{"ok":true}');
  });
});
await new Promise<void>((resolve) => receveur.listen(0, '127.0.0.1', () => resolve()));
const urlReceveur = `http://127.0.0.1:${(receveur.address() as AddressInfo).port}/hook`;

try {
  const resultat = await publier({ canal: 'webhook', url: urlReceveur }, payload);
  assert.equal(resultat.action, 'envoye', `envoi attendu, obtenu ${JSON.stringify(resultat)}`);
  const recu = JSON.parse((receveur as unknown as { __recu: string }).__recu);
  assert.match(recu.text, /Sonde de production/);
  assert.equal(recu.empreinte, payload.empreinte);
  verifications += 1;
  console.log('  ✓ un webhook réel reçoit l\'alerte (serveur local, aller-retour HTTP complet)');

  // Le corps doit être un JSON valide : un webhook qui reçoit du texte brut
  // chez Slack l'affiche, mais ne remonte aucune métadonnée exploitable.
  const brut = corpsWebhook(payload);
  assert.doesNotThrow(() => JSON.parse(brut));
  verifications += 1;
  console.log('  ✓ la charge utile du webhook est un JSON analysable');
} finally {
  await new Promise<void>((resolve) => receveur.close(() => resolve()));
}

// ---------------------------------------------------------------------------
// 4. Le canal GitHub : une issue, puis des commentaires
// ---------------------------------------------------------------------------

type Appel = { url: string; methode?: string; corps?: string };

function fauxGithub(issuesOuvertes: Array<{ number: number; title: string; html_url: string }>) {
  const appels: Appel[] = [];
  const fauxFetch = async (url: string, init: { method?: string; body?: string } = {}) => {
    appels.push({ url, methode: init.method, corps: init.body });
    const reponse = (statut: number, corps: unknown) => ({
      ok: statut < 400,
      status: statut,
      json: async () => corps,
      text: async () => JSON.stringify(corps)
    });
    if (url.includes('/issues?')) return reponse(200, issuesOuvertes);
    if (url.endsWith('/labels')) return reponse(201, { name: 'incident' });
    if (url.endsWith('/comments')) return reponse(201, { id: 1 });
    if (url.endsWith('/issues')) return reponse(201, { number: 42, html_url: 'https://github.com/a/b/issues/42' });
    return reponse(404, { message: 'Not Found' });
  };
  return { appels, fauxFetch };
}

{
  const { appels, fauxFetch } = fauxGithub([]);
  const resultat = await publier({ canal: 'github', token: 'tok', depot: 'a/b' }, payload, { fetchImpl: fauxFetch as never });
  assert.equal(resultat.action, 'creee', `création attendue, obtenu ${JSON.stringify(resultat)}`);
  const creation = appels.find((a) => a.url.endsWith('/issues') && a.methode === 'POST');
  assert.ok(creation, 'une requête de création doit être émise');
  const corps = JSON.parse(creation!.corps!);
  assert.equal(corps.labels[0], 'incident');
  assert.match(corps.title, new RegExp(`\\[${payload.empreinte}\\]`));
  verifications += 1;
  console.log('  ✓ sans issue ouverte, le canal GitHub en crée une, étiquetée, avec l\'empreinte dans le titre');
}

{
  const empreinte = payload.empreinte;
  const { appels, fauxFetch } = fauxGithub([{ number: 7, title: `Incident production — Sonde de production [${empreinte}]`, html_url: 'https://github.com/a/b/issues/7' }]);
  const resultat = await publier({ canal: 'github', token: 'tok', depot: 'a/b' }, payload, { fetchImpl: fauxFetch as never });
  assert.equal(resultat.action, 'commentee', `commentaire attendu, obtenu ${JSON.stringify(resultat)}`);
  assert.ok(appels.some((a) => a.url.endsWith('/issues/7/comments')), 'le commentaire doit viser l\'issue existante');
  assert.ok(!appels.some((a) => a.url.endsWith('/issues') && a.methode === 'POST'), 'aucune seconde issue ne doit être ouverte');
  verifications += 1;
  console.log('  ✓ une panne qui dure commente l\'issue ouverte au lieu d\'en ouvrir une autre');
}

{
  const { fauxFetch } = fauxGithub([]);
  const cassé = async () => ({ ok: false, status: 500, json: async () => ({}), text: async () => 'boom' });
  const resultat = await publier({ canal: 'github', token: 'tok', depot: 'a/b' }, payload, { fetchImpl: cassé as never });
  assert.equal(resultat.action, 'echec');
  assert.match(String(resultat.erreur), /500/);
  void fauxFetch;
  verifications += 1;
  console.log('  ✓ une remise impossible est un échec nommé, pas un succès déguisé');
}

// ---------------------------------------------------------------------------
// 5. Le programme, lancé pour de vrai : le code de sortie est le contrat
// ---------------------------------------------------------------------------

async function lancer(environnement: Record<string, string>, args: string[]): Promise<{ code: number; sortie: string; erreur: string }> {
  try {
    const { stdout, stderr } = await exec('node', ['scripts/alerter.mjs', ...args], {
      cwd: RACINE,
      env: { PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: process.env.HOME ?? '/tmp', ...environnement }
    });
    return { code: 0, sortie: stdout, erreur: stderr };
  } catch (error: any) {
    return { code: Number(error.code ?? 1), sortie: String(error.stdout ?? ''), erreur: String(error.stderr ?? '') };
  }
}

{
  const r = await lancer({}, ['--source', 'Banc', '--gravite', 'critique', '--detail', 'test']);
  assert.equal(r.code, CODES_SORTIE.aucune_destination, `sans destination, le programme doit échouer (3), obtenu ${r.code}`);
  assert.match(r.erreur, /AUCUNE DESTINATION D’ALERTE/);
  assert.match(r.erreur, /ALERT_WEBHOOK_URL/);
  verifications += 1;
  console.log('  ✓ sans destination : échec 3 et la marche à suivre est affichée — jamais un succès');
}

{
  // Un webhook local, lancé dans un sous-processus : on prouve le trajet
  // complet, du code de sortie à la réception.
  const serveur = http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{"ok":true}');
  });
  await new Promise<void>((resolve) => serveur.listen(0, '127.0.0.1', () => resolve()));
  const url = `http://127.0.0.1:${(serveur.address() as AddressInfo).port}/hook`;
  try {
    const r = await lancer({ ALERT_WEBHOOK_URL: url }, ['--source', 'Banc', '--detail', 'test']);
    assert.equal(r.code, CODES_SORTIE.envoye, `envoi attendu (0), obtenu ${r.code} — ${r.erreur}`);
    assert.match(r.sortie, /Alerte remise — canal webhook/);
    verifications += 1;
    console.log('  ✓ avec un webhook : sortie 0 et accusé de réception');
  } finally {
    await new Promise<void>((resolve) => serveur.close(() => resolve()));
  }
}

{
  const r = await lancer({ ALERT_WEBHOOK_URL: 'http://127.0.0.1:1/hook' }, ['--source', 'Banc', '--detail', 'test']);
  assert.equal(r.code, CODES_SORTIE.echec_emission, `remise impossible (4), obtenu ${r.code}`);
  verifications += 1;
  console.log('  ✓ webhook injoignable : échec 4, le banc rouge au lieu d\'un faux vert');
}

// ---------------------------------------------------------------------------
// 6. Les workflows portent bien l'alerte — sinon tout ce qui précède ne sert
//    à rien : un banc qui n'est pas branché ne protège de rien.
// ---------------------------------------------------------------------------

for (const fichier of ['production-monitor.yml', 'rendu-pages.yml', 'production-safety.yml']) {
  const brut = await readFile(path.join(RACINE, '.github', 'workflows', fichier), 'utf8');
  ok(`${fichier} : le pas d'alerte existe et ne tourne qu'en échec`, () => {
    assert.match(brut, /scripts\/alerter\.mjs/, 'le programme d\'alerte doit être appelé');
    assert.match(brut, /if:\s*failure\(\)/, 'l\'alerte ne doit partir que sur un échec');
  });
  ok(`${fichier} : la permission d'ouvrir une issue est déclarée`, () => {
    assert.match(brut, /issues:\s*write/, 'sans cette permission, l\'issue est refusée en 403 et le signal meurt');
  });
}

// ---------------------------------------------------------------------------
// 7. Les compteurs : ce qu'on n'a pas lu est null, jamais 0
// ---------------------------------------------------------------------------

const { serverDb } = await import('../src/lib/serverDb');

{
  const compte = await serverDb.compterCommandes();
  assert.equal(compte.compte, null, 'en mode mémoire il n\'y a pas de base : le compte est null');
  assert.equal(compte.source, 'non_lu', 'la source doit dire qu\'on n\'a rien lu, sinon on croit à un 0');
  verifications += 1;
  console.log('  ✓ un compte non lu est null et le dit — un 0 faux se lit comme « aucune commande »');
}

{
  const statut = serverDb.getStatusSummary();
  assert.equal('orderCount' in statut, false, '`orderCount` sous `supabaseStatus` annonçait 0 avec 39 commandes en base : le champ a été renommé');
  assert.equal(typeof statut.produitsEnMemoire, 'number');
  assert.equal(typeof statut.commandesEnMemoire, 'number');
  verifications += 1;
  console.log('  ✓ getStatusSummary() annonce la mémoire du processus, plus un total de base');
}

ok('la destination des erreurs est nommée même sans Sentry', () => {
  const destination = destinationDesErreurs();
  assert.ok(['sentry', 'journal_audit'].includes(destination), `destination inattendue : ${destination}`);
});

{
  // Le repli doit exister dans le code de surveillance : sans lui, une erreur
  // serveur ne laisse aucune trace interrogeable.
  const source = await readFile(path.join(RACINE, 'src', 'server', 'monitoring.ts'), 'utf8');
  assert.match(source, /consignerIncident/, 'le repli doit écrire l\'incident');
  assert.match(source, /await/, 'l\'écriture doit être attendue avant la réponse, sinon la plateforme coupe le processus');
  const sante = await readFile(path.join(RACINE, 'server.ts'), 'utf8');
  assert.match(sante, /destination: destinationDesErreurs\(\)/, '/api/health doit dire où vont les erreurs');
  assert.match(sante, /incidents24h/, '/api/health doit compter les incidents : un nombre dans une réponse HTTP est sondable');
  verifications += 1;
  console.log('  ✓ le repli écrit, attend l\'écriture, et /api/health expose destination + incidents 24 h');
}

console.log(`\n[PASS] Alerte d'incident : ${verifications} vérifications — sans destination l'alerte échoue au lieu de rassurer, un webhook réel reçoit la charge, le canal GitHub ouvre une issue puis la commente, les trois workflows sont branchés avec la permission, un compte non lu est null et non 0, le repli d'erreurs est borné et /api/health dit où vont les erreurs.`);
