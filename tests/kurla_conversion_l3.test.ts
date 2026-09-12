/**
 * BANC — L3 « Dashboard de conversion » : le funnel est lisible sans requêter la base
 * ==============================================================================
 *
 * Promesse du plan de chantiers : l'admin voit 4 étapes (diagnostic → routine →
 * panier → payé) × 2 pôles (cheveux/peau) avec des %, et une chute de −20 % sur
 * une étape est visible sans requêter la base.
 *
 * Ce banc verrouille l'agrégateur pur (src/lib/db/conversionFunnel.ts) :
 *  - le funnel complet : comptes, taux, chutes par étape, conversion globale ;
 *  - la séparation de pôles : profil, panier et paiement imputés aux bons pôles ;
 *  - le flag −20 % : chute visible (alerte lisible), seuil respecté, pas de faux
 *    positif ; période précédente vide → variation non calculable, pas de flag ;
 *  - l'honnêteté : input vide → « non mesurable », source indisponible → étape
 *    non mesurable, paniers invités / commandes sans compte exclus, statuts de
 *    commande post-paiement uniquement ;
 *  - les périodes : 30 j glissants, frontière exacte, horloge injectable.
 *
 * Exécution : npx tsx tests/kurla_conversion_l3.test.ts
 */

import assert from 'node:assert/strict';

import { aggregateConversionFunnel, ConversionFunnelInput, FunnelStep, PAID_ORDER_STATUSES } from '../src/lib/db/conversionFunnel';

let checks = 0;
const ok = async (label: string, fn: () => void | Promise<void>) => {
  await fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
};

// Horloge figée : 2026-09-12 12:00 UTC.
const NOW_MS = Date.parse('2026-09-12T12:00:00Z');
const daysAgo = (days: number): string => new Date(NOW_MS - days * 86_400_000).toISOString();

const HAIR_FILLED = { washFrequency: '2-3 fois par semaine', porosity: 'moyenne', scalpCondition: 'gras' };
const SKIN_FILLED = { skinType: 'seche', spfUsage: 'quotidien', budget: 'moyen' };
const ALL_UNKNOWN = { washFrequency: 'inconnu', porosity: 'inconnu', scalpCondition: 'inconnu' };

const baseInput = (): ConversionFunnelInput => ({
  beautyProfiles: [],
  routinePlans: [],
  carts: [],
  cartItems: [],
  orders: [],
  orderItems: [],
  productCategories: {},
  nowMs: NOW_MS
});

const profile = (userId: string, hair: unknown, skin: unknown, updatedDaysAgo: number) => ({
  user_id: userId,
  profile: { version: 1, hair, skin, environment: {}, photoConsent: false },
  created_at: daysAgo(updatedDaysAgo + 10),
  updated_at: daysAgo(updatedDaysAgo)
});

const plan = (userId: string, createdDaysAgo: number, status = 'active') => ({
  user_id: userId,
  status,
  created_at: daysAgo(createdDaysAgo)
});

const cart = (id: string, userId: string | null, updatedDaysAgo: number) => ({
  id,
  user_id: userId,
  updated_at: daysAgo(updatedDaysAgo)
});

const order = (id: string, userId: string | null, status: string, createdDaysAgo: number) => ({
  id,
  user_id: userId,
  status,
  created_at: daysAgo(createdDaysAgo)
});

const stepsOf = (input: ConversionFunnelInput, domain: 'tous' | 'cheveux' | 'peau') =>
  aggregateConversionFunnel(input).funnels[domain].steps;

const byKey = (steps: FunnelStep[]): Record<string, FunnelStep> => {
  const out: Record<string, FunnelStep> = {};
  for (const step of steps) out[step.key] = step;
  return out;
};

console.log('Banc L3 — dashboard de conversion (agrégateur pur)\n');

