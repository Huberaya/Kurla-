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
| 2 | Retirer `MOCK_PROS` + UGC fictif | ✅ LIVRÉ | `ProfessionalsPage` corrigé. **Purge achevée (bloc A1, commit `a8ecc8f`)** : `src/data/mockData.ts` et `src/lib/ai/mockAnswers.ts` supprimés ; `grep -rn 'mockData\|mockAnswers\|MOCK_' src/ server.ts` ne renvoie plus que 6 commentaires historiques, **0 import**. Les photos décoratives vivent dans `src/data/images.ts`, les produits de banc dans `tests/fixtures/seedProducts.ts` (`SEED_PRODUCTS`). **Complété** : `ProDashboardPage` affichait un studio inventé, « 4,9/5 sur 38 avis vérifiés » et trois clientes fictives ; réécrite sur `/api/professional/me` |
| 3 | Corriger les 2 contradictions de marque | ✅ LIVRÉ | Bicarbonate retiré, « éclaircissants » → « anti-taches » |
| 4 | 17 tests Phase 2 sur vraie instance | ✅ **LIVRÉ** | `npm run test:realdb` PASS contre l'instance réelle `qzwgsarfdegqtfdnqiql` (eu-west-1) : pré-vérification, 17 contrôles RLS, cycle de stock atomique, bancs pros, paiement de prestation. A nécessité 4 correctifs de schéma puis le rejeu de 3 migrations jamais appliquées — voir `KURLA_CHANTIERS.md` |
| 5 | Table `ingredients` + `product_ingredients` | ✅ LIVRÉ | Migration `20260845`, module `ingredientGraph.ts`, testé |
| 6 | Normaliser les vocabulaires | 🔶 PARTIEL | Tables créées par `20260845` (l.126 et l.133). **Correction d'une affirmation antérieure fausse** : les données de référence existent — `20260847000000_kurla_taxonomy_terms.sql` insère **5 taxonomies et 55 termes** (besoins 17, étapes 13, marchés 10, profondeurs de ton 8, textures 7). **Fait depuis le bloc B3** : `saveCatalogProduct` refuse toute valeur hors référentiel et résout les synonymes vers leur code canonique (`src/lib/db/taxonomyStore.ts`, référence miroir `src/lib/taxonomyReference.ts`, `GET /api/taxonomies` public, audit `GET /api/admin/catalog/vocabulary-audit`). **Reste** : la contrainte au niveau base (trigger/FK) et la reprise des lignes déjà écrites, que l'audit liste |
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

