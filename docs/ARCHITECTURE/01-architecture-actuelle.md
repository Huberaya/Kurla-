# 01 — Architecture actuelle (état vérifié au 11/09/2026)

> Tout ce qui suit a été vérifié dans le code, pas répercopié des documents.
> Les chiffres sont mesurés sur l'arbre du dépôt.

---

## 1. Stack technique

| Couche | Technologie | Notes |
|--------|-------------|-------|
| Frontend | React 19 + Vite 6 + TypeScript strict | SPA avec routing client-side (`src/lib/router.ts`, pushState) |
| Styles | Tailwind CSS 4 (`@tailwindcss/vite`) | Tokens de marque dans `src/index.css` (voir doc 11) |
| Motion | `motion` 12 (composants `Reveal`), CSS keyframes maison | `prefers-reduced-motion` respecté globalement |
| 3D | three.js 0.185 | 2 composants vivants (preview diagnostic, carte pro) ; chunk séparé au build |
| Backend | Node.js ≥ 22 + Express 4 | `server.ts` (2 830 lignes) = composition, les domaines sont hors du fichier |
| BDD | Supabase (PostgreSQL + Auth + Storage) | 83 migrations, 123 tables ; fallback mémoire pour tests/dev |
| Paiement | Stripe 22 (Checkout, mode test en pré-prod) | Webhooks signés + idempotence (`stripe_events`) |
| IA | `@google/genai` — Gemini `gemini-3.5-flash` (configurable `GEMINI_MODEL`) | **Côté serveur uniquement** ; clé jamais dans le bundle (vérifié) |
| PWA | manifest + service worker (`public/sw.js`) | Enregistrement production uniquement |
| Tests | 121 bancs `tsx` + Playwright (e2e) | 119 lancés par `npm test` (mode mémoire) + intégrations réel-DB séparées |
| Déploiement | Vercel (région cdg1) + fonction serverless `api/index.ts` | Cron Vercel (`/api/cron/retention` quotidien) |

## 2. Organisation du code

```
server.ts                 # Composition Express : middlewares + routes « cœur »
api/index.ts              # Entrée Vercel (wrap du serveur)
src/
  main.tsx / App.tsx      # Bootstrap front, modaux différés (panier, IA, …)
  pages/        (66)      # Une page = un module, lazy-chargé
  components/   (78)      # UI : génériques, admin (panels), 3d, diagnostic, product…
  context/                      # AuthContext (profil + identité)
  services/     (8)             # Clients API front (productService, …)
  lib/          (165)
    db/       (43 stores)       # Un module par domaine, fonctions pures (store, …args)
    ai/                           # Contrats/garde-fous IA côté client
    knowledge/ (3 vivants)        # Connaissances produits/peau/outils
  server/
    routes/     (33)            # Routes API par domaine (register*Routes)
    ai/                         # Assistant, catalogue contraint, client Gemini
    payments/                   # Stripe client, réconciliation, abonnement KURLA+
    auth.ts                     # Identité : jeton Supabase uniquement
    http.ts                     # Rate limiting, headers sécurité, CSP, erreurs sûres
    compliance.ts               # Graphe de juridiction (règlements par pays)
    seoResolver.ts              # Rendu SEO (prerender + metadata + hreflang)
supabase/migrations (83)        # Schéma + RLS + fonctions SECURITY DEFINER
tests/          (121)           # Bancs mémoire + intégrations + inventaires de référence
scripts/        (40+)           # Builds, seeds, générateurs de migrations, outillage
```

**Chiffres mesurés :**

- **298 routes API** (inventaire `tests/fixtures/route_inventory.json`, généré depuis le code)
- **303 méthodes de store** (inventaire `tests/fixtures/store_api_inventory.json`)
- **66 pages** déclarées dans `src/lib/routeTable.tsx` (71 entrées de route)
- **83 migrations**, **123 tables**
- **121 bancs de tests** (119 dans la suite `npm test`, 2 intégrations réel-DB)

## 3. Frontend

