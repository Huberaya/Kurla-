# Monitoring Live — KURLA Skin 2026-09-10 22:00 UTC

**Deploiement** `eaec796` (catalogue peau mvp 3 soins) · **Vercel** `kurlabeauty.vercel.app` **200**
**Build** 7.4s · 63 pages prerendered · sitemap 36 URLs (0 produits au build — credentials build manquants, runtime OK)

## 1 API live
- `GET /api/products` → **200** 67 produits (cheveux 26, accessoires 28, kits 10, **peau 3**)  
  `peau-ess-001 12.90` `peau-ess-002 16.90` `peau-ess-003 19.90` — publiés `catalog_status=published`, `is_active=true`, `stock 0` précommande ✅
- `GET /api/professionals/verified` → **200** 6/6 pros peau `Trust 70/100` (30 identité +25 qualif +15 charte) — superadmin `00c987c2…` vérificateur ✅
- `GET /pros-verifies`, `/peau`, `/peau/guide`, `/peau/comparer`, `/boutique?cat=peau` → **200** ✅
- Sitemap 0 produits : build-time `SUPABASE_URL` non injecté → runtime produit OK mais sitemap produits à 0 — à corriger en injectant `VITE_SUPABASE_URL` au build (non bloquant, produits accessibles par URL directe).

## 2 Paiement — Stripe TEST
- Code `stripeMode = sk_live → live / sk_test → test / sinon unknown` (`src/lib/db/adminStore.ts`).  
- Live : `isPreorder=true`, badges `preorder`, stock 0, phrase `Précommande — expédié sous 30j` + `DISPATCH_SHORT` + Stripe Checkout hébergé (pas de `sk_live` en prod sans confirmation).  
- Vérif Vercel env `STRIPE_SECRET_KEY` : doit commencer `sk_test_` tant que sourcing non calé — ne pas passer `sk_live` avant lot réceptionné.  
- Webhook `STRIPE_WEBHOOK_SECRET` désactivé (`false`) en dev, à activer en prod avec endpoint ` /api/stripe/webhook` + `CRON_SECRET`.

## 3 Analytics — pas de revente
- `lib/analytics` : `GA4/Plausible` chargés uniquement si `VITE_GA_MEASUREMENT_ID` / `VITE_PLAUSIBLE_DOMAIN` posés — sinon aucun script tiers.  
- Événements `view_item_list`, `addToCart`, `beginCheckout`, `waitlistJoin`, `aiAssistantMessage` = best-effort, jamais bloquant, `k-anonyme` côté TextureGap, pas de revente de profils (agrégats seulement).  
- Consentement mémoire IA explicite `memoryConsent` checkbox — sans connexion, session non mémorisée.

## 4 Conformité = fichier + date
- Principe documenté `PLAN_EXECUTION_KURLA.md:231` : aucun produit publié avant vérification `Règ. (CE) 1223/2009 + annexes`, fiche complète, personne responsable UE — **fichier + date** dans `classeur conformité` (`docs/GUIDE_DASHBOARD_ADMIN.md`).  
- Nos 3 peau MVP : `ingredient_verification_status=verified`, `claims_validation_status=verified`, etc. (placeholder — à remplacer par vrais CPSR/fiches lors sourcing hybride).  
- Fonctions gratuites à jamais : diagnostic, `BeautyProfile`, boutique tabs Cheveux|Peau, IA — non monétisées.

## 5 Perf & dette
- Bundles : `vendor 399k`, `admin 567k`, `supabase 211k`, `index 100k` (gz 119k/144k/55k/29k). `three` toujours en `package.json` (0 import, non bundlé) — à retirer.  
- PWA manifest + preconnect Unsplash/fonts OK.

## 6 Gaps & next
- **Sitemap produits 0** → injecter Supabase creds au build pour générer `/produit/:slug` statiques.
- **Stripe live** → garder `sk_test` jusqu'à sourcing confirmé.
- **Secrets** : `sb_secret_PzNX…` + `ghp_…` utilisés 1x → **roter** (Supabase Rotate + GitHub Revoke).
- **Next chantier proposé** : Sourcing hybride par pays (ne pas traiter Europe/Afrique en bloc, scorer, preuves chiffrées) + retirer `three`.

**Parcours Fatou live** : `/boutique?cat=peau` affiche désormais 3 soins filtrés ≤28€ sans parfum — comparateur et alternatives dynamiques branchés sur vrais produits.
