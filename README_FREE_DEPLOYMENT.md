# KURLA BEAUTY — GUIDE DE DÉPLOIEMENT GRATUIT & STACK LOCALE

Ce document explique comment exécuter et déployer l'application **KURLA Beauty** en local ou gratuitement, **sans nécessiter de facturation Google Cloud Run**.

---

## 🚀 1. Exécution Locale Immédiate (Port 3000)

L'application est configurée pour fonctionner de manière autonome sur votre machine avec **React + Vite + Express + Supabase + Stripe (mode test)**.

### Prérequis
- Node.js v18+ 
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

## 🧪 6. Exécution des Tests Automatisés Supabase

Pour vérifier les migrations SQL et les règles RLS multi-utilisateurs (Compte A vs Compte B) :

```bash
npm test
```