- **Routing** : `routeTable.tsx` = source de vérité déclarative (chemin, composant,
  metadata SEO, indexabilité, protection). `router.ts` fait le mapping pushState.
  Aucun routeur de fichiers : l'inventaire est vérifié par banc
  (`chantier_7_routing` : 70 routes déclaratives, 48 URLs historiques résolues,
  40 indexables, 18 protégées).
- **State** : Context API (`AuthContext` : user + profil beauté + actions), `useState`
  local pour les filtres boutique. Pas de store global — le serveur est l'autorité
  (prix, stock, publiabilité) ; le front ne fait que l'interroger.
- **Performance front** : modaux hors chemin critique différés (`requestIdleCallback`),
  fonts non bloquantes (`preload` + bascule `public/fonts.js`), `content-visibility`
  sur les sections, chunks manuels (`vendor`, `supabase`, `three`, `admin`, `ai-vendor`).
- **PWA** : installable, service worker production-only, périmètre excluant `/api/`.

## 4. Backend

- `server.ts` **compose** : middlewares (security headers, rate limit global
  300 req/min/IP, parsing JSON limité 100 ko / 2 Mo pour les feeds catalogue),
  routes cœur (panier, commandes, checkout, webhook Stripe, cron) et appel des
  `register*Routes` des 33 modules de domaine.
- **Plomberie** (`src/server/http.ts`) : rate limiting par nom d'endpoint
  (AI 30/min, questions/avis 60/min, …), en-têtes de sécurité, `X-Request-Id`,
  erreurs sans détail technique en production, CSP (voir doc 09).
- **Identité** (`src/server/auth.ts`) : **l'identité ne vient que du jeton Supabase**.
  Les en-têtes `x-user-id`/`x-user-email` sont délibérément ignorés (fournis par le
  client). Rôles : `admin`, `superadmin`, `support`, `brand`, `professional`,
  `customer` — guards `requireAdmin`/`requireSupport`/`requireBrand`/`requireUser`.
- **Règle d'écriture du store** : chaque domaine est un module de fonctions pures
  `(store, ...args) => …` recollé sur l'instance par `bindDomain`
  (`src/lib/db/bind.ts`). Ajouter un domaine = un module + une ligne de binding +
  les inventaires régénérés. C'est la suite qui verrouille la surface (303 méthodes).

## 5. Base de données

- **Supabase PostgreSQL** : 83 migrations versionnées, 123 tables.
- **RLS** : isolement strict par propriétaire (`auth.uid() = id`) sur profils,
  commandes, paniers, notifications, tickets support.
- **Fonctions SQL `SECURITY DEFINER`** : `is_admin()`, `get_current_user_role()`
  avec `SET search_path = public` ; politique `WITH CHECK` interdisant l'auto-élévation
  en `admin`.
- **Stock atomique** : cycle `payment_pending_webhook → paid → refunded` avec
  réservation/libération/définitivation sous verrous PostgreSQL ; restauration de
  stock idempotente par ligne de remboursement.
- **Idempotence** : table `stripe_events` + claim atomique avant traitement ;
  remboursements avec clé d'idempotence + `finalize_refund` atomique.
- **Mode mémoire** : `KURLA_STORE_MODE=memory` — même surface de store, données
  en RAM ; c'est lui qui fait tourner les 119 bancs sans infrastructure.

## 6. Authentification & gestion utilisateurs

- Supabase Auth (jetons vérifiés serveur via service client).
- Profil : `profiles` (rôle, identité) + **`beauty_profiles` = KURLA ID**
  (le profil beauté unique, cheveux + peau ensemble, avec historique daté,
  confiance calculée par champ, suppression et export RGPD, photos privées
  derrière consentement explicite — voir doc 06).
- Récupération de mot de passe, changement de mot de passe, gardes admin/suppor
  vérifiés par bancs négatifs (`authorization.test.ts`, `kurla_admin_role_guard`).

## 7. Catalogue & produits

- **Un seul catalogue** : table `products` (+ `product_variants`, `inventory`,
  `product_images`). Catégories : `cheveux`, `peau`, `accessoires`, `kits`,
  `hommes`, `enfants`.