### ✅ Livrées (34)
**1** Graphe d'ingrédients *(module `ingredientGraph.ts` + tables `20260845` ; **correction** : aucune couche n'écrivait `product_ingredients` — le graphe était illisible à alimenter. Comblé par le bloc B1 : `src/lib/db/ingredientLinkStore.ts` (`attachProductIngredients`, `linkDeclaredIngredients`, `linkAllDeclaredIngredients`, `getIngredientGraphCoverage`), routes admin dédiées, aucune correspondance devinée, provenance portée par ligne ; banc `tests/kurla_ingredient_graph.test.ts`. En production la table reste vide tant que le lot n'a pas été joué)* · **4** Disclosure IA · **6** KURLA Shelf · **7** Boucle d'apprentissage · **8** Archétypes k-anonymes · **9** Note par archétype *(affichée sur la fiche produit)* · **10** Wash Day OS · **12** Timeline protectrice *(écran dédié `/account/protective-timeline`)* · **13** Recherche sémantique *(`searchByQuery` appelé par `SmartSearchPage.tsx`)* · **14** Détection de conflit *(`ConflictCard` dans `RoutineBuilderPage.tsx:157`)* · **15** Routine Builder → panier *(`buildRoutinePlan` appelé par `RoutineBuilderPage.tsx:65`)* · **17** Intelligence des retours *(bouton par fiche dans `CatalogAdminPanel`)* · **18** Fiche ingrédient publique *(route publique + `IngredientCardPage.tsx`, sans authentification donc indexable)* · **19** Score de confiance produit public *(`fetchProductTrust` appelé par `ProductDetailPage.tsx`)* · **22** Trust Score pros *(`professionalTrust.ts` pur + testé, route, affichage écran)* · **23** Réservation + paiement de prestation *(Session de Checkout Stripe, statut relu chez Stripe, écran `/mes-reservations`)* · **24** Co-signature professionnelle *(création dans l'espace pro, lecture via `/api/me/endorsements`)* · **25** Espace pro dossiers clients *(écran professionnel livré, lecture au périmètre consenti)* · **34** Comparateur de routines · **35** Coût annuel *(les deux dans `CostSimulatorPage.tsx`)* · **44** Transparence IA comme badge *(`AiDisclosureBadge` sur le widget d'assistance)* · **47** Modularisation du moteur · **21** Filtrage réglementaire par juridiction *(moteur, fiche produit et checkout — chantier 7.7)* · **26** Loyalty par progression *(chantier 8.3 : cinq axes plafonnés, l'achat borné à 80/460)* · **27** Récompense non-marchande *(13 faits sur 14)* · **28** Beauty Journey *(chantier 8.4 : chronologie, jalons, comparaison, tendances déclarées)* · **29** Abonnement KURLA+ *(chantier 8.5 : 7 €/mois, essai 14 jours, 4 droits payants dont 2 branchés, aucune fonction essentielle rendue payante)* · **31** API catalogue + scoring *(chantier 8.6b : 5 endpoints `/api/v1/*`, scoring sans état vérifié, `/api-docs` publique et prérendue)* · **39** Programme experts/créateurs *(chantier 8.6c1 : candidature → vérification → publication ; visibilité comptée sur contributions, appuis et résultats déclarés ; aucun emplacement achetable ; page publique `/createurs`)* · **40** Rémunération au résultat *(chantier 8.6c1 : 1,50 € par résultat déclaré, clic/étagère/achat à 0 — figé par deux CHECK en base ; même taux pour un résultat négatif ; > 60 % de négatifs → revue, pas réduction)* · **41** Espace marque : tests produits ciblés *(chantier 8.6c2 : cohorte par besoins — 19 clés de ciblage personnel refusées nommément et impossibles à écrire en base ; consentement daté serveur ; rapport k-anonyme k=30, cellule sous k absente ; aucune donnée personnelle transmise ; page publique `/marques` + tableau de bord `/marque/tests`)* · **5** Purge des données fictives *(bloc A1, commit `a8ecc8f` : `mockData.ts` et `mockAnswers.ts` supprimés, aucun `MOCK_*` n'était consommé au runtime — responsabilité dormante éliminée ; images → `src/data/images.ts`, fixtures → `tests/fixtures/seedProducts.ts`)* · **43** Export / suppression en 1 clic *(bloc A2 : `src/lib/db/privacyStore.ts`, `GET /api/account/export` + `POST /api/account/delete`, écran `/account/donnees` ; suppression bornée au compte appelant, commandes/paiements/remboursements/livraisons conservés pour obligation légale et déclaré dans la réponse ; banc `tests/kurla_privacy.test.ts`)* · **42** Application mobile *(chantier 8.7 : PWA installable et hors-ligne ; brief quotidien en une requête — rien d'inventé, union d'items fermée sans promotion ; synchronisation hors-ligne idempotente : une action envoyée deux fois ne s'applique qu'une fois, contrainte d'unicité en base ; service worker qui ne met jamais `/api/` en cache)*

### 🟠 Logique seule (1)
**16** Réassort prédictif — route et fonction cliente existent, aucune surface ne les appelle

### 🔶 Partielles (4)
- **2** Vocabulaires contrôlés — 🔶 **référence présente** (`20260847` : 5 taxonomies, **50 termes** — l'affirmation « 0 donnée » était fausse) **et appliquée à l'écriture depuis le bloc B3** : valeur hors référentiel refusée, synonyme résolu vers son code canonique et résolution signalée, vocabulaire lisible publiquement, audit du fonds existant. **Reste** : contrainte en base (trigger/FK) et reprise des lignes déjà écrites. La dérive `cuir_chevelu` / `apaiser_cuir_chevelu` reste assumée comme synonyme, pas résorbée
- **11** Diagnostic photo — 🔶 **encadrement livré (bloc A3)** : AIPD `docs/KURLA_AIPD_PHOTO.md` + constante exécutable `src/lib/photoAipd.ts` (`AIPD-KURLA-PHOTO-v1`), route publique `GET /api/privacy/photo-aipd`, rétention 180 jours **réellement purgée** par `purgeExpiredBeautyProfilePhotos` (`POST /api/admin/maintenance/photo-purge`, admin), réponse d'upload qui rappelle durée + limites, banc `tests/kurla_photo_aipd.test.ts`. **Manque** : l'analyse d'image elle-même — aucun diagnostic n'est produit aujourd'hui, et il ne le sera pas sans revue de cette AIPD
- **30** Texture Gap Report — 🔶 chantier 8.6a : `src/lib/textureGap.ts` + `textureGapStore.ts` + `GET /api/intelligence/texture-gap` + `/admin/texture-gap`. Rapport k-anonyme (cellule sous 30 absente de la réponse), trou de donnée jamais présenté comme un angle mort. **Manquent** : la surface B2B (compte, contrat, facturation, export) et le rattachement produit × archétype — `product_ingredients` est vide, donc toutes les cellules sortent en `donnees_insuffisantes`.
- **45** Découpage du monolithe — 🔶 `server.ts` ramené de 4 795 à **2 019 lignes** (8.1) ; `serverDb.ts` (6 240 l.) reste entier

### ⬜ À faire (7)
**3** Rendu serveur · **20** i18n/devises/TVA · **32** Recherche visuelle · **33** Scan code-barres · **36** Climat/eau dure *(voir détail ci-dessous)* · **37** Pages SEO générées · **38** Contenu personnalisé · **46** Tests Supabase réels *(l'action 4 est livrée ; le banc d'intégration A/B reste à rejouer à chaque migration)*

### 🚫 Exclues volontairement (3)
**48** Virtual try-on coiffure · **49** Maquillage virtuel · **50** Place de marché créateurs

> **Compte : 34 + 1 + 4 + 8 + 3 = 50.** Vérifié par relecture programmatique de la matrice : 50 identifiants uniques, aucun doublon, aucun manquant.


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
| ✅ **Export + suppression 1 clic** — livré sous `GET /api/account/export` + `POST /api/account/delete` (écran `/account/donnees`) | 43, action 9 |
| Écran de recherche sémantique | 13 |
| Écran Routine Builder → panier en 1 clic | 15 |
| Afficher les conflits de routine détectés | 14 |
| ✅ **Purge achevée** — `mockData.ts` et `mockAnswers.ts` supprimés, 0 import restant | 5, action 2 |
| Remplir `kurla_taxonomy_terms` + migrer les `TEXT[]` | 2, action 6 |
| Passer `humidityPercent` et les événements déclarables à `buildWashDayPlan` | 36 |

**Critère de sortie : ✅ atteint.** Zéro import de `mockData` en production (6 commentaires historiques seulement) ; un utilisateur exporte et supprime ses données depuis `/account/donnees` sans nous écrire — vérifié par `tests/kurla_privacy.test.ts` (93 bancs PASS).

---

### CHANTIER B — CONFIANCE, PROS & ÉCOSYSTÈME ✅ (partiel)

| Tâche | Fonctionnalités | État |
|---|---|---|
| Trust Score pros : identité, diplôme, vérification, avis réels | 22, action 20 | ✅ `professionalTrust.ts` pur + testé, route, écran |
| Réservation de prestation | 23 | ✅ routes, store, écran, consentement au partage |
| **Paiement de prestation** | 23 | ✅ **vérifié le 28/08/2026** : `POST /api/appointments/:id/checkout` (session Stripe, réservé aux réservations déjà confirmées par le pro), `POST /api/service-payments/:id/confirm` (statut relu chez Stripe, jamais déclaré par le client), `GET /api/appointments/:id/payments`, bouton « Payer la prestation » dans `MyAppointmentsPage.tsx` |
| Espace pro : dossiers clients partagés avec consentement explicite | 25 | 🔶 modèle par périmètre + 4 routes, **aucun écran pro** |
| Fiche ingrédient publique (fonction, preuve A–D, sources) | 18 | ✅ route publique + `IngredientCardPage.tsx`, indexable |
| Comparateur de routines | 34 | ✅ `CostSimulatorPage.tsx` |
| Simulateur de coût annuel | 35 | ✅ `CostSimulatorPage.tsx` |
| Transparence IA transformée en badge visible | 44 | ✅ `AiDisclosureBadge` : disclosure en tête du widget d'assistance et rappel permanent en pied. Le widget flottant était un point d'interaction générative sans disclosure — écart à l'article 50(1) |

**Critère de sortie :** au moins un pro vérifié réservable, **payable**, et capable de co-signer. Une fiche ingrédient publique et indexable.

**Résultat, revérifié ligne à ligne le 28/08/2026 : le critère est atteint.** Les trois
maillons existent dans le code : réservation (`professionalStore` + routes + écran),
paiement (routes ci-dessus + bouton dans l'UI), co-signature (`POST /api/endorsements`,
`GET /api/me/endorsements`, lu côté client dans `RoutineBuilderPage.tsx` — un
professionnel ne peut pas être son propre client, et l'affichage exige le
consentement daté du membre). La ligne « aucune route ne l'appelle » qui figurait
ici était **périmée** : elle datait d'un état antérieur du dépôt.

---

### CHANTIER C — SEO, SSR & CONTENU
*Le plus coûteux. À trancher avant d'accumuler plus de pages.*

| Tâche | Fonctionnalités |
|---|---|
| Rendu serveur ou prérendu | 3, action 8 | ✅ chantier 7.3 (prérendu au build) **+ chantier 13** : les routes dynamiques reçoivent leur propre tête au moment de la requête, et un chemin inconnu répond 404 |
| Vrai routeur | 3 | ✅ **ligne périmée corrigée le 28/08/2026** : la table de routes est `src/lib/routeTable.tsx` (57 entrées) et `App.tsx` ne contient plus que 6 occurrences de `pathname`, aucune comparaison de routage |
| Métadonnées par page, sitemap, robots, hreflang, Open Graph | 3, 37 | ✅ chantiers 7.1/7.2 (57 fiches de métadonnées, `sitemap.xml`, `robots.txt`, hreflang fr/en, JSON-LD) **+ chantier 13** : le sitemap annonce désormais les fiches produit, et la tête d'une page dynamique n'est plus celle de l'accueil |
| Pages générées : ingrédient × produit | 37 | 🔶 fiches ingrédient (7.4) et fiches produit (chantier 13) prérendues depuis la base. **Les croisements problème × texture × ville ne sont pas faits, et c'est un choix** : sans contenu distinct par page, ce serait une usine à pages quasi dupliquées — exactement ce que KURLA reproche aux autres |
| Contenu personnalisé par profil | 38 | ⬜ non fait. Un contenu qui dépend du profil n'est pas indexable : il relève du rendu client, pas du SEO |

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
| Espace marque : tests produits ciblés — ✅ chantier 8.6c2 : rôle `brand`, 10 routes, 4 tables, rapport k-anonyme ; migration `20260865` appliquée en production le 2026-08-28. Contrat ✅ **et** facturation ✅ chantier 12 (blocs D1 et D2) : voir ci-dessous | 41 |
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
| ✅ **Diagnostic photo encadré** : `AIPD-KURLA-PHOTO-v1` (`docs/KURLA_AIPD_PHOTO.md` + `src/lib/photoAipd.ts`), rétention 180 j purgée, `GET /api/privacy/photo-aipd` | 11 |
| Recherche visuelle produit | 32 |
| Scan code-barres INCI | 33 |
| Catch-all API : 404 JSON au lieu du HTML 200 sur route inconnue | dette |

**Critère de sortie :** les 17 vérifications RLS passent contre une instance réelle *(fait)*. Le diagnostic photo est couvert par une AIPD signée *(fait : `AIPD-KURLA-PHOTO-v1`, 28 août 2026, revue prévue 28 août 2027)*.

---

### CHANTIER 10 — BLOC B : CATALOGUE & GRAPHE ✅ (B1–B4 livrés)

Deux constats vérifiés dans le code avant d'écrire, pas déduits d'un tableau :

1. **`product_ingredients` était lu par cinq mécanismes** (compliance produit,
   filtrage juridictionnel, score de confiance, Texture Gap Report, note par
   archétype) **et écrit par aucun**. Le graphe n'était pas incomplet : il était
   impossible à alimenter.
2. **`catalog_status` pouvait passer à `published` sans aucune vérification.**
   `isPublishableProduct` filtrait l'affichage, donc le produit restait invisible
   — mais le statut, lui, servait de condition dans des politiques en base
   (`20260845` l.388). Un statut qui ne correspond à rien est pire qu'un statut
   absent.

| Livré | Preuve |
|---|---|
| **B1 — couche d'écriture du graphe** | `src/lib/db/ingredientLinkStore.ts` : rattachement par identifiant ou mention déclarée, rang = ordre de concentration, provenance portée par ligne (`declared` / `inci_label` / `brand_confirmed` / `lab_analysed`), alimentation en lot avec rapport des mentions non résolues, couverture mesurée. **Aucune correspondance devinée** : ce qui n'existe pas dans le référentiel est rendu à l'opérateur. Routes `POST /api/admin/catalog/:productId/ingredients`, `POST /api/admin/catalog/ingredients/link-declared`, `GET /api/admin/catalog/ingredient-coverage`. Banc `tests/kurla_ingredient_graph.test.ts` |
| **B4 — lot d'ingrédients vérifiés, source par source** | `scripts/verify-ingredient-batch.py` interroge PubChem (NIH) et NCBI Taxonomy ; une ligne n'est émise que si l'identité est confirmée. **23 lignes retenues** : 9 en niveau 1 (INCI littéralement présent dans les synonymes PubChem **et** numéro CAS publié → `verified`), 14 en niveau 2 (espèce botanique vérifiée, dénomination INCI absente des sources → `pending`, jamais `verified`). **2 écartées et tracées** (hyaluronate de sodium, cocamidopropyl bétaïne). Trace `docs/data/ingredient_batch_1.json`, migration générée `20260868000000_ingredient_verified_batch_1.sql` (23 ingrédients + 23 provenances + 24 liaisons produit × ingrédient calculées, mentions sans correspondance listées et non rattachées). Le statut `verified` exige désormais une provenance de niveau 1 (`setIngredientVerificationStatus`), la fiche ingrédient publique expose source, URL et date. Banc `tests/kurla_ingredient_provenance.test.ts`. **CosIng écarté après sondage** : interface JavaScript sans point d'accès données public |
| **B3 — vocabulaires contrôlés appliqués** | `src/lib/db/taxonomyStore.ts` + référence miroir `src/lib/taxonomyReference.ts` (générée depuis `20260847`, divergence détectée par le banc). `saveCatalogProduct` refuse une valeur hors référentiel et résout les synonymes (`sec` → `hydrater_cheveux`) en le signalant. `GET /api/taxonomies` public, `GET /api/admin/catalog/vocabulary-audit` pour le fonds existant. Banc `tests/kurla_taxonomy.test.ts` |
| **B2 — la publication veut dire quelque chose** | `getCatalogPublicationReadiness` reprend les exigences de `isPublishableProduct` moins le statut lui-même, et `updateCatalogStatus` **refuse** `published` tant qu'elles ne sont pas satisfaites (422 avec la liste nominative des manques). Rapport `GET /api/admin/catalog/publication-readiness` : `publishedStatus` ≠ `readyToPublish`, et `publishedButNotListable` compte les statuts menteurs. Banc `tests/kurla_catalog_publication.test.ts` ; le banc `catalog_management` existant a été **renforcé** (il vérifiait le filtrage lecture, il vérifie désormais le refus écriture) |

**Ce que B1/B2 ne règlent pas, et qui reste ouvert :**

- **Les données.** Le lot 1 (B4) fournit 23 ingrédients vérifiés et 24 liaisons,
  mais sa migration `20260868000000` **n'est pas appliquée** : aucun identifiant
  de base n'était disponible ce tour. Tant qu'elle n'est pas jouée, la base de
  production reste à `product_ingredients = 0`. Et aucun produit n'est publié : la
  publication exige désormais des vérifications réelles (visuels, allégations,
  stock, certifications) qui ne se déclarent pas d'un clic.
  n'est publié. La couche d'écriture existe ; l'alimenter exige soit des listes
  INCI réelles par produit, soit des vérifications réellement effectuées
  (visuels, allégations, stock, certifications). **Ni l'un ni l'autre ne
  s'invente** : le lot `link-declared` ne rattache que ce qui correspond au
  référentiel existant (~13 ingrédients) et rend le reste.
- **B3 — vocabulaires contrôlés à l'écriture** : les termes de référence existent
  (`20260847`, 5 taxonomies / 55 termes) mais rien ne valide `concerns`,
  `hair_types` ou `needs` contre eux au moment de l'écriture produit.
- **État non vérifié ce tour** : le compte exact de produits publiés et de
  liaisons en base réelle n'a pas pu être relu (aucun identifiant de base
  disponible). Les chiffres cités proviennent de la dernière lecture connue.

### CHANTIER 11 — BLOC C : LA PETITE COMMUNAUTÉ ✅ (réalisé le 28/08/2026)

**Contexte.** La page « Communauté » était une coquille : 53 lignes, zéro appel
réseau, « Rejoins des milliers de personnes » (aucun compteur ne le prouvait) et
une bannière **« Événement Communautaire Actif — Challenge 30 Jours »** annonçant
un événement qui n'existe dans aucun fichier du dépôt. Annoncer un événement
actif inexistant est une pratique commerciale trompeuse, pas une décoration.
En dessous, le mur de témoignages — vidé de ses avis inventés lors d'un chantier
précédent — affichait encore des compteurs **codés en dur**.

**Le vrai trou, vérifié avant d'écrire.** On pouvait **poser** une question et
**écrire** un avis, mais **aucune route ne permettait de les lire** : seulement
`POST /api/products/:productId/questions` et `POST /api/products/:productId/reviews`.
Une communauté écrivable et illisible n'existe pas.

| Livrable | Preuve |
| --- | --- |
| **Lecture** | `getProductQuestionThreads`, `getOpenCommunityQuestions`, `getCommunityOverview` (`src/lib/db/communityStore.ts`) ; routes `GET /api/community`, `GET /api/community/questions`, `GET /api/products/:id/questions`, `GET /api/products/:id/reviews` (`src/server/routes/community.ts`) |
| **Entraide** | `answerProductQuestion`, `markQuestionResolved` ; routes `POST /api/products/:id/questions/:questionId/answers`, `POST /api/community/questions/:questionId/resolved` |
| **Page branchée** | `CommunityPage` lit les questions en attente ; `UgcWallSection` lit `GET /api/community` et affiche des compteurs **calculés**. Les deux affirmations invérifiables ont été supprimées, pas reformulées |
| **RGPD des contenus communautaires** | avis, questions et réponses sortent désormais dans l'export et partent à la suppression du compte (`privacyStore.ts`) — ils n'y étaient pas, trou hérité du chantier RGPD |
| **Migration** | `20260869000000_community_answers.sql` — table `product_question_answers` + `product_questions.resolved_answer_id` (**non appliquée**) |
| **Banc** | `tests/kurla_community.test.ts` (`npm run test:community`, câblé dans `npm test`) |

**Le badge « professionnel » exige un dossier approuvé — le banc l'a imposé.**
La première version déduisait le rôle du seul `role` de session : un compte
portant `role='professional'` obtenait le badge sans dossier vérifié. Le banc a
échoué sur ce point et la règle a été durcie : `professional` suppose un dossier
au statut `approved` dans `professional_applications`, sinon `member`. Afficher
« professionnel vérifié » sur la foi d'un drapeau serait exactement l'affirmation
invérifiable que KURLA refuse.

**Ce qui n'a volontairement pas été fait**

- Pas de likes ni de compteurs de popularité : le demandeur marque **une** réponse
  utile, et ce marquage n'alimente aucun classement.
- Pas de fil d'actualité, pas d'abonnements, pas de profils publics, pas de
  notifications d'engagement. La seule « liste » exposée est celle des questions
  sans réponse — la seule qui rende service.
- Pas d'identité publiée : un fil expose un rôle et une date, jamais un nom ni un
  identifiant (le banc vérifie que l'identifiant du demandeur n'apparaît pas dans
  la réponse de l'API).
- Le challenge 30 jours n'a pas été implémenté à la hâte : la bannière a été
  retirée.

**Limites déclarées**

- La migration `20260869` **n'est pas appliquée** : en mode Supabase, les réponses
  de membres ne peuvent pas encore être écrites ni lues (les fils s'affichent alors
  sans réponse, sans erreur). La colonne `resolved_answer_id` attend la même
  application.
- `getCommunityOverview` compte par requêtes simples : suffisant à l'échelle
  actuelle, à paginer si la volumétrie devient réelle.
- Le marquage « réponse utile » n'a pas encore d'interface : la route existe et est
  testée, le bouton sur la fiche produit reste à poser.

### CHANTIER 12 — BLOC D : CONTRAT MARQUE SIGNÉ ✅ (réalisé le 28/08/2026)

**Critère visé** (chantier F) : « un contrat marque signé sur agrégats, sans
aucune donnée personnelle cédée ».

**Constat vérifié avant d'écrire.** L'espace marque existait — 8 routes
`/api/brand-tests/*`, 4 tables, rapport k-anonyme — mais **aucune table ne
matérialisait de contrat** : une marque pouvait déposer une demande de test sans
avoir rien signé. Le critère de sortie du chantier F était donc hors d'atteinte,
et la phrase « sans aucune donnée personnelle cédée » n'engageait personne.

| Livrable | Preuve |
| --- | --- |
| **Texte signé, versionné** | `src/lib/brandContractTerms.ts` — `KURLA-BRAND-v1`, empreinte SHA-256 du texte ; clause 2 (agrégats k-anonymes, seuil k réel interpolé) et clause 3 (aucune donnée personnelle cédée) |
| **Deux signatures, ordre imposé** | `issueBrandContract` → `signBrandContract` (marque) → `countersignBrandContract` (KURLA). `active` n'est atteignable qu'avec les deux ; la base l'impose aussi par contrainte |
| **Portier** | `resolveBrandContractEligibility` appelé **dans** `createBrandTestRequest` : aucun appelant ne peut le contourner. La route renvoie un **422 nommé** (contrat non émis / non signé / signé pour une version périmée) |
| **Routes** | 7 routes (`src/server/routes/brandContracts.ts`) : texte public, émission admin, mes contrats, lecture, signature, contreseing, résiliation |
| **Migration** | `20260870000000_brand_contracts.sql` — 3 contraintes CHECK (contrat actif ⇒ deux signatures ; KURLA signe en dernier ; résiliation ⇒ motif) + index unique partiel « un seul contrat actif par marque » |
| **RGPD** | le contrat sort dans l'export et part à la suppression du compte |
| **Banc** | `tests/kurla_brand_contract.test.ts` (`npm run test:brand-contract`) |

**Un défaut de mon propre chantier C, trouvé en écrivant celui-ci.** Les sections
`productReviews`, `productQuestions` et `questionAnswers` de l'export RGPD lisaient
uniquement les collections **en mémoire** : en mode Supabase, l'export les aurait
rendues vides — un droit d'accès rendu partiellement sans le dire. Corrigé : les
sections lisent la base, et toute lecture qui échoue remonte dans un champ
`exportErrors` au lieu de passer sous silence.

#### D2 — La facturation (même jour)

| Livrable | Preuve |
| --- | --- |
| **Facture** | `src/lib/db/brandInvoiceStore.ts` + migration `20260871000000_brand_invoices.sql` (appliquée et vérifiée en production) |
| **Le montant n'est pas un paramètre** | `issueBrandInvoice(adminId, contractId)` ne prend **aucun** montant : il copie `priceCents` du contrat signé. Un CHECK SQL ne pourrait pas le garantir (PostgreSQL interdit les sous-requêtes dans un CHECK) — c'est l'absence de paramètre qui rend l'écart impossible |
| **« Réglée » se prouve** | `markBrandInvoicePaidFromSession` exige `payment_status = 'paid'`, la devise attendue **et** un montant identique. La base impose en plus `status = 'paid'` ⇒ `paid_at` + `stripe_session_id` non nuls |
| **Webhook** | branche `metadata.kind === 'brand_invoice'` dans `POST /api/stripe/webhook` : un écart de montant ne marque rien et laisse une trace |
| **Livraison du rapport** | `GET /api/brand-tests/:id/report` répond **402** en nommant la facture et son montant tant qu'aucune facture n'est réglée |
| **Sans clé Stripe** | la route de paiement répond **503** `PAYMENT_NOT_CONFIGURED` : KURLA ne simule pas un encaissement |
| **RGPD** | les factures sortent dans l'export et partent à la suppression du compte |
| **Banc** | `tests/kurla_brand_invoice.test.ts` (`npm run test:brand-invoice`) |

Le rapport k-anonyme payant n'est pas une fonction essentielle mise derrière un
péage artificiel : c'est le service B2B que la marque a signé et qui lui est
facturé. Le membre, lui, ne paie rien pour participer à un test ni pour lire ses
propres données.

**Ce qui n'a volontairement pas été fait**

- La signature n'est pas une case à cocher unique : les trois clauses se valident
  une par une, et une clause manquante refuse la signature (testé).
- Pas de « contrat accepté implicitement par l'usage ». Pas de renouvellement
  automatique : un texte qui change exige une nouvelle signature des deux parties.
- Aucun écran ne présente encore la facture à la marque : les routes existent et
  sont testées, l'interface reste à poser.

### CHANTIER 13 — SEO DES PAGES DYNAMIQUES ✅ (réalisé le 28/08/2026)

**Deux défauts vérifiés avant d'écrire, pas déduits du plan :**

1. **Le prérendu empilait ses balises.** `buildRouteHtml` remplaçait le titre et la
   description, puis *ajoutait* canonique, robots, Open Graph et JSON-LD. Relancé
   sur un `dist` non nettoyé, il produisait des pages à **plusieurs canoniques**,
   la première pointant sur l'accueil. Mesuré sur `dist/boutique/index.html` :
   **3 canoniques**. C'est le signal exact qui fait traiter une page comme un
   doublon de l'accueil.
2. **Toute URL inconnue répondait 200.** Vérifié en production :
   `/produit/ce-produit-n-existe-pas` → 200, `/page-qui-n-existe-pas` → 200. Un
   soft 404 fait indexer du vide. Et les **16 fiches produit** n'étaient ni
   prérendues ni présentes dans le sitemap : les pages commerciales principales
   étaient invisibles pour un moteur sans JavaScript.

| Livrable | Preuve |
| --- | --- |
| **Tête SEO idempotente** | `src/lib/seoHead.ts` : `stripSeoTags` retire avant d'écrire. Vérifié par **deux builds successifs sans nettoyage** : 1 canonique, 1 `og:title`, 1 `<title>` par page |
| **404 franc** | `src/server/seoResolver.ts` reconnaît le chemin dans la table de routes : inconnu → **404** avec `noindex`, connu mais non prérendu (espace compte) → 200 |
| **Tête propre par entité** | fiche produit → titre, description, canonique, `og:type=product`, JSON-LD `Product`, amorce `<h1>` ; fiche ingrédient → JSON-LD `DefinedTerm` ; article → `Article` |
| **Un produit non publiable n'est pas référençable** | le résolveur n'accepte que ce que `isPublishableProduct` valide : `/produit/produit-non-verifie` → 404 (testé) |
| **Produits dans le sitemap** | `fetchProductPages()` ne retient que les produits **publiés** ; `sitemap.xml` et prérendu les incluent |
| **Repli SPA testable** | `src/server/spaFallback.ts` : extrait de `startServer`, sinon aucun banc ne pouvait le traverser |
| **Banc** | `tests/kurla_seo_dynamic.test.ts` (`npm run test:seo-dynamic`) |

**Deux erreurs du premier banc, corrigées sans affaiblir le code.** D'abord il
« passait » le 404 sur le 404 par défaut d'Express — pour la mauvaise raison,
puisque le repli SPA vivait dans `startServer` : d'où l'extraction en module.
Ensuite il semait le catalogue **avant** d'importer le serveur, qui réinitialise
les collections mémoire : le test tournait sur un catalogue vide.

**Trois déploiements pour un défaut de routage — et ce qu'ils ont appris.**
Le correctif local ne suffisait pas, et seule la production l'a montré :

1. Après le premier déploiement, les canoniques étaient justes (1 seule, la
   bonne) mais `/produit/inexistant` répondait toujours **200** : `vercel.json`
   réécrit tout chemin sans fichier correspondant, et le repli SPA était monté
   dans `startServer()` — que le mode serverless n'appelle jamais. Aucune route
   HTML n'atteignait le serveur.
2. Une fois le repli monté en mode serverless et la réécriture dirigée vers la
   fonction, le 404 est arrivé **avec le corps JSON du garde d'API** : la
   réécriture fait arriver la requête sous `/api/<chemin>`.
3. Le garde `/api` distingue désormais par l'en-tête `Accept` : une navigation
   (`text/html`) reçoit la page 404, un `fetch` reçoit `API_ROUTE_NOT_FOUND`.
   Même statut 404 dans les deux cas.

Vérifié en production après le troisième déploiement : `/page-qui-n-existe-pas`
et `/produit/ce-produit-n-existe-pas` → **404**, `content-type: text/html`,
titre « Page introuvable », `noindex` ; `/api/route-inconnue` en JSON → 404 JSON ;
`/boutique` et `/ingredient/glycerin` → 200 avec **une seule** canonique, la leur.

Une sonde (`tests/support/serverless_probe.ts`) verrouille le point 1 : elle
vérifie en processus enfant, avec `KURLA_SERVERLESS=true`, que le serveur monte
le repli **tout seul** — avec contrôle négatif (sans ce mode, le 404 est celui
d'Express, sans `noindex`).

**Ce qui n'a pas été fait, volontairement**

- Pas d'usine à pages « ingrédient × problème × texture × ville ». Sans contenu
  réellement distinct par combinaison, ce serait du quasi-dupliqué à grande
  échelle — le contraire de ce que KURLA défend.
- Les routes dynamiques non résolues (profil de professionnel, routine, résultat
  de diagnostic) continuent de servir la coquille en 200 : rien n'est inventé,
  mais elles n'ont pas encore de tête propre. C'est la limite déclarée.

### CHANTIER 14 — PUBLIER DES PRODUITS : CE QUI BLOQUAIT VRAIMENT ⚠️ (en cours, ouvert le 29/08/2026)

Demande : « publier des produits ». 16 produits en base, 0 publié. Le premier
rapport de préparation a répondu **« produits : 0 »** — pour un catalogue de 16
lignes. C'est ce chiffre faux qui a ouvert le chantier.

**Ce qui a été mesuré avant de toucher au code**

| Constat | Preuve |
|---|---|
| Les 16 produits sont `catalog_status = 'unavailable'` **et** `is_active = false` | requête groupée sur `public.products` : 16 lignes, une seule combinaison |
| Les 7 vérifications sont à `not_provided`, les droits visuels à `unverified` | mêmes 16 lignes |
| Le rapport de préparation annonçait 0 produit | `getCatalogPublicationReadinessReport` rechargeait chaque ligne via `getProductById` (filtré `is_active = true`) dans un `.catch(() => null)` : chaque produit était **sauté en silence** |
| Aucun profil `admin`/`superadmin` en base | `public.profiles` : 2 lignes, les deux `customer` — la surface d'administration est donc inaccessible, personne ne pouvait enregistrer ces vérifications |
| 12 champs de conseil vides sur 16 produits | `benefit_primary`, `for_who`, `not_ideal_if`, `how_to_use`, `texture`, `usage_frequency`, `estimated_yield`, `returns_policy`, `badges`, `warnings`, `inci` : **0 ligne remplie** ; seuls `name` et `description` le sont |

**Ce qui a été corrigé**

1. **`getProductById` filtrait les produits désactivés, et toute la préparation passait par lui.** Il était donc impossible de rattacher une composition, d'enregistrer une vérification, ou même de **réactiver** un produit (`updateCatalogStatus` ne trouvait plus le produit qu'elle devait changer de statut). Ajout de `getProductForAdministration` : la visibilité publique reste filtrée, la préparation ne l'est plus. (`src/lib/db/catalogStore.ts`)
2. **Le rapport d'audit ne cache plus rien.** L'évaluation est extraite en fonction pure `evaluateCatalogPublicationReadiness(product)` ; le rapport évalue la ligne qu'il a déjà lue au lieu de la recharger. Banc : un produit désactivé apparaît avec son blocage nommé.
3. **Le lieur de composition ignorait `parseDeclaredIngredient`.** « Niacinamide 5 % » ne résolvait pas alors que l'entité existe — le parseur écrit pour ce cas précis (sa doc cite cet exemple) n'était appelé par personne. La concentration est maintenant lue sur le libellé et portée sur la liaison.
4. **Le lieur sautait tout produit déjà partiellement lié** : les produits rattachés à moitié le restaient pour toujours. Relancé en production : **+24 liaisons sur 11 produits**, sans duplication (l'écriture est un upsert sur `product_id,ingredient_id`).
5. **Il n'existait aucun contrôle d'allégations.** La publication exigeait `claims_validation_status = 'verified'` alors que rien ne produisait cette vérification : le statut ne pouvait qu'être laissé vide ou coché sans trace. Ajout de `src/lib/catalogClaims.ts` (5 règles, 53 motifs, cadre 1223/2009 art. 2 et 655/2013) et de `scripts/verifyCatalogPublication.ts`.

**Ce qui a été vérifié pour de vrai** — 80 événements dans `catalog_validation_events`, chacun avec sa méthode en note :

| Contrôle | Résultat | Ce que la note dit |
|---|---|---|
| allégations | 16 réussis | crible lexical sur 2 champs / ~150 caractères — **et la note précise que ce n'est pas une validation juridique** |
| stock | 16 réussis | cohérence `in_stock`/`stock_quantity` — pas un inventaire physique |
| certifications | 16 réussis | aucune certification revendiquée : rien à justifier |
| traductions | 16 réussis | fiche monolingue, aucune colonne traduite dans le schéma |
| composition | **3 réussis, 13 échecs** | les mentions non rattachées sont nommées une à une |

**Ce qui bloque encore, et pourquoi ce n'est pas du code**

- `images`, `brand`, droits sur les visuels : **attestations humaines**. Aucune trace automatique ne peut les produire, et écrire `verified` sans preuve transformerait une donnée de conformité en drapeau décoratif.
- 13 compositions incomplètes. Les mentions manquantes se répartissent en : entités absentes du référentiel (Vitamine E, Cocamidopropyl Betaine, Huile de Caméline…), **mentions ambiguës qu'il est interdit de deviner** (« Protéine de Soie végétale » est contradictoire, « Vitamin C Ester » désigne au moins deux substances différentes), un **manque de conformité réel** (p6, SPF 50+ : « Filtres Solaires Organiques invisibles » n'est pas un ingrédient — un solaire doit déclarer ses filtres UV), et 4 accessoires textiles dont la « composition » est un matériau, pas un INCI.
- Les fiches sont des squelettes : publier 16 pages sans mode d'emploi ni contre-indications mettrait en ligne 16 pages creuses.

**Ce que la revue des visuels et des marques a révélé** (demande : « montre-moi les visuels »)

| Constat | Preuve |
|---|---|
| Les 17 visuels sont des photos **Unsplash**, pas les produits | `product_images.url` : 17 lignes, toutes sur `images.unsplash.com` |
| Deux visuels montrent des **produits d'autres marques** | alt `Eadem Milk Marvel Serum` (p14) et `Black Girl Sunscreen SPF 30` (p15) |
| Deux produits portent une **marque tierce** | `products.brand` : p14 = `Eadem`, p15 = `Black Girl Sunscreen` ; les 14 autres sont des sous-marques KURLA |
| Chaque visuel porte déjà ses propres statuts | `product_images.ownership_status = 'unverified'`, `validation_status = 'pending'`, `source_note` vide pour les 17 |

Conséquence : l'attestation « visuels revus, droits détenus » ne peut pas être
enregistrée en l'état — le visuel n'est pas le produit, et deux fiches
revendiquent le nom et la photo d'un concurrent. Le statut reste
`not_provided`/`unverified` : c'est la valeur vraie.

**Un faux négatif du crible, trouvé en lisant les fiches** — la première version
laissait passer p13 : « Formule dermatologique **prévenant la
pseudofolliculite** de la barbe », soit une allégation de prévention d'une
affection. Ajout du terme pathologique et du motif *verbe de prévention +
pathologie*, plus une 6ᵉ règle (supériorité non étayée, 655/2013). Contrôle
négatif ajouté au banc : « prévient les pellicules » reste une allégation
cosmétique ordinaire et ne doit pas tomber. Résultat après correction :
**13 fiches propres, 3 en échec** (p13 thérapeutique, p6 et p15 supériorité).

**Décisions appliquées** : compte `hubertbay@gmail.com` passé `superadmin`
(`00c987c2-b224-4b33-a43f-bd80ece98cb0`) — la surface d'administration était
inaccessible, les deux profils étant `customer`. Deux entités non ambiguës
créées dans le référentiel (`cocamidopropyl_betaine`, `camelina_sativa`) en
`verification_status = 'not_provided'` : créées, pas vérifiées. Deux alias
ajoutés (`huile de carapate (black castor)`, `huile de romarin à cinéole`).
Rattachement relancé : **31 liaisons, 0 doublon** (vérifié par comptage des
couples distincts), 18 mentions non résolues restantes — toutes ambiguës ou
propres aux accessoires.

**Écart d'outillage constaté** : il n'existe **aucune route ni fonction pour
créer un ingrédient**. Le référentiel ne s'étend que par SQL, alors que 13
produits attendent exactement cette opération.

**Publication effective (29/08/2026, après accord du propriétaire sur les visuels)**

Trois produits publiés : **p9** `creme-definition-boucles-twists`, **p10**
`serum-marques-post-imperfections-niacinamide`, **p13**
`baume-apaisant-anti-poils-incarnes-barbe`. Les onze autres restent
`unavailable`, bloqués par la seule composition (mentions ambiguës). p14 et p15
exclus : marques tierces.

Vérifié en production, pas seulement en base :

| URL | Réponse |
|---|---|
| `/produit/creme-definition-boucles-twists` | **200**, titre produit, 1 canonique, 1 JSON-LD, pas de noindex |
| `/produit/serum-marques-post-imperfections-niacinamide` | **200**, idem |
| `/produit/baume-apaisant-anti-poils-incarnes-barbe` | **200**, idem |
| `/produit/shampoing-doux-sans-sulfates` (non publié) | **404** « Page introuvable » + noindex |

Le contenu des 14 fiches a été écrit par `scripts/publishCatalog.ts` depuis
`docs/PROPOSITION_FICHES_PRODUITS.md`. Le crible lit désormais 9 champs et ~800
caractères par fiche au lieu de 2 champs et ~150 : les descriptions réécrites de
p13 et p6 passent, p16 aussi. Les visuels sont enregistrés `licensed` avec la
note qui dit ce qu'ils sont (« photos de stock sous licence Unsplash, aucun
visuel ne montre le produit vendu ») — pas `brand_provided`, qui serait faux.

**Trois défauts trouvés en écrivant, tous mesurés avant d'être corrigés**

1. **Le chemin d'écriture était inutilisable sur tout le catalogue.** 14
   écritures sur 14 refusées : la validation du département et des marchés
   portait sur `source`, qui fusionne la fiche existante — donc sur des valeurs
   que l'appel ne touchait pas. Les 16 fiches portent `DOM` et `AFR` (trois
   lettres) que la règle des pays refuse. Corrigé : on valide l'entrée, comme le
   faisait déjà `checkProductVocabulary`.
