# KURLA BEAUTY — GUIDE DE DÉPLOIEMENT GRATUIT & STACK LOCALE

Ce document explique comment exécuter et déployer l'application **KURLA Beauty** en local ou gratuitement, **sans nécessiter de facturation Google Cloud Run**.

---

## 🚀 1. Exécution Locale Immédiate (Port 3000)

L'application est configurée pour fonctionner de manière autonome sur votre machine avec **React + Vite + Express + Supabase + Stripe (mode test)**.

### Prérequis
- Node.js v22+ (requis par la version actuelle de `@supabase/supabase-js`)
- npm / npx

### Lancement du serveur dev
```bash
npm run dev
```

L'application est immédiatement accessible dans votre navigateur à l'adresse :
👉 **http://localhost:3000**

---

## 🔐 2. Configuration Supabase (URL de Redirection & Auth)

Dans votre **Dashboard Supabase** (dans *Authentication -> URL Configuration*) :

1. **Site URL** : Set to `http://localhost:3000`
2. **Redirect URLs** (URL de redirection autorisées) :
   - `http://localhost:3000/**`
   - `http://localhost:3000/account`
   - `http://localhost:3000/auth/callback`

---

## 🛡️ 3. Modèle de Sécurité des Clés API

Toutes les clés sensibles restent strictement protégées côté serveur :

| Clé | Usage | Visibilité Frontend |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Client Supabase | Public (OK) |
| `VITE_SUPABASE_ANON_KEY` | Auth & RLS client | Public (OK) |
| `VITE_STRIPE_PUBLIC_KEY` | Checkout Stripe JS | Public (OK) |
| `SUPABASE_SECRET_KEY` | Requêtes serveur d'administration | ⛔ **SECRETERIE SERVEUR SEULEMENT** |
| `STRIPE_SECRET_KEY` | Création de sessions de paiement | ⛔ **SECRETERIE SERVEUR SEULEMENT** |
| `STRIPE_WEBHOOK_SECRET` | Validation de signature Webhook | ⛔ **SECRETERIE SERVEUR SEULEMENT** |
| `GEMINI_API_KEY` | Diagnostics & conseils IA | ⛔ **SECRETERIE SERVEUR SEULEMENT** |

---

## 🌐 4. Déploiement Gratuit sans Cloud Run Payant

Pour héberger l'application en ligne gratuitement sans carte bancaire ni frais :

### Option A : Frontend sur Vercel / Netlify + Backend Express sur Render / Fly.io