- **Gouvernance à 7 validations** : une fiche n'est publique qu'avec
  `catalog_status='published'` + 7 statuts de vérification (ingrédients, allégations,
  images, stock, certifications, traductions, marque) + `isPublishableProduct`.
  Trust Score public calculé à partir des colonnes de statut (jamais une note inventée).
- **La couche peau n'est pas un second catalogue** : `skinCatalogStore.ts` lit
  `products` (catégorie `peau`) et produit des **rapports** (readiness C1,
  acceptation héros). Le catalogue public peau et le catalogue cheveux partagent la
  même table, le même pipeline de publication, le même schéma.
- **Formulations cibles** : les 13 fiches de `kurlaSkinRange.ts` sont des cibles de
  formulation (staging, testées) : `generate-skin-range-sql.ts` les projette en
  `formulation_target` — jamais achetables, visibles sans stock ni prix engageant
  via `/api/peau/gamme`.
- **Ingrédients** : graphe ingrédients (231 ingrédients, 36 liaisons produit,
  44 incompatibilités mesurées en base) + vocabulaire CosIng + restrictions UE
  (Règlement (CE) n°1223/2009) en fichiers sources de migration.
- **Lecture** : `/api/products` (liste publique) + `/api/products/:productId`
  (fiche unitaire — ajoutée dans cette session, doc 10) + sous-ressources
  (`/trust`, `/verification`, `/ingredients`, `/compliance`, `/archetype-ratings`…).

## 8. KURLA Hair (pôle de référence)

