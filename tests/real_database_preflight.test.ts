/**
 * Pré-vérification « base réelle ».
 *
 * Ce banc ne teste pas la logique métier : il vérifie que le projet Supabase
 * ciblé est réellement utilisable avant d'y exécuter quoi que ce soit. Il
 * reproduit le mode de panne rencontré lors de l'application des migrations :
 * GoTrue renvoyait un `Database error creating new user` opaque parce qu'un
 * trigger échouait en cascade (contrainte UNIQUE absente sur
 * `notifications.dedupe_key`). Sans cette étape, une suite annoncée « base
 * réelle » peut soit échouer sans explication, soit — pire — tourner en silence
 * sur le repli mémoire et passer pour verte.
 *
 * Exécution volontaire uniquement :
 *   npm run test:realdb
 */
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { describeStoreBinding } from '../src/lib/supabaseClient';

function requiredEnv(name: string, alternatives: string[] = []): string | undefined {
  for (const candidate of [name, ...alternatives]) {
    const value = process.env[candidate];
    if (value) return value;
  }
  return undefined;
}

async function runRealDatabasePreflight() {
  const binding = describeStoreBinding();
  console.log(`[Pré-vérification] mode=${binding.mode} liaison=${binding.binding}`);

  if (binding.binding !== 'supabase') {
    throw new Error(
      'Pré-vérification refusée : aucune liaison à une base réelle. '
      + 'Renseigner SUPABASE_URL et SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY), '
      + 'et ne pas forcer KURLA_STORE_MODE=memory pour ce banc.'
    );
  }

  const url = requiredEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']) as string;
  const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY', ['SUPABASE_SECRET_KEY']) as string;
  const publicKey = requiredEnv('VITE_SUPABASE_PUBLISHABLE_KEY', ['VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY']);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // 1. Créer un compte exerce les triggers applicatifs côté base. C'est le
  //    point de rupture réel observé : un trigger défaillant rend toute la
  //    chaîne de tests inutilisable avec un message GoTrue non exploitable.
  const email = `kurla.preflight.${Date.now()}@example.com`;
  const password = `KURLA-Preflight-${randomUUID()}!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: 'Pré-vérification', last_name: 'KURLA' },
  });
  if (error || !data.user) {
    throw new Error(
      `Création d’un compte de test impossible : ${error?.message || 'utilisateur absent'}. `
      + 'Vérifier les triggers sur auth.users (handle_new_user, create_account_notifications) '
      + 'et les contraintes qu’ils supposent.'
    );
  }

  // 2. La connexion avec la clé publique confirme que le JWT émis est valide
  //    pour les accès RLS, donc que les bancs suivants pourront s'authentifier.
  if (publicKey) {
    const publicClient = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: session, error: signInError } = await publicClient.auth.signInWithPassword({ email, password });
    if (signInError || !session.session?.access_token) {
      throw new Error(
        `Connexion du compte de test impossible : ${signInError?.message || 'access token absent'}. `
        + 'Sans jeton valide, aucune vérification RLS n’est possible.'
      );
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) {
    throw new Error(`Nettoyage du compte de pré-vérification impossible : ${deleteError.message}`);
  }

  console.log('[PASS] Base réelle utilisable : création de compte, triggers et authentification vérifiés.');
}

runRealDatabasePreflight().catch(error => {
  console.error('[FAIL] Pré-vérification base réelle:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
