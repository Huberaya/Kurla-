# AUDIT EXISTANT KURLA BEAUTY — Base pour KURLA SKIN
**Date : 09/09/2026 — Phase 1 / Chantier Peau**
**Auteur : Product Manager — audit code + fonctionnel + UX**

> Règle : ne rien recréer. Étendre, mutualiser. Ce document est la référence avant toute modif peau.

---

## 1. AUDIT TECHNIQUE

### 1.1 Architecture des dossiers

```
/src
 ├─ App.tsx + main.tsx + router.ts + routeTable.tsx
 ├─ pages/           (53 pages)
 ├─ components/      (60+ : génériques + 3d + landing + diagnostic + product)
 ├─ lib/             (80+ modules : ai/, db/, knowledge/, etc.)
 ├─ context/         (AuthContext)
 ├─ services/        (productService, etc.)
 ├─ data/            (brandImages, inspirations)
 ├─ server/          (Express, routes, db)
 └─ types.ts
/supabase/migrations (61 migrations)
public/ + data/ + scripts/
```

**Framework :** React 19 + Vite 6 + Tailwind 4 + motion 12 + three.js (peu utilisé) + Supabase JS 2.112 + Express 4 (SSR/API) + Stripe 22. Localisation via `lib/translations.ts` + `I18nProvider`.
**Build :** `vite build` → `dist/` + `dist/server.cjs` ; SEO prerender 57 pages ; sitemap 31 URLs.

### 1.2 Frameworks & dépendances clés

- **React 19** (SPA, pas Next), **Context API** seul (pas Redux/Zustand) → `AuthContext` porte `profile`, `hair_type`, `skin_type`, `concerns`, `texture`, `toneDepth`, etc.
- **Supabase** : Postgres + Auth + Storage ; client côté browser (`VITE_SUPABASE_*`) + service_role côté serveur (`SUPABASE_SECRET_KEY`)
- **State** : `useState`/`useEffect` + Context ; pas de store global ; panier = `CartDrawer` + `services/productService` + `lib/serverDb` côté serveur (mémoire + DB)
- **IA** : `@google/genai` gemini-3.5-flash via `lib/ai/*` (`systemPrompt.ts`, `contracts.ts`, `guardrails.ts`, `assistant.ts`)
- **Paiement** : Stripe Checkout (TEST, précommande 3-5j)
- **Tests** : Playwright e2e, `tests/kurla_taxonomy.test.ts` (garde vocabulaire)

### 1.3 Pages existantes (53)

**Cheveux (cœur) :** `HomePage`, `BoutiquePage` (cat `cheveux|peau|accessoires|kits|hommes|enfants` + ?cat), `ProductDetailPage` (`/produit/:slug`), `DiagnosticHairPage` + `DiagnosticProtectivePage` + `DiagnosticKidsPage` + `DiagnosticResultPage`, `RoutinesPage` + `RoutineBuilderPage` + `RoutineDetailPage` + `RoutineIdPage` + `RoutineTrackerPage`, `ToolsPage`, `WashDayPage`, `ProtectiveStylesPage`, `HairIdPage`/`KurlaIdPage`, `TextureGapPage`.

**Peau (déjà amorcé, mais faible) :** `DiagnosticSkinPage` (existe mais 5 questions seulement vs 18 cheveux), `MelaninSkinPage` (`/melanin-skin`), `SkinIdPage`, `Ingredient*` (3 pages), `NeedHubPage` (`/besoin/:slug` 12 besoins hydrater→barbe, sert cheveux+peau).

**Transverse :** `AiBeautyAssistantPage` (`/assistant`), `ProfessionalsPage` + `ProfessionalDirectoryPage` + `Pro*` (5 pages), `CommunityPage`, `InspirationsPage`, `JournalPage`, `SavedPage`, `CustomerAccountPage` (`/compte` avec `BeautyHub`), `AdminDashboardPage` (catalog, suppliers, batches, sourcing, etc.), `LegalPage`/`PrivacyPage`, `SmartSearchPage`, `BrandSpacePage`.

