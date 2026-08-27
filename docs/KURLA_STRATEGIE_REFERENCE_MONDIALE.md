# KURLA — ANALYSE STRATÉGIQUE : VERS LA RÉFÉRENCE MONDIALE

> **Date :** 27 août 2026
> **Périmètre :** analyse du dépôt `Huberaya/Kurla-` (commit `d72faee`, branche `main`) + étude des modèles de référence
> **Statut :** document de décision. Aucune ligne de code n'a été modifiée.
> **Méthode :** chaque affirmation sur l'existant est issue d'une lecture directe du dépôt. Les chiffres cités sont comptés, pas estimés.

---

## A. CE QUE KURLA EST AUJOURD'HUI

### A.1 L'inventaire réel

| Métrique | Valeur vérifiée |
|---|---|
| Commits | 19 |
| Tables SQL | **66** |
| Lignes de migrations SQL | **4 391** (22 fichiers) |
| `server.ts` | **2 875 lignes** (monolithe Express) |
| `src/lib/serverDb.ts` | **6 124 lignes** (monolithe d'accès données) |
| Total TS/TSX | **27 216 lignes** |
| Pages | 37 |
| Fichiers de test | 19 |
| État des tests | `npm test` → code de sortie **0** (5/5 Phase 3, 7/7 Phase 4, 25/25 Phase 5) |

### A.2 Le verdict honnête

**KURLA n'est pas un produit de personnalisation. C'est une plateforme e-commerce et opérationnelle très bien construite, avec une couche conseil cosmétique posée dessus.**

Ce qui est réellement solide et rare à ce stade :

- **L'intégrité commerciale est excellente.** Prix imposés côté serveur, stock atomique (réservation → déduction → libération → restauration), idempotence Stripe via `stripe_events`, remboursement idempotent. Peu de projets à ce stade de maturité ont ça.
- **La discipline RLS est réelle.** `is_admin()` et `get_current_user_role()` en `SECURITY DEFINER` avec `SET search_path`, politique `WITH CHECK` empêchant l'auto-élévation de rôle.
- **La gouvernance catalogue est un vrai actif.** Sept statuts de validation par produit (`ingredient_verification_status`, `claims_validation_status`, `images_validation_status`, `stock_validation_status`, `certifications_validation_status`, `translations_validation_status`, `brand_verification_status`) et un produit non publié tant que les contrôles ne sont pas verts. C'est une architecture de confiance, pas une architecture de catalogue.
- **L'honnêteté du système de profil.** Le code utilise une constante `UNKNOWN` et `calculateKurlaFit` renvoie `score: null` plutôt qu'un score inventé. C'est un choix éthique rare et c'est un avantage concurrentiel sous-exploité.

### A.3 Les six blocages structurels

Ce ne sont pas des manques de fonctionnalités. Ce sont des **impossibilités architecturales** : tant qu'ils ne sont pas levés, les niveaux 2 à 5 de la roadmap sont inaccessibles.

**1. Il n'existe aucun graphe de connaissances. Les ingrédients sont des chaînes de caractères.**

```sql
-- supabase/migrations/20260804000000_init_kurla_schema.sql:64
ingredients TEXT[],
hair_types TEXT[],
skin_types TEXT[],
concerns TEXT[],
```

Il n'y a **aucune table `ingredients`**. `ingredient_roles` est une colonne `JSONB` sur `products`. Conséquence : on ne peut pas poser la question « quels produits contiennent de la glycérine ? », on ne peut attacher ni fonction, ni niveau de preuve, ni incompatibilité, ni allergène à un ingrédient en tant qu'entité. **Le §11 de ta vision (Knowledge Graph) et le §4 (le MOAT) sont structurellement impossibles aujourd'hui.** C'est le blocage n°1.

**2. La boucle d'apprentissage est un cimetière de données.**

`routine_feedback` est écrit, lu et supprimé. Jamais consommé.

```
src/lib/serverDb.ts:4540  select  (affichage)
src/lib/serverDb.ts:4678  insert  (collecte)
src/lib/serverDb.ts:4757  delete  (RGPD)
```

Aucune de ces lignes n'alimente `calculateKurlaFit` ni la génération de routine. **KURLA collecte du feedback et ne l'utilise pour rien.** Le §10 — que tu identifies à juste titre comme stratégique — n'existe pas.

**3. Le moteur de recommandation ne peut pas apprendre.**

`src/lib/kurlaFit.ts` fait 186 lignes. C'est un `switch/case` écrit à la main, un cas par besoin (`hydrater_cheveux`, `reduire_casse`, `definir_boucles`…). C'est explicable — c'est sa grande qualité — mais chaque nouveau besoin ou nouveau produit exige du code. Aucun poids appris, aucun raisonnement au niveau ingrédient. Ça ne scale pas au-delà de quelques dizaines de besoins.

**4. L'application est un SPA sans rendu serveur. La stratégie contenu/SEO est impossible.**

- `index.html` contient **un seul** `<title>` et **une seule** meta description, statiques.
- Le routage est une cascade de `if (pathname === '...')` dans `src/App.tsx` (lignes 200-281). Pas de `react-router`.
- **Aucun** répertoire `public/`. **Aucun** `sitemap.xml`, **aucun** `robots.txt`, **aucun** `hreflang`, **aucune** balise Open Graph.
- Zéro gestion de `document.title` par page (grep vide).

Les §26 et §27 — faire de KURLA « une immense base de connaissances beauté » — exigent des centaines de milliers d'URL indexables. **L'architecture actuelle en indexe une.** C'est le blocage le plus coûteux à lever, donc celui à décider en premier.

**5. Aucune infrastructure d'internationalisation.**

Pas de framework i18n, pas de fichiers de traduction, pas de gestion de devises. Seuls existent `normalizeAiLocale` / `normalizeAiCountry` côté API IA et `country_availability TEXT[]` sur les produits (défaut : `['FR','BE','CH','CA','CI','SN']`). Le §28 est à construire de zéro — mais le champ `country_availability` montre que l'intention était là.

**6. Tout ce qui relève de la relation humaine est une coquille vide.**

| Fonction | Ce que montre le code |
|---|---|
| Prise de rendez-vous | `ConsultationBookingModal.tsx` contient **zéro** appel `fetch(`/`api/`. Aucune table `appointments` ou `bookings` (grep : 0 occurrence). |
| Place de marché des pros | `ProfessionalsPage.tsx:3` importe `MOCK_PROS`. **Aucun appel API.** |
| Communauté / UGC | `UgcWallSection.tsx:3` importe depuis `mockData`. Aucune table `ugc`. |
| Fidélité | `loyalty` : **0 occurrence** dans les 4 391 lignes de SQL. |
| Parrainage | `referral` : **0 occurrence**. |
| Score de confiance | `trust_score` : **0 occurrence**. |

**15 composants et pages en production consomment `mockData`**, dont `ProfessionalsPage` et `ProProfilePage`. Voir §D.

### A.4 Un passif juridique immédiat

**L'article 50(1) du règlement européen sur l'IA est applicable depuis le 2 août 2026** — il y a 25 jours. Il impose au fournisseur d'informer l'utilisateur qu'il interagit avec un système d'IA, sauf si c'est évident. Sanction : jusqu'à 15 M€ ou 3 % du chiffre d'affaires mondial.

Ce que fait KURLA aujourd'hui : l'interface affiche `KURLA AI · assistant explicable` (`AiBeautyAssistantPage.tsx:142`) et un avertissement « Les réponses KURLA sont des informations et conseils cosmétiques ». **Ce n'est pas une disclosure IA** — c'est un disclaimer de non-médicalité. Les lignes directrices de la Commission (20 juillet 2026) précisent explicitement de ne pas s'appuyer sur un libellé ambigu.

Point connexe : le CMS `content_articles` peut publier du texte généré par IA. L'article 50(4) impose alors la divulgation — **sauf** si un contrôle éditorial humain est documenté avec une personne responsable nommée. Cette exemption doit devenir une règle produit, pas une option.

---

## B. CE QUE KURLA DOIT DEVENIR

### B.1 Le recadrage

La formulation « LE SYSTÈME PERSONNEL DE BEAUTÉ INTELLIGENT » est la bonne. Mais elle reste centrée sur l'IA. L'IA n'est pas défendable : Revieve la vend en marque blanche à 250 enseignes, Google Cloud la fournit, n'importe qui peut brancher un modèle.

**Le recadrage :**

> **KURLA n'est pas un site marchand avec de l'IA. KURLA est le dossier beauté de l'utilisateur — et tout l'écosystème (marques, pros, distributeurs) paie pour y être pertinent.**

Trois couches, dans cet ordre :

```
1. LE DOSSIER     Ce que je suis, ce que je possède, ce que j'ai essayé, ce qui s'est passé.
2. LE MOTEUR      Ce que je dois faire maintenant, et pourquoi.
3. LE MARCHÉ      Où l'acheter, qui peut m'aider, ce que les autres en disent.
```

Aujourd'hui KURLA a construit la couche 3, ébauché la couche 2, et n'a pas la couche 1. **Il faut inverser l'ordre de construction.**

### B.2 La phrase test

Une fonctionnalité appartient à KURLA si et seulement si elle **enrichit le dossier** ou **améliore le moteur**. Sinon c'est du e-commerce générique, et le e-commerce générique est un marché où KURLA perdra contre Amazon, Notino et Sephora.

### B.3 Ce que la combinaison des concurrents ne fait pas

| Plateforme | Ce qu'elle fait bien | Son angle mort structurel |
|---|---|---|
| **Sephora** (45 M membres) | Fidélité émotionnelle, communauté comme coût de changement, zero-party data via Color iQ | Généraliste. La texture 4C y est une exception statistique, pas le cas par défaut. |
| **Ulta** (~46,7 M membres, ~95 % du CA) | Réassort prédictif, récompense des comportements non-marchands, segmentation par cycle de vie | Idem. Et aucune expertise capillaire texturée. |
| **Proven** | Formulation sur mesure à partir de dizaines de facteurs | Vend SA formule. Aucun intérêt à recommander le produit d'un autre. Conflit d'intérêt structurel. |
| **Revieve** (250+ enseignes, 40 pays) | Diagnostic photo, AR, Beauty Product IQ, Data Hub B2B | Marque blanche. Elle ne possède ni la relation, ni la donnée longitudinale, ni la confiance de la communauté. |
| **Carra** | Expertise cheveux texturés, accompagnement humain | Échelle limitée, pas de moteur produit, pas de marketplace. |
| **Yuka / INCIDecoder** | Transparence ingrédient, confiance massive | Aucun profil, aucune routine, aucun résultat. Et un biais hazard-over-exposure. |
| **SkinSort / HadaBuddy** | Score de correspondance au profil, routines | Peau d'abord. La peau riche en mélanine et le cheveu texturé y sont des variantes. |

**L'espace vide est précis et il est réel :**

> Personne ne possède simultanément (1) la **transparence ingrédient** de Yuka, (2) le **profil longitudinal** de Proven, (3) la **donnée de résultat sur cheveux texturés et peaux riches en mélanine**, et (4) un **réseau de professionnels vérifiés** capables de valider ce que l'IA propose.

Chacun de ces quatre éléments existe séparément. **La combinaison n'existe nulle part.** Et elle est difficile à copier, parce que les éléments 3 et 4 exigent du temps et de la confiance, pas du code.

---

## C. CE QUI MANQUE

### C.1 Couche DONNÉES — le plus critique

| Manque | Conséquence |
|---|---|
| Table `ingredients` normalisée + `product_ingredients` (rang INCI, %, rôle) | Pas de raisonnement ingrédient. Pas de graphe. |
| Vocabulaires contrôlés (`concerns`, `hair_types`, `skin_types`, `goals`, `textures`) | `TEXT[]` libre = données non agrégeables = aucune intelligence possible. |
| Table `ingredient_evidence` (fonction, niveau de preuve A-D, sources, populations étudiées) | Le niveau de preuve A/B/C/D existe dans le prompt IA mais n'est **pas modélisé en base**. |
| Table `ingredient_incompatibilities` | Impossible d'alerter sur les mélanges à risque (rétinoïde + AHA, etc.). |
| Table `user_products` (le **shelf** : possédé / en cours / terminé / abandonné + raison) | Sans inventaire réel, on recommande à l'aveugle et on pousse à suracheter. |
| Table `outcome_observations` structurée (produit × ingrédient × archétype × durée × résultat) | C'est **la** donnée qui vaut de l'or. Elle est aujourd'hui noyée dans `routine_feedback` inutilisé. |
| Table `archetypes` + cohorte k-anonyme | Impossible de dire « chez les profils similaires » sans violer la confidentialité. |
| Historique `reviews` relié à l'archétype du profil | La table `reviews` existe mais ne permet aucune agrégation par texture ou carnation. |

### C.2 Couche MOTEUR

| Manque | Conséquence |
|---|---|
| Consommation réelle de `routine_feedback` | La boucle d'apprentissage n'existe pas. |
| Représentation vectorielle des produits et des besoins | Pas de recherche sémantique (§13), pas d'alternatives intelligentes. |
| Détection de conflit dans une routine (doublon de fonction, surcharge d'actifs, incompatibilité) | KURLA peut aujourd'hui recommander deux produits qui font la même chose. |
| Modèle de coût d'usage (prix au ml, rendement, fréquence) | `estimated_yield` existe en base mais n'est pas exploité dans le raisonnement budget. |
| Moteur de routine événementiel (wash day) plutôt qu'AM/PM | Voir §G.3 — c'est un différenciateur majeur. |

### C.3 Couche EXPÉRIENCE

| Manque | Conséquence |
|---|---|
| Rendu serveur / prérendu | Pas de SEO. Pas de partage social digne de ce nom. |
| i18n + devises + catalogue régional piloté | Internationalisation impossible. |
| Recherche sémantique | La recherche actuelle est par mot-clé et catégorie. |
| Scan / recherche visuelle | §14 inexistant. |
| Notification de réassort prédictive | Ulta en a fait un pilier de rétention. KURLA a `notifications` mais pas la logique de cycle. |
| Application mobile | Absente. Or le scan, la photo et le suivi quotidien sont des usages mobiles. |

### C.4 Couche ÉCOSYSTÈME

Réservation, paiement des pros, contrats, facturation, co-signature professionnelle, espace marque, API, tableau de bord B2B : **tout est à construire.**

### C.5 Couche CONFIANCE ET CONFORMITÉ

| Manque | Conséquence |
|---|---|
| Disclosure IA article 50(1) | Non-conformité actuelle, applicable depuis le 2 août 2026. |
| Marquage machine-readable des contenus générés (art. 50(2)) | Applicable au 2 décembre 2026 pour les systèmes déjà sur le marché. |
| Registre de traitement RGPD pour `beauty_profile_photos` | Les photos de peau/cheveux peuvent constituer des données de santé. Base légale à documenter. |
| Analyse d'impact (AIPD) | Obligatoire si traitement à grande échelle de données sensibles. |
| Encadrement des allégations cosmétiques (règl. 1223/2009, critères communs) | `claims_validation_status` existe en base mais aucune règle éditoriale n'est formalisée. |

---

## D. CE QU'IL FAUT SUPPRIMER

Tu as demandé d'être direct. Voici ce qui doit disparaître.

### D.1 Suppression immédiate — risque juridique et de confiance

**1. Les faux professionnels en production.** `ProfessionalsPage.tsx:3` et `ProProfilePage.tsx` affichent `MOCK_PROS` : faux noms, faux avatars Unsplash, fausses notes (4,98), faux nombres d'avis (42), fausses adresses réelles (« 28 Rue Garibaldi, 69006 Lyon »), et surtout **`verified: true` et `certified: true` sur des personnes qui n'existent pas.**

Pour une plateforme dont la promesse est la confiance vérifiée, c'est le pire passif du dépôt. C'est aussi un risque juridique (fausses recommandations, usage d'adresses réelles, faux avis au sens de la consommation). **À retirer du parcours public immédiatement**, quitte à afficher une page « nos premiers pros arrivent, inscrivez-vous ».

**2. Les 13 autres composants qui consomment `mockData` en production** : `BeautyHouseSection`, `ChooseNeedSection`, `ConsultationBookingModal`, `HeroSection`, `KurlaProSection`, `TextureGallerySection`, `UgcWallSection`, `landing/HairSkinSection`, `landing/KidsMenSection`, `KidsModulePage`, `MelaninSkinPage`, `MenGroomingPage`, `ProtectiveStylesPage`. Le mur d'UGC faux est particulièrement toxique : c'est de la fausse preuve sociale.

**3. Les deux contradictions de marque identifiées :**
- `src/data/mockData.ts:717` — un pro `verified: true, certified: true`, noté 4,98, vend « Soin Detox Bicarbonate/Vinaigre ». Le référentiel éditorial de l'assistant interdit formellement le bicarbonate. **La plateforme met en avant une pratique qu'elle déconseille.**
- `src/components/landing/HairSkinSection.tsx:21` — « Taches & Hyperpigmentation → **Sérums éclaircissants ciblés** ». Le mot « éclaircissant » est exactement celui qu'on reproche à une marque mélanine. À remplacer par « sérums anti-taches / unifiants ciblés ».

### D.2 Suppression — code mort

| Élément | Preuve |
|---|---|
| `data/orders.json`, `data/idempotency.json` | Zéro référence dans `server.ts` et `serverDb.ts`. Artefacts orphelins versionnés. |
| `src/lib/ai/mockAnswers.ts` | Zéro import dans tout le dépôt. |
| `AI_GUARDRAILS.checkForMedicalFlags()` et `getMedicalRedirectMessage()` (`guardrails.ts:6`, `:11`) | Jamais appelées. Le triage est réimplémenté en parallèle dans `medicalTriage()` (`server.ts:1444`). Deux listes de mots-clés divergentes, c'est un bug en attente. |
| `migrations/001_init.json` | Coexiste avec `supabase/migrations/*.sql`. Deux systèmes de migration = ambiguïté sur la source de vérité. |

### D.3 Suppression — architecture

**Le routage `if (pathname === ...)` de `App.tsx`.** 80+ conditions en cascade. Bloque le SSR, bloque le code-splitting propre, bloque les métadonnées par page. À remplacer par un vrai routeur, en même temps que la bascule SSR.

**Les pages de contenu écrites à la main.** `KidsModulePage`, `ProtectiveStylesPage`, `MelaninSkinPage`, `MenGroomingPage`, `ToolsPage`, `IngredientsGuidePage` sont des pages React codées en dur. C'est l'inverse de la stratégie §27 : le contenu doit être **généré** depuis le graphe de connaissances et le CMS `content_articles`, pas compilé dans le bundle.

**Le monolithe.** `server.ts` (2 875 lignes) et `serverDb.ts` (6 124 lignes). Ajouter 50 fonctionnalités là-dedans coûtera de plus en plus cher. À découper par domaine avant le niveau 3.

### D.4 Suppression — produit

**Le concept de « note globale » d'un produit.** Un 4,6/5 toutes populations confondues est une information fausse pour un cheveu 4C faible porosité. À remplacer par une note **par archétype**. C'est moins flatteur au début (moins d'avis par cellule) et c'est exactement ce qui rend la donnée unique.

---

## E. CE QU'IL FAUT AMÉLIORER

| Existant | Amélioration |
|---|---|
| `calculateKurlaFit` (règles explicites) | **Ne pas le jeter.** L'explicabilité est un actif. Le faire évoluer en moteur hybride : règles explicables en surface, pondérations apprises en dessous. Chaque pondération apprise doit rester justifiable en une phrase. |
| `routine_feedback` | Le transformer en `outcome_observations` structuré et le brancher sur le moteur. |
| `medicalTriage()` (`server.ts:1444`) | Bonne idée, mauvaise exécution : correspondance par phrases exactes. « j'ai la gorge qui gonfle » et « je n'arrive plus à respirer » ne déclenchent rien. Passer à une correspondance par racines + seuil, et n'avoir **qu'une** liste, dans `guardrails.ts`. |
| Gouvernance catalogue (7 statuts de validation) | Excellent socle. Le rendre **public** : afficher le niveau de vérification sur la fiche produit. C'est ton Yuka des allégations, et tu as déjà la base. |
| `beauty_profiles` + `beauty_profile_history` | Très riche. Ajouter la notion d'**archétype dérivé** et de confiance par champ, pour alimenter les cohortes. |
| `progress_journal_entries` + `beauty_profile_photos` | La base du « Beauty Journey » existe. Manque la narration : évolution visible, comparaison dans le temps, jalons. |
| `product_subscriptions` | Existe en base. À relier au réassort prédictif, pas seulement à la livraison récurrente. |
| `country_availability` | Bon début d'internationalisation. À étendre en véritable matrice prix × devise × TVA × réglementation ingrédient par juridiction. |
| Prompt IA (`systemPrompt.ts`, 94 lignes) | Très bon fond : hiérarchie des sources (HAS, ANSM, DGCCRF, FDA, CosIng), niveaux de preuve A-D, section urgence 15/112. À **fusionner** avec le référentiel éditorial que tu as posé — qui ajoute l'interdiction explicite des remèdes maison dangereux et le format de réponse — sans perdre la hiérarchie des sources ni le gradateur de preuve. |

---

## F. LES NOUVELLES FONCTIONNALITÉS (50)

`D` = difficulté (1 facile → 5 très difficile) · `P` = priorité (P0 bloquant → P3 plus tard) · Phases : **1** Fondation · **2** Personnalisation · **3** Intelligence · **4** Écosystème · **5** Global

| # | Nom | Problème résolu | Valeur utilisateur | Valeur business | D | P | Phase |
|---|---|---|---|---|---|---|---|
| 1 | **Graphe d'ingrédients** (table `ingredients` + `product_ingredients`) | Impossible de raisonner par ingrédient | Comprendre enfin les compositions | Fondement de tout le B2B | 4 | P0 | 1 |
| 2 | **Vocabulaires contrôlés** (concerns, textures, objectifs) | `TEXT[]` libre non agrégeable | Filtres qui ont du sens | Données exploitables | 3 | P0 | 1 |
| 3 | **Rendu serveur / prérendu** | 1 URL indexable | Partage social riche | Acquisition organique | 4 | P0 | 1 |
| 4 | **Disclosure IA + conformité AI Act** | Non-conformité actuelle | Savoir à qui on parle | Éviter 15 M€ / 3 % CA | 1 | P0 | 1 |
| 5 | **Purge des données fictives en production** | Faux pros, faux avis | Confiance réelle | Protection juridique | 1 | P0 | 1 |
| 6 | **KURLA Shelf** (inventaire personnel par scan) | On recommande sans savoir ce que tu as | Ne plus racheter en double | Meilleure donnée d'usage du marché | 3 | P0 | 2 |
| 7 | **Boucle d'apprentissage branchée** (`outcome_observations`) | Le feedback ne sert à rien | KURLA s'améliore vraiment | Le MOAT | 3 | P0 | 2 |
| 8 | **Archétypes + cohortes k-anonymes** | Pas de « profils similaires » possible | « Les gens comme moi » | Community intelligence légale | 3 | P0 | 2 |
| 9 | **Note par archétype** (fin de la note globale) | Un 4,6/5 mentira sur du 4C | Décision d'achat fiable | Différenciation majeure | 3 | P0 | 2 |
| 10 | **Wash Day OS** (routine événementielle) | Le modèle AM/PM est faux pour le texturé | Routine qui colle à la vraie vie | Différenciateur structurel | 3 | P0 | 2 |
| 11 | **Diagnostic photo encadré** (aide beauté, pas diagnostic) | Questionnaire seul = déclaratif | Objectivité partielle | Revieve revendique +22 % de conversion, et +108 % / +23 % de panier moyen sur le cas JCPenney (chiffres vendor, à traiter comme ordre de grandeur) | 5 | P1 | 3 |
| 12 | **Timeline coiffure protectrice** (âge, tension, retrait) | Alopécie de traction non détectée | Alerte avant la casse | Crédibilité santé unique | 3 | P1 | 2 |
| 13 | **Recherche sémantique** (« routine crépus secs < 50 € ») | Recherche par mot-clé | Exprimer un vrai besoin | Conversion recherche | 3 | P1 | 2 |
| 14 | **Détection de conflit de routine** | Doublons et surcharge d'actifs | Éviter les réactions | Confiance | 3 | P1 | 2 |
| 15 | **Routine Builder → panier en 1 clic** | IA déconnectée du commerce | Friction nulle | Panier moyen ↑ | 2 | P1 | 2 |
| 16 | **Réassort prédictif** | On rachète trop tôt ou trop tard | Message utile, pas promo | Rétention (pilier Ulta) | 2 | P1 | 2 |
| 17 | **Intelligence des retours** (pourquoi rendu ?) | La donnée retour est jetée | Produits mieux adaptés | Donnée que personne d'autre n'a | 2 | P1 | 2 |
| 18 | **Fiche ingrédient publique** (fonction, preuve, sources) | Compositions illisibles | Pédagogie | SEO massif | 2 | P1 | 2 |
| 19 | **Score de confiance produit public** | On ne sait pas ce qui est vérifié | Transparence | Actif de marque | 2 | P1 | 2 |
| 20 | **i18n + devises + TVA** | Architecture monolingue | Acheter dans sa langue | Ouverture marchés | 4 | P1 | 3 |
| 21 | **Filtrage réglementaire par juridiction** | Restrictions UE ≠ US | Sécurité | Barrière à l'entrée | 3 | P1 | 3 |
| 22 | **KURLA Trust Score pros** (identité, diplôme, avis) | Aucun moyen de vérifier un pro | Choisir en confiance | Qualité du réseau | 3 | P1 | 4 |
| 23 | **Réservation + paiement de prestation** | Le pont IA → humain n'existe pas | Un seul parcours | Commission 15-25 % | 4 | P1 | 4 |
| 24 | **Co-signature professionnelle** | L'IA seule ne suffit pas | Avis validé par un humain | Raison d'adopter pour les pros | 3 | P1 | 4 |
| 25 | **Espace pro : dossiers clients partagés** | Le pro n'a pas le contexte | Continuité salon/maison | Abonnement pro | 4 | P1 | 4 |
| 26 | **Loyalty par progression** (pas de points seuls) | Aucune fidélité aujourd'hui | Sentiment d'avancer | Rétention | 3 | P1 | 3 |
| 27 | **Récompense des comportements non-marchands** (avis, scan, feedback) | Le feedback ne coûte rien à donner | Être récompensé pour aider | Alimente le MOAT | 2 | P1 | 3 |
| 28 | **Beauty Journey** (narration de l'évolution) | On ne voit pas ses progrès | Motivation durable | Rétention long terme | 3 | P1 | 3 |
| 29 | **Abonnement KURLA+** | Pas de revenu récurrent | Suivi avancé | MRR | 3 | P2 | 3 |
| 30 | **Texture Gap Report (B2B)** | Les marques ignorent leurs angles morts | — | Revenu B2B à forte marge | 3 | P2 | 4 |
| 31 | **API catalogue + scoring** | Aucune ouverture | — | Infrastructure BeautyTech | 4 | P2 | 5 |
| 32 | **Recherche visuelle produit** (photo → fiche) | Identifier un produit vu ailleurs | Acquisition | Entonnoir d'acquisition | 4 | P2 | 3 |
| 33 | **Scan code-barres INCI** | Saisie manuelle fastidieuse | Décision en rayon | Acquisition mobile | 3 | P2 | 3 |
| 34 | **Comparateur de routines** | Choisir entre deux routines | Décision éclairée | Conversion | 2 | P2 | 3 |
| 35 | **Simulateur de coût annuel** | Le vrai prix d'une routine est invisible | Maîtriser son budget | Confiance → conversion | 2 | P2 | 2 |
| 36 | **Intelligence climat / eau dure** | L'eau dure casse les routines | Conseil vraiment local | Différenciateur | 2 | P2 | 2 |
| 37 | **Pages SEO générées** (problème × texture × ville) | 1 URL indexable | Trouver une réponse | Acquisition organique massive | 3 | P1 | 3 |
| 38 | **Contenu personnalisé par profil** | Contenu générique | Pertinence | Engagement | 2 | P2 | 3 |
| 39 | **Programme experts / créateurs** | Pas de voix d'autorité | Incarnation | Acquisition + contenu | 3 | P2 | 4 |
| 40 | **Rémunération au résultat, pas au clic** | Créateurs payés à la conversion = biais | Intégrité | Différenciateur éthique | 3 | P2 | 4 |
| 41 | **Espace marque : tests produits ciblés** | Les marques testent à l'aveugle | Produits mieux pensés | Revenu B2B | 4 | P2 | 4 |
| 42 | **Application mobile** | Le scan et le suivi sont mobiles | Usage quotidien | Rétention | 5 | P2 | 4 |
| 43 | **Export / suppression en 1 clic** | Conformité RGPD partielle | Contrôle total | Confiance = argument commercial | 2 | P0 | 1 |
| 44 | **Transparence IA comme badge** | L'IA est une boîte noire | Comprendre pourquoi | Conformité + différenciation | 2 | P0 | 1 |
| 45 | **Découpage du monolithe par domaine** | 9 000 lignes dans 2 fichiers | — | Vélocité de développement | 3 | P0 | 1 |
| 46 | **Tests Supabase réels A/B** | 0/17 vérifications Phase 2 exécutées | — | Éviter une faille RLS en production | 2 | P0 | 1 |
| 47 | **Modularisation du moteur de recommandation** | 186 lignes de `switch` | — | Scalabilité | 3 | P0 | 2 |
| 48 | **Virtual try-on coiffure/couleur** | Se projeter est difficile | Plaisir | **À ne faire que si objectif clair** | 5 | P3 | 5 |
| 49 | **Maquillage virtuel** | Hors cœur de métier | — | **Hors périmètre** | 5 | P3 | — |
| 50 | **Place de marché créateurs (produits)** | — | — | **Trop tôt** | 5 | P3 | 5 |

### Les 20 à retenir

**Fondation (à faire avant tout le reste) :** 4, 5, 46, 45, 1, 2, 3, 43
**Personnalisation :** 6, 7, 8, 9, 10, 12
**Intelligence :** 13, 14, 15, 16
**Écosystème :** 22, 24

Ce sont celles qui, prises ensemble, produisent le MOAT. Les 30 autres en découlent ou peuvent attendre.

---

## G. CE À QUOI NOUS N'AVONS PAS PENSÉ

### G.1 KURLA SHELF — l'invention la plus importante de cette analyse

Toute l'industrie recommande à partir de l'**historique d'achat**. C'est la pire base possible : acheter n'est pas utiliser. Un sérum acheté il y a huit mois peut être terminé, abandonné au fond d'un placard, ou donné.

**KURLA Shelf** : l'utilisateur photographie son étagère (ou scanne ses codes-barres). KURLA construit son **inventaire réel**.

Ce que ça change :

- La question passe de « que veux-tu acheter ? » à « **que te manque-t-il vraiment ?** ». KURLA devient capable de dire : *« tu n'as rien à acheter, il te manque juste un leave-in. »*
- C'est l'acte de confiance le plus fort du marché. Une plateforme qui te dit de ne pas acheter gagne une confiance qu'aucune promotion n'achète.
- C'est **la meilleure donnée d'usage au monde** : possession × fréquence × abandon × raison. Personne ne l'a.
- Effet commercial contre-intuitif : la conversion baisse sur le coup, le panier moyen et la fréquence montent fortement, et le taux de retour s'effondre.

### G.2 L'EVIDENCE PAR INGRÉDIENT × ARCHÉTYPE — le MOAT réel

Revieve vend *Beauty Product IQ* : de l'intelligence **produit** aux marques. Personne ne vend de l'intelligence **ingrédient × texture × résultat**.

Concrètement, KURLA peut produire ce que personne ne peut produire :

> *« La glycérine, en climat sec (< 40 % d'humidité), sur cheveux 4C faible porosité : résultats mitigés sur 312 observations, 58 % signalent un effet rêche. En climat humide, sur la même texture : 74 % de retours positifs. »*

Cette phrase vaut de l'or pour un formulateur. Elle est **impossible** à produire sans (a) un graphe d'ingrédients, (b) des archétypes, (c) des observations de résultat longitudinales. Les trois sont exactement ce qu'il faut construire en priorité.

**C'est ça, le MOAT. Pas l'IA. Pas le catalogue. La donnée d'efficacité par ingrédient sur des populations que l'industrie ignore.**

### G.3 WASH DAY OS — le différenciateur capillaire

Tout le marché de la personnalisation (Proven, Revieve, SkinSort) est **peau d'abord**, donc construit sur une logique matin/soir quotidienne.

Le cheveu texturé ne fonctionne pas comme ça. Il fonctionne par **cycles** : wash day tous les 7 à 21 jours, coiffure protectrice portée 4 à 8 semaines, masque toutes les 1 à 4 semaines. Une routine AM/PM appliquée au 4C est **structurellement fausse**.

KURLA a déjà les bons champs en base (`washDayIntervalDays`, `maskFrequency`, `protectiveStyleRemovalAfterDays`, `locksMaintenanceEveryDays` dans `adaptiveRoutine.ts`). Il faut en faire le **cœur du modèle**, pas un paramètre.

Modèle : `Routine = Cycle(wash day) × Événements(coiffure, saison, sport, eau) × Quotidien(léger)`.

### G.4 LA TIMELINE DE COIFFURE PROTECTRICE — crédibilité santé

Aucune plateforme ne suit l'**âge d'une coiffure**. Or l'alopécie de traction est cumulative, prévisible, et largement évitable.

KURLA sait déjà quand une coiffure protectrice a commencé. Il faut :
- suivre l'âge, la tension déclarée, les signaux (démangeaison, douleur, boutons, croûtes) ;
- alerter avant la perte (« ta coiffure a 7 semaines, tu signales de la douleur sur les tempes : c'est le moment de la retirer ») ;
- proposer un protocole de récupération.

C'est le seul endroit où KURLA peut avoir un impact sanitaire mesurable. Et c'est un sujet où la littérature existe, où les communautés sont demandeuses, et où **personne n'a d'outil**.

### G.5 L'INTELLIGENCE DES RETOURS

KURLA possède déjà `returns` et `return_events`. Aujourd'hui, un retour est un événement logistique.

Il faut le transformer en **donnée d'efficacité** : « pourquoi l'as-tu rendu ? » → `{texture_inadaptée, trop_gras, parfum, réaction, inefficace, trop_cher}` croisé avec l'archétype et les ingrédients.

**Aucun détaillant beauté au monde n'exploite ça.** C'est une donnée négative — donc plus informative que les avis, qui sont biaisés vers les acheteurs satisfaits.

### G.6 LA CO-SIGNATURE PROFESSIONNELLE

Le pont IA → humain ne doit pas être « l'IA te recommande un pro ». Il doit être **le pro valide la recommandation de l'IA**.

- L'IA propose une routine.
- Un pro vérifié peut l'approuver, l'amender ou la contredire, avec son nom.
- La routine affiche : *« Validée par Aminata D., locticienne certifiée, 42 avis. »*

Effets : (1) crédibilité immédiate de l'IA ; (2) le pro gagne en visibilité **grâce à son expertise réelle**, pas à un budget publicitaire ; (3) KURLA obtient du signal expert structuré, qui est la donnée la plus rare de toutes.

### G.7 LA CONFORMITÉ COMME ACTIF DE MARQUE

La contrainte AI Act est une opportunité. Dans un marché où les concurrents affichent des diagnostics photo avec des affirmations pseudoscientifiques, KURLA peut être **la plateforme qui montre son travail** :

- « Cette recommandation repose sur 3 règles explicites : porosité faible, sécheresse forte, budget < 30 €. »
- « Niveau de preuve : B. Sources : [liens]. »
- « Ce champ est inconnu dans ton profil, donc il n'a pas influencé la réponse. »

Le code le fait déjà partiellement (`score: null` plutôt qu'invention, `evidence[]` dans `KurlaFitResult`). Il faut en faire **l'identité produit**, pas un détail technique.

### G.8 LE FILTRAGE RÉGLEMENTAIRE PAR JURIDICTION

Les restrictions d'ingrédients diffèrent entre l'UE, les États-Unis, le Royaume-Uni et d'autres marchés (conservateurs, filtres UV, colorants). Une même formule peut être légale à Paris et interdite à New York.

KURLA, en structurant ses ingrédients, obtient **gratuitement** une capacité que ni Yuka (UE-centré) ni les apps US n'ont : recommander en fonction de la juridiction de l'utilisateur. C'est un différenciateur d'internationalisation concret et peu coûteux une fois le graphe construit.

### G.9 LE « UNKNOWN » COMME PRINCIPE PRODUIT

Le code utilise déjà `UNKNOWN` et renvoie `score: null` plutôt qu'inventer. Il faut l'ériger en **signature de marque** :

> *« KURLA ne devine pas. »*

Chaque concurrent force l'utilisateur à répondre à 40 questions pour produire un score. KURLA peut produire une recommandation partielle honnête, dire ce qu'elle ignore, et expliquer ce que chaque information manquante changerait. C'est un positionnement de confiance impossible à imiter pour un acteur dont le modèle repose sur la conversion.

### G.10 CE QU'IL NE FAUT PAS FAIRE

- **Pas de note globale.** Voir §D.4.
- **Pas de virtual try-on maquillage.** Hors cœur de métier, coût élevé, aucun avantage.
- **Pas de réseau social.** La communauté doit être un sous-produit de la donnée (cohortes), pas un fil d'actualité.
- **Pas de marque propre au début.** Proven a ce conflit d'intérêt ; ne pas le reproduire avant d'avoir établi la neutralité comme actif.
- **Pas de diagnostic médical par photo.** Ni techniquement fiable, ni juridiquement tenable. Aide beauté uniquement, formulée comme telle.

---

## H. LE MOAT DE KURLA

### H.1 Soyons honnêtes sur la boucle proposée

La boucle « plus d'utilisateurs → plus de données → meilleures recommandations » est vraie mais **faible** : c'est la boucle que revendique chaque acteur de la BeautyTech. Elle ne défend rien en soi.

Ce qui défend, ce sont trois actifs qui **composent** :

### H.2 Actif 1 — La donnée d'efficacité par ingrédient et par archétype

Impossible à acheter, impossible à scraper, longue à accumuler. Elle provient de trois sources que KURLA est la seule à pouvoir croiser : le **Shelf** (usage réel), le **feedback de routine** (résultat), et les **retours** (échec).

**Demi-vie longue :** une observation de 2027 reste pertinente en 2035.

### H.3 Actif 2 — Le dossier longitudinal de l'utilisateur

C'est le vrai coût de changement. Après 18 mois, KURLA sait : 47 produits essayés, 12 abandonnés et pourquoi, 3 coiffures protectrices, une réaction au parfum en juin, un budget qui a évolué.

**Ce dossier ne se migre pas.** Et il ne faut surtout pas le vendre — c'est précisément parce qu'il est inviolable que l'utilisateur y reste.

### H.4 Actif 3 — Le réseau de professionnels vérifiés

Effet réseau bilatéral classique, mais lent à construire donc difficile à copier. Un salon qui gère ses dossiers clients sur KURLA ne part pas.

### H.5 Le respect de la vie privée comme condition, pas comme contrainte

La boucle ne fonctionne **que** si la donnée est agrégeable sans exposer les individus. Concrètement :

- **k-anonymité** : aucune statistique de cohorte publiée sous un seuil (k ≥ 30 minimum, à fixer par AIPD).
- **Agrégation au niveau archétype**, jamais au niveau individu.
- **Consentement granulaire** par usage : améliorer *mes* recommandations ≠ contribuer à la recherche KURLA.
- **Photos** : analyse à la demande, non conservée par défaut, supprimable en un geste. La table `beauty_profile_photos` existe avec consentement rétractable — c'est la bonne base.
- **Pas de revente de données personnelles.** Jamais. Le B2B vend des **agrégats**, pas des profils.

**La confidentialité n'est pas un frein au MOAT. C'est ce qui rend le MOAT légalement exploitable.**

---

## I. LE MODÈLE ÉCONOMIQUE

### I.1 Cinq lignes de revenu, dans l'ordre

| # | Ligne | Mécanique | Horizon | Marge | Condition |
|---|---|---|---|---|---|
| 1 | **Retail / marketplace produits** | Commission 15-30 % ou achat-revente | Maintenant | Moyenne | Catalogue vérifié (déjà en place) |
| 2 | **Services professionnels** | Commission 15-25 % sur prestation réservée | Niveau 4 | Bonne | Réseau de pros vérifiés |
| 3 | **Abonnement KURLA+** | 5-9 €/mois : suivi avancé, consultations IA illimitées, alertes, accès experts | Niveau 3 | Très bonne | Le dossier doit valoir quelque chose |
| 4 | **Abonnement KURLA Pro** | 29-99 €/mois : dossiers clients, co-signature, outils salon | Niveau 4 | Très bonne | Réseau existant |
| 5 | **KURLA Intelligence (B2B)** | Données agrégées et k-anonymes, Texture Gap Report, API de scoring | Niveau 4-5 | **Excellente** | Le MOAT |

### I.2 Le point stratégique

Les lignes 1 et 2 sont des métiers à marge moyenne dans des marchés concurrentiels. **La ligne 5 est celle qui change la valorisation** — c'est de la donnée propriétaire, sans coût marginal, sans stock, sans logistique.

Mais la ligne 5 **exige** la crédibilité des lignes 1 à 4. Une plateforme sans utilisateurs n'a pas de donnée à vendre. D'où la séquence : ne jamais monétiser la donnée avant d'avoir la confiance.

### I.3 La ligne rouge

**Ne jamais rendre payantes les fonctions qui créent la confiance** : diagnostic, profil, explication des recommandations, transparence ingrédient, export et suppression. Ce sont elles qui génèrent la donnée. Les payer, c'est tuer le MOAT.

L'abonnement vend du **confort et de la profondeur**, jamais de l'accès à l'honnêteté.

---

## J. ROADMAP 0 → RÉFÉRENCE MONDIALE

### NIVEAU 1 — FOUNDATION (0-4 mois)
*Rendre le produit irréprochable et lever les impossibilités.*

- Conformité AI Act (art. 50(1)) + registre RGPD + export/suppression 1 clic
- Purge des données fictives en production
- Tests Supabase réels A/B (les 17 vérifications Phase 2 aujourd'hui non exécutées)
- Découpage du monolithe par domaine
- **Graphe d'ingrédients + vocabulaires contrôlés** ← le chantier fondateur
- Rendu serveur / prérendu + sitemap + métadonnées par page
- Unification du triage médical autour de `guardrails.ts`

**Critère de sortie :** une page produit et une fiche ingrédient sont indexables ; le graphe contient ≥ 2 000 ingrédients ; zéro donnée fictive en production ; les 17 tests Phase 2 passent contre une vraie instance.

### NIVEAU 2 — PERSONALIZATION (4-10 mois)
*Le dossier devient réel.*

- KURLA Shelf (scan + inventaire)
- `outcome_observations` et **boucle d'apprentissage branchée**
- Archétypes + cohortes k-anonymes
- Note par archétype (suppression de la note globale)
- Wash Day OS + timeline coiffure protectrice
- Recherche sémantique + détection de conflit de routine
- Routine Builder → panier
- Réassort prédictif

**Critère de sortie :** ≥ 30 % des utilisateurs actifs ont un Shelf ; la boucle modifie réellement au moins une recommandation par utilisateur par mois ; les cohortes affichent des notes par archétype.

### NIVEAU 3 — INTELLIGENCE (10-18 mois)
*Le moteur devient un avantage.*

- Diagnostic photo **encadré** (aide beauté, AIPD préalable)
- Fiches ingrédient publiques + pages SEO générées à grande échelle
- Loyalty par progression + récompense des comportements non-marchands
- Beauty Journey (narration de l'évolution)
- Abonnement KURLA+
- i18n + devises + TVA + filtrage réglementaire par juridiction
- Recherche visuelle + scan code-barres

**Critère de sortie :** ≥ 100 000 URLs indexées ; KURLA+ > 3 % de conversion des actifs ; ouverture d'un second marché linguistique.

### NIVEAU 4 — ECOSYSTEM (18-30 mois)
*Le réseau se referme.*

- Trust Score pros (identité, diplôme, vérification)
- Réservation + paiement de prestation
- Co-signature professionnelle
- Espace pro : dossiers clients partagés + abonnement KURLA Pro
- Programme experts / créateurs, rémunéré au résultat
- **KURLA Intelligence B2B** : Texture Gap Report
- Application mobile

**Critère de sortie :** ≥ 500 pros vérifiés actifs ; le B2B représente > 10 % du revenu ; au moins un contrat marque signé.

### NIVEAU 5 — GLOBAL PLATFORM (30 mois +)
*L'infrastructure.*

- API publique catalogue + scoring
- Tests produits ciblés pour les marques
- 5+ marchés, catalogues régionaux, paiements locaux
- Place de marché créateurs
- Partenariats distributeurs et salons

**Critère de sortie :** KURLA est cité comme source par les formulateurs. C'est le seul indicateur qui compte.

---

## K. LES 20 ACTIONS PRIORITAIRES

| Rang | Action | Impact | Effort | Pourquoi maintenant |
|---|---|---|---|---|
| 1 | **Disclosure IA art. 50(1)** | Critique | XS | Applicable depuis le 2 août 2026. 15 M€ / 3 % CA. |
| 2 | **Retirer `MOCK_PROS` et l'UGC fictif du parcours public** | Critique | XS | Faux avis, fausses adresses, faux « verified ». Risque immédiat. |
| 3 | **Corriger les 2 contradictions de marque** (bicarbonate, « éclaircissants ») | Fort | XS | Incohérence visible avec le référentiel éditorial. |
| 4 | **Exécuter les 17 tests Phase 2 contre une vraie instance Supabase** | Critique | S | La RLS n'est pas vérifiée. C'est le cœur de la sécurité. |
| 5 | **Créer la table `ingredients` + `product_ingredients`** | **Fondateur** | L | Sans ça, ni graphe, ni MOAT, ni B2B. |
| 6 | **Normaliser les vocabulaires** (concerns, textures, objectifs) | Fondateur | M | `TEXT[]` libre = données mortes. |
| 7 | **Brancher `routine_feedback` sur le moteur** | **Fondateur** | M | La boucle d'apprentissage est le MOAT. |
| 8 | **Rendu serveur / prérendu** | Critique | L | 1 URL indexable aujourd'hui. Bloque toute la stratégie contenu. |
| 9 | **Exporter / supprimer ses données en 1 clic** | Fort | S | Conformité + argument de confiance. |
| 10 | **Archétypes + cohortes k-anonymes** | Fondateur | M | Condition de toute statistique communautaire légale. |
| 11 | **KURLA Shelf** | **Différenciant** | L | La meilleure donnée d'usage du marché. |
| 12 | **Note par archétype** (supprimer la note globale) | Différenciant | M | Un 4,6/5 global est une information fausse. |
| 13 | **Wash Day OS** | Différenciant | M | Le modèle AM/PM est structurellement faux pour le texturé. |
| 14 | **Timeline coiffure protectrice** | Différenciant | S | Impact sanitaire réel, aucun concurrent. |
| 15 | **Recherche sémantique** | Fort | M | « routine crépus secs < 50 € » doit fonctionner. |
| 16 | **Détection de conflit de routine** | Fort | M | KURLA peut aujourd'hui recommander des doublons. |
| 17 | **Unifier le triage médical dans `guardrails.ts`** | Fort | S | Deux listes divergentes ; phrases exactes = trous de couverture. |
| 18 | **Découper `server.ts` et `serverDb.ts`** | Fort | L | 9 000 lignes dans 2 fichiers avant d'ajouter 50 fonctionnalités. |
| 19 | **Réassort prédictif** | Fort | S | Pilier de rétention chez Ulta ; les notifications existent déjà. |
| 20 | **Trust Score pros + co-signature** | Différenciant | L | Le pont IA → humain, et la raison d'adopter pour les pros. |

**Séquence recommandée :** 1-4 immédiatement (semaines 1-2) · 5-8 en parallèle (mois 1-4) · 9-16 (mois 3-10) · 17-20 au fil de l'eau.

### K.1 Sur l'action n°5 : ne pas repartir de zéro

Construire un graphe d'ingrédients à la main prendrait des années. Il existe des bases INCI commerciales prêtes à l'emploi — par exemple INCIDB, qui expose un schéma relationnel `brands` / `products` / `ingredients` / `product_ingredients` (≈ 19 800 produits, ≈ 44 800 composés INCI canoniques, ≈ 6 000 marques, ≈ 324 000 mappings), avec catégories fonctionnelles CosIng et allergènes MoCRA, sous licence ODbL et à un prix d'entrée très bas.

**Conséquence stratégique importante :** la donnée brute d'ingrédients n'est **pas** le MOAT — elle est achetable par n'importe qui. Le MOAT est la **couche que personne ne peut acheter** : le niveau de preuve par ingrédient *sur cheveux texturés et peaux riches en mélanine*, et les observations de résultat. Il faut donc acheter/licencier la base, et investir tout l'effort sur la couche différenciante.

---

## L. L'ARCHITECTURE PRODUIT FINALE

### L.1 Le système

```
                        ┌─────────────────────────────┐
                        │      KURLA INTELLIGENCE     │
                        │  moteur hybride : règles    │
                        │  explicables + poids appris │
                        └──────────────┬──────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
     ┌────────▼────────┐      ┌────────▼────────┐      ┌────────▼────────┐
     │  KURLA PROFILE  │      │  KURLA GRAPH    │      │  KURLA TRUST    │
     │  le dossier     │      │  la connaissance│      │  la vérification│
     ├─────────────────┤      ├─────────────────┤      ├─────────────────┤
     │ Hair ID         │      │ ingredients     │      │ catalogue       │
     │ Skin ID         │      │ product_ingred. │      │  (7 validations)│
     │ Shelf (invent.) │      │ evidence A-D    │      │ pros vérifiés   │
     │ Objectifs       │      │ incompatibilités│      │ co-signatures   │
     │ Historique      │      │ archétypes      │      │ claims validées │
     │ Consentements   │      │ réglementations │      │                 │
     └────────┬────────┘      └────────┬────────┘      └────────┬────────┘
              │                        │                        │
              └────────────────────────┼────────────────────────┘
                                       │
                        ┌──────────────▼──────────────┐
                        │      KURLA OUTCOMES         │
                        │  outcome_observations       │
                        │  (usage × ingrédient ×      │
                        │   archétype × durée ×       │
                        │   résultat × abandon)       │
                        └──────────────┬──────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
     ┌────────▼────────┐      ┌────────▼────────┐      ┌────────▼────────┐
     │   DÉCOUVRIR     │      │    AGIR         │      │   PROGRESSER    │
     ├─────────────────┤      ├─────────────────┤      ├─────────────────┤
     │ Recherche sém.  │      │ Routine Builder │      │ Beauty Journey  │
     │ Scan / visuel   │      │ Wash Day OS     │      │ Tracker         │
     │ Fiches ingréd.  │      │ Panier 1 clic   │      │ Feedback        │
     │ Pages générées  │      │ Réservation pro │      │ Réassort        │
     └────────┬────────┘      └────────┬────────┘      └────────┬────────┘
              │                        │                        │
              └────────────────────────┼────────────────────────┘
                                       │
                        ┌──────────────▼──────────────┐
                        │      KURLA COMMUNITY        │
                        │  cohortes k-anonymes        │
                        │  « les profils comme toi »  │
                        └──────────────┬──────────────┘
                                       │
                        ┌──────────────▼──────────────┐
                        │      KURLA B2B              │
                        │  Texture Gap Report · API   │
                        │  (agrégats uniquement)      │
                        └─────────────────────────────┘
```

### L.2 Les sept changements de modèle de données

1. **`ingredients`** (entité) + **`product_ingredients`** (rang INCI, rôle, concentration déclarée) — remplace `ingredients TEXT[]`.
2. **`ingredient_evidence`** (fonction, niveau A-D, sources, populations étudiées) — matérialise en base ce qui n'existe que dans le prompt IA.
3. **`ingredient_incompatibilities`** — alimente la détection de conflit.
4. **Vocabulaires contrôlés** pour `concerns`, `hair_types`, `skin_types`, `goals`, `textures` — remplace les `TEXT[]` libres.
5. **`user_products`** (le Shelf) : possédé / en cours / terminé / abandonné + raison + date.
6. **`outcome_observations`** : produit × ingrédient × archétype × durée × résultat. Remplace l'usage actuel de `routine_feedback`.
7. **`archetypes`** + règle de k-anonymité appliquée à toute agrégation.

### L.3 Les trois principes non négociables

1. **KURLA ne devine pas.** `null` plutôt qu'une invention. C'est déjà dans le code ; ça doit devenir la marque.
2. **Toute recommandation est explicable en une phrase.** Si le moteur ne peut pas justifier, il ne recommande pas.
3. **La donnée personnelle n'est jamais vendue.** Seuls les agrégats k-anonymes alimentent le B2B.

---

## SYNTHÈSE EN TROIS PHRASES

KURLA a construit, sans le savoir, la partie la plus difficile et la moins différenciante — l'intégrité commerciale — et n'a pas construit la partie qui la rendrait irremplaçable : le graphe de connaissances et la donnée de résultat.

Le MOAT n'est pas l'IA (que tout le monde peut acheter) mais **la donnée d'efficacité par ingrédient sur les cheveux texturés et les peaux riches en mélanine**, croisée avec un dossier utilisateur longitudinal que personne ne peut migrer.

Trois chantiers conditionnent tout le reste, et ils sont tous dans le code aujourd'hui : **normaliser les ingrédients en entités**, **brancher le feedback sur le moteur**, **passer au rendu serveur**.

---

## ANNEXE — CE QUI RESTE À VÉRIFIER

Points que je n'ai **pas** pu vérifier dans cet environnement, à traiter avant toute décision de production :

- Les 17 vérifications Phase 2 (auth/RLS) : **0 exécutées**, `Supabase Configured=false`. Aucune instance réelle disponible ici.
- Le comportement réel des webhooks Stripe : les tests tournent en simulation.
- Le rendu réel des 37 pages dans un navigateur : l'analyse est statique.
- La conformité RGPD/AI Act : ce document identifie les risques, il ne constitue pas un avis juridique.
- Node v20.20.2 dans cet environnement contre `engines: node >=22.0.0` dans `package.json` : les tests passent avec des avertissements EBADENGINE, mais la cible de production doit être validée sur Node 22.
