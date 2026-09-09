# AUDIT KURLA SKIN vs KURLA CHEVEUX — 2026-09-10
> **Pôle audité : KURLA SKIN** (peau riche en mélanine) comparé à **KURLA CHEVEUX** (référence mature).  
> **Méthode :** analyse de l’application réelle (routes, composants, libs, migrations, données live) — pas du code prévu. 63 pages + 36 sitemap vérifiés. Live `kurlabeauty.vercel.app`.  
> **Principe :** AUDITE → COMPARE → IDENTIFIE → PRIORISE → RECOMMANDE. Aucune implémentation dans cette phase.

---

## A. SCORE GLOBAL

### KURLA CHEVEUX : **78 / 100**
- Catalogue 67 produits (26 cheveux + 28 accessoires + 10 kits + 3 peau) publié, mais partie cheveux seule = 64 ref + kits exploitables. Filtres, kits, routines, fiches, IA, profils, journaux, shelf, community opérationnels. Parcours diagnostic (8 étapes visuelles) → reco kit → panier → commande test Stripe → suivi. Moteur kurlaFit + recommendationEngine + ingredientGraph + shelf + outcomeEvidence en place. Contenu riche (protective styles, kids, hommes, inspirations, ingredientsGuide). Dashboard admin complet. Dette : `three` inutilisée, sitemap produits 0 au build (runtime OK), marge soins 34% HT.

### KURLA PEAU : **42 / 100**
- Pôle peau **réel mais MVP** : 6 pages dédiées, diagnostic 12/5 steps plus granulaire que cheveux, boutique peau 15 besoins + filtres budget/sans parfum/SPF invisible + fiche peau experte + alternatives + comparateur + guide + routine matin/soir/hebdo. **MAIS** catalogue 3/15 besoins couverts (hydrater 1, éclat 0, taches 1 via SPF, sèche 0…), 0 outil peau, moteur peau = alias sur hair engine, 0 shelf/journal peau, 0 protective-style peau, 0 UGC peau, 0 suivi peau. Score tiré vers le bas par **profondeur catalogue** et **absence d’écosystème peau**.

### Écart : **−36 points**. L’écart n’est pas d’UX — la coquille peau est plus moderne que cheveux — mais de **substance** : cheveux a un moteur qui tourne avec de la donnée, peau a une coquille qui attend sa donnée.

---

## B. MATRICE COMPARATIVE (réel, pas prévu)

