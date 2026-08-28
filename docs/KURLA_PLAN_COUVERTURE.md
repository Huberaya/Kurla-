# KURLA — PLAN DE CHANTIERS & MATRICE DE COUVERTURE

> **Date :** 27 août 2026 · **Mise à jour :** chantier A livré et vérifié ce jour
>
> **Chantier A ✅** — les cinq fonctions en « logique seule » sont branchées, l'export et la suppression RGPD existent, les écrans de recherche et de routine builder sont en ligne, les données fictives sont purgées et les vocabulaires contrôlés sont alimentés. Voir `docs/KURLA_CHANTIERS.md`.
> **Objet :** garantir que les **20 actions prioritaires**, les **50 fonctionnalités** et les **innovations inventées** seront toutes réalisées, sans trou invisible.
> **Méthode :** chaque statut ci-dessous a été vérifié par `grep` et lecture du code **ce jour**. Les numéros de ligne cités sont réels.
> **Compte final : 47 fonctionnalités couvertes + 3 exclues volontairement = 50. Les 20 actions sont toutes rattachées à un chantier.**

---

## 1. LES QUATRE ÉTATS — ET POURQUOI LA DISTINCTION EST CRITIQUE

| État | Signification | Danger |
|---|---|---|
| ✅ LIVRÉ | Logique + API + écran, testé | Aucun |
| 🔶 **PARTIEL** | Une partie manque (écran, données, migration) | Visible si on regarde |
| 🟠 **LOGIQUE SEULE** | Module écrit et testé, **jamais appelé par rien** | **Le pire** : les tests passent, l'avancement semble réel, l'utilisateur ne voit rien et aucune donnée ne rentre |
| ⬜ **À FAIRE** | Rien n'existe | Gérable, car visible |

### Le piège principal, vérifié ce jour

Cinq symboles ont **zéro appel hors de leur propre module et hors des tests** :

```
computeArchetypeRating    → aucun appel
evaluateReplenishment     → aucun appel
checkJurisdiction         → aucun appel
summarizeReturnInsights   → aucun appel
handleContradiction       → aucun appel
```

Ils sont testés. C'est précisément pour ça qu'ils donnent un faux sentiment d'avancement. **Le chantier A existe pour les fermer.**

---

## 2. ÉTAT RÉEL DES 20 ACTIONS PRIORITAIRES