2. **Le readiness produit-unique déclarait tout manquant, toujours.**
   `evaluateCatalogPublicationReadiness` lisait des clés `snake_case` alors que
   `getProducts` renvoie du `camelCase`. Le rapport global disait vrai (il lit
   les lignes brutes), l'endpoint produit disait faux — et c'est celui qu'on
   consulte avant de publier. L'évaluation lit maintenant les deux formes.
3. **`slugify` supprimait tous les « u ».** Le retrait des diacritiques était
   écrit `/[\\u0300-\\u036f]/` avec un backslash en trop : en regex JS,
   `\\` est un backslash littéral, donc la classe contenait la lettre `u`.
   « Sérum » → `serm`, « Baume » → `bame`, « Boucles » → `bocles`. **9 slugs du
   catalogue réel étaient corrompus**, sans qu'aucun contrôle ne le signale — un
   slug faux est une URL valide. Le même échappement fautif à la ligne suivante
   faisait que `categoryKey` ne reconnaissait jamais « peau » ni « cheveu » : le
   normalisateur de département n'a jamais fonctionné. Les deux sont corrigés,
   les 14 slugs réparés (p14 et p15 laissés intacts), non-régression au banc.

Compte rendu honnête : la réparation des slugs a aussi **allongé** des slugs qui
étaient valides mais courts (`bonnet-satin` → `bonnet-satin-microfibre-premium-xl`).
Aucune URL n'était référencée ailleurs, les fiches n'étant pas publiées.