| Fonctionnalité | Cheveux | Peau | Niveau Peau | Manque |
|---|---|---|---|---|
| **1. Pages** | 8 dédiées + hub | 6 dédiées (`/peau`, `/peau/diagnostic`, `/peau/diagnostic/resultats`, `/peau/routine`, `/peau/comparer`, `/peau/guide`) + alias boutique | 🟠 65% | `/peau/journal`, `/peau/shelf`, `/account/skin-id` vide, `/melanin-skin` non branché |
| **2. Diagnostic** | 8 étapes visuelles (texture 4A-C, porosity test verre d’eau, scalp, etc.) + `mindful | **12 complètes / 5 express** (type, hydratation, phototype couleur dot, undertone, HPI, acne, 15 concerns ×3, 12 objectifs ×3, sensibilité 2 niveaux, SPF, routine/texture/fini, budget/âge/climat + reactionHistory 300) double entrée directe/guidée | 🟢 95% — **plus profond que cheveux** | Peu de visuels DiagnosticVisual peau vs cheveux très visuel |
| **3. Profil personnalisé (`BeautyProfile`)** | 19 champs hair + 3 zones (scalp/lengths/ends) + 13 skin de base → confiance calculée 31 champs | Même `BeautyProfile {hair,skin}` mais skin étendu : `skinType, hydrationLevel, skinConcerns[17], skinObjectives[12], currentRoutine, budget, sensitivities, preferences, ageRange, journal[50]` + `toneDepth/undertone/hyperpigmentation` + `calculateProfileConfidence` branché | 🟢 85% | `skin.journal` vide, `HairIdPage` riche vs `SkinIdPage` coquille, pas de photo peau |
| **4. Recherche par besoin** | 10 besoins cheveux + alias `BOUTIQUE_NEED_ALIAS` (ex: taches→hyperpigmentation) | 15 besoins peau (`hydrater, eclat, taches HPI, seche, grasse, imperfections, sensible, SPF white-cast, anti-age, contour_yeux, levres, corps, cicatrices, barriere, par_ingredient`) + double entrée `?cat=peau&need=taches&q=niacinamide` | 🟢 90% | Besoin `par_ingredient` ≈ search générique ; 10/15 besoins sans produit → dead-end |
| **5. Filtres boutique** | 15 familles : category, subCat, brand, afroCommunity, compatible KURLA ID, country, search, sort, need alias, texture graph | **4 filtres peau** : budget (≤14/28/45), **sans parfum** (INCI+allergens+containsFragrance), **SPF invisible** (haystack + mineral vs organique/hybride), need 15 + guided `ApplyMesPreferences` (budget+sansParfum depuis diag) | 🟠 70% | Pas de filtre **actif** (niacinamide 5%, rétinol, AHA/BHA), **phototype** (clair→très foncé), **texture** (gel/crème/baume), **fini** (mat/glowy), **sensibilité** |
| **6. Recommandations** | `kurlaFit → recommendationEngine.buildRecommendations` : owned/surplus/avoided/budget/jurisdiction/positiveOutcome + ranking + conflicts + uncoveredSteps + usageCost | Réutilise le même moteur + `skinAlternatives.findAlternatives` (même étape routine + même besoin + preferSansParfum + preferInvisible + budget ±30% + whitecastRisk) | 🟡 55% | Moteur pensé cheveux (routineStep `cleanse/condition/leave_in`) ; pas de règle peau (matin 6 / soir 8 / hebdo 3), pas de `jurisdiction` SPF, pas d’`avoidedIngredient` peau |
| **7. Routines** | `RoutineBuilderPage`, `adaptiveRoutine.buildAdaptiveRoutine`, 5 routines + kits K02/K03 (64.90/69.90), fréquence 6–8 sem, coût réel, étapes hair | `/peau/routine` : **matin 6 / soir 8 / hebdo 3**, 3 niveaux (Essentielle/Équilibrée/Experte), prix réel `12.90+16.90+19.90=49.70`, alternatives par étape, alertes incompatibilité (rétinol+AHA) + `/peau/comparer` 2–4 | 🟠 60% | EI : matin/soir figés (pas d’adaptive selon phototype/saison), pas de `adaptiveRoutine` peau, pas de kits peau KPEAU-01, pas de journal/observance, pas de calendrier hebdo |
| **8. Fiches produits** | `ProductDetailPage` : INCI, rôles, allergènes, certifications, livraison, avis vérifiés (trust), Q&A, archétype, vérification, yield→monthlyCost, tool guide | Même page + **bande KURLA SKIN experte** 3 cards (mélanine HPI, barrière, placement matin/soir), badge **SPF invisible risk** (faible/modéré/élevé), **routineBadge**, **alternatives peau 3** avec whitecast + sans parfum + comparer, guided diag reminder | 🟢 80% | Fiches peau minces (pas de `ingredientRoles` peau, pas de `phototype` tag, pas de `texturePreference` rendu) |
| **9. Suivi (Shelf / Journal / Timeline)** | `ShelfPage` (étagère : ce que vous utilisez, verdict, réassort), `ProgressJournalPage`, `ProtectiveTimeline` (tresses/locks), `WashDay` | `Skin.journal[50]` dans `beautyProfile.ts` + `JournalPage` générique mais **aucune page peau dédiée** : pas de `MySkinShelf`, pas de `SkinJournal`, pas de `SpfTracker`, pas de `HpiTracker` photo | 🔴 20% | Pas de suivi observance, pas de photo avant/après HPI, pas de réassort peau |
| **10. Professionnels** | 6 pros cheveux Trust 70 (identité 30+qualif 25+charte 15), `GET /api/professionals/verified`, page `ProfessionalsPage`, filtre cheveux | Mêmes 6 pros labellisés `cat=peau` (Aminata Nantes … Inès Bordeaux 70) + `pros-verifies?cat=peau` — mais annuaire mixte cheveux/peau, pas de dermato vérifié | 🟠 50% | 0 dermato, 0 spécialité SPF/HPI, trust identique cheveux (pas de score peau) |
| **11. Contenu / Guide** | `HairIdPage`, `KidsModule`, `ProtectiveStyles`, `Inspirations` (tresses/locs), `IngredientsGuide` (karité, ricin…), `CommunitySection` UGC, `JournalSection` | `/peau/guide` : 7 fiches 3–6 min (HPI, SPF invisible, niacinamide 5%, céramides, rétinol/AHA gardes, textures, routine par budget) + `/melanin-skin` + `Manifeste` (uniformiser≠éclaircir) | 🟠 60% | Contenu peau = 7 fiches statiques vs hair 100+ pages ingrédient/routine/SEO ; pas de SEO ingrédient peau (niacinamide page vide), pas de UGC peau, pas de community peau |
| **12. Personal Space / Dashboard** | `account/hair-id`, `routine-id`, `shelf`, `wash-day`, `protective-timeline`, `progress`, `journey` (chronologie + photos + tendances) | `account/skin-id` (existe mais coquille), `BeautyProfile skin` stocké, mais **pas de navigation peau** dans personalSpace, pas de `BeautyJourney` peau | 🔴 30% | Pas de `Skin Journey`, pas de `Skin ID` éditable complet |
| **13. Recherche & découverte** | `SearchModal` + `IngredientSearchPage` + `semanticSearch` + `barcodeLookup` + `NeedHubPage` + `HairSkinSection` | Même moteur + `BoutiquePage` peau `q` + `need` + `skinAlternatives` ; `IngredientSearch` peau inexistant (1 ingrédient = étoile seulement) | 🟠 55% | Recherche par **actif** (niacinamide, acide azélaïque), **phototype**, **fini** manquante |
| **14. IA / Assistant** | `AiBeautyAssistantPage` + `assistant-beaute` (guardrails médicaux, systemPrompt mélanine V2) + `AiAssistantWidget` + `BeautyAdvisor` | Même IA — prompt peau enrichi (HPI, whitecast, vocabulaire uniformiser) + garde-fous SPF/hyperpigmentation | 🟢 75% | IA peau = même modèle cheveux avec prompt peau ; pas de **vision photo** peau, pas de **graphe ingrédient peau** dédié |
| **15. Expérience mobile** | MobileShell PWA, responsive, offline statique | Identique (même shell, même PWA) — peau diagnostic 12 étapes pénible en mobile vs 8 cheveux | 🟡 65% | 12 étapes complètes = fatigue mobile ; express 5 ok mais pas mis en avant par défaut |
| **16. UX/UI** | Thème clair `#FFFDF9`, hero plateforme, tabs Cheveux|Peau (Lucide gold), pastilles dorées, icônes vraies (plus d’emojis) | Même UX + microcopy peau soigné (HPI, sans trace blanche), pastilles `Sans parfum`/`Invisible` — cohérent | 🟢 85% | Hub `EMPTY_CATEGORY_HUB` a disparu (bien) mais grille 3 produits fait « vide » vs cheveux dense |
| **17. Systèmes de données** | `products` 67, `product_variants`, `inventory`, `product_images`, `supplier_id`, `launchCatalog` 26 soins + kits, `ingredientGraph`, `suppliers`, `pros`, `orders`, `analytics` (view_item_list, addToCart, beginCheckout) | 3 `peau-ess-001/002/003` `published/is_active/in_stock` stock 0 précommande `sup-brands-wholesale`, `sourcing_country_strategy` 8 pays (FR 34/NL 30/BG 32…), `beautyProfile.skin` 15 champs | 🔴 25% | Catalogue peau 3/150 ref cible ; ingestion supplier peau 0 ; `product_ingredients` peau vide → graphe inopérant |
| **18. Évolutivité** | BusinessStrategy 5 paliers, CONQUEST_ROADMAP M0-M36, TextureGap B2B, marketplace future | `STRATEGIE_SOURCING_SEGMENTEE_PAYS 2026-09-10` + `MATRICE_PAYS_SOURCING.csv` + `sourcingCountryScore.ts` + `S1_EMAILS` + suivi admin `SourcingCountryStrategyPanel` | 🟢 80% | Plan sourcing peau solide, mais pas de `KPEAU` kits, pas de pricing peau inter, pas de B2B textureGap peau |