- **Diagnostic** : 8 étapes visuelles (texture 3A–4C, porosité, densité, casse,
  cuir chevelu, routine, objectifs, budget, sensibilités) → `kurlaFit` (règles
  explicites, `score: null` plutôt qu'une note inventée) → résultat via le contrat
  partagé `diagnosticResult.ts`.
- **Boutique** : filtres besoin (10 besoins cheveux + alias), marque, communauté
  afro, pays, recherche texte/ingrédient, tri fit/prix/avis ; hub de besoin
  (`/besoin/:slug`), pages texture (3A–4C).
- **Routines** : builder (étapes fixed-order hair), routines adaptatives
  (`adaptiveRoutine` : fréquence, temps, budget, étapes non couvertes), kits K01–K10,
  tracker quotidien, économie réelle (coût/mois, rendement).
- **Suivi** : Shelf (étagère : produits ouverts, verdict, réassort, scan INCI/
  code-barres), journal de progression, timeline protective styles, wash day,
  Beauty Journey (photos + tendances).
- **Spécifique cheveux** : protective styles (épisodes sous perruque, traction),
  kids, hommes, communauté/UGC, inspirations.
- **IA** : même assistant que la peau, prompt cheveux (voir doc 05).

## 9. KURLA Skin (pôle construit sur la plateforme)

- **Diagnostic** : 12 étapes complètes **ou 5 étapes express** (mobile-first),
  phototype I–VI recueilli **avec consentement explicite**, carnation, sous-ton,
  HPI (auto-déclaration, jamais un diagnostic médical), budget, sensibilités.
  Le résultat passe par le **même** contrat `diagnosticResult.ts` que les cheveux
  et le **même** `/api/beauty-profile` (SSOT vérifié — doc 04).
- **Connaissance peau** : 3 profils (`acné`, `pigmentation`, `sécheresse`) sourcés,
  branchés sur le résultat de diagnostic (la base n'est plus lue par personne).
- **Boutique peau** : 15 besoins peau, filtres budget / sans parfum / SPF invisible,
  scoring explicable `skinRecommendation` (incompatibilités d'actifs rétinol×AHA,
  whitecast phototype V–VI, boost HPI niacinamide, sensibilité), comparateur 2–4.
- **Routine peau** : matin 6 / soir 8 / hebdo 3, 3 niveaux (Essentielle/Équilibrée/
  Experte), règles par phototype/sensibilité, kits KPEAU-01..03 (formulation target
  tant que le sourcing C1 n'est pas accepté — les kits ne se verrouillent pas
  sur des preuves inventées).
- **Suivi peau** : journal persistant (`skin_journal_entries`, ressenti 1–5,
  jalon J+0/J+7/J+30, photo consentie), observance matin/soir (`skin_observance_days`),
  export/suppression RGPD inclus.
- **État catalogue** : **3 produits peau live** (Essentielle : nettoyant, crème
  céramides, SPF 50) — le goulot est le sourcing réel (CPNP/DP, preuves), pas le code.

## 10. Diagnostic (commun)

- **Un contrat de résultat** : `src/lib/diagnosticResult.ts` (`DiagnosticResultModel`)
  servi aux deux pôles — champs de profil, certain/unknown, priorités, routine
  matin/soir/hebdo, produits avec **disponibilité explicite** (available / preorder /
  pending_validation / formulation_target / unavailable), suivi (première observation,
  prochaine, liens journal/shelf), avertissements, profil de connaissance peau.
- **Une persistance** : `PUT /api/beauty-profile` → `beauty_profiles` (un seul
  enregistrement par utilisateur, historique daté, confiance par champ).
- **Une page de résultat** : `DiagnosticResultPage` (hair + skin).
- Les flux de questions restent spécifiques (c'est du domaine métier, pas de la
  plateforme) : 8 étapes hair, 12/5 étapes skin.

## 11. IA

- **Gemini `gemini-3.5-flash`** (configurable), appelé **uniquement côté serveur**
  (`src/server/ai/`), avec : catalogue contraint (l'IA ne « voit » que des produits
  publiés projetés), triage médical (`medicalTriage`), disclaimer constant,
  JSON structuré validé, revue humaine possible, sessions persistées.
- **Ce qui n'est PAS de l'IA** (règle tenue) : le scoring `kurlaFit` et
  `skinRecommendation` sont des **règles explicites** ; le moteur
  `recommendationEngine` est un orchestrateur rule-based qui n'appelle l'IA que
  pour la formulation/le conseil de langage — jamais pour le verdict produit.
  Détail et arbitrage dans la doc 05.

## 12. Recommandations

- **Un moteur orchestrateur** : `recommendationEngine.ts` (CHANTIER 5) — contexte
  réel (profil, Shelf, observations, abandons → ingrédients évités), budget,
  juridiction (règlements par pays), incompatibilités d'ingrédients, produits
  possédés (jamais recommandé ce qu'on a déjà), **chaque ajustement de score est
  traçable et expliqué** (« pourquoi ce produit pour cette personne »).
- `kurlaFit` = règles explicites cheveux (conservé tel quel, actif de la plateforme).
- `skinRecommendation` = règles explicites peau (incompatibilités actifs, whitecast,
  HPI, sensibilité).
- Recherche sémantique : `semanticSearch.ts` (lexique de besoins, intent parsing) —
  sans embedding externe, déterministe et testée.
- Garde-fous de domaine : un diagnostic peau ne recommande pas des produits cheveux
  (corrige, banc C-07) ; les formulations cibles ne sont jamais injectées dans une
  routine (banc C3).

## 13. Routines

- **Builder cheveux** : étapes ordonnées, templates kits, personnalisation par étape,
  partage par slug, sauvegarde serveur (`saved_routines`).
- **Adaptatif** : `adaptiveRoutine` (fréquence, durée, budget, étapes manquantes,
  feedback d'observation) — la routine est un système, pas une page statique.
- **Peau** : `skinRoutine` (matin/soir/hebdo × 3 niveaux) + `skinObservance`.
- **Conflits** : `routineConflicts.ts` — les incompatibilités sont calculées sur
  **ce que l'utilisateur applique réellement** (Shelf), pas seulement sur les
  recommandations (banc `routine-conflicts`).

## 14. E-commerce

- **Panier** : normalisé et validé côté serveur, remplacement atomique,
  déduplication des lignes, idempotence checkout, prix **toujours relus en base**
  (un prix falsifié par le client est rejeté).
- **Checkout** : Stripe Checkout (mode test en pré-prod), TVA par juridiction
  (`checkoutVat`, `vatRateForCountry`, reverse charge, VIES pour B2B), coupons,
  validation de vérité catalogue avant paiement (`isCheckoutEligibleProduct`).
- **Commandes** : cycle de vie complet + historique daté, suivi colis (transporteur
  saisi par l'admin — pas d'URL de suivi inventée), retours liés aux quantités
  commandées, support ticket bidirectionnel, notifications (in-app + email,
  préférences utilisateur, déduplication, logs de livraison).
- **Abonnements** : KURLA+ (membership via Stripe subscription, activation
  idempotente sur paiement confirmé + montant vérifié), abonnements produit,
  fidélité (progression + rédemption), parrainage (anti-abus : auto-parrainage refusé).
- **Précommande** : promesse datée, stock 0 explicite, pas de date inventée.

## 15. Marketplace & professionnels

- Pros (coiffeurs texturés, barbiers, nattiers, pros peau) : application →
  vérification → **Trust Score public** (identité 30 + qualification 25 + charte 15),
  annuaire vérifié `/api/professionals/verified`, réservation de consultation,
  endorsements, conformité par juridiction.
- Marques : tests produit (participations, observations), contrats + factures,
  espace marque (rôle `brand` cloisonné : ses tests, rien d'autre).
- Créateurs : programme d'application + commission.
- Communauté : UGC, avis/questions produits modérés, communauté dédiée.

## 16. Administration

- `/admin` : 30+ panels (catalogue CRUD + import CSV/fournisseur + 7 validations,
  fournisseurs, lots, sourcing (items, RFQ, stratégie pays), cockpit opérations,
  kitting, pros, peau (C1–C28 opérationnels), stratégie, facturation…).
- Toutes les routes admin sont vérifiées par inventaire
  (`admin_route_inventory` : appelants de chaque route) et par tests de garde de rôle.
- Cockpit de lancement France (C6) : métriques réelles depuis les tables,
  `available: false` quand la source est absente — jamais de zéro inventé.

## 17. Analytics & notifications

- **Analytics** : événements produit (`view_item_list`, `addToCart`, `beginCheckout`)
  ; GA4/Plausible chargés **uniquement si configurés** (aucun script tiers sinon).
- **Notifications** : dispatch centralisé (in-app + email), préférences par
  utilisateur, déduplication, logs provider/statut, rappels de routine, alertes
  stock faible. Provider email : console en dev (refusé en production, verrouillé),
  resend/sendgrid/postmark en prod.
- **Observabilité** : `X-Request-Id` sur toute réponse, logs JSON des erreurs 5xx
  avec corrélation, email health, cockpit traction (MAU, D30, NPS, k-anonymat).

## 18. Recherche, filtres, SEO, i18n

- **Recherche** : `SearchModal` (auto-complétion), recherche sémantique par intent,
  recherche par ingrédient, code-barres (Shelf), `SmartSearchPage`.
- **SEO** : prerender 57+ pages, sitemap produits + pages, metadata par route
  (70 routes déclaratives), hreflang FR/EN, JSON-LD produits, URLs stables
  (FR = locale nue, préfixées pour les autres).
- **i18n** : `fr` (défaut) + `en` ; dictionnaire typé — le compilateur refuse une
  clé absente d'une des deux locales. Chrome (nav/footer) traduit ; **corps des
  pages : à traduire** (doc 08, P1).
- **PWA mobile-first** : shell PWA, responsive systématique, diagnostics
  mobile-first (mode express peau par défaut sur mobile).

## 19. Déploiement

- Vercel (cdg1) : build `vite build` + sitemap + prerender + `esbuild server.ts` ;
  `api/index.ts` = fonction serverless (60 s) ; réécritures → tout passe par la fonction.
- Cron Vercel quotidien `/api/cron/retention` (protégé `CRON_SECRET`).
- Supabase (CDN) + Stripe + email provider configurables par environnement.
- `TRUST_PROXY` explicite (anti-spoofing X-Forwarded-For contre le rate limiter).