**Volontairement non fait** : aucune entité ingrédient créée sur une hypothèse ; aucun `verified` écrit sans contrôle réel ; aucune publication forcée en contournant la porte.

---

### CHANTIER 15A — INVENTAIRE VÉRIFIÉ DE LA SURFACE D'ADMINISTRATION ✅ (réalisé le 29/08/2026)

Préalable au chantier 16 : savoir ce qui existe avant de construire. Trois faits
mesurés, aucun estimé.

| Fait | Mesure |
|---|---|
| Routes d'administration | **30 couples méthode + chemin**, 29 chemins distincts (`/api/admin/catalog/products` porte GET et POST) |
| Routes montées et protégées en production | **30 sur 30** — chacune sondée répond `401` avec « Authentification Supabase requise. » Aucune route morte, aucun contournement |
| Garde de rôle avant le premier effet | **30 sur 30**, vérifié statiquement gestionnaire par gestionnaire |
| Routes appelées par un écran | **8 sur 30**, toutes depuis `src/components/CatalogAdminPanel.tsx` — *chiffre corrigé au chantier 16B, voir l'encadré ci-dessous* |
| Routes sans aucun appelant | **22 sur 30** |

**CORRECTION apportée au chantier 16B — le chiffre publié ici était faux.**

Le banc 15A repérait les appelants en cherchant le chemin de la route dans le
code client, en remplaçant `:param` par `${…}`. Or l'étape d'échappement qui
précède ne protège pas le caractère `:` : la règle de remplacement cherchait
donc un `\:` qui n'existait jamais, et **toute route paramétrée passait pour
orpheline même lorsqu'un écran l'appelait**. Démontré par exécution, pas par
lecture : la regex produite était `/api/admin/suppliers/:supplierId` et ne
matchait pas `` `/api/admin/suppliers/${…}` ``.