// ---------------------------------------------------------------------------
// 1. Funnel complet : 4 étapes × pôles, taux et chutes
// ---------------------------------------------------------------------------
await ok('funnel complet d\'un utilisateur cheveux : 4/4/4/4 partout où imputable', () => {
  const input = baseInput();
  input.beautyProfiles = [profile('u1', HAIR_FILLED, ALL_UNKNOWN, 5)];
  input.routinePlans = [plan('u1', 4)];
  input.carts = [cart('c1', 'u1', 3)];
  input.cartItems = [{ cart_id: 'c1', product_id: 'p-shampoing' }];
  input.orders = [order('o1', 'u1', 'paid', 2)];
  input.orderItems = [{ order_id: 'o1', product_id: 'p-shampoing' }];
  input.productCategories = { 'p-shampoing': 'cheveux' };

  const funnel = aggregateConversionFunnel(input);
  const tous = byKey(funnel.funnels.tous.steps);
  const cheveux = byKey(funnel.funnels.cheveux.steps);

  for (const key of ['diagnostic', 'routine', 'panier', 'paye']) {
    assert.equal(tous[key].count, 1, `tous.${key}`);
    assert.equal(cheveux[key].count, 1, `cheveux.${key}`);
  }
  assert.equal(tous.diagnostic.rateFromTopPct, 100);
  assert.equal(tous.paye.stepConversionPct, 100);
  assert.equal(tous.paye.dropFromPreviousPct, 0);
  assert.equal(funnel.funnels.tous.topToBottomPct, 100);
  assert.equal(funnel.funnels.cheveux.topToBottomPct, 100);
  assert.equal(funnel.flags.length, 0);
});

await ok('pôle peau sans diagnostic : non mesurable avec raison, pas de zéro trompeur', () => {
  const input = baseInput();
  input.beautyProfiles = [profile('u1', HAIR_FILLED, ALL_UNKNOWN, 5)];
  input.productCategories = { 'p-shampoing': 'cheveux' };
  const funnel = aggregateConversionFunnel(input);
  assert.equal(funnel.funnels.peau.available, false);
  assert.match(funnel.funnels.peau.reason ?? '', /aucun diagnostic/i);
  assert.equal(funnel.funnels.peau.topToBottomPct, null);
  assert.equal(funnel.funnels.tous.available, true);
});

// ---------------------------------------------------------------------------
// 2. La chute de −20 % est visible (flag) ; seuil respecté
// ---------------------------------------------------------------------------
const declineInput = (): ConversionFunnelInput => {
  const input = baseInput();
  const hair = (id: string, d: number) => profile(id, HAIR_FILLED, ALL_UNKNOWN, d);
  // Période courante : 4 diagnostics, 4 routines, 4 paniers, 2 payés.
  for (const id of ['u1', 'u2', 'u3', 'u4']) {
    input.beautyProfiles.push(hair(id, 5));
    input.routinePlans.push(plan(id, 4));
    input.carts.push(cart(`c-${id}`, id, 3));
    input.cartItems.push({ cart_id: `c-${id}`, product_id: 'p-h' });
    if (id === 'u1' || id === 'u2') {
      input.orders.push(order(`o-${id}`, id, 'paid', 2));
      input.orderItems.push({ order_id: `o-${id}`, product_id: 'p-h' });
    }
  }
  // Période précédente : 4 diagnostics, 4 routines, 4 paniers, 4 payés.
  for (const id of ['v1', 'v2', 'v3', 'v4']) {
    input.beautyProfiles.push(hair(id, 40));
    input.routinePlans.push(plan(id, 39));
    input.carts.push(cart(`cv-${id}`, id, 38));
    input.cartItems.push({ cart_id: `cv-${id}`, product_id: 'p-h' });
    input.orders.push(order(`ov-${id}`, id, 'paid', 37));
    input.orderItems.push({ order_id: `ov-${id}`, product_id: 'p-h' });
  }
  input.productCategories = { 'p-h': 'cheveux' };
  return input;
};

await ok('chute −50 % à l\'étape payée : flag visible dans les deux vues imputables', () => {
  const funnel = aggregateConversionFunnel(declineInput());
  const payeTous = byKey(funnel.funnels.tous.steps).paye;
  const payeCheveux = byKey(funnel.funnels.cheveux.steps).paye;
  assert.equal(payeTous.count, 2);
  assert.equal(payeTous.previousCount, 4);
  assert.equal(payeTous.deltaPct, -50);
  assert.equal(payeTous.flagged, true);
  assert.equal(payeCheveux.flagged, true);
  // Les étapes stables ne sont pas flaggées.
  assert.equal(byKey(funnel.funnels.tous.steps).panier.flagged, false);
  assert.equal(byKey(funnel.funnels.tous.steps).diagnostic.deltaPct, 0);
  // Alertes lisibles, sans requêter la base.
  assert.equal(funnel.flags.length, 2);
  for (const flag of funnel.flags) assert.match(flag, /commande payée : −50 % vs période précédente \(2 vs 4 utilisateurs\)/i);
});

