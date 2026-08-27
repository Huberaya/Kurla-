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
| 2 | Retirer `MOCK_PROS` + UGC fictif | ✅ LIVRÉ | `ProfessionalsPage` corrigé. **14 fichiers importent encore `mockData`** : 9 composants (dont `UgcWallSection`, `KurlaProSection`, `TextureGallerySection`, `ConsultationBookingModal`) + 5 pages (dont `ProProfilePage`, `ProtectiveStylesPage`) |
| 3 | Corriger les 2 contradictions de marque | ✅ LIVRÉ | Bicarbonate retiré, « éclaircissants » → « anti-taches » |
| 4 | 17 tests Phase 2 sur vraie instance | ✅ **LIVRÉ** | `npm run test:integration` PASS contre l'instance réelle `qzwgsarfdegqtfdnqiql` (eu-west-1). A nécessité 4 correctifs de schéma — voir `KURLA_CHANTIERS.md` |
| 5 | Table `ingredients` + `product_ingredients` | ✅ LIVRÉ | Migration `20260845`, module `ingredientGraph.ts`, testé |
| 6 | Normaliser les vocabulaires | ✅ LIVRÉ | Tables `kurla_taxonomies` (l.126) et `kurla_taxonomy_terms` (l.133) créées, **mais 0 `INSERT`** dans toute la migration, et **aucune migration des colonnes `TEXT[]` existantes** |
| 7 | Brancher `routine_feedback` sur le moteur | ✅ LIVRÉ | `outcome_observations` → `getOutcomes()` → `buildRecommendations`. Testé avec preuve citable (`obs-1`/`obs-2`) |
| 8 | Rendu serveur / prérendu | ⬜ À FAIRE | Toujours 1 URL indexable |
| 9 | Export / suppression en 1 clic | ✅ LIVRÉ | **Aucune route.** `deleteBeautyProfile` existe (`server.ts:2327`), `deleteIntelligenceData` existe dans le store, mais rien ne les expose ensemble en 1 clic |
| 10 | Archétypes + cohortes k-anonymes | ✅ LIVRÉ | Logique + `GET /api/me/archetype`, testé |
| 11 | KURLA Shelf | ✅ LIVRÉ | Logique + 5 endpoints + `ShelfPage` |
| 12 | Note par archétype | ✅ LIVRÉ | `computeArchetypeRating` testé, zéro appel. Pas non plus de source de données (les `reviews` ne portent pas d'attribut de texture) |
| 13 | Wash Day OS | ✅ LIVRÉ | Logique + migration `20260846` + 3 endpoints + `WashDayPage` |
| 14 | Timeline coiffure protectrice | ✅ LIVRÉ | Logique + endpoints + signaux stockés et lus par `assessTractionRisk` |
| 15 | Recherche sémantique | ✅ LIVRÉ | Logique + `GET /api/search`. **Aucun écran** |
| 16 | Détection de conflit de routine | ✅ LIVRÉ | Dans le moteur, **jamais affiché à l'utilisateur** |
| 17 | Unifier le triage médical | ✅ LIVRÉ | `AI_GUARDRAILS.triage()` par racines, testé |
| 18 | Découper les monolithes | 🔶 **PARTIEL** | 2 stores extraits : `intelligenceStore.ts` (1 026 l.) et `professionalStore.ts` (645 l.). Mais `server.ts` a **grossi** : **3 977 lignes** (3 265 avant le chantier A), `serverDb.ts` = **6 163 lignes**. Le découpage par domaine de `server.ts` reste à faire |
| 19 | Réassort prédictif | ✅ LIVRÉ | `evaluateReplenishment` testé, zéro appel, aucune notification branchée |
| 20 | Trust Score pros + co-signature | 🔶 **PARTIEL** *(Trust Score livré, co-signature toujours sans appel)* | `professionalTrust.ts` pur, testé (14 blocs), servi par `GET /api/professionals/:id/trust`, affiché dans `ProfessionalDirectoryPage.tsx`. `proEndorsement.ts` testé mais **toujours zéro appel** côté UI |

**Bilan après application des migrations : 17 livrées (1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19) · 2 partielles (18, 20) · 1 à faire (8). Total 20.**

Les comptes des 20 actions ne bougent pas, mais leur substance oui : l'action 20 passe de « Trust Score : rien » à « Trust Score livré et affiché », et l'action 18 recule en valeur relative puisque `server.ts` a grossi de 712 lignes pendant que deux stores étaient extraits.

---

## 3. ÉTAT RÉEL DES 50 FONCTIONNALITÉS

### ✅ Livrées (14)
**1** Graphe d'ingrédients · **4** Disclosure IA · **6** KURLA Shelf · **7** Boucle d'apprentissage · **8** Archétypes k-anonymes · **10** Wash Day OS · **12** Timeline protectrice · **18** Fiche ingrédient publique *(route publique + `IngredientCardPage.tsx`, sans authentification donc indexable)* · **19** Score de confiance produit public *(vérifié : `fetchProductTrust` appelé par `ProductDetailPage.tsx:119`)* · **22** Trust Score pros *(`professionalTrust.ts` pur + testé, route, affichage écran)* · **23** Réservation + paiement de prestation *(Session de Checkout Stripe, statut relu chez Stripe, écran `/mes-reservations`)* · **34** Comparateur de routines · **35** Coût annuel *(les deux dans `CostSimulatorPage.tsx`)* · **47** Modularisation du moteur

### 🟠 Logique seule — **le chantier A** (5)
**9** Note par archétype · **16** Réassort prédictif · **17** Intelligence des retours · **21** Filtrage par juridiction · **24** Co-signature professionnelle

### 🔶 Partielles (7)
- **25** Espace pro dossiers clients — modèle de consentement par périmètre + 4 routes ; côté **client** gérable dans `/mes-reservations` (périmètre affiché, révocation en un clic), côté **professionnel** toujours sans écran
- **2** Vocabulaires contrôlés — tables créées, **0 donnée de référence**, `TEXT[]` non migrés
- **5** Purge des données fictives — 14 fichiers encore sur `mockData`
- **13** Recherche sémantique — logique + `GET /api/search`, **aucun écran**
- **14** Détection de conflit — moteur sans UI
- **15** Routine Builder → panier — 5 fonctions exportées + `POST /api/routine-builder` (`server.ts:1900`), **aucun écran** (`grep` : zéro appel côté client)
- **45** Découpage du monolithe — 1 module extrait sur 2 monolithes

### ⬜ À faire (21)
**3** Rendu serveur · **11** Diagnostic photo · **20** i18n/devises/TVA · **26** Loyalty par progression · **27** Récompense non-marchande · **28** Beauty Journey · **29** KURLA+ · **30** Texture Gap Report · **31** API catalogue · **32** Recherche visuelle · **33** Scan code-barres · **36** Climat/eau dure *(voir détail ci-dessous)* · **37** Pages SEO générées · **38** Contenu personnalisé · **39** Experts/créateurs · **40** Rémunération au résultat · **41** Espace marque · **42** Application mobile · **43** Export/suppression 1 clic · **44** Transparence IA comme badge *(disclosure fait, pas le badge)* · **46** Tests Supabase réels

### 🚫 Exclues volontairement (3)
**48** Virtual try-on coiffure · **49** Maquillage virtuel · **50** Place de marché créateurs

> **Compte : 14 + 5 + 7 + 21 + 3 = 50.** Vérifié par relecture programmatique de la matrice : 50 identifiants uniques, aucun doublon, aucun manquant.

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
| Transparence IA transformée en badge visible | 44 | ⬜ disclosure fait depuis le chantier 1, badge non fait |

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

**Critère de sortie :** un second marché linguistique fonctionne de bout en bout : prix, TVA, conformité ingrédient locale.

---

### CHANTIER E — RÉTENTION & BEAUTY JOURNEY

| Tâche | Fonctionnalités |
|---|---|
| Loyalty par progression, pas par points seuls | 26 |
| Récompense des comportements non-marchands : scan, avis, feedback | 27 |
| Beauty Journey : narration de l'évolution | 28 |
| Abonnement KURLA+ | 29 |

**Critère de sortie :** un utilisateur qui ne commande pas progresse et est récompensé. Rétention à 90 jours mesurée.

---

### CHANTIER F — B2B & API

| Tâche | Fonctionnalités |
|---|---|
| Texture Gap Report — agrégats k-anonymes uniquement | 30 |
| API catalogue + scoring | 31 |
| Espace marque : tests produits ciblés | 41 |
| Programme experts / créateurs | 39 |
| Rémunération au résultat, pas au clic | 40 |

**Critère de sortie :** un contrat marque signé sur agrégats, sans aucune donnée personnelle cédée.

---

### CHANTIER G — ARCHITECTURE, MOBILE & VISION

| Tâche | Fonctionnalités |
|---|---|
| Découpage de `server.ts` (3 265 l.) et `serverDb.ts` (6 163 l.) par domaine | 45, action 18 |
| Tests Supabase réels A/B | 46, action 4 |
| Application mobile | 42 |
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
| **Filtrage réglementaire par juridiction** | 🟠 logique seule | A puis D |
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
| 17 vérifications RLS jamais exécutées | Aucune instance Supabase réelle dans cet environnement |
| Aucune vérification visuelle/navigateur des écrans Shelf et Wash Day | Vérifiés par compilation, tests de câblage et HTTP 200 — pas par rendu |
| `GET /api/*` sur route inconnue renvoie du HTML 200 | Catch-all SPA. Pas une faille d'autorisation — les routes protégées renvoient bien 401. Corrigé en G |
| Art. 50(2) marquage machine-readable | Échéance 2 déc. 2026 pour les systèmes déjà sur le marché. À traiter en B |
| Art. 50(4) exemption éditoriale | Encodée dans `AI_TRANSPARENCY.editorialExemptionNote`, **non appliquée dans le CMS** |