Conséquence mesurée après correctif — deux routes avaient un appelant que je
n'avais pas vu :

| Route | Appelant réel |
|---|---|
| `PATCH /api/admin/catalog/products/:productId` | `src/components/CatalogAdminPanel.tsx:210` |
| `GET /api/admin/return-insights/:productId` | `src/components/CatalogAdminPanel.tsx:253` |

Le décompte exact est donc **8 sur 30 appelées, 22 orphelines** — et non 6/24.
En 15A le bug était invisible : aucune route paramétrée n'avait alors
d'appelant détectable, et rien ne contredisait le résultat.

**La conséquence n° 1 ci-dessous était donc fausse, et je la retire** : la
modification d'un produit **a** un écran (`CatalogAdminPanel.tsx:210` appelle
bien le `PATCH`). Ce qui reste vrai, c'est que le chantier 14 a écrit le
contenu des 14 fiches par script — mais pas « faute d'interface » : l'interface
existait, elle n'a simplement pas été utilisée pour cette opération de masse.

Un second défaut du même banc a été corrigé dans la foulée : sans frontière
finale, `/api/admin/suppliers` matchait aussi les lignes appelant
`/api/admin/suppliers/:id/documents`, donc une route orpheline aurait pu passer
pour appelée par simple préfixe commun. Aucun faux positif de ce type n'existait
en pratique (13/35 avant comme après), mais le risque était réel.

