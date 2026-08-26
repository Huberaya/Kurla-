import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { app } from '../server';

/**
 * Real Supabase integration test. It is intentionally separate from npm test:
 * it creates temporary users and requires a dedicated Supabase project.
 *
 * Required environment variables:
 *   SUPABASE_URL (or VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)
 *   VITE_SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_ANON_KEY / SUPABASE_ANON_KEY
 */

type CreatedUser = { id: string; email: string; password: string };

function requiredEnv(name: string, alternatives: string[] = []): string | undefined {
  for (const candidate of [name, ...alternatives]) {
    const value = process.env[candidate];
    if (value) return value;
  }
  return undefined;
}

async function expectStatus(baseUrl: string, path: string, token: string | undefined, expected: number, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  if (response.status !== expected) {
    const body = await response.text();
    throw new Error(`${path}: expected HTTP ${expected}, received ${response.status}: ${body}`);
  }
  return response;
}

async function createTemporaryUser(admin: SupabaseClient, label: string): Promise<CreatedUser> {
  const email = `kurla.integration.${label}.${Date.now()}@example.com`;
  const password = `KURLA-Integration-${randomUUID()}!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: 'Integration', last_name: label }
  });
  if (error || !data.user) throw new Error(`Création utilisateur ${label} impossible: ${error?.message || 'utilisateur absent'}`);
  return { id: data.user.id, email, password };
}

async function signIn(publicClient: SupabaseClient, user: CreatedUser): Promise<string> {
  const { data, error } = await publicClient.auth.signInWithPassword({
    email: user.email,
    password: user.password
  });
  if (error || !data.session?.access_token) {
    throw new Error(`Connexion ${user.email} impossible: ${error?.message || 'access token absent'}`);
  }
  return data.session.access_token;
}

async function runRealSupabaseIntegration() {
  const url = requiredEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
  const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY', ['SUPABASE_SECRET_KEY']);
  const publicKey = requiredEnv('VITE_SUPABASE_PUBLISHABLE_KEY', ['VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY']);
  if (!url || !serviceKey || !publicKey) {
    throw new Error(
      'Test d’intégration non exécutable: renseigner SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SECRET_KEY) et une clé publique Supabase.'
    );
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const publicClient = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const users: CreatedUser[] = [];
  const orderIds = [`ITG-A-${Date.now()}`, `ITG-B-${Date.now()}`];
  const ticketId = randomUUID();
  const shipmentId = randomUUID();
  const returnId = randomUUID();
  let listener: ReturnType<typeof app.listen> | undefined;

  try {
    users.push(await createTemporaryUser(admin, 'A'));
    users.push(await createTemporaryUser(admin, 'B'));
    const tokenA = await signIn(publicClient, users[0]);
    const tokenB = await signIn(publicClient, users[1]);

    const { data: product, error: productError } = await admin
      .from('products')
      .select('id, name, price')
      .limit(1)
      .single();
    if (productError || !product) throw new Error(`Catalogue Supabase indisponible: ${productError?.message || 'produit absent'}`);

    const orderPayload = (id: string, userId: string, email: string) => ({
      id,
      user_id: userId,
      customer_email: email,
      items: [{ productId: product.id, quantity: 1, price: Number(product.price), name: product.name }],
      total: Number(product.price),
      status: 'payment_pending_webhook'
    });
    const { error: orderError } = await admin.from('orders').insert([
      orderPayload(orderIds[0], users[0].id, users[0].email),
      orderPayload(orderIds[1], users[1].id, users[1].email)
    ]);
    if (orderError) throw new Error(`Création des commandes d’intégration impossible: ${orderError.message}`);

    const { error: shipmentError } = await admin.from('shipments').insert({
      id: shipmentId,
      order_id: orderIds[0],
      user_id: users[0].id,
      carrier: 'manual',
      method: 'integration',
      price: 0,
      status: 'preparing'
    });
    if (shipmentError) throw new Error(`Création expédition d’intégration impossible: ${shipmentError.message}`);

    const { error: ticketError } = await admin.from('support_tickets').insert({
      id: ticketId,
      user_id: users[0].id,
      order_id: orderIds[0],
      subject_category: 'commande',
      subject: 'Ticket intégration autorisation',
      status: 'open'
    });
    if (ticketError) throw new Error(`Création ticket d’intégration impossible: ${ticketError.message}`);
    const { error: messageError } = await admin.from('support_messages').insert({
      id: randomUUID(),
      ticket_id: ticketId,
      sender_id: users[0].id,
      sender_role: 'customer',
      message: 'Message de test'
    });
    if (messageError) throw new Error(`Création message d’intégration impossible: ${messageError.message}`);

    listener = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve, reject) => {
      listener!.once('listening', () => resolve());
      listener!.once('error', reject);
    });
    const address = listener.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const ordersA = await (await expectStatus(baseUrl, '/api/orders', tokenA, 200)).json();
    const ordersB = await (await expectStatus(baseUrl, '/api/orders', tokenB, 200)).json();
    if (!ordersA.orders.some((order: any) => order.id === orderIds[0]) || ordersA.orders.some((order: any) => order.id === orderIds[1])) {
      throw new Error('Isolation commandes invalide pour le compte A.');
    }
    if (!ordersB.orders.some((order: any) => order.id === orderIds[1]) || ordersB.orders.some((order: any) => order.id === orderIds[0])) {
      throw new Error('Isolation commandes invalide pour le compte B.');
    }

    await expectStatus(baseUrl, '/api/orders', undefined, 401, {
      headers: { 'x-user-id': users[0].id, 'x-user-email': users[0].email }
    });
    await expectStatus(baseUrl, `/api/shipments/${orderIds[0]}`, tokenB, 404);
    await expectStatus(baseUrl, '/api/returns', tokenB, 404, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: orderIds[0], reason: 'cross-account', items: [{ productId: product.id, quantity: 1 }] })
    });
    await expectStatus(baseUrl, `/api/support/tickets/${ticketId}/messages`, tokenB, 404);
    await expectStatus(baseUrl, '/api/admin/metrics', tokenA, 403);

    const adminUser = await createTemporaryUser(admin, 'ADMIN');
    users.push(adminUser);
    const { error: roleError } = await admin.from('profiles').update({ role: 'admin' }).eq('id', adminUser.id);
    if (roleError) throw new Error(`Attribution du rôle admin de test impossible: ${roleError.message}`);
    const adminToken = await signIn(publicClient, adminUser);
    await expectStatus(baseUrl, '/api/admin/metrics', adminToken, 200);

    // Insert this return outside the Node process cache, then update it through
    // the admin API. This specifically verifies that Supabase is authoritative
    // when updateReturnStatus cannot find a local in-memory row.
    const { error: returnError } = await admin.from('returns').insert({
      id: returnId,
      order_id: orderIds[0],
      user_id: users[0].id,
      reason: 'integration-return',
      items: [{ productId: product.id, quantity: 1 }],
      quantity: 1,
      status: 'requested'
    });
    if (returnError) throw new Error(`Création du retour d’intégration impossible: ${returnError.message}`);
    const updatedReturnResponse = await expectStatus(baseUrl, `/api/admin/returns/${returnId}/status`, adminToken, 200, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved', adminComment: 'Validation intégration' })
    });
    const updatedReturn = await updatedReturnResponse.json();
    if (updatedReturn.returnRequest?.status !== 'approved') {
      throw new Error('La mise à jour admin d’un retour Supabase absent du cache a échoué.');
    }

    console.log('[PASS] Intégration Supabase réelle: comptes A/B isolés, ressources privées protégées, rôle admin et mise à jour retour hors cache vérifiés.');
  } finally {
    await admin.from('returns').delete().eq('id', returnId);
    if (listener) {
      await new Promise<void>((resolve, reject) => listener!.close(error => error ? reject(error) : resolve()));
    }
    await admin.from('support_messages').delete().eq('ticket_id', ticketId);
    await admin.from('support_tickets').delete().eq('id', ticketId);
    await admin.from('shipments').delete().eq('id', shipmentId);
    await admin.from('orders').delete().in('id', orderIds);
    for (const user of users) {
      await admin.auth.admin.deleteUser(user.id);
    }
  }
}

runRealSupabaseIntegration().catch(error => {
  console.error('[FAIL] Intégration Supabase réelle:', error);
  process.exitCode = 1;
});