**Routes :** `routeTable.tsx` déclare toutes les routes (fichier source de vérité, pas un routeur fichier) ; `router.ts` gère `pushState`.

### 1.4 Composants — génériques vs spécifiques cheveux

**Génériques (mutualisables tels quels) :**
`Navbar`, `Footer`, `HeroSection`, `ProductCard` (via `BoutiquePage` grid), `CartDrawer`, `SearchModal`, `AuthModal`, `BrandImage`, `CategoryWaitlist`, `BenefitStrip`, `Reveal`/`MagneticButton` (motion), `ProtectedRoute`, `CatalogAdminPanel` (CRUD), `SupplierAdminPanel`, `BatchAdminPanel`, `KittingAdminPanel`.

**Spécifiques cheveux (à généraliser ou dupliquer pour peau) :**
`TextureGallerySection` (3A-4C visuels), `DiagnosticVisuals` (cheveu), `HairSkinSection` (landing), `KidsMenSection`, `RoutineCarouselSection`, `WashDayPage`-components, `ProtectiveTimelinePage`, `TextureGapPage` (rapport B2B texture_gap), `ToolsPage` (guide outils cheveux).

**Hooks/Services partagés :**
`useProducts()` (`services/productService` → `fetch('/api/products')` → `lib/db/catalogStore.getProducts`), `useAuth()` (`AuthContext` → `beautyProfile.ts` + `supabase.auth`), `getPublicProducts`, `getProductReviews/Questions`, `joinProductWaitlist`, `createProductSubscription`, `analytics.viewItemList`, `semanticSearch.parseSearchIntent/searchByIntent`, `recommendationEngine`, `kurlaFit`, `needsHub`, `taxonomyReference`, `archetype`.

### 1.5 Modèles de données

**`types.ts` — Product :**
```ts
Product { id, slug, name, brand, category ('cheveux'|'peau'|'accessoires'|'hommes'|'enfants'|'kits'), subCategory, price, rating, inStock, image, galleryImages, keyIngredients, ingredients, inci, description, benefitPrimary, targetHairTypes, targetSkinTypes, texture, needs[], concerns[], countryAvailability[], catalogCategoryTags[], etc. }
```

**`beautyProfile.ts` — BeautyProfile :**
```ts
BeautyProfile { hair?: { texture: string, porosity, density, scalpConcerns[], breakage, dryness }, skin?: { skinType, concernZones[], toneDepth }, toneDepth, concerns: string[], ... }
```
→ Le profil peau existe mais **très minimal** (skinType + concernZones + toneDepth). Pas de phototype détaillé, pas de routine actuelle, pas de budget, pas de sensibilités.

**`lib/db/catalogStore.ts` — `products` table (colonnes) :**
`id, slug, name, brand, category, subcategory, sub_category_tag, price, original_price, stock_quantity, is_active, is_preorder/badges, description, benefit_primary, image_url, hair_types, skin_types, concerns (array), country_availability, catalog_status, *_verification_status (7), image_ownership_status`.

**Taxonomie contrôlée (`kurla_taxonomy_terms` + `taxonomyReference.ts`) :**
- `need` : 18 termes (hydrater_cheveux … barbe … protection_solaire)
- `texture` : 3A-4C
- `routine_step` : cleanse … skin_spf
- `market` : FR/BE/CH/CA/CI/SN/DOM/AFR/INT
- `tone_depth` : fair…rich (phototype peau, utilisé pour mélanine mais pas affiché en boutique)

**Autres stores (`lib/db/`) :** `adminStore`, `taxonomyStore`, `sourcingStore`, `supplierStore`, `abandonedCartStore`, `brandTestStore`, `textureGapStore`, `intelligenceStore`.

### 1.6 State management

- **Context API uniquement** (`AuthContext` fournit `user`, `profile`, `hair`, `skin`, `updateProfile`).
- Pas de Redux/Zustand/Jotai. Les filtres boutique sont en `useState` local à `BoutiquePage`.
- Serveur : `serverDb.ts` → `SupabaseServerStore` avec `inMemoryProducts` fallback (mémoire si Supabase down). Le catalogue publié est filtré par `isPublishableProduct` (7 vérifications + `catalog_status='published'`).