**Limite assumée, et dite** : la détection est **par chemin, pas par méthode**.
« Appelée » signifie « ce chemin apparaît dans le code client », pas « cette
méthode HTTP précise est appelée ». Rendre le banc sensible à la méthode
demanderait d'analyser les options de chaque `fetch`.

**Méthode, et pourquoi elle a été choisie**

Sonder les routes d'écriture sans authentification aurait pu déclencher un effet
réel (`POST /api/admin/maintenance/photo-purge` existe). La garde a donc été
vérifiée **statiquement avant** le sondage : pour chaque gestionnaire, la garde
de rôle doit précéder le premier appel au store. Les 30 étant conformes, le
sondage sans jeton était sans risque — et c'est ce sondage qui établit qu'aucune
route n'est morte.

**Les 6 routes qui ont un écran** : `GET/POST /api/admin/catalog/products`,
`GET /api/admin/catalog/imports`, `GET /api/admin/catalog/taxonomy`,
`POST /api/admin/catalog/import/csv`, `POST /api/admin/catalog/import/supplier`.

**Les 24 qui n'en ont pas**, par domaine : contrats et factures marque (5),
tests marque (2), conformité éditoriale (2), créateurs (2), fidélité (3),
gouvernance du catalogue — préparation, publication, vocabulaire, liaison
d'ingrédients, couverture (6), vérification d'un professionnel (1), purge photo
(1), retours produit (1), et `PATCH /api/admin/catalog/products/:productId`.

Deux conséquences à retenir :

1. ~~**La modification d'un produit n'a aucun écran.**~~ **Retiré au chantier
   16B : c'était faux.** `PATCH /api/admin/catalog/products/:productId` est
   appelée par `CatalogAdminPanel.tsx:210`. Le chantier 14 a bien écrit les 14
   fiches par script, mais l'interface existait.
2. **Le rapport de préparation et l'historique des vérifications n'ont aucun
   écran.** Celle-ci reste vraie, et c'est le périmètre du chantier 15B.

**Livré** : `tests/admin_route_inventory.test.ts` + fixture
`tests/fixtures/admin_route_inventory.json` (30 routes, garde et appelants
figés). Deux contrôles négatifs exécutés pour prouver que le banc mord : retirer
une route de la référence fait échouer l'inventaire ; effacer les appelants
d'une route fait échouer la dérive des appelants. `npm test` : **105 PASS / 0 FAIL**.