1. **Frontend (SPA React)** :
   - Importez le projet sur **Vercel** ou **Netlify** (Offre gratuite permanente).
   - Définissez `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, et `VITE_APP_URL` dans les variables d'environnement Vercel.

2. **Backend (Node/Express `server.ts`)** :
   - Déployez gratuitement le serveur Node.js sur **Render.com** (Web Service gratuit) ou **Fly.io**.
   - Définissez `GEMINI_API_KEY`, `STRIPE_SECRET_KEY`, `SUPABASE_SECRET_KEY` et `PORT=3000`.

### Option B : Supabase Edge Functions (100% Serverless Gratuit)

- Convertissez les 3 endpoints API (`/api/stripe/create-checkout-session`, `/api/ai/assistant`, `/api/ai/routine-result`) en **Supabase Edge Functions** (Deno/TypeScript) gratuites.
- Supabase offre 500 000 invocations d'Edge Functions gratuites par mois.

---

## 🌐 4 bis. Déploiement Vercel en un seul service (recommandé)

L'application est un SPA **et** un serveur Express. Si vous déployez seulement le front, chaque appel
`/api/*` renvoie la page 404 de l'hébergeur (`404: NOT_FOUND` + `Code: NOT_FOUND` + `ID: cdg1::…`) et
chaque lien interne renvoie la même page, faute de repli SPA. Le dépôt embarque donc de quoi servir les
deux depuis **un seul** déploiement Vercel :

| Fichier | Rôle |
| :--- | :--- |
| `api/index.ts` | Fonction serverless qui expose l'application Express. Elle rejoue l'assertion de configuration production puis l'initialisation du store avant de servir, et répond `503` en nommant les variables manquantes au lieu de laisser toutes les routes échouer. |
| `vercel.json` | `buildCommand: vite build`, `outputDirectory: dist`, réécriture `/api/:path*` vers la fonction puis repli `/(.*)` vers `index.html` pour le routage SPA. |
| `.vercelignore` | Exclut `docs/`, `tests/`, `supabase/`, `data/` de l'upload. |

Variables à renseigner dans le projet Vercel :

```
SUPABASE_URL, SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY)
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_ENABLED=true, STRIPE_WEBHOOK_SECRET
VITE_APP_URL            # URL HTTPS publique du déploiement
EMAIL_PROVIDER          # resend | sendgrid | postmark
EMAIL_PROVIDER_API_KEY
VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_STRIPE_PUBLIC_KEY
```

En production le serveur refuse de démarrer si l'une manque : c'est volontaire, et le message liste
exactement ce qui manque. Ne mettez jamais `EMAIL_PROVIDER=console` en production.

Deux points vérifiés localement et non vérifiables sans déployer :

- le handler est exercé derrière un `http.Server` et répond sur les deux formes de chemin
  (`/api/health` et `/health`), donc il ne dépend pas de la sémantique de réécriture de la plateforme ;
- les fichiers statiques de `dist/` sont servis avant les réécritures, donc le repli SPA n'intercepte
  pas les assets.

Une route `/api/*` inconnue répond désormais `404` en JSON (`code: API_ROUTE_NOT_FOUND`) et non plus
`index.html` en `200` : un client qui appelle une route supprimée ne peut plus le confondre avec un
succès, et une API absente du domaine est distinguable d'une erreur métier.

## 🛍️ 5. Mode Stripe Test & Webhook

- Les sessions Stripe Checkout s'exécutent en mode Test.
- Lorsque le webhook n'est pas encore configuré avec `STRIPE_WEBHOOK_SECRET`, la commande reste en attente sécurisée (`payment_pending_webhook`) tout en générant l'identifiant de commande unique pour le client.

---

## 🧪 6. Tests locaux et intégration réelle Supabase

Les vérifications locales et les tests HTTP négatifs peuvent être lancés sans secret :

```bash
npm test
npm run test:authorization
```

Le serveur refuse de démarrer avec `NODE_ENV=production` si `SUPABASE_URL` et une clé secrète serveur (`SUPABASE_SECRET_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`) sont absentes.

Après avoir appliqué les migrations Supabase dans l'ordre, le test A/B réel crée temporairement deux clients et un administrateur, vérifie leurs JWT, l'isolation des commandes/tickets/expéditions/retours, puis supprime les comptes de test :

```bash
npm run test:integration
```

Cette commande exige un projet Supabase de test avec `SUPABASE_URL`, une clé service côté serveur et une clé publique d'authentification. Ne placez jamais ces valeurs dans Git.

Les remboursements administrateur appellent Stripe côté serveur avec une clé d’idempotence. La migration `20260827000000_refund_integrity.sql` doit être appliquée avant d’activer ce flux : elle protège le ledger et la restauration du stock contre les doubles traitements.

Le panier et le checkout utilisent également la migration `20260828000000_cart_order_integrity.sql`, qui ajoute les paniers canoniques, les politiques RLS, la réservation atomique du stock et l’idempotence des créations de checkout.

Les opérations métier utilisent enfin `20260829000000_operations_integrity.sql`. Appliquez-la après les migrations précédentes : elle déduplique les expéditions existantes en conservant leurs événements de suivi, impose une seule expédition par commande et élargit la contrainte des types de notifications aux statuts réellement émis par le serveur. Les nouveaux retours, tickets, messages, notifications et expéditions reçoivent des UUID compatibles avec Supabase.

### Durcissement production

- Le serveur désactive le fingerprint Express, ajoute des en-têtes de sécurité, corrèle les erreurs avec `X-Request-Id` et limite les corps JSON à 100 ko (webhook brut à 256 ko).
- Les API sont protégées par un rate limit local ; un rate limit partagé au niveau du proxy/CDN reste recommandé en multi-instance. Définir `TRUST_PROXY=true` uniquement derrière un reverse proxy maîtrisé pour obtenir l’IP client réelle.
- Les origines frontend séparées peuvent être autorisées avec `CORS_ORIGIN` (liste séparée par des virgules). Sans cette variable, aucune origine cross-site n’est ajoutée.
- En production, le serveur refuse de démarrer sans Supabase serveur, Stripe + webhook signé, URL publique HTTPS et fournisseur email réel.
- `EMAIL_PROVIDER=console` est strictement réservé au développement. Les providers `resend`, `sendgrid` et `postmark` utilisent leurs API avec timeout de 10 secondes ; Stripe utilise un timeout de 15 secondes et des retries réseau bornés.

### Notifications et emails transactionnels (chantier 13)

Le serveur centralise chaque événement métier dans `serverDb.notifyUser()` : la notification in-app et l’email partagent une clé d’idempotence, les préférences `inAppNotifications` et email sont appliquées, et chaque tentative est écrite dans `notification_logs`. Les statuts distinguent explicitement :

- `sent` / `delivered: true` : le provider réel a accepté l’email et son identifiant est conservé ;
- `logged` / `delivered: false` : mode `console` en développement ou email désactivé par les préférences ; ce n’est jamais présenté comme un envoi ;
- `failed` / `delivered: false` : configuration ou API fournisseur en erreur, avec le message journalisé.

Les déclencheurs couvrent la création et confirmation de compte, les étapes de paiement, préparation, emballage, expédition et livraison, retours/remboursements, support, stock faible et rappels de routine. La migration `20260840000000_notifications_delivery_operations.sql` ajoute les clés de déduplication, le provider/ID message dans les logs et les notices de compte. Appliquez-la après `20260839000000_atomic_stock_lifecycle.sql`.

Pour la production :

1. Choisissez `resend`, `sendgrid` ou `postmark` et placez uniquement la clé API dans les variables secrètes du déploiement (`EMAIL_PROVIDER_API_KEY`).
2. Vérifiez le domaine d’envoi chez le fournisseur. Publiez exactement les enregistrements **SPF** et **DKIM** fournis par celui-ci, puis attendez leur validation avant de passer `EMAIL_FROM` sur ce domaine. Ajoutez `EMAIL_REPLY_TO` pour les réponses support.
3. Gardez `EMAIL_PROVIDER=console` en local uniquement : le serveur refuse ce provider avec `NODE_ENV=production`.
4. L’email de confirmation d’identité est géré par Supabase Auth ; le trigger de profil crée en parallèle les notifications in-app `account_created` et `email_confirmation_pending`. Configurez l’URL de redirection Supabase sur l’URL publique HTTPS de l’application.
5. Utilisez `GET /api/admin/notification-logs` avec un JWT administrateur pour auditer les envois, les erreurs et les emails simplement journalisés.

## 🧪 6 bis. Liaison des stores et tests déterministes

`KURLA_STORE_MODE` contrôle la liaison des stores, côté serveur **et** client public :

| Valeur | Effet |
| :--- | :--- |
| `auto` *(défaut)* | Base réelle si `SUPABASE_URL` + une clé secrète sont présentes, sinon repli mémoire. |
| `memory` | Repli mémoire forcé, quelle que soit la configuration présente. |
| `server` | Base réelle exigée ; `describeStoreBinding()` signale `unsatisfied` si les identifiants manquent. |

Avant ce garde, la présence de variables d'environnement suffisait à basculer les stores sur la base
réelle : `npm test` passait sur une machine et échouait sur une autre, sur des identifiants de fixture
non UUID et des contraintes de clé étrangère. Tous les bancs unitaires forcent désormais `memory`, et
`tests/store_binding.test.ts` verrouille ce comportement. Le mode `memory` couvre aussi le client
public, sinon un banc construirait un transport realtime et dépendrait de la version de Node.

```bash
npm test                 # suite unitaire, déterministe quel que soit l'environnement
npm run test:store-binding
npm run test:realdb      # pré-vérification + les bancs conçus pour une base réelle
```

`npm run test:realdb` commence par `tests/real_database_preflight.test.ts`, qui crée puis supprime un
compte de test : c'est le point de rupture réel observé lors de l'application des migrations, où GoTrue
renvoyait `Database error creating new user` parce qu'un trigger échouait en cascade. Sans cette étape,
une suite annoncée « base réelle » peut échouer sans explication — ou tourner en silence sur le repli
mémoire et passer pour verte.

Les types React (`@types/react`, `@types/react-dom`) sont désormais installés. Sans eux, `useState`
valait `any` et aucun composant n'était typé : `tsc --noEmit` donnait une garantie bien plus faible
qu'annoncé.

## 🔐 7. Rotation des secrets exposés

Les anciennes clés ou mots de passe présents dans l'historique public doivent être considérés comme compromis. Depuis les consoles Supabase, GitHub et de l'hébergeur :

1. révoquez les anciennes clés ;
2. générez de nouvelles clés ;
3. mettez à jour uniquement les variables d'environnement serveur ;
4. vérifiez les logs et les secrets CI/CD ;
5. activez la MFA sur les comptes administrateurs.

Le dépôt ne peut pas effectuer ces révocations à votre place.