**Lecture :** 🟢 >75% · 🟠 50–75% · 🟡 30–50% · 🔴 <30%

---

## C. LES 10 PLUS GROS MANQUES (classés)

### 1) Catalogue peau squelettique — 3/150 ref, 10/15 besoins vides
- **Cheveux :** 26 soins + 28 outils + kits exploitables → chaque filtre renvoie quelque chose.
- **Peau :** 3 soins Essentielle (nettoyant 12.90, crème céramides 16.90, SPF 50 19.90). Recherche `peaux grasses`, `imperfections`, `anti-age`, `contour_yeux`, `cicatrices` → 0 résultat ou 1 fallback. `Budget ≤14 →1`, `sans parfum→3/3` mais sans contraste.
- **Manque :** 12 besoins sans vitrine.
- **Pourquoi critique :** le moteur le plus beau sans produits = no trust, no conversion, no SEO ingrédient.
- **Corriger :** exécuter S1 sourcing segmenté (FR 34 + NL 30 vague 1 : 60–100 ref via NappyQueen/Activilong/IN’OYA + Afro Wholesale → CPNP/RP fichier+date). Objectif 40 ref publiées M2, 100 M3 avec vérification 7 validations.
- **Difficulté :** moyenne (opérationnelle, pas tech). **Impact UX 🔴 / Business 🔴** — **Priorité 🔴 CRITIQUE**