await ok('chute de −15 % : pas de flag (seuil −20 % respecté)', () => {
  // Cale exact : 17 payés courants vs 20 précédents → (17−20)/20 = −15 %.
  const funnel = aggregateConversionFunnel({
    ...baseInput(),
    beautyProfiles: [profile('u1', HAIR_FILLED, ALL_UNKNOWN, 5)],
    routinePlans: [plan('u1', 4)],
    carts: [cart('c1', 'u1', 3)],
    cartItems: [{ cart_id: 'c1', product_id: 'p-h' }],
    orders: [
      ...Array.from({ length: 20 }, (_, i) => ({ id: `pc${i}`, user_id: `u${i}`, status: 'paid', created_at: daysAgo(40) })),
      ...Array.from({ length: 17 }, (_, i) => ({ id: `cc${i}`, user_id: `u${i}`, status: 'paid', created_at: daysAgo(5) }))
    ],
    orderItems: [
      ...Array.from({ length: 20 }, (_, i) => ({ order_id: `pc${i}`, product_id: 'p-h' })),
      ...Array.from({ length: 17 }, (_, i) => ({ order_id: `cc${i}`, product_id: 'p-h' }))
    ],
    productCategories: { 'p-h': 'cheveux' }
  });
  const payeTous = byKey(funnel.funnels.tous.steps).paye;
  assert.equal(payeTous.count, 17);
  assert.equal(payeTous.previousCount, 20);
  assert.equal(payeTous.deltaPct, -15);
  assert.equal(payeTous.flagged, false);
  assert.equal(funnel.flags.length, 0);
});

await ok('période précédente vide : variation non calculable, pas de flag, pas de division par zéro', () => {
  const funnel = aggregateConversionFunnel(declineInput());
  const input = baseInput();
  input.beautyProfiles = [profile('u1', HAIR_FILLED, ALL_UNKNOWN, 5)];
  const fresh = aggregateConversionFunnel(input);
  const diag = byKey(fresh.funnels.tous.steps).diagnostic;
  assert.equal(diag.previousCount, 0);
  assert.equal(diag.deltaPct, null);
  assert.equal(diag.flagged, false);
  assert.equal(funnel.flags.length, 2); // le reste est inchangé
});

// ---------------------------------------------------------------------------
// 3. Séparation de pôles : profil, panier et paiement imputés aux bons pôles
// ---------------------------------------------------------------------------
await ok('un profil impute les pôles remplis ; routine sans profil → « tous » seulement', () => {
  const input = baseInput();
  input.beautyProfiles = [
    profile('u-hair', HAIR_FILLED, ALL_UNKNOWN, 5),
    profile('u-skin', ALL_UNKNOWN, SKIN_FILLED, 5),
    profile('u-both', HAIR_FILLED, SKIN_FILLED, 5),
    { user_id: 'u-nop', profile: null, created_at: daysAgo(15), updated_at: null }
  ];
  input.routinePlans = ['u-hair', 'u-skin', 'u-both', 'u-nop'].map(id => plan(id, 4));

  const steps = byKey(stepsOf(input, 'tous'));
  const cheveux = byKey(stepsOf(input, 'cheveux'));
  const peau = byKey(stepsOf(input, 'peau'));

  assert.equal(steps.diagnostic.count, 3); // u-nop a un profil vide : pas de diagnostic imputable
  assert.equal(cheveux.diagnostic.count, 2);
  assert.equal(peau.diagnostic.count, 2);
  assert.equal(steps.routine.count, 4);
  assert.equal(cheveux.routine.count, 2);
  assert.equal(peau.routine.count, 2);
});

await ok('panier mixte imputé aux deux pôles ; produit hors pôle → « tous » seulement', () => {
  const input = baseInput();
  const profileRow = (id: string, hair: unknown, skin: unknown) => profile(id, hair, skin, 5);
  input.beautyProfiles = [
    profileRow('u-h', HAIR_FILLED, ALL_UNKNOWN),
    profileRow('u-s', ALL_UNKNOWN, SKIN_FILLED),
    profileRow('u-b', HAIR_FILLED, SKIN_FILLED),
    profileRow('u-k', HAIR_FILLED, ALL_UNKNOWN)
  ];
  input.carts = [
    cart('c-h', 'u-h', 3),
    cart('c-s', 'u-s', 3),
    cart('c-b', 'u-b', 3),
    cart('c-k', 'u-k', 3)
  ];
  input.cartItems = [
    { cart_id: 'c-h', product_id: 'p-h' },
    { cart_id: 'c-s', product_id: 'p-s' },
    { cart_id: 'c-b', product_id: 'p-h' },
    { cart_id: 'c-b', product_id: 'p-s' },
    { cart_id: 'c-k', product_id: 'p-kit' }
  ];
  input.productCategories = { 'p-h': 'cheveux', 'p-s': 'peau', 'p-kit': 'kits' };

  const tous = byKey(stepsOf(input, 'tous'));
  const cheveux = byKey(stepsOf(input, 'cheveux'));
  const peau = byKey(stepsOf(input, 'peau'));
  assert.equal(tous.panier.count, 4);
  assert.equal(cheveux.panier.count, 2); // u-h + u-b
  assert.equal(peau.panier.count, 2); // u-s + u-b
});

