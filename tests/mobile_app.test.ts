/**
 * CHANTIER 8.7 — Application mobile (feature 42).
 *
 * Ce banc vérifie ce qu'un téléphone exige du produit, et ce que le produit
 * refuse d'être :
 *
 *   1. **Rien n'est inventé.** Une donnée absente produit une absence, jamais
 *      un bouche-trou. Sans préférence de lavage, pas d'item lavage.
 *   2. **Le brief est une liste courte, pas un backlog** — cinq items, deux
 *      invitations à déclarer un résultat, et le nombre d'invitations retenues
 *      est renvoyé, pas dissimulé.
 *   3. **Aucun item promotionnel.** L'union des types d'items est fermée : il
 *      n'existe pas de type « offre » ni « suggestion d'achat ».
 *   4. **Une action hors ligne se rejoue exactement une fois.** Le store ne
 *      réapplique jamais un identifiant client déjà connu, et la fidélité ne
 *      compte pas deux fois.
 *   5. **Le service worker ne met jamais /api/ en cache** et ne met rien en
 *      cache hors de son propre hôte : les données personnelles ne vont pas sur
 *      le disque pour un autre écran.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

process.env.KURLA_STORE_MODE = 'memory';
process.env.KURLA_TEST_NO_SERVER = 'true';

const {
  BRIEFING_ITEM_KINDS,
  BRIEFING_MAX_ITEMS,
  MAX_OUTCOME_PROMPTS,
  MIN_DAYS_BEFORE_OUTCOME,
  OFFLINE_ACTION_KINDS,
  OFFLINE_ACTION_TTL_DAYS,
  OFFLINE_QUEUE_MAX,
  buildDailyBriefing,
  drainOfflineQueue
} = await import('../src/lib/mobileShell');

const NOW = '2026-08-28T12:00:00.000Z';
const day = (daysAgo: number) => new Date(Date.parse(NOW) - daysAgo * 86_400_000).toISOString();

// ---------------------------------------------------------------------------
// 1. Rien n'est inventé : une base vide produit un brief vide
// ---------------------------------------------------------------------------
const empty = buildDailyBriefing({ now: NOW, washDay: null, routineTasks: [], shelf: [], loyalty: null });
assert.equal(empty.items.length, 0, 'aucune donnée : aucun item');
assert.equal(empty.held.outcomePrompts, 0);

// ---------------------------------------------------------------------------
// 2. Jour de lavage : échu seulement, pas « bientôt »
// ---------------------------------------------------------------------------
const washDue = buildDailyBriefing({
  now: NOW,
  washDay: { intervalDays: 7, lastWashDayAt: day(8) },
  routineTasks: [],
  shelf: [],
  loyalty: null
});
assert.equal(washDue.items[0].kind, 'wash_day', 'un cycle échu produit l’item lavage');
assert.ok(washDue.items[0].reason.includes('7'), 'la raison cite le cycle déclaré');

const washNotDue = buildDailyBriefing({
  now: NOW,
  washDay: { intervalDays: 7, lastWashDayAt: day(2) },
  routineTasks: [],
  shelf: [],
  loyalty: null
});
assert.equal(washNotDue.items.length, 0, 'un cycle non échu n’apparaît pas');

// ---------------------------------------------------------------------------
// 3. Routine : uniquement les tâches du jour, non faites
// ---------------------------------------------------------------------------
const routine = buildDailyBriefing({
  now: NOW,
  washDay: null,
  routineTasks: [
    { id: 't1', title: 'Masque profond', scheduledFor: NOW, status: 'pending' },
    { id: 't2', title: 'Fait hier', scheduledFor: NOW, status: 'completed' },
    { id: 't3', title: 'Demain', scheduledFor: day(-1), status: 'pending' }
  ],
  shelf: [],
  loyalty: null
});
assert.equal(routine.items.length, 1, 'une seule étape du jour, non faite');
assert.equal(routine.items[0].title, 'Masque profond');

// ---------------------------------------------------------------------------
// 4. Résultats à déclarer : bornés à deux, le reste est compté
// ---------------------------------------------------------------------------
const shelf = [
  { id: 's1', label: 'Shampoing doux', addedAt: day(30), status: 'in_use', hasDeclaredOutcome: false },
  { id: 's2', label: 'Masque', addedAt: day(25), status: 'in_use', hasDeclaredOutcome: false },
  { id: 's3', label: 'Huile', addedAt: day(20), status: 'in_use', hasDeclaredOutcome: false },
  { id: 's4', label: 'Récent', addedAt: day(3), status: 'in_use', hasDeclaredOutcome: false },
  { id: 's5', label: 'Déjà déclaré', addedAt: day(40), status: 'in_use', hasDeclaredOutcome: true }
];
const outcomes = buildDailyBriefing({ now: NOW, washDay: null, routineTasks: [], shelf, loyalty: null });
const promptCount = outcomes.items.filter(item => item.kind === 'outcome_declaration').length;
assert.equal(promptCount, MAX_OUTCOME_PROMPTS, 'deux invitations au maximum');
assert.equal(outcomes.held.outcomePrompts, 1, 'la troisième invitation est retenue et comptée');
assert.equal(
  outcomes.items.some(item => item.title.includes('Récent')),
  false,
  'un produit trop récent n’est pas relancé'
);
assert.equal(
  outcomes.items.some(item => item.title.includes('Déjà déclaré')),
  false,
  'un produit déjà déclaré n’est pas relancé'
);
assert.ok(
  outcomes.items.every(item => item.reason.includes('négatif') || item.kind !== 'outcome_declaration'),
  'l’invitation dit qu’un résultat négatif a la même valeur'
);

// ---------------------------------------------------------------------------
// 5. Fidélité : absente sans compte, muette au niveau maximal
// ---------------------------------------------------------------------------
const loyaltyNone = buildDailyBriefing({ now: NOW, washDay: null, routineTasks: [], shelf: [], loyalty: null });
assert.equal(loyaltyNone.items.length, 0, 'sans compte de fidélité, pas d’item fidélité');
const loyaltyMax = buildDailyBriefing({
  now: NOW,
  washDay: null,
  routineTasks: [],
  shelf: [],
  loyalty: { levelLabel: 'Niveau 5', pointsMissing: null }
});
assert.equal(loyaltyMax.items.length, 0, 'au niveau maximal, rien à annoncer');
const loyaltyProgress = buildDailyBriefing({
  now: NOW,
  washDay: null,
  routineTasks: [],
  shelf: [],
  loyalty: { levelLabel: 'Niveau 2', pointsMissing: 12 }
});
assert.equal(loyaltyProgress.items.length, 1);
assert.ok(
  loyaltyProgress.items[0].reason.includes('Aucun achat'),
  'l’item fidélité rappelle qu’acheter n’est pas nécessaire'
);

// ---------------------------------------------------------------------------
// 6. Bornes et ordre déterministe
// ---------------------------------------------------------------------------
const busy = buildDailyBriefing({
  now: NOW,
  washDay: { intervalDays: 7, lastWashDayAt: day(9) },
  routineTasks: [
    { id: 'a', title: 'Étape A', scheduledFor: NOW, status: 'pending' },
    { id: 'b', title: 'Étape B', scheduledFor: NOW, status: 'pending' }
  ],
  shelf,
  loyalty: { levelLabel: 'Niveau 1', pointsMissing: 5 }
});
assert.ok(busy.items.length <= BRIEFING_MAX_ITEMS, `au plus ${BRIEFING_MAX_ITEMS} items`);
const priorities = busy.items.map(item => item.priority);
assert.deepEqual([...priorities].sort((a, b) => a - b), priorities, 'ordre par priorité');

// ---------------------------------------------------------------------------
// 7. Union fermée, aucune promotion, aucun vocabulaire de preuve
// ---------------------------------------------------------------------------
for (const item of busy.items) {
  assert.ok(BRIEFING_ITEM_KINDS.includes(item.kind), `le type « ${item.kind} » est dans l’union fermée`);
}
assert.ok(!BRIEFING_ITEM_KINDS.includes('promotion' as never), 'il n’existe pas de type promotion');
const allReasons = [...busy.items, ...outcomes.items].map(item => `${item.title} ${item.reason}`).join(' ').toLowerCase();
for (const word of ['offre', 'promotion', 'achat conseillé', 'prouvé', 'garanti']) {
  assert.equal(allReasons.includes(word), false, `pas de « ${word} » dans le brief`);
}

// ---------------------------------------------------------------------------
// 8. File hors ligne : FIFO, dédoublonnage, expiration, eviction, refus
// ---------------------------------------------------------------------------
// a1 est la plus ancienne (day 3), a3 plus récente (day 1) : FIFO doit sortir a1 d'abord.
const actions = [
  { clientActionId: 'a3', kind: 'scan', payload: { reference: 'X' }, queuedAt: day(1) },
  { clientActionId: 'a1', kind: 'scan', payload: { reference: 'X' }, queuedAt: day(3) },
  { clientActionId: 'a1', kind: 'scan', payload: { reference: 'X' }, queuedAt: day(3) },
  { clientActionId: 'old', kind: 'outcome_declared', payload: { signal: 'more_hydration', productId: 'p' }, queuedAt: day(40) },
  { clientActionId: 'bad', kind: 'achat', payload: {}, queuedAt: day(1) }
];
const drained = drainOfflineQueue(actions, { now: NOW, ackedClientActionIds: ['a2'] });
assert.equal(drained.ready[0].clientActionId, 'a1', 'FIFO : la plus ancienne d’abord');
assert.equal(drained.ready[1].clientActionId, 'a3');
assert.ok(drained.duplicates.includes('a1'), 'le doublon dans la file est signalé');
assert.ok(drained.expired.some(item => item.clientActionId === 'old'), 'au-delà du TTL : expirée');
assert.ok(drained.refused.some(item => item.clientActionId === 'bad'), 'un type inconnu est refusé, pas ignoré');

const ackedDrain = drainOfflineQueue(
  [{ clientActionId: 'a2', kind: 'scan', payload: { reference: 'X' }, queuedAt: day(1) }],
  { now: NOW, ackedClientActionIds: ['a2'] }
);
assert.equal(ackedDrain.ready.length, 0, 'une action déjà reconnue n’est pas rejouée');

// Eviction par la taille : toutes dans la TTL, espacées d'une seconde.
const big = Array.from({ length: OFFLINE_QUEUE_MAX + 5 }, (_, index) => ({
  clientActionId: `q${index}`,
  kind: 'scan',
  payload: { reference: 'X' },
  queuedAt: new Date(Date.parse(NOW) - index * 1000).toISOString()
}));
const bigDrain = drainOfflineQueue(big, { now: NOW });
assert.equal(bigDrain.ready.length, OFFLINE_QUEUE_MAX, 'la file est bornée');
assert.equal(bigDrain.evicted.length, 5, 'les cinq plus anciennes sont évincées');
// q204 a le queuedAt le plus ancien (NOW - 204 s) : c'est elle qui saute en premier.
assert.equal(bigDrain.evicted[0].clientActionId, 'q204', 'évincées de la plus ancienne');
assert.equal(OFFLINE_ACTION_TTL_DAYS, 30);
assert.deepEqual(OFFLINE_ACTION_KINDS, ['scan', 'outcome_declared'], 'deux actions du quotidien, pas plus');

// ---------------------------------------------------------------------------
// 9. Store : réserver avant d'appliquer, et jamais deux fois
// ---------------------------------------------------------------------------
const { serverDb } = await import('../src/lib/serverDb');

const first = await serverDb.recordMobileSyncAction({
  userId: 'mobile-user',
  clientActionId: 'sync-0001',
  kind: 'scan',
  payload: { reference: 'produit-1' }
});
assert.equal(first.duplicate, false, 'premier enregistrement : pas un doublon');
await serverDb.applyLoyaltyEvent('mobile-user', 'scan_performed', 'produit-1', `scan_performed:mobile-user:sync-0001`);

const second = await serverDb.recordMobileSyncAction({
  userId: 'mobile-user',
  clientActionId: 'sync-0001',
  kind: 'scan',
  payload: { reference: 'produit-1' }
});
assert.equal(second.duplicate, true, 'le même identifiant client est reconnu');

const events = await serverDb.getLoyaltyEvents('mobile-user', 50);
const scanCount = events.filter(event => event.kind === 'scan_performed' && String(event.dedupeKey || '').includes('sync-0001')).length;
assert.equal(scanCount, 1, 'le scan compte une fois, pas deux');

const acked = await serverDb.getAckedClientActionIds('mobile-user');
assert.ok(acked.includes('sync-0001'), 'l’appareil peut savoir ce qui est appliqué');

// ---------------------------------------------------------------------------
// 10. Routes : contrat public, accès protégés, rejeu sans doublon
// ---------------------------------------------------------------------------
async function requestApp(path: string, init?: { method?: string; body?: unknown }) {
  const serverModule = await import('../server');
  const listener = http.createServer(serverModule.app);
  await new Promise<void>(resolve => listener.listen(0, '127.0.0.1', () => resolve()));
  const address = listener.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: init?.method ?? 'GET',
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
      body: init?.body ? JSON.stringify(init.body) : undefined
    });
    const text = await response.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { status: response.status, json, text };
  } finally {
    await new Promise<void>(resolve => listener.close(() => resolve()));
  }
}

const capabilities = await requestApp('/api/mobile/capabilities');
assert.equal(capabilities.status, 200, 'le contrat mobile est public');
assert.deepEqual(capabilities.json.offline.actionKinds, ['scan', 'outcome_declared']);
assert.equal(capabilities.json.offline.queueMax, OFFLINE_QUEUE_MAX);
assert.equal(capabilities.json.briefing.maxItems, BRIEFING_MAX_ITEMS);
assert.ok(!capabilities.json.briefing.itemKinds.includes('promotion'), 'pas d’item promotionnel dans le contrat');
assert.equal(capabilities.json.installable.manifest, '/manifest.webmanifest');

assert.equal((await requestApp('/api/mobile/briefing')).status, 401, 'le brief exige un compte');
assert.equal((await requestApp('/api/mobile/sync', { method: 'POST', body: { actions: [] } })).status, 401, 'la sync exige un compte');

const tooMany = await requestApp('/api/mobile/sync', {
  method: 'POST',
  body: { actions: Array.from({ length: OFFLINE_QUEUE_MAX + 1 }, () => ({ clientActionId: 'x', kind: 'scan' })) }
});
assert.equal(tooMany.status, 401, 'la borne de taille n’est même pas atteinte sans compte');

// ---------------------------------------------------------------------------
// 11. PWA : manifeste valide, icônes présentes, SW qui ne cache jamais l'API
// ---------------------------------------------------------------------------
const root = path.resolve(process.cwd());
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/manifest.webmanifest'), 'utf-8'));
assert.equal(manifest.display, 'standalone', 'installable en plein écran');
assert.equal(manifest.start_url, '/');
assert.equal(manifest.lang, 'fr');
assert.ok(manifest.icons.length >= 3, 'au moins une icône 192, une 512 et une maskable');
for (const icon of manifest.icons) {
  assert.ok(fs.existsSync(path.join(root, 'public', icon.src.replace(/^\//, ''))), `l’icône ${icon.src} existe sur le disque`);
}
assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'), 'une icône maskable');

const sw = fs.readFileSync(path.join(root, 'public/sw.js'), 'utf-8');
const shellLine = sw.match(/const SHELL = \[(.*?)\]/s);
assert.ok(shellLine, 'la liste de précache existe');
assert.equal(shellLine[1].includes('/api'), false, 'l’API n’est pas dans le précache');
assert.ok(sw.includes("url.pathname.startsWith('/api/')"), 'l’API est exclue à l’exécution');
assert.ok(sw.includes('url.origin !== self.location.origin'), 'rien hors de l’hôte n’est mis en cache');
assert.ok(!sw.includes('cache.addAll(SHELL.concat'), 'pas d’astuce de concat qui réinjecterait l’API');

console.log(
  `[PASS] Chantier 8.7 — application mobile : brief vide sans données, lavage échu seulement, routine du jour non faite, ` +
    `${MAX_OUTCOME_PROMPTS} invitations à déclarer (1 retenue), fidélité muette sans compte ni au sommet, ` +
    `file hors ligne FIFO avec dédoublonnage/expiration/eviction/refus, scan compté une fois sur deux envois, ` +
    `contrat mobile public, 2 accès refusés sans compte, manifeste standalone avec icônes réelles, SW qui ne met jamais /api/ en cache.`
);