### 2) Shelf / Journal / Suivi peau inexistants
- **Cheveux :** `ShelfPage` (étagère active, surplus, réassort), `ProgressJournal`, `ProtectiveTimeline`, `WashDay`, `BeautyJourney` (photos + tendances).
- **Peau :** `skin.journal: []` dans `beautyProfile.ts` jamais branché. Pas de `MySkinShelf`, `SpfTracker`, `HpiTracker` photo, `BarriereTracker`.
- **Importance :** peau = quotidien matin/soir, observance clé ; sans suivi, pas de réachat ni de preuve HPI.
- **Corriger :** `PeauShelf` (produits ouverts + % restant), `PeauJournal` (photo + feeling + concerns J+7/J+30), `TimelineHPI` (photo standardisée + delta teint).
- **Difficulté :** moyenne (CRUD + photo). **Priorité 🔴 CRITIQUE**

### 3) Kits peau & routines adaptatives manquants
- **Cheveux :** kits K02/K03/K01 + `adaptiveRoutine` (fréquence, temps, budget, uncoveredSteps) + `kitting` + `usageCost`.
- **Peau :** routine Essentielle prix réel 49.70 fixe, 3 niveaux UI mais pas de kit SKU, pas d’adaptive selon phototype/saison, pas de `adaptiveRoutine` peau.
- **Importance :** AOV peau reste 12–19€ à l’unité vs 64€ kit cheveux → CAC non amorti.
- **Corriger :** 3 kits peau (Essentielle 49.70, Équilibrée ~62€, Experte ~85€) en `kits` category + `buildSkinRoutine` (matin/spf, soir réparation, hebdo exfoliation) avec règles `phototype IV-VI → SPF invisible obligatoire`, `sensibilité élevée → sans parfum + céramides`.
- **Difficulté :** faible (catalogue + règles). **Priorité 🔴 CRITIQUE**

### 4) Filtres peau = 4 vs 15 attendus — par actif / phototype / texture / fini
- **Cheveux :** 7 familles + texture + porosity + densité.
- **Peau :** budget + sans parfum + SPF invisible + need. Pas de filtre par **actif** (niacinamide 5%, ac  azélaïque, rétinol, vit C), **phototype** (clair→très foncé), **texture** (gel/lotion/crème/baume), **fini** (mat/naturel/glowy), **sensibilité**.
- **Importance :** Fatou 28 peau mixte sensible cherche « niacinamide sans parfum fini mat ≤28€ » → impossible.
- **Corriger :** ajouter `filterKeys: skinActives, skinTexture, skinFinish, phototype, sensitivity` dans `BoutiquePage` + index `product_needs_correction` étendu + mapping `skinAlternatives` déjà en place.
- **Difficulté :** faible. **Priorité 🔴 CRITIQUE**