---

## 2. AUDIT FONCTIONNEL — PÔLE CHEVEUX (inventaire)

### 2.1 Diagnostic cheveux

- **Fichier :** `DiagnosticHairPage.tsx` + `kurlaFit.ts` + `beautyProfile.ts`
- **Questions (≈14) :** texture (3A-4C visuel), porosité, densité, casse, sécheresse, cuir chevelu (démangeaisons/pellicules), routine actuelle, objectifs, budget, sensibilités (parfum…), âge, coiffures protectrices.
- **Scoring :** `kurlaFit` calcule `concernsFromProfile` + `archetype` (k-anonymité), pas de ML ; règles métier explicites.
- **Résultat :** `/diagnostic/resultat` → profil `BeautyProfile` sauvegardé + `TextureGap` + recommandations `recommendationEngine` (matching `needs`).
- **UX :** stepper visuel, cartes illustrées, branchement conditionnel (ex: si cuir chevelu sensible → questions apaisement), révisable, sauvegardé.

### 2.2 Filtres cheveux (BoutiquePage)

- **Filtres :** catégorie (`cheveux|accessoires|kits|hommes|enfants` + subCategory `hydratation|cuir_chevelu|casse|tresses|definition`), **besoin** (10 `HAIR_NEEDS` : hydrater, reduire_casse, demeler, cuir_chevelu, tresses, locks, perruque, boucles, nuit, barbe), marque (dynamique), communauté afro (`communityBrand`), compatibilité `KURLA ID` (si `profile` rempli), pays (`countryAvailability`), recherche texte (nom/marque/description/ingrédient), tri (fit/prix/avis).
- **Logique :** `filteredProducts = products.filter(p => p.needs.includes(selectedNeedId))` (corrigé chantier 2 via `BOUTIQUE_NEED_ALIAS` + `productNeedsCorrection`) ; tri + pagination ; `analytics.viewItemList`.

### 2.3 Catalogue cheveux

- **Organisation :** `LAUNCH_PRODUCTS` (77 refs p01-p77 + 10 kits) → `products` DB ; catégories `cheveux` (soins), `accessoires` (outils, 24–48h), `kits`, `hommes`, `enfants`, `nouveautés`, `promotions`.
- **Navigation :** onglets + sous-pills ; `?cat=...` via `readShopCategory` (fuzzy + alias `category=`) ; empty state → hub (`EMPTY_CATEGORY_HUB`) + waitlist.
- **Tri/pagination :** côté client (`sortBy`) ; pas de pagination serveur (64–87 produits, ok).

### 2.4 Fiches produits cheveux

- **Fichier :** `ProductDetailPage.tsx` + `product/ArchetypeRatingsPanel`, `ProductVerificationPanel`.
- **Sections :** hero (galerie `product_images`, prix, stock badge 24–48h vs précommande, `communityBrand`), `benefitPrimary`, `forWho`/`notIdealIf`/`howToUse`, `keyIngredients` + INCI accordéon, `texture`/`fragrance`, `hairTypes`, avis vérifiés (`reviews` filtrés `verified_purchase`), questions (`product_questions`), produits complémentaires (`recommendationEngine`), `TOOL_BY_PRODUCT_SLUG` → lien guide outils.
- **Manques peau :** pas de `routineStep` affiché en timeline, pas de `spf`, `whitecast`, `texture galténique` peau, pas de matching profil peau visuel.

### 2.5 Routines cheveux

- **Fichier :** `RoutineBuilderPage` + `routines/routineBuilder.ts` + `adaptiveRoutine.ts`
- **Structure :** étapes `cleanse → condition → deep_condition → protein_treatment → leave_in → seal_oil → styling_definer → scalp_treatment` ; ordre fixe ; fréquence ; templates `kits` (k01-k10) ; personnalisation (swap produit par étape, filtres `hairTypes` + `needs`).
- **Sauvegarde :** `serverDb.savedRoutines` ; partage via slug ; tracker quotidien (`RoutineTrackerPage`).
- **Économie :** `routineEconomics` calcule prix total + coût/mois.

