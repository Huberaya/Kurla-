import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { readFile } from 'node:fs/promises';

/**
 * CONSTAT n°3 — Stripe.
 *
 * L'intégration Stripe est écrite et complète. Ce qui manque n'est pas du code :
 * c'est une clé réelle, que seul le propriétaire du compte Stripe peut produire.
 * Ce banc prouve donc la seule chose vérifiable ici, et c'est celle qui compte :
 *
 *   sans clé, aucun chemin ne fabrique de succès.
 *
 * Il couvre trois propriétés :
 *  1. la route de paiement répond 503 avec `PAYMENT_NOT_CONFIGURED`, et non un
 *     faux encaissement — et aucune commande n'est créée ;
 *  2. le webhook désactivé répond 200 sans rien marquer payé, et activé sans
 *     secret il refuse en nommant la variable manquante ;
 *  3. GARDE : les six points d'appel de `getStripeClient()` répondent tous 503.
 *     L'écart mesuré à l'origine de ce banc — la route checkout principale
 *     répondait 400, « votre requête est mauvaise », alors que la faute était
 *     côté serveur — ne peut pas revenir sans faire tomber la suite.
 */

// Condition réelle de cet environnement : aucune clé.
delete process.env.STRIPE_SECRET_KEY;
delete process.env.STRIPE_WEBHOOK_SECRET;
delete process.env.STRIPE_WEBHOOK_ENABLED;
process.env.KURLA_STORE_MODE = 'memory';
// Le banc ouvre son propre écouteur sur un port libre : sans ceci, `server.ts`
// s'auto-écoute sur 3000 et le banc échoue dès que ce port est occupé.
process.env.KURLA_TEST_NO_SERVER = 'true';

const { serverDb } = await import('../src/lib/serverDb');
const { getStripeClient } = await import('../src/server/payments/stripeClient');
const { getStripeServerClient } = await import('../src/lib/db/refundSupport');
const { app } = await import('../server');

const listener = http.createServer(app);
await new Promise<void>((resolve, reject) => {
  listener.once('listening', () => resolve());
  listener.once('error', reject);
  listener.listen(0, '127.0.0.1');
});

const { port } = listener.address() as AddressInfo;
const base = `http://127.0.0.1:${port}`;

try {
  // --- 1. Le client Stripe n'existe pas sans clé --------------------------
  assert.equal(getStripeClient(), null, 'sans STRIPE_SECRET_KEY, aucun client Stripe ne doit être construit');
  assert.equal(getStripeServerClient(), null, 'idem côté remboursements');

  // --- 2. La route de paiement refuse, et ne crée rien --------------------
  serverDb.inMemoryOrders = [];
  const checkout = await fetch(`${base}/api/stripe/create-checkout-session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      items: [{ product_id: 'kit-peau-ess-001', quantity: 1 }],
      customerEmail: 'acheteur@example.com',
      shippingMethod: 'standard',
      shippingAddress: {
        fullName: 'Test Client', street: '12 rue Test',
        city: 'Nantes', postalCode: '44000', country: 'FR'
      }
    })
  });
  const checkoutBody = await checkout.json() as any;
  assert.equal(checkout.status, 503, `sans clé, le checkout doit dire 503, reçu ${checkout.status}`);
  assert.equal(checkoutBody.code, 'PAYMENT_NOT_CONFIGURED', 'le code doit nommer la cause, pas la cacher');
  assert.match(checkoutBody.note || '', /ne simule pas un encaissement/,
    'la réponse doit dire explicitement qu’aucun paiement n’est simulé');
  assert.equal(checkoutBody.url, undefined, 'aucune URL Stripe ne doit être renvoyée');
  assert.equal(serverDb.inMemoryOrders.length, 0, 'aucune commande ne doit être créée sans moyen d’encaissement');

  // Le panier vide reste un 400 : c'est bien la faute du client, cette fois.
  const empty = await fetch(`${base}/api/stripe/create-checkout-session`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({})
  });
  assert.equal(empty.status, 400, 'un panier vide est une erreur du client, pas une indisponibilité');

  // --- 3. Le webhook ne marque rien payé quand il est désactivé -----------
  const webhookOff = await fetch(`${base}/api/stripe/webhook`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}'
  });
  const offBody = await webhookOff.json() as any;
  assert.equal(webhookOff.status, 200, 'un webhook désactivé répond 200 pour ne pas faire réessayer Stripe en boucle');
  assert.equal(offBody.status, 'webhook_disabled');

  // --- 4. Activé sans secret : refus explicite, variable nommée ----------
  process.env.STRIPE_WEBHOOK_ENABLED = 'true';
  const webhookOn = await fetch(`${base}/api/stripe/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=fake' },
    body: '{}'
  });
  const onBody = await webhookOn.json() as any;
  assert.equal(webhookOn.status, 400, 'activé sans secret, le webhook doit refuser plutôt que d’accepter une signature non vérifiable');
  assert.match(onBody.error || '', /STRIPE_WEBHOOK_SECRET/, 'le refus doit nommer la variable manquante');
  delete process.env.STRIPE_WEBHOOK_ENABLED;

  // --- 5. Le diagnostic dit la vérité ------------------------------------
  const status = await (await fetch(`${base}/api/stripe/status`)).json() as any;
  assert.equal(status.stripeConfigured, false, 'le diagnostic doit annoncer Stripe non configuré');
  assert.equal(status.webhookEnabled, false);

  // --- 6. GARDE — les six points d'appel répondent tous 503 ---------------
  // `server.ts` compte 2 : le checkout (l.563) et la vérification de paiement
  // (l.998). La branche `if (!sig || !stripe)` du webhook répond 400 et c'est
  // correct — une signature absente est la faute de l'appelant, pas du
  // serveur ; elle n'est donc volontairement pas couverte par ce motif.
  const callSites: Array<[string, number]> = [
    ['server.ts', 2],
    ['src/server/routes/brandContracts.ts', 1],
    ['src/server/routes/membership.ts', 1],
    ['src/server/routes/professionals.ts', 2]
  ];
  for (const [file, expected] of callSites) {
    const source = await readFile(file, 'utf8');
    // `[^\n{]*` et non `[^)]*` : `membership.ts` écrit
    // `if (!stripe || !isMembershipPaymentConfigured())`, qui contient une
    // parenthèse fermante intermédiaire.
    const branches = Array.from(source.matchAll(/if \(!stripe[^\n{]*\) \{\n((?:.*\n){0,8})/g));
    assert.ok(branches.length >= expected,
      `${file} : au moins ${expected} branches « pas de client Stripe » attendues, ${branches.length} trouvées`);
    for (const branch of branches) {
      const status = branch[1].match(/status\((\d+)\)/);
      assert.ok(status, `${file} : une branche sans client Stripe ne renvoie aucun statut`);
      assert.equal(status![1], '503',
        `${file} : une route de paiement sans clé doit répondre 503 (faute serveur), pas ${status![1]} — la requête du client était correcte`);
    }
  }
} finally {
  await new Promise<void>((resolve, reject) => listener.close(error => (error ? reject(error) : resolve())));
}

console.log('[PASS] Stripe sans clé : le checkout répond 503 PAYMENT_NOT_CONFIGURED et ne crée aucune commande, le webhook désactivé ne marque rien payé et refuse en nommant la variable manquante quand il est activé sans secret, le diagnostic annonce Stripe non configuré, et les six points d’appel de getStripeClient() répondent tous 503.');