await ok('paiement imputé par les produits de la commande (et non par le profil)', () => {
  const input = baseInput();
  input.beautyProfiles = [
    profile('u-h', HAIR_FILLED, ALL_UNKNOWN, 5),
    profile('u-b', HAIR_FILLED, SKIN_FILLED, 5),
    profile('u-s', ALL_UNKNOWN, SKIN_FILLED, 5)
  ];
  input.orders = [
    order('o1', 'u-h', 'paid', 2),
    order('o2', 'u-b', 'shipped', 2),
    order('o3', 'u-s', 'paid', 2)
  ];
  input.orderItems = [
    { order_id: 'o1', product_id: 'p-h' },
    { order_id: 'o2', product_id: 'p-s' },
    { order_id: 'o3', product_id: 'p-kit' }
  ];
  input.productCategories = { 'p-h': 'cheveux', 'p-s': 'peau', 'p-kit': 'kits' };

  const tous = byKey(stepsOf(input, 'tous'));
  const cheveux = byKey(stepsOf(input, 'cheveux'));
  const peau = byKey(stepsOf(input, 'peau'));
  assert.equal(tous.paye.count, 3);
  assert.equal(cheveux.paye.count, 1); // u-h (profil cheveux mais commande cheveux)
  assert.equal(peau.paye.count, 1); // u-b (profil mixte, commande peau)
  // u-s : commande kit → « tous » seulement.
});

// ---------------------------------------------------------------------------
// 4. Honnêteté : vide, sources indisponibles, invités, statuts
// ---------------------------------------------------------------------------
await ok('input vide : les trois vues sont non mesurables, aucune valeur inventée', () => {
  const funnel = aggregateConversionFunnel(baseInput());
  for (const domain of ['tous', 'cheveux', 'peau'] as const) {
    const f = funnel.funnels[domain];
    assert.equal(f.available, false);
    assert.ok(f.reason);
    for (const step of f.steps) assert.equal(step.count, 0);
  }
  assert.equal(funnel.flags.length, 0);
  assert.equal(funnel.notes.length, 3);
  assert.equal(funnel.periodDays, 30);
});

await ok('source panier indisponible : étape non mesurable, funnel non disponible, raison explicite', () => {
  const input = baseInput();
  input.beautyProfiles = [profile('u1', HAIR_FILLED, ALL_UNKNOWN, 5)];
  input.routinePlans = [plan('u1', 4)];
  input.orders = [order('o1', 'u1', 'paid', 2)];
  input.orderItems = [{ order_id: 'o1', product_id: 'p-h' }];
  input.productCategories = { 'p-h': 'cheveux' };
  input.sourceAvailable = { panier: false };

  const funnel = aggregateConversionFunnel(input);
  const tous = byKey(funnel.funnels.tous.steps);
  assert.equal(tous.panier.available, false);
  assert.equal(tous.panier.count, null);
  assert.equal(tous.panier.rateFromTopPct, null);
  assert.equal(tous.diagnostic.count, 1); // les autres étapes restent mesurées
  assert.equal(tous.paye.count, 1);
  assert.equal(funnel.funnels.tous.available, false);
  assert.match(funnel.funnels.tous.reason ?? '', /panier constitué/i);
  assert.equal(funnel.funnels.tous.topToBottomPct, null);
});

await ok('paniers invités et commandes sans compte : exclus du funnel utilisateur', () => {
  const input = baseInput();
  input.beautyProfiles = [profile('u1', HAIR_FILLED, ALL_UNKNOWN, 5)];
  input.carts = [cart('c1', 'u1', 3), cart('c-guest', null, 2)];
  input.cartItems = [
    { cart_id: 'c1', product_id: 'p-h' },
    { cart_id: 'c-guest', product_id: 'p-h' }
  ];
  input.orders = [
    order('o1', 'u1', 'paid', 2),
    order('o-guest', null, 'paid', 2)
  ];
  input.orderItems = [
    { order_id: 'o1', product_id: 'p-h' },
    { order_id: 'o-guest', product_id: 'p-h' }
  ];
  input.productCategories = { 'p-h': 'cheveux' };

  const steps = byKey(stepsOf(input, 'tous'));
  assert.equal(steps.panier.count, 1);
  assert.equal(steps.paye.count, 1);
  assert.equal(steps.diagnostic.count, 1);
});