### 5) Moteur peau = alias cheveux, pas de règles peau
- **Cheveux :** `recommendationEngine` complet : owned/surplus/avoided/budget/jurisdiction/positiveOutcome + incompatibilities cuir chevelu.
- **Peau :** `BOUTIQUE_NEED_ALIAS` + `skinAlternatives` uniquement. Pas de règle `rétinol + AHA = incompatibilité soir`, `phototype foncé → éviter minéral pur whitecast élevé`, `HPI fréquente → niacinamide prioritaire`.
- **Importance :** recommandations peu différenciantes, risque incompatibilité actifs.
- **Corriger :** `src/lib/skinRecommendation.ts` : règles `incompatibilitySkinRules` (rétinol×AHA, vitC×niacinamide même routine), ranking `phototypeToneDepth` + `hyperpigmentationTendency`.
- **Difficulté :** moyenne. **Priorité 🔴 CRITIQUE**

### 6) Contenu peau = 7 fiches vs 100+ cheveux ; SEO ingrédient vide
- **Cheveux :** 100+ pages ingrédient/routine/SEO (karité, ricin…), UGC, community, journal indexé.
- **Peau :** `/peau/guide` 7 fiches + `skin.ts` 2 entrées (`melanin-pigmentation`, `melanin-dry`) + `educationalContent` sans fiches peau publiées. Recherche `niacinamide` : badge seulement, pas de fiche `/ingredients/niacinamide` peau.
- **Importance :** SEO + confiance + acquisition.
- **Corriger :** 15 fiches ingrédient peau (niacinamide 5%, ac hyaluronique, céramides NP, SPF filtres invisibles, ac azélaïque, vit C stabilisée, AHA/BHA, squalane, rétinol gardes…) + linking `ingredientGraph` peau.
- **Difficulté :** faible (contenu). **Priorité 🟠 IMPORTANT**

### 7) Recherche & découverte peau peu guidée
- **Cheveux :** `NeedHub`, `DiagnosticPreview`, `HairSkinSection`, `Inspirations` gallery, `SearchModal` auto-complete, barcode.
- **Peau :** `SearchModal` générique + `NeedHub` non filtré peau + `HairSkinSection` vitrine peau faible.
- **Importance :** parcours « je ne sais pas quoi chercher » = bounce.
- **Corriger :** `NeedHubPage` peau : 15 needs en grille + `PeauPreviewSection` (3 routines + 3 SPF invisibles) + `SearchModal` suggestions peau (`Spf sans trace`, `Taches HPI`, `Sensible & sans parfum`).
- **Difficulté :** faible. **Priorité 🟠 IMPORTANT**

### 8) Personnalisation peau : diagnostic 12 steps fatiguant en mobile, express caché
- **Cheveux :** 8 steps fluides, visuels, 3 min.
- **Peau :** 12 steps complet = 5 min, très riche mais **long en mobile** (12 progress bar). Mode `?mode=express` 5 steps existe mais **aucun CTA “Passer en express”** visible en step 1 complet.
- **Importance :** abandon diagnostic peau > cheveux.
- **Corriger :** CTA persistant `Passer en express (2 min)` en header peau + sauvegarde partielle `step` localStorage + reprendre plus tard.
- **Difficulté :** faible. **Priorité 🟠 IMPORTANT**

### 9) Professionnels peau = cheveux relabellisé, pas de dermato
- **Cheveux :** 6 pros salon, trust 70 cohérent (coiffure).
- **Peau :** mêmes 6 avec `cat=peau` → pas de dermato, pas de spécialité HPI/SPF. Trust `identité 30 + qualif 25 + charte 15` identique — un coiffeur 70 ≠ dermato 70.
- **Importance :** crédibilité peau médicale.
- **Corriger :** 2–3 pros peau (dermato / esthéticienne) vérifiés, filtre `skin_specialty`, `professionalTrust` peau (`diplôme + RP + photo SPF invisible`).
- **Difficulté :** opérationnelle. **Priorité 🟠 IMPORTANT**

### 10) Systèmes données peau vides → graphe inopérant
- **Cheveux :** `product_ingredients` rempli → graphe → `cosingFunctions`, `ingredientRegulatory`, `jurisdiction`.
- **Peau :** `product_ingredients` peau vide, `product_needs_correction` alias seulement, `sourcing_country_strategy` OK mais `products` peau 3 seulement → `TextureGap` peau `donnees_insuffisantes`.
- **Importance :** bloque intelligence B2B, compliance SPF ISO, sitemap produits 0.
- **Corriger :** ingestion INCI via sourcing S1 (INCI → `ingredientGraph` → fiches ingrédient → `sitemap.xml` produits). Injecter `SUPABASE_URL` au build Vercel.
- **Difficulté :** faible (pipeline). **Priorité 🟠 IMPORTANT**

