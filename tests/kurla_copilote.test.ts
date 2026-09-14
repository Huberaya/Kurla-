/**
 * COPILOTE — banc des chiffres de la plateforme.
 * ==============================================
 *
 * Demande du 15/09/2026 : un copilote qui donne les informations de la
 * plateforme (visites, inscriptions, ventes…). Ce banc ne vérifie pas
 * l'esthétique du panneau : il vérifie la seule propriété qui rend ce genre
 * d'écran digne de confiance — **il n'invente rien**.
 *
 * Trois contrats, et le troisième est le plus facile à trahir :
 *
 *   1. les comptes sont justes, et les commandes « réglées » excluent les
 *      sessions Stripe en attente (`payment_pending_webhook`) ;
 *   2. un indicateur à zéro est annoncé `aucun`, avec une lecture qui dit ce
 *      que ce zéro signifie — un zéro affiché sans explication se lit comme
 *      une panne, alors qu'il peut être un fait ;
 *   3. **jamais un 0 à la place d'un chiffre non lu.** Un indicateur non
 *      mesurable porte `valeur: null`, et c'est le seul état où `valeur` est
 *      nul. C'est la règle du module des incidents, appliquée ici à un
 *      tableau de bord.
 *
 * Ce banc exerce aussi la route, y compris sa garde : un copilote qui expose
 * le trafic et les ventes ne doit répondre qu'à un administrateur.
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

process.env.KURLA_TEST_NO_SERVER = 'true';
process.env.NODE_ENV = 'test';
process.env.KURLA_TEST_AUTH_TOKEN = 'jeton-de-banc-copilote';
process.env.KURLA_TEST_AUTH_ROLE = 'admin';

const { serverDb } = await import('../src/lib/serverDb');
const serverModule = await import('../server');

const JETON = 'jeton-de-banc-copilote';
const maintenant = Date.now();
const il_y_a = (jours: number) => new Date(maintenant - jours * 24 * 60 * 60 * 1000).toISOString();

function evenement(id: string, eventName: string, sessionId: string, jours = 1) {
  return {
    id,
    eventName,
    sessionId,
    path: '/',
    props: {},
    occurredAt: il_y_a(jours)
  };
}

async function requestApp(path: string, options: { jeton?: string } = {}) {
  const listener = http.createServer(serverModule.app);
  await new Promise<void>(resolve => listener.listen(0, '127.0.0.1', () => resolve()));
  const port = (listener.address() as AddressInfo).port;
  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      headers: options.jeton ? { Authorization: `Bearer ${options.jeton}` } : undefined
    });
    const texte = await response.text();
    let json: any = null;
    try { json = JSON.parse(texte); } catch { json = null; }
    return { status: response.status, json };
  } finally {
    await new Promise<void>(resolve => listener.close(() => resolve()));
  }
}

const indicateur = (pouls: any, id: string) =>
  pouls.indicateurs.find((item: any) => item.id === id);

// ---------------------------------------------------------------------------
// 1. Les comptes, et la distinction « commande » / « commande réglée »
// ---------------------------------------------------------------------------
{
  serverDb.inMemoryGrowthFunnelEvents = [
    evenement('e1', 'page_view', 'session-a'),
    evenement('e2', 'page_view', 'session-a'),
    evenement('e3', 'page_view', 'session-b'),
    evenement('e4', 'diagnostic_start', 'session-a'),
    evenement('e5', 'diagnostic_start', 'session-b'),
    evenement('e6', 'diagnostic_complete', 'session-a'),
    evenement('e7', 'sign_up', 'session-a'),
    evenement('e8', 'add_to_cart', 'session-b'),
    evenement('e9', 'purchase', 'session-b'),
    // Hors période : ne doit pas être compté.
    evenement('e10', 'page_view', 'session-z', 400)
  ] as never[];

  serverDb.inMemoryOrders = [
    { id: 'c1', status: 'paid', total: 20 } as never,
    { id: 'c2', status: 'payment_pending_webhook', total: 15 } as never,
    { id: 'c3', status: 'payment_pending_webhook', total: 15 } as never
  ];

  const pouls = await serverDb.lirePoulsPlateforme({ jours: 30 });

  assert.equal(indicateur(pouls, 'visites').valeur, 3, 'trois pages vues dans la période (la quatrième est hors période)');
  assert.equal(indicateur(pouls, 'sessions').valeur, 2, 'deux sessions distinctes');
  assert.equal(indicateur(pouls, 'inscriptions').valeur, 1);
  assert.equal(indicateur(pouls, 'diagnostics').valeur, 1, 'un diagnostic terminé');
  assert.equal(indicateur(pouls, 'paniers').valeur, 1);
  assert.equal(indicateur(pouls, 'achats').valeur, 1);

  const commandes = indicateur(pouls, 'commandes');
  assert.equal(commandes.valeur, 3, 'trois commandes en base');
  assert.match(
    commandes.lecture,
    /1 réellement réglées/,
    'sur trois commandes, une seule est réglée : les deux autres attendent le webhook'
  );
  assert.ok(
    pouls.lecture.some((ligne: string) => /1 commande\(s\) réglée\(s\) sur 3/.test(ligne)),
    'la lecture d’ensemble doit dire qu’une seule commande sur trois est réglée'
  );
}

// ---------------------------------------------------------------------------
// 2. L'invariant d'honnêteté : état et valeur ne se contredisent jamais
// ---------------------------------------------------------------------------
{
  const pouls = await serverDb.lirePoulsPlateforme({ jours: 30 });
  for (const item of pouls.indicateurs) {
    if (item.etat === 'non_mesurable') {
      assert.equal(item.valeur, null, `« ${item.label} » est non mesurable : sa valeur doit être nulle, jamais 0`);
      assert.match(item.lecture, /Lecture impossible/);
    } else if (item.etat === 'aucun') {
      assert.equal(item.valeur, 0, `« ${item.label} » annoncé « aucun » doit valoir 0`);
      assert.ok(item.lecture.length > 20, `« ${item.label} » à zéro doit expliquer ce que ce zéro veut dire`);
    } else {
      assert.ok((item.valeur as number) > 0, `« ${item.label} » mesuré doit valoir plus de 0`);
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Le zéro est un fait, pas une panne : il est annoncé et expliqué
// ---------------------------------------------------------------------------
{
  serverDb.inMemoryGrowthFunnelEvents = [] as never[];
  serverDb.inMemoryOrders = [] as never[];

  const pouls = await serverDb.lirePoulsPlateforme({ jours: 30 });

  assert.equal(indicateur(pouls, 'visites').etat, 'aucun');
  assert.equal(indicateur(pouls, 'visites').valeur, 0, 'un zéro réel s’affiche, il n’est pas masqué');
  assert.match(
    indicateur(pouls, 'inscriptions').lecture,
    /personne ne s’est inscrit/,
    'un zéro d’inscription doit dire qu’il ne s’agit pas d’un suivi cassé'
  );
  assert.equal(
    pouls.lecture.length,
    0,
    'sans données mesurées, aucune lecture automatique : on ne commente pas du vide'
  );

  // Le compte des profils n'existe pas en mémoire : il doit être déclaré non
  // mesurable plutôt qu'affiché à zéro.
  const comptes = indicateur(pouls, 'comptes');
  assert.equal(comptes.etat, 'non_mesurable');
  assert.equal(comptes.valeur, null, 'un compte qu’on n’a pas lu est null, jamais 0');
}

// ---------------------------------------------------------------------------
// 4. La route : gardée, et elle rend ce que le store a lu
// ---------------------------------------------------------------------------
{
  serverDb.inMemoryGrowthFunnelEvents = [
    evenement('r1', 'page_view', 'session-route'),
    evenement('r2', 'page_view', 'session-route')
  ] as never[];

  const sansJeton = await requestApp('/api/admin/copilote');
  assert.equal(sansJeton.status, 401, 'le copilote n’est pas public');

  process.env.KURLA_TEST_AUTH_ROLE = 'customer';
  const client = await requestApp('/api/admin/copilote', { jeton: JETON });
  assert.equal(client.status, 403, 'un compte client n’accède pas au copilote');

  process.env.KURLA_TEST_AUTH_ROLE = 'admin';
  const admin = await requestApp('/api/admin/copilote', { jeton: JETON });
  assert.equal(admin.status, 200);
  assert.equal(indicateur(admin.json, 'visites').valeur, 2);
  assert.equal(indicateur(admin.json, 'achats').etat, 'aucun', 'aucun achat : dit comme tel');
  assert.ok(Array.isArray(admin.json.neFaitPas) && admin.json.neFaitPas.length >= 3,
    'la route doit rappeler ce qu’elle ne fait pas');
  assert.equal(admin.json.periodeJours, 30);

  const septJours = await requestApp('/api/admin/copilote?jours=7', { jeton: JETON });
  assert.equal(septJours.status, 200);
  assert.equal(septJours.json.periodeJours, 7, 'la période demandée est respectée');
}

console.log(
  `[PASS] Copilote : comptes justes (visites, sessions, diagnostics, inscriptions, panier, achats), ` +
  `commandes réglées distinguées des sessions Stripe en attente, invariant d’honnêteté tenu ` +
  `(jamais un 0 à la place d’un chiffre non lu), zéro annoncé et expliqué, route gardée (401 nu, 403 client, 200 admin).`
);