await ok('seuls les statuts post-paiement comptent (pending/cancelled/refunded exclus)', () => {
  const statuses: Array<[string, number]> = [
    ['paid', 1],
    ['processing', 1],
    ['packed', 1],
    ['shipped', 1],
    ['delivered', 1],
    ['cancelled', 0],
    ['refunded', 0],
    ['pending_payment', 0],
    ['payment_pending_webhook', 0],
    ['payment_failed', 0]
  ];
  const expected = PAID_ORDER_STATUSES.length;
  assert.equal(expected, statuses.filter(([, count]) => count === 1).length);
  const input = baseInput();
  statuses.forEach(([status], i) => {
    input.beautyProfiles.push(profile(`u${i}`, HAIR_FILLED, ALL_UNKNOWN, 5));
    input.orders.push(order(`o${i}`, `u${i}`, status, 2));
    input.orderItems.push({ order_id: `o${i}`, product_id: 'p-h' });
  });
  input.productCategories = { 'p-h': 'cheveux' };
  const steps = byKey(stepsOf(input, 'tous'));
  assert.equal(steps.paye.count, expected);
  assert.equal(steps.diagnostic.count, statuses.length);
});

// ---------------------------------------------------------------------------
// 5. Périodes : 30 j glissants, frontières, horloge injectable
// ---------------------------------------------------------------------------
await ok('frontières : 29,99 j → période courante ; 30,01 j → précédente seulement', () => {
  const input = baseInput();
  const current = new Date(NOW_MS - 29.99 * 86_400_000).toISOString();
  const previous = new Date(NOW_MS - 30.01 * 86_400_000).toISOString();
  input.beautyProfiles = [
    { user_id: 'u-c', profile: { hair: HAIR_FILLED, skin: ALL_UNKNOWN }, created_at: daysAgo(60), updated_at: current },
    { user_id: 'u-p', profile: { hair: HAIR_FILLED, skin: ALL_UNKNOWN }, created_at: daysAgo(60), updated_at: previous }
  ];
  const funnel = aggregateConversionFunnel(input);
  const diag = byKey(funnel.funnels.tous.steps).diagnostic;
  assert.equal(diag.count, 1); // u-c seulement
  assert.equal(diag.previousCount, 1); // u-p seulement
});

await ok('période courante sans diagnostic mais avec historique : funnel non mesurable, comptes précédents conservés', () => {
  const input = baseInput();
  input.beautyProfiles = [profile('u1', HAIR_FILLED, ALL_UNKNOWN, 45)];
  input.routinePlans = [plan('u1', 50)];
  input.carts = [cart('c1', 'u1', 55)];
  input.cartItems = [{ cart_id: 'c1', product_id: 'p-h' }];
  input.orders = [order('o1', 'u1', 'paid', 10)];
  input.orderItems = [{ order_id: 'o1', product_id: 'p-h' }];
  input.productCategories = { 'p-h': 'cheveux' };

  const funnel = aggregateConversionFunnel(input);
  assert.equal(funnel.funnels.tous.available, false);
  assert.match(funnel.funnels.tous.reason ?? '', /aucun diagnostic/i);
  const steps = byKey(funnel.funnels.tous.steps);
  assert.equal(steps.diagnostic.count, 0);
  assert.equal(steps.diagnostic.previousCount, 1);
  assert.equal(steps.routine.previousCount, 1);
  assert.equal(steps.panier.previousCount, 1);
  assert.equal(steps.paye.count, 1);
  assert.equal(steps.paye.previousCount, 0);
});

await ok('réponse : périodes cohérentes (30 j glissants), horloge injectable respectée', () => {
  const funnel = aggregateConversionFunnel(baseInput());
  assert.equal(funnel.generatedAt, new Date(NOW_MS).toISOString());
  assert.equal(funnel.periods.current.to, new Date(NOW_MS).toISOString());
  assert.equal(funnel.periods.current.from, new Date(NOW_MS - 30 * 86_400_000).toISOString());
  assert.equal(funnel.periods.previous.from, new Date(NOW_MS - 60 * 86_400_000).toISOString());
  assert.equal(funnel.periods.previous.to, new Date(NOW_MS - 30 * 86_400_000).toISOString());
});

console.log(`\n${checks} vérifications L3 réussies.`);
if (checks < 14) {
  console.error('Banc incomplet : le nombre de vérifications est inférieur à l attendu (14).');
  process.exitCode = 1;
}