---

## D. FONCTIONNALITÉS À AJOUTER (parité)

**Pour atteindre 78/100 (parité cheveux) :**

1. **Catalogue peau 40–100 ref** — S1 FR/NL exécuté, 7 validations pipeline, 12 besoins couverts. **🔴**
2. **3 kits peau** (Essentielle/Équilibrée/Experte) + pricing bundle + livraison. **🔴**
3. **Filtres peau manquants** : actif, phototype, texture, fini, sensibilité. **🔴**
4. **`skinRecommendationEngine`** avec incompatibilités actifs + whitecast + HPI ranking. **🔴**
5. **`MySkinShelf` + `SkinJournal` + `HpiTracker` + `SpfTracker`** (photos, observance matin/soir). **🔴**
6. **`SkinAdaptiveRoutine`** (matin 6 / soir 8 / hebdo 3 adaptés phototype + saison + sensibilité). **🟠**
7. **15 fiches ingrédient peau + sitemap** + linking fiches produits. **🟠**
8. **NeedHub peau + Search peau** (suggestions actives). **🟠**
9. **CTA express persistant + reprise diagnostic**. **🟠**
10. **2 pros peau dermato** + trust peau. **🟠**
11. **Ingestion INCI peau → graphe → compliance**. **🟠**
12. **PersonalSpace peau** : `account/skin-id` complet + `beautyJourney` peau. **🟠**
13. **Analytics peau** : `view_item_list peau`, `diagnostic_skin_complete`, `routine_skin_view`, `spf_invisible_filter_use`. **🟡**
14. **Mobile express par défaut** si `isMobile && !isExpress`. **🟡**

---

## E. AMÉLIORATIONS (existant mais à renforcer)

| Actuel peau | Amélioration | Priorité |
|---|---|---|
| Diagnostic 12 steps très textuel | Ajouter **visuels phototype** (dots peau déjà) + **visual texture** (gel/crème/baume) + **micro-copy HPI** à chaque étape — comme cheveux `DiagnosticVisual` | 🟡 |
| Fiche peau 3 cards statiques | Cards dynamiques selon `skinConcerns` (ex: si `taches` → card “Routine taches J+0/J+30/J+90”) | 🟡 |
| Alternatives peau 3 | Alternatives **par budget + phototype** (ex: “même SPF invisible, plus riche si très sèche”) | 🟡 |
| Guide 7 fiches | Guide **recherche** indexé, breadcrumb, temps lecture, related products | 🟡 |
| Boutique peau header | Sticky `Mes préférences peau` + count `3 produits` → `42 produits` vivant | 🟡 |
| Comparateur peau 2–4 | Comparateur avec **colonne phototype / whitecast / sans parfum / texture** | 🟡 |
| Analytics peau | Funnel peau `visite → diagnostic → routine → boutique → panier → achat → réachat` avec CAC/LTV peau | 🟡 |

---

## F. OPPORTUNITÉS — faire de KURLA SKIN mieux que cheveux (Beauty Tech réf)

> Cheveux = référence texture. Peau peut devenir référence **mélanine**.

### 1. Photo-intelligence HPI (différenciant mondial)
- **Idée :** `HpiPhotoTracker` : photo standardisée (lumière du jour, menton posé) → détection **delta teint** non médical (échelle `teint_terne → uniforme` auto-évaluée, pas de diagnostic). Suivi J+0/J+15/J+45 avec routine associée. Aucune promesse médicale, juste observance + photo.
- **Pourquoi cheveux ne l’a pas :** cheveux se mesurent en texture, pas en couleur.
- **Tech :** `skin.journal[].photos[]` + `compare` slider + garde-fous `medicalTriage` (si `réactionHistory` + `sensible` → push dermato).
- **Priorité 🟢 FUTUR — moat fort**

### 2. SPF Invisible Lab (zero white-cast)
- **Idée :** base **SPF peau foncée** : chaque SPF noté `whitecastRisk` (faible/modéré/élevé) à partir de filtres (organique/hybride/minéral) + **galerie peaux réelles** (phototypes IV–VI) sous UV. Filtre `Mon phototype → SPF invisibles pour moi` = killer feature EU.
- **Cheveux n’a pas d’équivalent.**
- **Priorité 🟢 FUTUR — acquisition SEO “SPF sans trace peau noire”**