**Non mesuré, et dit explicitement** : le comportement des 30 routes **sous une
vraie session admin** n'a pas été testé. Le compte `superadmin` créé au chantier
14 (`hubertbay@gmail.com`) existe, mais son mot de passe n'est pas détenu ici et
je ne forge pas de jeton de session. Le sondage établit que les routes sont
montées et protégées ; il n'établit pas qu'elles répondent correctement une fois
authentifié. C'est le premier trou à refermer, et il faut pour cela soit un
compte admin de test, soit une session fournie.

---

### CHANTIER 16A — RÉFÉRENTIEL FOURNISSEURS ✅ (réalisé le 29/08/2026)

Premier maillon du chantier 16. Constat de départ, vérifié : **il n'existait
aucune table `suppliers`**, et la provenance d'un produit vivait dans
`products.source_supplier` — une chaîne libre que l'import fournisseur
enregistrait telle quelle, vide sur les 16 produits.

**Ce qui a été construit**

| Élément | Contenu |
|---|---|
| `public.suppliers` | 16 colonnes. Identité légale + `legal_name_normalized` **unique**, type (7 valeurs), pays, contacts, MOQ, délai, certifications, `verification_status` (`verified`/`pending`/`not_provided`) |
| `public.supplier_documents` | 11 colonnes, 12 types de preuve (PR, PIF, CPSR, CPNP, SPF ISO 24444, UVA ISO 24443, OEKO-TEX, EUDR, sans microplastique, ISO 22716, CoA, autre) |
| `public.products.supplier_id` | Colonne ajoutée, nullable |
| Sécurité | RLS actif sur les deux tables, **6 politiques**, toutes bornées à `public.is_admin()` |

**Les deux règles, et pourquoi**

1. **On ne devine jamais une correspondance.** Deux écritures du *même* nom
   retombent sur la même entité par normalisation (casse, diacritiques,
   ponctuation, forme juridique retirée : SAS, SARL, Ltd, GmbH…). Deux entités
   *différentes* qui pourraient toutes deux convenir produisent une
   `SupplierAmbiguityError` **nominative** : la route répond **409** en listant
   les entités en concurrence, et **rien n'a été écrit**. Un produit rattaché au
   mauvais fournisseur corromp toute la traçabilité en aval.
2. **Un document de conformité n'existe pas sans preuve.** Fichier **et** date
   d'émission exigés par le code, et renforcés en base par la contrainte
   `supplier_document_needs_proof` ; une expiration antérieure à l'émission est
   refusée. Une case cochée n'est pas un CPSR.

Un fournisseur découvert par un import naît **`not_provided`** et de type
**`unknown`** : un nom écrit dans un CSV n'est ni une vérification, ni une
qualification du métier du fournisseur.

**Critère d'acceptation, mesuré** — deux imports nommant le même fournisseur de
deux façons (« Laboratoire Alvend SAS » puis « LABORATOIRE ALVEND ») produisent
**une seule entité**, les deux produits pointent le même identifiant, et le nom
enregistré est la raison sociale retenue, pas la chaîne du fichier.

| Preuve | Résultat |
|---|---|
| Migration appliquée | `suppliers` 16 colonnes, `supplier_documents` 11 colonnes, `products.supplier_id` présent, contrainte de preuve présente, RLS `true` |
| RLS réellement filtrante | Une ligne insérée **dans une transaction annulée** : `anon` voit **0** ligne, `authenticated` voit **0** ligne ; table restée vide après rollback |
| Banc `tests/kurla_supplier.test.ts` | **PASS** — 6 blocs : pliage du nom, unicité d'entité, ambiguïté remontée sans écriture, `not_provided` à la découverte, refus des 5 formes de document invalide, route protégée (401 sans jeton, aucun effet) |
| Le banc mord | **3 contrôles négatifs exécutés** : déduplication désactivée aux deux endroits → `deux écritures doivent donner une seule entité, obtenu 2` ; candidats vidés → l'assertion d'ambiguïté tombe ; contrôle du fichier retiré → l'assertion de preuve tombe |
| Garde d'inventaire du store | A détecté les 8 nouvelles méthodes, **aucune disparue, aucune arité modifiée** ; référence régénérée : **252 → 260 méthodes** |
| Suite complète | `npm test` → **106 PASS / 0 FAIL** (105 + le banc fournisseurs) ; `npm run build` exit 0 ; `tsc --noEmit` **0 erreur** |

**Corrigé au passage** : `npm test` se terminait par `tsc --noEmit`, qui
s'arrête en OOM (exit **134**) sur le tas Node par défaut — donc la chaîne ne
pouvait pas passer sans enveloppe externe. Le tas est maintenant déclaré dans
`lint` et en fin de chaîne ; `npm test` est autonome. Le build Vercel n'appelle
pas `tsc`, il n'est pas concerné.

**Non fait, et dit explicitement**

- **Aucun écran.** Le référentiel n'est atteignable que par l'API et la base.
  L'écran fournisseurs est le chantier **16B**.
- **Les 16 produits existants n'ont pas été rattachés** : leur fournisseur réel
  n'est pas connu, et le rattacher serait une invention. `supplier_id` reste
  `null` sur tout le catalogue.
- **La résolution n'écrase jamais une provenance existante** : `supplier_id`
  s'écrit à la création du produit, pas en mise à jour d'une ligne déjà
  rattachée.
- **Aucune route admin nouvelle** n'a été ajoutée : l'inventaire 15A reste à
  30 couples, seul le comportement de l'import fournisseur a changé (409 sur
  ambiguïté au lieu d'un 400 générique).
- **Comportement sous session admin authentifiée toujours non testé**, même
  trou qu'en 15A.

---

### CHANTIER 16B — ÉCRAN D'APPROVISIONNEMENT ✅ (réalisé le 29/08/2026)

Le chantier 16A avait laissé le référentiel fournisseurs sans écran : il
n'était atteignable que par l'API et la base. Le constat 15A — 22 routes
d'administration orphelines — était précisément l'argument pour ne pas en
ajouter cinq de plus sans interface.

**Ce qui a été construit**

| Élément | Contenu |
|---|---|
| `src/server/routes/suppliers.ts` | **5 routes** : `GET`/`POST /api/admin/suppliers`, `GET`/`PATCH /api/admin/suppliers/:supplierId`, `POST /api/admin/suppliers/:supplierId/documents` |
| `src/components/SupplierAdminPanel.tsx` | Écran complet : référentiel, déclaration d'un fournisseur, fiche avec preuves et produits rattachés |
| `src/pages/AdminDashboardPage.tsx` | Nouvel onglet **« Approvisionnement »**, monté à côté de « Catalogue produits » |
| Couche données | `updateSupplier` et `getSupplierDetail` — le store passe de **260 à 262 méthodes** |

**Deux règles ajoutées, qui viennent du même refus de deviner**

1. **La raison sociale ne se modifie pas.** L'identifiant en dérive et
   `legal_name_normalized` porte une contrainte d'unicité : renommer une entité
   casserait les produits déjà rattachés. Si le nom change, c'est une autre
   entité, à créer.
2. **« Vérifié » ne se déclare pas, il se prouve.** Passer un fournisseur en
   vérifié exige qu'au moins un document de conformité soit enregistré. Sinon
   « vérifié » ne serait qu'une opinion affichée dans un tableau de bord — et un
   tableau de bord est exactement l'endroit où une opinion se lit comme un fait.

L'écran reprend la discipline de 16A : les types de fournisseur et de document
sont **fournis par l'API** (`supplierTypes`, `documentTypes`), pas saisis en
texte libre ; le champ de preuve demande une **URL de fichier déjà hébergé et
une date d'émission**, et le dit explicitement — cet écran enregistre une
référence, il ne téléverse pas. Le MOQ et le délai sont présentés avec la
mention qu'ils restent à confirmer par demande de prix.

| Preuve | Résultat |
|---|---|
| Banc `tests/kurla_supplier_admin.test.ts` | **PASS** — raison sociale non modifiable, « vérifié » refusé sans preuve puis accepté avec, fiche sans produit inventé, **5 routes sondées en 401** avec le corps standard et **aucun effet** |
| Le banc mord | **3 contrôles négatifs exécutés** : preuve non exigée → l'assertion tombe ; renommage autorisé → l'assertion tombe ; fiche listant tous les produits → *« un fournisseur sans produit doit renvoyer une liste vide, pas une estimation »* |
| Inventaire des routes | Garde mordue puis régénérée : **234 → 239 routes**, aucune retirée |
| Inventaire admin (15A) | Garde mordue puis régénérée : **30 → 35 couples**, **13 appelées / 22 orphelines** |
| Inventaire du store | Garde mordue puis régénérée : **260 → 262 méthodes**, aucune retirée, aucune arité modifiée |
| Suite complète | `npm test` → **107 PASS / 0 FAIL** (105 en fin de 15A, +1 banc 16A, +1 banc 16B) ; `npm run build` exit 0 ; `tsc --noEmit` **0 erreur** |