### 2.6 Recommandations cheveux

- **Moteur :** `recommendationEngine.ts` + `kurlaFit.ts` + `semanticSearch.ts` (`NEED_LEXICON` 17 besoins dont 7 ajoutés chantier 2) + `needsHub.ts` (12 hubs hydrater…barbe, chaque hub = routine + productIds + kitIds).
- **Logique :** `profile.concerns` → `needs[]` → `searchByIntent` + `filteredProducts` ; `needsHub` fournit la routine éditoriale ; `textureGap` identifie les manques catalogue.

### 2.7 Espace utilisateur cheveux

- **Fichier :** `CustomerAccountPage` + `BeautyHub` + `HairIdPage`/`KurlaIdPage`
- **Sections :** profil capillaire (texture, porosité, densité), `BeautyProfileEditor` (stepper), favoris (`SavedPage`), historique commandes, routines sauvegardées, `ProgressJournalPage` (journal capillaire), `ReferralPanel`.

### 2.8 Marketplace pros cheveux

- **Fichiers :** `ProfessionalsPage`, `ProfessionalDirectoryPage`, `Pro*` (application, dashboard, profil, directory), `proEndorsement`, `professionalStore`, `professionalTrust`.
- **Types :** coiffeurs texturés, barbiers, nattiers ; profils (photo, bio, spécialités, services/prix, localisation, portfolio, avis) ; réservation via `ConsultationBookingModal` + `MyAppointmentsPage`; pas de paiement en ligne pro (sur place).

### 2.9 Contenu éducatif cheveux

- **Fichiers :** `ArticleDetailPage`, `IngredientsGuidePage`, `InspirationsPage`, `MelaninSkinPage` (en fait cheveux+peau), `ToolsPage`, `WashDayPage`, `ProtectiveStylesPage`, `JournalPage` + `lib/educationalContent`, `knowledge/*`.
- **Catégorisation :** par besoin (hydrater, casse), par texture (3C, 4C), par geste (wash day, protective). Pas de CMS ; articles en dur (`data/`).

### 2.10 Dashboard admin cheveux

- **Fichier :** `AdminDashboardPage` → 8 panels : `CatalogAdminPanel` (CRUD produits, import CSV, validation 7 checks), `SupplierAdminPanel`, `BatchAdminPanel`, `SourcingProspectsPanel`, `KittingAdminPanel`, `OperationsCockpitPanel`, `AssortmentPlanPanel`, `StrategyCockpitPanel`.
- **Gouvernance :** `taxonomyStore.checkProductVocabulary`, `catalogGuard.isPublishableProduct`, `cosmeticCompliance` (CPNP/RP/CPSR pour cosmétiques UE).

---

## 3. AUDIT UX/UI

### 3.1 Parcours existants (user flows)

- **Onboarding :** Home → Hero (boutique+diagnostic+pros) → `DiagnosticHairPage` (stepper 14 étapes) → Résultat → Boutique filtrée → Fiche → Panier (3-5j précommande) → Stripe → `OrderConfirmation`.
- **Découverte par besoin :** `Home` → `ChooseNeedSection` (cards hydrater…barbe) → `BoutiquePage? besoin` → grille.
- **Comparaison :** `BoutiquePage` → `compareIds` (2-3 produits) → bottom sheet (pas de page `/comparer` dédiée).
- **Pros :** `ProfessionalsPage` → filtre ville/spécialité → `ProProfilePage` → booking.
- **Admin :** `/admin` → login → `AdminDashboardPage` → CRUD.

### 3.2 Patterns d’interaction

- **Stepper diagnostic :** cartes visuelles, branchement conditionnel, barre progression, retour arrière, sauvegarde.
- **Sélection multiple :** cards + chips (concerns), checkbox (préférences).
- **Navigation par cards :** `NeedHub` (12 besoins, icon Lucide or), `BoutiquePreviewSection`, `RoutineCarousel`.
- **Comparateur :** bottom sheet flottant (3 max), pas de tableau.
- **Filtres :** sidebar desktop (select + checkbox), pas de bottom sheet mobile dédié (scroll).
- **Modals :** `AuthModal`, `ConsultationBookingModal`, `SearchModal`.