### 3. Incompatibilité actifs temps-réel dans la routine
- **Idée :** builder peau qui **bloque** `rétinol + AHA même soir` avec explication + propose `alternance soir A / soir B`. Déjà `ingredientIncompatibilities` hair existe — l’étendre à peau (`retinol, aha, bha, vitC, niacinamide`).
- **Plus poussé que cheveux** (cheveux incompatibilités limitées).
- **Priorité 🟠 IMPORTANT**

### 4. Barrière cutanée score (0–100)
- **Idée :** score barrière calculé depuis `hydrationLevel + sensitivity + texturePreference + season/climate` → reco **céramides / squalane** si <50. Dashboard peau `Barrière 72/100 — renforcer`.
- **Équivalent cheveux :** `profileConfidence` → mais peau peut quantifier barrière, cheveux ne peut pas.
- **Priorité 🟡 AMÉLIORATION**

### 5. Graphe ingrédient peau → preuve CosIng + restriction UE par phototype
- **Idée :** `ingredientGraph` peau : `cosingFunctions` + `ingredientRegulatory` + `jurisdiction` filtrés SPF/hyperpigmentation → chaque fiche peau cite `CosIng` + `Règ. CE 1223/2009` + “éviter si `sensible`”.
- **Cheveux l’a, peau peut le surpasser** (enjeu réglementaire SPF plus fort).
- **Priorité 🟠 IMPORTANT**

### 6. Marketplace peau + pros peau booking
- **Idée :** `ProDashboard` peau : dermato/esthéticienne bookable + `MyAppointments` peau + `Trust peau` (diplôme vérifié + photo SPF test).
- **Cheveux = salon ; peau = clinique — plus forte valeur panier.**
- **Priorité 🟢 FUTUR**

### 7. Routine climat + saison adaptative
- **Idée :** `climate` + `season` déjà dans `beautyProfile.environment` : `Été chaud humide → gel SPF invisible` vs `Hiver froid sec → baume céramides`. Cheveux climate existe mais peu exploité ; peau peut l’activer.
- **Priorité 🟡 AMÉLIORATION**

---

## G. AUDIT UX/UI (15 questions)

| Question | Cheveux | Peau | Verdict peau |
|---|---|---|---|
| Comprend-il immédiatement quoi faire ? | Oui — “Fais ton diagnostic” CTA | Oui — “Passer diagnostic peau” + “Boutique peau filtrée pour carnation” | ✅ clair, mais 2 CTAs concurrentes |
| Trouve-t-il rapidement ce qu’il cherche ? | Oui — 10 besoins visuels + search | Moyen — 15 besoins mais 10 vides → frustration | ⚠️ dead-ends |
| Recherche par problème ? | Oui (hydrater, casse…) | Oui `taches`, `imperfections`… | ✅ |
| Recherche par objectif ? | Partiel | Oui `uniformiser`, `eclat`, `renforcer_barriere` | ✅ mieux que cheveux |
| Recherche par type de peau ? | `hairTypes` 3A-4C | `skinType` 8 + `hydrationLevel` 4 | ✅ plus fin que cheveux |
| Diagnostic clair ? | Très clair (visuels, test verre d’eau) | Très clair mais long (12 steps) — express caché | ⚠️ mettre express en 1er sur mobile |
| Recommandations compréhensibles ? | Oui — ranking + reasons | Alternatives seulement — pas de ranking global | ⚠️ no ranking peau |
| Routines faciles à suivre ? | Oui — kits + steps | Matin/soir/hebdo = clair, mais pas de suivi | ⚠️ no tracker |
| Produits contextualisés ? | Oui — tool guide, archétype | Oui — fiche experte peau + whitecast | ✅ |
| Fluide comme cheveux ? | Oui (8 steps, dense) | Moins fluide (12 steps, grille 3 produits vide) | ⚠️ catalogue creuse la fluidité |
| Pages inutiles ? | Non | `/melanin-skin` vs `/peau/guide` redondance ; `/peau/comparer` vide sans 2 produits | ⚠️ fusionner melanin-skin → guide |
| Infos manquent-elles ? | Peu | Phototype, texture, fini, actif, sensibilité filtrés absents | ⚠️ filtres manquants |
| Répétitions ? | Non | `uniformiser ≠ éclaircir` répété 3× (bien) mais pas lourd | ✅ justifié |
| Filtres puissants ? | Oui | Non — 4 vs 9 attendus | 🔴 |
| Mobile optimal ? | Oui | 12 steps scroll pénible | ⚠️ roros |

