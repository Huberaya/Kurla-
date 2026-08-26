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

## 🔐 7. Rotation des secrets exposés

Les anciennes clés ou mots de passe présents dans l'historique public doivent être considérés comme compromis. Depuis les consoles Supabase, GitHub et de l'hébergeur :

1. révoquez les anciennes clés ;
2. générez de nouvelles clés ;
3. mettez à jour uniquement les variables d'environnement serveur ;
4. vérifiez les logs et les secrets CI/CD ;
5. activez la MFA sur les comptes administrateurs.

Le dépôt ne peut pas effectuer ces révocations à votre place.
