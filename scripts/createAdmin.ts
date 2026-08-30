/**
 * Script d'amorçage du (ou des) compte(s) administrateur KURLA.
 *
 * Pourquoi ce script existe
 * -------------------------
 * Aucun écran ne permet de devenir administrateur : le rôle n'est jamais
 * écrit depuis le client (c'est volontaire, voir `AuthContext`). Le tout
 * premier admin doit donc être créé avec la clé *service role* de Supabase,
 * qui contourne la RLS. Ce script fait exactement ça, de façon idempotente :
 * on peut le relancer sans risque (création du compte s'il n'existe pas,
 * promotion du profil sinon).
 *
 * Il fait trois choses :
 *  1. Crée l'utilisateur dans Supabase Auth (compte déjà confirmé), ou met à
 *     jour son mot de passe s'il existe déjà ;
 *  2. Positionne `profiles.role` sur `superadmin` (ou `admin`) ;
 *  3. Pose le même rôle dans `app_metadata` (le JWT), pour que la fonction
 *     SQL `is_admin()` — qui lit aussi `app_metadata.role` — réponde vrai.
 *
 * Utilisation
 * -----------
 * Les secrets ne sont JAMAIS codés en dur : ils viennent de l'environnement
 * (ou d'un fichier .env non versionné).
 *
 *   SUPABASE_URL="https://xxxx.supabase.co" \
 *   SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
 *   ADMIN_EMAIL="hubertbay@gmail.com" \
 *   ADMIN_PASSWORD='MotDePasseSolide' \
 *   npm run admin:create
 *
 * Variantes :
 *   - ADMIN_ROLE=admin            -> administrateur (au lieu de superadmin)
 *   - ADMIN_FIRST_NAME / ADMIN_LAST_NAME -> prénom / nom du profil
 *   - sans ADMIN_PASSWORD sur un compte existant : seule la promotion est
 *     faite, le mot de passe n'est pas touché.
 *
 * Sécurité
 * --------
 * La clé service role donne un accès total à la base. Ne la committez jamais,
 * ne l'exposez jamais au front. Changez le mot de passe après la première
 * connexion si ce script a été lancé dans un environnement partagé.
 */

import 'dotenv/config';
import { createClient, type User } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';
const firstName = process.env.ADMIN_FIRST_NAME || 'Hubert';
const lastName = process.env.ADMIN_LAST_NAME || 'Admin';
const role = (process.env.ADMIN_ROLE || 'superadmin').trim();

function fail(message: string): never {
  console.error(`\n❌  ${message}\n`);
  process.exit(1);
}

if (!url) fail('Variable SUPABASE_URL manquante.');
if (!serviceKey)
  fail(
    'Variable SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SECRET_KEY) manquante. ' +
      'Récupérez-la dans Supabase : Project Settings → API → service_role secret key.'
  );
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  fail('ADMIN_EMAIL manquante ou invalide. Exemple : ADMIN_EMAIL="hubert@gmail.com".');
if (!['admin', 'superadmin'].includes(role))
  fail(`ADMIN_ROLE invalide : « ${role} ». Attendu : admin ou superadmin.`);

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserByEmail(target: string): Promise<User | null> {
  // listUsers est paginé (1000 par page) ; on parcourt jusqu'à trouver.
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) fail(`Impossible de lister les utilisateurs : ${error.message}`);
    const users: User[] = data.users;
    const found = users.find((u) => (u.email || '').toLowerCase() === target);
    if (found) return found;
    if (users.length < 1000) return null;
    page += 1;
  }
}

async function main() {
  console.log(`\n🔐  Amorçage administrateur KURLA`);
  console.log(`    email : ${email}`);
  console.log(`    rôle  : ${role}\n`);

  let userId: string;
  let created = false;

  const existing = await findUserByEmail(email);

  if (!existing) {
    if (!password)
      fail(
        "Le compte n'existe pas encore et ADMIN_PASSWORD est vide : impossible de le créer. " +
          'Relancez avec ADMIN_PASSWORD défini.'
      );
    if (password.length < 6) fail('ADMIN_PASSWORD doit contenir au moins 6 caractères.');

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // compte actif immédiatement, sans étape de confirmation
      user_metadata: { first_name: firstName, last_name: lastName },
    });
    if (error) fail(`Création du compte échouée : ${error.message}`);
    userId = data.user.id;
    created = true;
    console.log('   • Compte Supabase Auth créé (déjà confirmé).');
  } else {
    userId = existing.id;
    console.log('   • Compte Supabase Auth existant trouvé.');

    if (password) {
      if (password.length < 6) fail('ADMIN_PASSWORD doit contenir au moins 6 caractères.');
      const { error } = await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
      });
      if (error) fail(`Mise à jour du mot de passe échouée : ${error.message}`);
      console.log('   • Mot de passe mis à jour.');
    } else {
      console.log('   • Mot de passe non touché (ADMIN_PASSWORD non fourni).');
    }
  }

  // 1) Rôle dans app_metadata (lu par is_admin() côté SQL via auth.jwt()).
  const { error: metaErr } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role },
  });
  if (metaErr) fail(`Position de app_metadata.role échouée : ${metaErr.message}`);

  // 2) Profil public.profiles (lu par l'API et par l'interface).
  // On n'écrase pas un prénom/nom déjà renseigné.
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', userId)
    .maybeSingle();

  const { error: profileErr } = await admin
    .from('profiles')
    .upsert(
      {
        id: userId,
        email,
        first_name: existingProfile?.first_name || firstName,
        last_name: existingProfile?.last_name || lastName,
        role,
        updated_at: new Date().toISOString(),
        ...(created ? { created_at: new Date().toISOString() } : {}),
      },
      { onConflict: 'id' }
    );
  if (profileErr) fail(`Écriture du profil échouée : ${profileErr.message}`);

  console.log(`   • Profil promu « ${role} » (public.profiles + app_metadata).`);

  console.log('\n✅  Terminé.');
  console.log(`    Connectez-vous sur le site avec ${email}, puis ouvrez /admin.\n`);
}

main().catch((err) => fail(err?.message || String(err)));