**Note UX peau : 68/100** — coquille excellente, expérience cassée par le vide catalogue.

---

## H. AUDIT PROFONDEUR (présence → qualité → profondeur → perso → utilité → UX)

| Fonction | Présence | Qualité | Profondeur | Perso | Utilité | UX | Note |
|---|---|---|---|---|---|---|---|
| Diagnostic peau | 100% | 90% | **95%** (12 steps, HPI, whitecast, double entrée) | 95% | 90% | 70% mobile | **A** |
| Boutique peau | 100% | 60% | 30% (4 filtres) | 50% | 35% (3 prod) | 65% | **D** |
| Fiche peau | 100% | 85% | 70% | 60% | 75% | 85% | **B+** |
| Routine peau | 100% | 65% | 50% | 40% | 55% | 70% | **C** |
| Suivi peau | 20% | — | 10% | 10% | 15% | 20% | **F** |
| Recherche peau | 100% | 55% | 35% | 45% | 40% | 60% | **D+** |
| IA peau | 100% | 75% | 60% | 65% | 70% | 75% | **B-** |
| **Moyenne peau** | **89%** | **71%** | **50%** | **51%** | **54%** | **63%** | **C+** |

> Cheveux moyenne profondeur **78%** → peau **50%** = l’écart se joue à **profondeur × catalogue**, pas à présence.

---

## I. RECOMMANDATION — PLAN D’ACTION PHASE 2 (priorisé, sans coder)

### Vague P0 (M0–M2) — 🔴 Critique — atteindre 65/100
1. **Sourcing S1** → 40 ref peau publiées (FR/NL). Owner : ops. Coût : 4–6k€ stock + 0 dev.
2. **3 kits peau + pricing** + boutique `?cat=peau` vivant. Dev 2j.
3. **Filtres manquants** (actif, phototype, texture) + `skinRecommendation`. Dev 3j.
4. **Shelf + Journal peau V1** (photo + observance). Dev 5j.

### Vague P1 (M2–M4) — 🟠 Important — atteindre 78/100 (parité)
5. **15 fiches ingrédient peau** + graphe + sitemap fix. Dev 3j + contenu.
6. **AdaptiveRoutine peau** + incompatibilités actifs. Dev 4j.
7. **NeedHub peau + Search peau + CTA express**. Dev 2j.
8. **2 pros peau** + `account/skin-id` complet. Ops 2 semaines.

### Vague P2 (M4–M12) — 🟢 Différenciation — dépasser 85/100
9. **HPI PhotoTracker** + SPF Invisible Lab (galerie phototypes). Dev 8j + studio.
10. **Barrière score + climat adaptatif + B2B TextureGap peau**.

**Ne pas faire maintenant :** marketplace peau, booking dermato, IA vision — après P0/P1.

---

## J. CONCLUSION

**KURLA SKIN est la partie la mieux designée de la plateforme, mais la moins remplie.** Le diagnostic peau dépasse déjà cheveux en finesse (12 steps, HPI, whitecast). La boutique peau est prête à scaler (15 needs, 3 filtres intelligents, fiche experte, alternatives). **Ce qui manque est du stock, pas de la structure.**

**Si S1 est exécuté, peau passe de 42→65 en 2 mois, puis 78 en 4 mois.** Sans S1, même la meilleure tech reste une démo.

> **Prochaine étape :** valider ce diagnostic, puis lancer **PHASE 2 — P0** dans l’ordre ci-dessus. Aucun code P0 ne part sans ton go.

*Fichiers sources : `routeMeta.ts` (6 peau vs 8 cheveux), `beautyProfile.ts` (skin 15 champs), `BoutiquePage.tsx` (15 needs peau vs 10 cheveux, 4 vs 7 filtres), `DiagnosticSkinPage.tsx` (12/5 vs 8), `ProductDetailPage.tsx` (fiche peau experte), `skinAlternatives.ts`, `sourcingCountryScore.ts`, `STRATEGIE_SOURCING_SEGMENTEE`.*