**Un bug du banc 15A a été trouvé et corrigé ici**, avec la correction du
chiffre publié — voir l'encadré de la section 15A. En résumé : le banc ne
détectait aucun appelant pour les routes paramétrées, ce qui m'avait fait
écrire à tort que la modification d'un produit n'avait pas d'écran.

**Non fait, et dit explicitement**

- **Aucun téléversement de fichier.** L'écran enregistre l'URL d'un document
  déjà hébergé. Un vrai dépôt de fichier est un chantier à part.
- **Comportement sous session admin authentifiée toujours non testé.** Les 5
  routes sont prouvées montées et protégées (401 sans jeton, aucun effet), pas
  prouvées correctes une fois authentifié. Même trou qu'en 15A : le mot de
  passe du compte `superadmin` n'est pas détenu ici et je ne forge pas de jeton.
- **Les 16 produits existants restent sans provenance** : leur fournisseur réel
  n'est pas connu, `supplier_id` est `null` sur tout le catalogue.
- **La détection d'appelants reste par chemin, pas par méthode** (limite du banc
  15A, assumée et documentée).

---

### CHANTIER 16C — LE SOURCING RÉEL, PAR VAGUE ⚠️ (réalisé le 29/08/2026, **partiellement**)

Le critère du chantier, tel qu'écrit dans `docs/CHANTIER_16_APPROVISIONNEMENT.md`
§G, est : *« chaque vague produit un RFQ structuré **envoyé**, des réponses
**comparées**, et un fournisseur **retenu** avec ses documents. »*

**Ce critère n'est pas rempli, et il ne peut pas l'être par moi.** Je n'ai ni
boîte mail, ni mandat pour engager KURLA auprès d'un tiers, et aucune réponse de
fournisseur n'existe. Inventer un devis, un MOQ ou un fournisseur retenu serait
la pire chose à produire ici : ce sont des chiffres qui engagent de l'argent
réel. Ce qui est livré, c'est ce qui rend ces trois étapes exécutables et
traçables — plus le document que vous enverrez.

**Ce qui a été construit**

| Élément | Contenu |
|---|---|
| `supabase/migrations/20260873000000_sourcing.sql` | `sourcing_items` (12 colonnes), `rfqs` (11), `rfq_responses` (12), RLS + **9 politiques**, **4 contraintes** |
| `src/lib/db/sourcingStore.ts` | 10 méthodes : besoins, demandes, envoi, réponses, comparaison, attribution |
| `src/lib/sourcingRfq.ts` | Générateur du contenu réellement envoyable |
| `src/lib/sourcingDocuments.ts` | Libellés et **motifs réglementaires** des documents — source unique partagée avec l'écran 16B |
| `src/server/routes/sourcing.ts` | **7 routes** d'administration |
| `scripts/seedSourcingWaves.ts` | Applicateur de la vague 1, dry-run puis `--apply` |
| `scripts/generateRfqDocuments.ts` | Produit les fichiers `docs/sourcing/*.md` |
| `docs/sourcing/` | **3 demandes de prix réelles**, prêtes à compléter |

**Les trois règles, toutes du même côté que le reste du chantier 16**

1. **Aucun chiffre n'est déduit.** Prix, MOQ et délai sont NULLables : une
   réponse peut ne pas chiffrer. Un devis complété par la plateforme serait une
   invention — et un devis inventé est pire qu'un devis manquant.
2. **« Envoyé » exige un destinataire existant et une date.** Contrôlé par le
   code et par deux contraintes en base (`rfq_sent_needs_supplier`,
   `rfq_sent_needs_date`).
3. **Retenir un fournisseur exige les documents enregistrés.** Un CPSR annoncé
   dans un devis ne suffit pas : tant que le fichier et sa date ne sont pas au
   référentiel, la sélection est **refusée**. La comparaison, elle, **ne classe
   pas et ne désigne pas de gagnant** — décider reste un acte humain.

**La vague 1, enregistrée en production** — les trois besoins viennent de §B.2
et §G du livrable, rien n'a été ajouté :

| Besoin | Documents exigés | Motif |
|---|---|---|
| `vague-1-apres-shampoing-rince` | 7 | Trou n°1 : le catalogue lave et scelle, mais ne démêle pas sous la douche |
| `vague-1-shampoing-clarifiant` | 7 | Trou n°2 : le « à éviter si » de p2 promet un besoin non couvert |
| `vague-1-faconnier-soins-cheveux` | 5 | Aucun des 16 produits n'a de fournisseur rattaché |

Les deux produits rincés exigent l'attestation sans microplastique :
l'interdiction AGEC est **en vigueur depuis le 1er janvier 2026**, ce n'est pas
une marge de négociation.

| Preuve | Résultat |
|---|---|
| Migration appliquée | 12 / 11 / 12 colonnes, 9 politiques, 4 contraintes, RLS actif sur les 3 tables |
| Vague 1 écrite | `--apply` puis **relecture SQL indépendante** : 3 lignes, statuts `to_source`, 7 / 7 / 5 documents |
| Documents générés | 3 fichiers, 4 222 à 4 420 caractères, **6 champs `⟨à compléter⟩` chacun** — le script échoue si ce nombre tombe à zéro, ce qui signalerait une donnée inventée |
| Banc `tests/kurla_sourcing.test.ts` | **PASS** — 7 blocs |
| Le banc mord | **4 contrôles négatifs exécutés** : sélection sans documents → l'assertion tombe ; valeur absente valant 0 → tombe sur *« sans prix et sans note »* ; placeholder remplacé par une identité inventée → *« ce qui est inconnu doit être marqué, pas inventé »* ; réponse sur un brouillon → l'assertion tombe |
| Un bug trouvé par le banc | L'identifiant généré donnait `apr-s-shampoing-rinc-` : les diacritiques n'étaient pas retirés avant le filtrage, et la troncature laissait un tiret final. Corrigé |
| Inventaires | Gardes mordues puis régénérées : routes **239 → 246**, admin **35 → 42**, store **262 → 272** — aucune retirée, aucune arité modifiée |
| Suite complète | `npm test` → **108 PASS / 0 FAIL** · `npm run build` exit 0 · `tsc --noEmit` **0 erreur** |

**Frontière de périmètre respectée** : l'écran d'envoi de RFQ et l'historique
des échanges sont, d'après §G, le périmètre du **chantier 15B** — pas de 16C.
Les 7 nouvelles routes n'ont donc **volontairement aucun écran**, ce que
l'inventaire admin mesure : 13 appelées sur 42, 29 sans appelant.

**Non fait, et dit explicitement**

- **Rien n'a été envoyé.** Aucune demande de prix n'existe en base : les
  fichiers sont générés, les demandes se créeront au moment de l'envoi pour que
  le contenu stocké soit exactement celui qui est parti.
- **Aucun fournisseur n'a été contacté, aucun n'a répondu, aucun n'est retenu.**
  Aucun prix, aucun MOQ, aucun délai n'existe dans la plateforme.
- **Les champs `⟨à compléter⟩` sont à remplir par un humain** : interlocuteur,
  courriel de réponse, date limite, et surtout la **spécification technique** —
  sans cahier des charges, un façonnier ne peut pas chiffrer.
- **Comportement sous session admin authentifiée toujours non testé** : les 7
  routes sont prouvées montées et protégées (401 sans jeton, aucun effet), pas
  prouvées correctes une fois authentifié.

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
| **Conformité AI Act comme avantage concurrentiel** | ✅ disclosure art. 50(1) ; ✅ **art. 50(4) exécutoire dans le CMS** (bloc A4 : publication refusée sans signalement ni relecture humaine nommée — `src/lib/editorialCompliance.ts`, `POST /api/admin/content/articles`, audit `GET /api/admin/content/compliance`) | B — badge visible ; art. 50(2) au 2 déc. 2026 |

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
| Art. 50(4) exemption éditoriale | ✅ **Appliquée dans le CMS** (bloc A4) : `evaluateEditorialCompliance` + `assertPublishable` bloquent la publication d'un texte IA sans signalement ni relecture assumée par une personne nommée (« relu par la rédaction » ou un prénom seul ne suffisent pas) ; transparence publique portée par `mapPublicArticle` (`generatedBy`, `aiDisclosure`, `editorialResponsiblePerson`) ; audit article par article. Banc `tests/kurla_ai_act_cms.test.ts`. **Migration `20260867000000_content_editorial_compliance.sql` écrite, NON appliquée** (colonnes `generated_by`, `ai_disclosure`, `editorial_review`) — à jouer avant tout usage du CMS en base réelle |
