# Accès administrateur & inscriptions/connexions — Runbook

> **Objectif :** (1) obtenir l'accès au dashboard admin, (2) faire en sorte que
> visiteurs et testeurs puissent s'inscrire et se connecter **sans accroc**.
> Aucune clé secrète n'est écrite dans le code ni dans ce document : elles se
> trouvent dans le tableau de bord Supabase et dans les variables d'environnement
> du déploiement (Vercel).

---

## 1. CRÉER LE COMPTE ADMINISTRATEUR

### Pourquoi c'est nécessaire

Le rôle d'un compte (`customer`, `admin`, `superadmin`…) **n'est jamais
modifiable depuis le site** (c'est une sécurité : un client ne peut pas se
promouvoir admin). Le tout premier admin doit donc être créé côté serveur avec
la clé *service role* de Supabase, qui contourne la sécurité RLS.

Le script `scripts/createAdmin.ts` fait ça de façon **idempotente** : on peut
le relancer sans risque. Il :

1. crée le compte dans Supabase Auth (déjà confirmé, pas d'étape email) s'il
   n'existe pas, ou met à jour le mot de passe s'il existe ;
2. passe `public.profiles.role` à `superadmin` ;
3. pose le même rôle dans `app_metadata` (le jeton JWT), pour que la fonction
   SQL `is_admin()` réponde vrai immédiatement.

### Étapes

1. Récupérez les valeurs dans **Supabase → Project Settings → API** :
   - `Project URL` (ex. `https://qzwgsarfdegqtfdnqiql.supabase.co`)
   - `service_role secret key` (⚠️ clé secrète, jamais côté navigateur)
2. Depuis la racine du projet, exécutez (pensez à mettre le mot de passe que
   vous voulez — il n'est stocké nulle part dans le dépôt) :

```bash
SUPABASE_URL="https://VOTRE-PROJET.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="VOTRE_CLE_SERVICE_ROLE" \
ADMIN_EMAIL="hubertbay@gmail.com" \
ADMIN_PASSWORD='Richesse@20' \
ADMIN_FIRST_NAME="Hubert" \
ADMIN_LAST_NAME="Bay" \
npm run admin:create
```

Vous devez voir `✅ Terminé`. Connectez-vous ensuite sur le site avec
**hubertbay@gmail.com** et ouvrez **`/admin`**.

> Le même script fonctionne en local comme en production : il suffit que les
> variables pointent vers le bon projet Supabase. Pour lancer le script sur
> le projet déployé, ajoutez ces variables dans l'environnement Vercel
> (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`)
> puis lancez `npm run admin:create` dans le build/console, ou exécutez-le en
> local avec les valeurs du projet de production.

### Alternative SQL (si le compte existe déjà)

Si vous avez **déjà créé le compte** en vous inscrivant normalement sur le
site, inutile de relancer le script : exécutez ceci dans
**Supabase → SQL Editor** (remplacez l'email) :

```sql
update public.profiles
set role = 'superadmin', updated_at = now()
where email = 'hubertbay@gmail.com';
```

Pour le rôle dans le JWT (`app_metadata`) également :

```sql
update auth.users
set raw_app_meta_data =
      raw_app_meta_data || jsonb_build_object('role', 'superadmin')
where email = 'hubertbay@gmail.com';
```

Reconnectez-vous ensuite (la session doit être régénérée pour porter le rôle).

---

## 2. INSCRIPTIONS / CONNEXIONS SANS ACCROC — RÉGLAGES SUPABASE

Le code est prêt pour les deux configurations (confirmation email activée ou
non). Le vrai point de friction est **côté réglages Supabase**.

### 2.1 Le choix décisif : confirmation de l'email

Par défaut, Supabase exige qu'un nouvel inscrit clique sur un lien reçu par
email avant de pouvoir se connecter. Avec l'**email intégré de Supabase**, ce
courriel est très limité (quel envois/heure) et arrive souvent en spam :
c'est la cause n°1 des « je m'inscris et je n'arrive pas à me connecter ».

**Deux options — choisissez-en une :**

**OPTION A — Inscription immédiate (recommandée pour le lancement/test)**

- Supabase → **Authentication → Sign In / Providers → Email**
- Désactivez **« Confirm email »**.
- Conséquence : le visiteur crée son compte et est connecté tout de suite,
  aucun email à confirmer. Idéal pour la phase bêta et les 300 premiers
  testeurs.

**OPTION B — Confirmation email, mais avec un vrai serveur d'envoi (production)**

- Gardez « Confirm email » activé.
- Configurez un **SMTP personnalisé** : Supabase → **Project Settings →
  Authentication → SMTP Settings**, branchez Resend / SendGrid / Postmark
  avec le domaine `kurla-beauty.com` authentifié (SPF/DKIM/DMARC). Sinon les
  emails restent limités et bloqués.
- Augmentez les limites de débit après bascule sur SMTP.

> Quelle que soit l'option, l'application gère maintenant le cas « email non
> confirmé » : après l'inscription, un panneau **« Vérifie ta boîte mail »**
> propose de **renvoyer l'email** (avec anti-spam 30 s), et une tentative de
> connexion sur un compte non confirmé redirige vers ce même panneau.

### 2.2 URLs à renseigner (indispensable pour les liens)

Dans **Supabase → Authentication → URL Configuration** :

- **Site URL** : l'URL de production (`https://kurlabeauty.vercel.app` ou votre
  domaine final). En local : `http://localhost:3000`.
- **Redirect URLs** (ajoutez toutes les origines utilisées) :
  - `http://localhost:3000/**`
  - `https://kurlabeauty.vercel.app/**`
  - votre domaine final `https://votredomaine.com/**`

Si ces URLs ne sont pas listées, le lien de confirmation et le lien de
réinitialisation du mot de passe renvoient vers une erreur.

### 2.3 Checklist avant ouverture

- [ ] Email provider **activé** (Authentication → Providers → Email).
- [ ] Soit « Confirm email » **désactivé** (option A), soit **SMTP
      personnalisé configuré** (option B) — ne jamais lancer avec l'email
      par défaut de Supabase en production.
- [ ] **Site URL** et **Redirect URLs** renseignés pour chaque environnement.
- [ ] Variables d'environnement présentes côté navigateur **et** serveur :
      `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (ou `VITE_SUPABASE_ANON_KEY`),
      et côté serveur `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Sur Vercel, le déploiement a bien reçu ces variables (les redéployer
      si elles ont été ajoutées après coup).
- [ ] Le tunnel de production s'ouvre avec une clé anon valide : sur le site,
      l'inscription ne doit jamais afficher « configuration du service
      incomplète » (ce message apparaît si les variables navigateur manquent).

### 2.4 Vérification rapide de bout en bout

1. Ouvrez le site en navigation privée → **Se connecter / S'inscrire**.
2. Créez un compte test.
   - Option A : vous êtes connecté immédiatement, vous arrivez sur `/account`.
   - Option B : panneau « Vérifie ta boîte mail » → cliquez le lien reçu →
     reconnectez-vous.
3. Déconnectez-vous, reconnectez-vous avec le mot de passe.
4. Avec le compte admin (§1), ouvrez `/admin` : le dashboard s'affiche.

---

## 3. SÉCURITÉ — À FAIRE APRÈS LA PREMIÈRE CONNEXION

- Changez le mot de passe admin après la première connexion s'il a transité
  par un canal non sûr.
- Ne committez jamais `.env` (il est déjà ignoré par `.gitignore` :
  `.env*` sauf `.env.example`).
- La clé `service_role` ne doit apparaître **que** dans les variables serveur
  (Vercel/server), jamais dans une variable préfixée `VITE_`.