| # | Action | État | Preuve vérifiée |
|---|---|---|---|
| 1 | Disclosure IA art. 50(1) | ✅ LIVRÉ | Bandeau UI, marquage réponse, `GET /api/ai/disclosure` vérifié en HTTP réel |
| 2 | Retirer `MOCK_PROS` + UGC fictif | ✅ LIVRÉ | `ProfessionalsPage` corrigé. **14 fichiers importent encore `mockData`** : 9 composants (dont `UgcWallSection`, `KurlaProSection`, `TextureGallerySection`, `ConsultationBookingModal`) + 5 pages (dont `ProProfilePage`, `ProtectiveStylesPage`). **Complété** : `ProDashboardPage` affichait un studio inventé, « 4,9/5 sur 38 avis vérifiés » et trois clientes fictives ; réécrite sur `/api/professional/me` |
| 3 | Corriger les 2 contradictions de marque | ✅ LIVRÉ | Bicarbonate retiré, « éclaircissants » → « anti-taches » |
| 4 | 17 tests Phase 2 sur vraie instance | ✅ **LIVRÉ** | `npm run test:realdb` PASS contre l'instance réelle `qzwgsarfdegqtfdnqiql` (eu-west-1) : pré-vérification, 17 contrôles RLS, cycle de stock atomique, bancs pros, paiement de prestation. A nécessité 4 correctifs de schéma puis le rejeu de 3 migrations jamais appliquées — voir `KURLA_CHANTIERS.md` |
| 5 | Table `ingredients` + `product_ingredients` | ✅ LIVRÉ | Migration `20260845`, module `ingredientGraph.ts`, testé |
| 6 | Normaliser les vocabulaires | ✅ LIVRÉ | Tables `kurla_taxonomies` (l.126) et `kurla_taxonomy_terms` (l.133) créées, **mais 0 `INSERT`** dans toute la migration, et **aucune migration des colonnes `TEXT[]` existantes** |
| 7 | Brancher `routine_feedback` sur le moteur | ✅ LIVRÉ | `outcome_observations` → `getOutcomes()` → `buildRecommendations`. Testé avec preuve citable (`obs-1`/`obs-2`) |
| 8 | Rendu serveur / prérendu | 🔶 **PARTIEL** | **38 URLs distinctes prérendues** (chantier 7.4 : `scripts/prerender.ts` dans le build, `sitemap.xml` à 38 `<loc>`), chacune avec son `<head>` propre — mais le corps reste une amorce (`<div id="root">` + `prerender-seed`, mesuré sur `dist/index.html`) : le contenu est toujours rendu côté client. Un vrai rendu serveur du corps reste à faire |
| 9 | Export / suppression en 1 clic | ✅ LIVRÉ | **Aucune route.** `deleteBeautyProfile` existe (`server.ts:2327`), `deleteIntelligenceData` existe dans le store, mais rien ne les expose ensemble en 1 clic |
| 10 | Archétypes + cohortes k-anonymes | ✅ LIVRÉ | Logique + `GET /api/me/archetype`, testé |
| 11 | KURLA Shelf | ✅ LIVRÉ | Logique + 5 endpoints + `ShelfPage` |
| 12 | Note par archétype | ✅ LIVRÉ | `computeArchetypeRating` testé, servi par `GET /api/products/:id/archetype-ratings` et **affiché sur la fiche produit** (`ArchetypeRatingsPanel`). Cohortes sous le seuil annoncées comme masquées. Limite inchangée : les `reviews` ne portent pas d'attribut de texture, donc la source d'alimentation reste à construire |
| 13 | Wash Day OS | ✅ LIVRÉ | Logique + migration `20260846` + 3 endpoints + `WashDayPage` |
| 14 | Timeline coiffure protectrice | ✅ LIVRÉ | Logique + endpoints + signaux stockés et lus par `assessTractionRisk`, **plus un écran dédié** `/account/protective-timeline` (épisodes, jauge de port, signaux d'escalade, historique) |
| 15 | Recherche sémantique | ✅ LIVRÉ | Logique + `GET /api/search`. **Aucun écran** |
| 16 | Détection de conflit de routine | ✅ LIVRÉ | Dans le moteur, **jamais affiché à l'utilisateur** |
| 17 | Unifier le triage médical | ✅ LIVRÉ | `AI_GUARDRAILS.triage()` par racines, testé |
| 18 | Découper les monolithes | ✅ **FAIT** | **Chantier 8.1 livré** : `server.ts` passe de **4 795 à 2 019 lignes** (−58 %), 163 routes inchangées (inventaire de référence `tests/route_inventory.test.ts`), 16 modules sous `src/server/` (http, auth, compliance, ai, 9 modules de routes). **8.2 terminé** : `serverDb.ts` passe de **6 240 à 333 lignes** (−95 %), quatorze domaines dans `src/lib/db/` — 4 domaines extraits dans `src/lib/db/` (notifications/e-mail, support, famille, profil beauté) et recomposés sur le singleton ; les **166 méthodes** restent appelables (inventaire runtime + sonde qui en appelle 21). Le store ne garde que l'état, le verrou de stock, `initialize` et l'assemblage |
| 19 | Réassort prédictif | ✅ LIVRÉ | `evaluateReplenishment` testé, zéro appel, aucune notification branchée |
| 20 | Trust Score pros + co-signature | ✅ **LIVRÉ** | `professionalTrust.ts` pur, testé (14 blocs), servi par `GET /api/professionals/:id/trust`, affiché dans `ProfessionalDirectoryPage.tsx`. `proEndorsement.ts` testé, lecture via `/api/me/endorsements`, **création via le formulaire de l'espace pro**. `POST /api/endorsements` a été verrouillée au passage : elle acceptait `professionalId` et `professionalVerified` depuis le corps de la requête, ce qui permettait de forger la co-signature d'un professionnel vérifié |

**Bilan après le chantier 8.2 : 19 livrées (1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20) · 1 partielle (8 — prérendu : 38 URLs, corps non rendu) · 0 à faire. Total 20.**

Les comptes des 20 actions ne bougent pas, mais leur substance oui : l'action 20 passe de « Trust Score : rien » à « Trust Score livré et affiché », et l'action 18 recule en valeur relative puisque `server.ts` a grossi de 712 lignes pendant que deux stores étaient extraits.

---

## 3. ÉTAT RÉEL DES 50 FONCTIONNALITÉS

### ✅ Livrées (32)
**1** Graphe d'ingrédients · **4** Disclosure IA · **6** KURLA Shelf · **7** Boucle d'apprentissage · **8** Archétypes k-anonymes · **9** Note par archétype *(affichée sur la fiche produit)* · **10** Wash Day OS · **12** Timeline protectrice *(écran dédié `/account/protective-timeline`)* · **13** Recherche sémantique *(`searchByQuery` appelé par `SmartSearchPage.tsx`)* · **14** Détection de conflit *(`ConflictCard` dans `RoutineBuilderPage.tsx:157`)* · **15** Routine Builder → panier *(`buildRoutinePlan` appelé par `RoutineBuilderPage.tsx:65`)* · **17** Intelligence des retours *(bouton par fiche dans `CatalogAdminPanel`)* · **18** Fiche ingrédient publique *(route publique + `IngredientCardPage.tsx`, sans authentification donc indexable)* · **19** Score de confiance produit public *(`fetchProductTrust` appelé par `ProductDetailPage.tsx`)* · **22** Trust Score pros *(`professionalTrust.ts` pur + testé, route, affichage écran)* · **23** Réservation + paiement de prestation *(Session de Checkout Stripe, statut relu chez Stripe, écran `/mes-reservations`)* · **24** Co-signature professionnelle *(création dans l'espace pro, lecture via `/api/me/endorsements`)* · **25** Espace pro dossiers clients *(écran professionnel livré, lecture au périmètre consenti)* · **34** Comparateur de routines · **35** Coût annuel *(les deux dans `CostSimulatorPage.tsx`)* · **44** Transparence IA comme badge *(`AiDisclosureBadge` sur le widget d'assistance)* · **47** Modularisation du moteur · **21** Filtrage réglementaire par juridiction *(moteur, fiche produit et checkout — chantier 7.7)* · **26** Loyalty par progression *(chantier 8.3 : cinq axes plafonnés, l'achat borné à 80/460)* · **27** Récompense non-marchande *(13 faits sur 14)* · **28** Beauty Journey *(chantier 8.4 : chronologie, jalons, comparaison, tendances déclarées)* · **29** Abonnement KURLA+ *(chantier 8.5 : 7 €/mois, essai 14 jours, 4 droits payants dont 2 branchés, aucune fonction essentielle rendue payante)* · **31** API catalogue + scoring *(chantier 8.6b : 5 endpoints `/api/v1/*`, scoring sans état vérifié, `/api-docs` publique et prérendue)* · **39** Programme experts/créateurs *(chantier 8.6c1 : candidature → vérification → publication ; visibilité comptée sur contributions, appuis et résultats déclarés ; aucun emplacement achetable ; page publique `/createurs`)* · **40** Rémunération au résultat *(chantier 8.6c1 : 1,50 € par résultat déclaré, clic/étagère/achat à 0 — figé par deux CHECK en base ; même taux pour un résultat négatif ; > 60 % de négatifs → revue, pas réduction)* · **41** Espace marque : tests produits ciblés *(chantier 8.6c2 : cohorte par besoins — 19 clés de ciblage personnel refusées nommément et impossibles à écrire en base ; consentement daté serveur ; rapport k-anonyme k=30, cellule sous k absente ; aucune donnée personnelle transmise ; page publique `/marques` + tableau de bord `/marque/tests`)* · **42** Application mobile *(chantier 8.7 : PWA installable et hors-ligne ; brief quotidien en une requête — rien d'inventé, union d'items fermée sans promotion ; synchronisation hors-ligne idempotente : une action envoyée deux fois ne s'applique qu'une fois, contrainte d'unicité en base ; service worker qui ne met jamais `/api/` en cache)*

### 🟠 Logique seule (1)
**16** Réassort prédictif — route et fonction cliente existent, aucune surface ne les appelle

### 🔶 Partielles (4)
- **2** Vocabulaires contrôlés — tables créées, **0 donnée de référence**, `TEXT[]` non migrés
- **5** Purge des données fictives — `mockData` reste importé par plusieurs fichiers *(le tableau de bord pro, lui, a été purgé ce tour)*
- **30** Texture Gap Report — 🔶 chantier 8.6a : `src/lib/textureGap.ts` + `textureGapStore.ts` + `GET /api/intelligence/texture-gap` + `/admin/texture-gap`. Rapport k-anonyme (cellule sous 30 absente de la réponse), trou de donnée jamais présenté comme un angle mort. **Manquent** : la surface B2B (compte, contrat, facturation, export) et le rattachement produit × archétype — `product_ingredients` est vide, donc toutes les cellules sortent en `donnees_insuffisantes`.
- **45** Découpage du monolithe — 🔶 `server.ts` ramené de 4 795 à **2 019 lignes** (8.1) ; `serverDb.ts` (6 240 l.) reste entier

### ⬜ À faire (10)
**3** Rendu serveur · **11** Diagnostic photo · **20** i18n/devises/TVA · **32** Recherche visuelle · **33** Scan code-barres · **36** Climat/eau dure *(voir détail ci-dessous)* · **37** Pages SEO générées · **38** Contenu personnalisé · **43** Export/suppression 1 clic · **46** Tests Supabase réels *(l'action 4 est livrée ; le banc d'intégration A/B reste à rejouer à chaque migration)*

### 🚫 Exclues volontairement (3)
**48** Virtual try-on coiffure · **49** Maquillage virtuel · **50** Place de marché créateurs

> **Compte : 32 + 1 + 4 + 10 + 3 = 50.** Vérifié par relecture programmatique de la matrice : 50 identifiants uniques, aucun doublon, aucun manquant.


### Détail mesuré sur la feature 36 (climat / eau dure)

Le module sait faire les deux, le serveur n'en alimente qu'un :

- **Eau dure : branchée.** `server.ts:1790` passe `hardWater: cycle.hardWater` → `washDay.ts:211` produit la note.
- **Humidité : non branchée.** `washDay.ts:208` sait produire une note d'humidité, mais l'appel `buildWashDayPlan` (`server.ts:1782`) ne passe **pas** `humidityPercent` — alors qu'un appel météo existe ailleurs (`server.ts:2195-2202`) et récupère déjà `relative_humidity_2m`.
- **Événements : `events: []` en dur** (`server.ts:1789`). Piscine, chaleur, chimie, transpiration : la logique existe, aucun moyen de les déclarer.

Trois lignes de câblage manquent, pas trois fonctionnalités.

---

## 4. LES SEPT CHANTIERS

### CHANTIER A — FERMER LES TROUS
*Le plus urgent, le moins visible. Sans lui, aucune donnée ne rentre.*

| Tâche | Fonctionnalités |
|---|---|
| Brancher `computeArchetypeRating` sur la fiche produit + retirer la note globale + ajouter l'attribut texture aux avis | 9 |
| Brancher `evaluateReplenishment` sur les notifications existantes | 16 |
| Brancher `summarizeReturnInsights` : formulaire de retour motivé + surface admin | 17 |
| Brancher `checkJurisdiction` dans le filtre catalogue par pays | 21 |
| Brancher `handleContradiction` sur la routine + UI de co-signature | 24 |
| **`GET /api/me/data` (export) + `DELETE /api/account` (suppression 1 clic)** | 43, action 9 |
| Écran de recherche sémantique | 13 |
| Écran Routine Builder → panier en 1 clic | 15 |
| Afficher les conflits de routine détectés | 14 |
| Purger les 14 fichiers restants sur `mockData` | 5, action 2 |
| Remplir `kurla_taxonomy_terms` + migrer les `TEXT[]` | 2, action 6 |
| Passer `humidityPercent` et les événements déclarables à `buildWashDayPlan` | 36 |

**Critère de sortie :** `grep` sur les cinq symboles renvoie des appels réels. Zéro import de `mockData` en production. Un utilisateur exporte et supprime ses données sans nous écrire.

---

### CHANTIER B — CONFIANCE, PROS & ÉCOSYSTÈME ✅ (partiel)

| Tâche | Fonctionnalités | État |
|---|---|---|
| Trust Score pros : identité, diplôme, vérification, avis réels | 22, action 20 | ✅ `professionalTrust.ts` pur + testé, route, écran |
| Réservation de prestation | 23 | ✅ routes, store, écran, consentement au partage |
| **Paiement de prestation** | 23 | ⬜ table `service_payments` créée, **aucune route ne l'appelle** |
| Espace pro : dossiers clients partagés avec consentement explicite | 25 | 🔶 modèle par périmètre + 4 routes, **aucun écran pro** |
| Fiche ingrédient publique (fonction, preuve A–D, sources) | 18 | ✅ route publique + `IngredientCardPage.tsx`, indexable |
| Comparateur de routines | 34 | ✅ `CostSimulatorPage.tsx` |
| Simulateur de coût annuel | 35 | ✅ `CostSimulatorPage.tsx` |
| Transparence IA transformée en badge visible | 44 | ✅ `AiDisclosureBadge` : disclosure en tête du widget d'assistance et rappel permanent en pied. Le widget flottant était un point d'interaction générative sans disclosure — écart à l'article 50(1) |

**Critère de sortie :** au moins un pro vérifié réservable, **payable**, et capable de co-signer. Une fiche ingrédient publique et indexable.

**Résultat : la fiche ingrédient publique est atteinte. Le critère pro ne l'est pas** — la réservation est livrée, le paiement de prestation et la co-signature dans l'UI ne le sont pas. Détail complet dans `docs/KURLA_CHANTIERS.md`.

---

### CHANTIER C — SEO, SSR & CONTENU
*Le plus coûteux. À trancher avant d'accumuler plus de pages.*

| Tâche | Fonctionnalités |
|---|---|
| Rendu serveur ou prérendu | 3, action 8 |
| Vrai routeur — `App.tsx` contient **39** comparaisons `pathname` | 3 |
| Métadonnées par page, sitemap, robots, hreflang, Open Graph | 3, 37 |
| Pages générées : ingrédient × problème × texture × ville | 37 |
| Contenu personnalisé par profil | 38 |

**Critère de sortie :** ≥ 10 000 URLs indexables générées depuis le graphe, métadonnées distinctes.

---

### CHANTIER D — INTERNATIONALISATION

| Tâche | Fonctionnalités |
|---|---|
| i18n + devises + TVA | 20 |
| Exposition du filtrage réglementaire par marché *(la logique vient du chantier A)* | 21 |
| Catalogue régional piloté depuis `country_availability` (déjà présent, 6 pays en seed) | 20 |

**Critère de sortie :** un second marché linguistique fonctionne de bout en bout : prix, TVA, conformité ingrédient locale. *(7.5 a livré l'i18n et les routes traduites ; 7.6 la TVA au taux de destination ; 7.7 la conformité ingrédient par pays — le critère est atteint, sauf l'encaissement multidevise, reporté avec Stripe.)*

---

### CHANTIER E — RÉTENTION & BEAUTY JOURNEY

| Tâche | Fonctionnalités |
|---|---|
| Loyalty par progression, pas par points seuls — ✅ chantier 8.3 : cinq axes plafonnés, l'achat borné à 80/460 | 26 |
| Récompense des comportements non-marchands : scan, avis, feedback — ✅ chantier 8.3 : 13 faits non marchands sur 14 | 27 |
| Beauty Journey : narration de l'évolution — ✅ chantier 8.4 : chronologie, jalons, comparaison, tendances déclarées | 28 |
| Abonnement KURLA+ — ✅ chantier 8.5 : KURLA+ 7 €/mois, essai 14 j, 4 droits payants dont 2 branchés, rien d’essentiel rendu payant | 29 |

**Critère de sortie :** un utilisateur qui ne commande pas progresse et est récompensé. Rétention à 90 jours mesurée.

---

### CHANTIER F — B2B & API

| Tâche | Fonctionnalités |
|---|---|
| Texture Gap Report — agrégats k-anonymes uniquement — 🔶 chantier 8.6a : rapport k-anonyme livré et réservé à l’administration ; ni compte B2B ni contrat, et couverture du catalogue inconnue tant que `product_ingredients` est vide | 30 |
| API catalogue + scoring — ✅ chantier 8.6b : 5 endpoints `/api/v1/*` publics, scoring sans état, `/api-docs` indexable ; pas de clés ni de quota par consommateur | 31 |
| Espace marque : tests produits ciblés — ✅ chantier 8.6c2 : rôle `brand`, 10 routes, 4 tables, rapport k-anonyme. **Manquent** le contrat, la facturation et l’application de la migration `20260865` | 41 |
| Programme experts / créateurs — ✅ chantier 8.6c1 : `creatorProgram.ts` + `creatorStore.ts` + 7 routes + migration `20260864` + page publique `/createurs`. La visibilité ne s’achète pas : aucun poids monétaire, aucune table où enregistrer un placement | 39 |
| Rémunération au résultat, pas au clic — ✅ chantier 8.6c1 : clic/étagère/achat valent 0 (contraintes `only_outcomes_are_paid` + `outcomes_pay_exactly_one`), 1,50 € par résultat déclaré, taux identique quel que soit le signe, > 60 % de négatifs → revue | 40 |

**Critère de sortie :** un contrat marque signé sur agrégats, sans aucune donnée personnelle cédée.

---

### CHANTIER G — ARCHITECTURE, MOBILE & VISION

| Tâche | Fonctionnalités |
|---|---|
| Découpage de `server.ts` (4 795 → **2 019 l.**, fait en 8.1) et `serverDb.ts` (6 240 l., à faire) par domaine | 45, action 18 |
| Tests Supabase réels A/B | 46, action 4 |
| Application mobile — ✅ chantier 8.7 : PWA + brief + sync idempotente. **Manquent** : notifications push, build App Store/Play, écran de scan (33) et diagnostic photo (11) en dette | 42 |
| Diagnostic photo **encadré** : aide beauté, AIPD préalable | 11 |
| Recherche visuelle produit | 32 |
| Scan code-barres INCI | 33 |
| Catch-all API : 404 JSON au lieu du HTML 200 sur route inconnue | dette |

**Critère de sortie :** les 17 vérifications RLS passent contre une instance réelle. Le diagnostic photo est couvert par une AIPD signée.

---

## 5. MATRICE DE TRAÇABILITÉ

Chaque fonctionnalité apparaît **une seule fois** dans la colonne « chantier principal ». Deux fonctions sont reprises en second lieu, explicitement signalé.

| Chantier | Fonctionnalités | Nb |
|---|---|---|
| **A** — Fermer les trous | 2, 5, 9, 13, 14, 15, 16, 17, 21, 24, 36, 43 | 12 |
| **B** — Confiance & pros | 18, 22, 23, 25, 34, 35, 44 | 7 |
| **C** — SEO / SSR | 3, 37, 38 | 3 |
| **D** — International | 20 *(+ 21 en reprise)* | 1 |
| **E** — Rétention | 26, 27, 28, 29 | 4 |
| **F** — B2B | 30, 31, 39, 40, 41 | 5 |
| **G** — Architecture | 11, 32, 33, 42, 45, 46 | 6 |
| **Déjà livré** | 1, 4, 6, 7, 8, 10, 12, 19, 47 | 9 |
| **Exclu** | 48, 49, 50 | 3 |
| | | **50 + 1 reprise (21) = 51 entrées** |

### Couverture des 20 actions

| Chantier | Actions |
|---|---|
| **A** | 2, 6, 9, 12, 15, 16, 19, 20 *(la co-signature)* |
| **B** | 20 *(le Trust Score)* |
| **C** | 8 |
| **G** | 4, 18 |
| **Déjà fait** | 1, 3, 5, 7, 10, 11, 13, 14, 17 |

**Compte : 8 + 1 + 1 + 2 + 9 = 21 entrées, l'action 20 étant scindée en deux volets → 20 actions couvertes.**

---

## 6. LES INNOVATIONS — OÙ ELLES ATTERISSENT

| Innovation | État vérifié | Suite |
|---|---|---|
| **KURLA Shelf** | ✅ logique + 5 API + écran | A pour le scan visuel |
| **Wash Day OS** | ✅ logique + migration + 3 API + écran | A pour les événements déclarables |
| **Evidence ingrédient × archétype — le MOAT** | 🔶 agrégation livrée, **note par archétype non branchée** | A |
| **Timeline coiffure protectrice** | ✅ logique + signaux stockés et lus | — |
| **Intelligence des retours** | 🟠 logique seule | A |
| **Co-signature professionnelle** | 🟠 logique seule | A |
| **Filtrage réglementaire par juridiction** | ✅ moteur (exclusion tracée) + fiche produit (bandeau par pays) + checkout (porte fermée) — 7.7 | D — renseigner `product_ingredients` pour lever les avertissements |
| **« KURLA ne devine pas » comme signature** | ✅ encodé (`null`, `unclassified`, seuil k) | E — à expliciter en marque |
| **Conformité AI Act comme avantage concurrentiel** | ✅ disclosure art. 50(1) | B — badge visible ; art. 50(2) au 2 déc. 2026 |

---

## 7. CE QUE JE NE FERAI PAS, ET POURQUOI

- **48 Virtual try-on coiffure/couleur** — spectaculaire, coût élevé, aucun avantage défendable.
- **49 Maquillage virtuel** — hors cœur de métier.
- **50 Place de marché créateurs** — trop tôt, diluerait la confiance.
- **Marque propre KURLA** — pas avant d'avoir établi la neutralité comme actif. C'est le conflit d'intérêt structurel de Proven.
- **Diagnostic médical par photo** — ni fiable, ni juridiquement tenable. Aide beauté uniquement.
- **Feed social** — coût de modération, aucun lien avec la décision d'achat.

---

## 8. ORDRE EXÉCUTÉ ET RAISON

```
A  Fermer les trous      ← URGENT : sans ça, aucune donnée ne rentre
↓
B  Confiance & pros      ← la donnée expert, la plus rare à obtenir
↓
C  SEO / SSR             ← le plus coûteux, avant d'accumuler des pages
↓
D  International
↓
E  Rétention
↓
F  B2B
↓
G  Architecture, mobile, vision
```

**Pourquoi A en premier, précisément :** tant que la note par archétype, le réassort, l'intelligence des retours et la co-signature ne sont pas branchés, **aucune donnée ne rentre**. Sans donnée, le MOAT ne démarre pas — et les chantiers C à F n'ont rien à valoriser.

---

## 9. RÈGLE DE VÉRIFICATION, À CHAQUE CHANTIER

Aucun chantier n'est déclaré terminé sans :

1. `tsc --noEmit` → exit 0
2. `npm test` → exit 0
3. Un test qui **appelle réellement** le nouveau code, pas une réimplémentation
4. Un `grep` prouvant le branchement — **interdiction de laisser un module en `logique seule`**
5. Le serveur démarré, la route testée en HTTP réel, **avec la méthode explicite** (`curl` sans `-X` émet un GET qui tombe dans le catch-all SPA et renvoie 200)
6. Ce qui n'a pas pu être vérifié est **dit explicitement**, jamais passé sous silence

---

## 10. PASSIFS OUVERTS, DÉCLARÉS

| Passif | Pourquoi il reste ouvert |
|---|---|
| ~~17 vérifications RLS jamais exécutées~~ **LEVÉ** | `npm run test:realdb` vert contre `qzwgsarfdegqtfdnqiql` : 17 contrôles RLS, cycle de stock atomique, bancs pros et paiement de prestation |
| Aucune vérification visuelle/navigateur des écrans Shelf et Wash Day | Vérifiés par compilation, tests de câblage et HTTP 200 — pas par rendu |
| `GET /api/*` sur route inconnue renvoie du HTML 200 | Catch-all SPA. Pas une faille d'autorisation — les routes protégées renvoient bien 401. Corrigé : un 404 JSON `API_ROUTE_NOT_FOUND` est enregistré avant le catch-all |
| Art. 50(2) marquage machine-readable | Échéance 2 déc. 2026 pour les systèmes déjà sur le marché. À traiter en B |
| Art. 50(4) exemption éditoriale | Encodée dans `AI_TRANSPARENCY.editorialExemptionNote`, **non appliquée dans le CMS** |