### 3.3 Design system

- **Typo :** `font-serif-title` (titres, ?) + sans (body) ; `tracking-tight`, `font-light`.
- **Couleurs :** `#111111` (texte), `#FFFDF9` (fond), `#F8F2EC` (section), `#E8E1DA` (border), `#C8753D` (accent, CTA), `#D49A63` (highlight), `#2E7D5B` (précommande), `emerald-600` (24–48h dropship). Pas de différenciation peau/cheveux.
- **Espacements :** `rounded-3xl` (cards, sections), `p-6/8`, `gap-3/6`, `max-w-7xl`.
- **Icônes :** `lucide-react` (Droplets, Sparkles, Shield, Crown, etc.) ; emojis bannis des boutons (remplacés par Lucide).
- **Tokens :** Tailwind 4, pas de fichier `design-tokens.json` ; couleurs en dur dans classes.
- **Responsif :** mobile-first, `grid-cols-1 sm:2 lg:4`, `overflow-x-auto` pour onglets, `hamburger` pour Navbar ; pas de bottom tabs mobile.

### 3.4 Points forts / dettes

**Forts :** stepper réutilisable, `BoutiquePage` filtrage temps réel + alias, `needsHub` éditorial, `taxonomyReference` contrôlé, `semanticSearch` explicable.

**Dettes :** pas de `design-tokens`, pas de composant `FilterDrawer` mobile, pas de `CompareTable`, pas de `RoutineBuilder` drag-drop, pas de `PhotoJournal`.

---

## 4. MUTUALISABLE vs SPÉCIFIQUE PEAU

| Composant / Fonctionnalité | Mutualisable (Cheveux + Peau) | Spécifique Peau (à créer) |
|---|---|---|
| Layout page catalogue | ✅ (`BoutiquePage` structure, onglets, subPills, search, `filteredProducts`) | — |
| Card produit | ✅ (adapter badges : `skinTypes` + `spf` + `whitecast`) | — |
| Système de filtres (archi) | ✅ (structure `useMemo` + `select` + `checkbox`) | **Nouveaux filtres peau** : type de peau (6), zone (12), type produit (25+), texture/galénique, moment, certifications, phototype |
| Diagnostic stepper | ✅ (`DiagnosticHairPage` → composant `Stepper` à extraire) | **Contenu peau** : 12 étapes (type peau, hydratation, phototype, préoccupations (17), objectifs, routine actuelle 5 Q, sensibilités, préférences, budget, env/mode de vie, âge) |
| Modèle `Product` | ✅ (étendre) | Champs peau : `skinTypes[]`, `skinConcerns[]`, `targetZones[]`, `keyIngredients[]+concentration`, `fullInciList`, `routineStep/order`, `spfValue/type/whitecast`, `texture/finish`, `paoMonths`, `melaninRichFriendly` |
| `BeautyProfile` | ✅ (étendre `skin` object) | `SkinProfile` : skinType, hydration, phototype, concerns[], objectives[], sensitivities[], preferences[], budget, currentRoutine, useSPF, env, ageRange, journal[] |
| `Routine builder` (logique) | ✅ (`routineBuilder.ts` + `adaptiveRoutine.ts` → ordre + fréquence) | **Templates peau** : matin 6 étapes / soir 8 étapes / hebdo 3 soins ; règles compatibilité actifs (rétinol≠AHA…) |
| Moteur recommandation | ✅ (`recommendationEngine` + `semanticSearch` archi) | **Règles peau** : `skinType`×`concern`×`budget`×`sensibilité` + 17 `NEED_LEXICON` peau |
| Profil utilisateur (`CustomerAccountPage` + `BeautyHub`) | ✅ (ajouter onglet `Ma peau`) | Section `Ma peau` (profil, routine matin/soir/hebdo, produits, favoris, historique, recommandations, journal) |
| Marketplace pros | ✅ (`ProfessionalsPage` + `professionalStore` + booking) | **Types peau** : esthéticienne, facialiste, cosméticienne peau foncée, spécialiste LED/microneedling, naturopathe, dermatologue (annuaire) |
| Contenu éducatif | ✅ (`ArticleDetailPage` + `educationalContent` structure) | **Guide de la peau** : 7 axes (besoin, type peau, ingrédient, geste, mélanine, décryptage) ; 15+ articles (HPI, SPF peaux foncées…) |
| Comparateur | ❌ (existe en sheet 3 max, pas de table) | **Table 2-4 produits** (11 critères + compatibilité profil) |
| Dashboard admin | ✅ (`CatalogAdminPanel` CRUD + `taxonomyStore`) | **Sections** : types de peau, préoccupations, ingrédients, routines types, diagnostic peau, compatibilités, analytics peau |
| `needsHub` / `ChooseNeedSection` | ✅ (structure hub) | **12-15 hubs peau** (Hydrater, Éclat, Taches…Corps) avec routine + productIds |
| Design system | ✅ (palette, typo, cards, modals) | **Accent peau** : rosé/doré subtil + icônes peau ; différenciation sans rupture |
| Suivi / Journal | ✅ (`ProgressJournalPage` structure) | **Journal peau** : feeling hebdo + préoccupations du jour (V1), timeline photos (V2) |

**Règle d’or :** extraire d’abord `Stepper` + `FilterBar` + `ProductCard` en composants génériques avant de dupliquer.

---

## 5. RISQUES DE RÉGRESSION (à verrouiller)

- **Boutique** : ne pas casser `?cat=` + `readShopCategory` + `EMPTY_CATEGORY_HUB` + `isDropshipProduct` badge 24–48h
- **Diagnostic cheveux** : ne pas toucher `beautyProfile` `hair` + `kurlaFit` scoring
- **Taxonomie** : ne pas ajouter de `needs` sans migration `kurla_taxonomy_terms` (test `kurla_taxonomy.test.ts` casse si `taxonomyReference.ts` ≠ migration)
- **Publish** : `catalogStore.getProducts` correction `productNeedsCorrection` doit rester (sinon retour 28 outils identiques)
- **SEO** : `routeTable` + `seoHead` + prerender 57 pages
- **Paiement** : Stripe TEST + précommande 3-5j + `preorderPromise`

---

## 6. PROPOSITION D’ARCHITECTURE PEAU (extensible)

**Infra (Phase 2) :**
- `supabase/migrations/20260910000000_skin_domain.sql` : nouvelles tables `skin_types`, `skin_concerns`, `skin_objectives`, `ingredients`, `ingredient_incompatibilities`, `routine_templates`, `skin_profiles` (ou étendre `beautyProfiles` JSONB `skin`).
- `lib/taxonomyReference.ts` : étendre `need` avec 12 besoins peau manquants (taches, pores, éclat… déjà partiellement en `need` mais pas tous), ou créer taxonomie `skin_concern` séparée (recommandé pour ne pas polluer `need` cheveux).
- `lib/beautyProfile.ts` : étendre `SkinProfile` complet (cf. §20.4 cahier des charges).
- `lib/routineBuilder.ts` : ajouter `SKIN_ROUTINE_STEPS` (matin 6 / soir 8 / hebdo 3).

**Parcours (Phases 3-5) :**
- Extraire `components/diagnostic/Stepper.tsx` depuis `DiagnosticHairPage`
- Créer `pages/SkinLandingPage.tsx` (`/peau`) + `pages/SkinDiagnosticPage.tsx` (`/peau/diagnostic`) + `pages/SkinResultPage.tsx`
- Étendre `BoutiquePage` → `pages/SkinCatalogPage.tsx` (`/peau/produits`) ou **mutualiser** : ajouter `activeDomain='cheveux|peau'` à `BoutiquePage` (préférable pour DRY)
- Créer `pages/SkinRoutineBuilderPage.tsx` (`/peau/routine`) + `components/RoutineTimeline.tsx`

**Prochaine page concrète (après validation) :** `SkinLandingPage` (`/peau`) — 5 sections : hero diagnostic + grille 15 besoins visuels + barre recherche peau + routines types + guide peau.

