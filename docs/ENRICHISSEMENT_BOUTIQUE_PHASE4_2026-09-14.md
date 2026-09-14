# Enrichissement boutique — phase 4 (2026-09-14)

**Objectif** : intégrer dans la base KURLA les produits candidats réels identifiés pendant
le travail de sourcing (phases 1–3), **sans rien publier** et sans toucher aux 16 fiches
cibles existantes.

## 1. Principe de sécurité (intacte)

- 26 fiches créées en **`catalog_status = 'draft'`** + **`is_active = false`** →
  **jamais publiquement listables** : la garde `isCatalogPubliclyListable`
  (`src/lib/catalogTruth.ts:357`) exige `catalog_status = 'published'` **et**
  `is_active = true` **et** preuves minimales. Les 2 conditions sont donc fermées.
- **Aucune migration** nécessaire : `draft` est un statut existant du schéma.
- Statuts de vérification **honnêtes** sur chaque fiche :
  `ingredient_verification_status = not_provided` (INCI non obtenue),
  `claims_validation_status = not_provided` (allégations non vérifiées),
  `brand_verification_status = not_provided` (marque connue, autorisation non obtenue).
- `supplier_authorization_status = not_contacted` + note `supplier_authorization_note`
  précisant l'email préparé (numéro de la phase 3) — le suivi fournisseur suit le
  cycle existant `not_contacted → contacted → authorized/refused`.
- **Prix** : uniquement des prix publics constatés cette session (pharmacies FR, sites
  officiels, revendeurs FR). Colonne `price` NOT NULL respectée — **aucune fiche sans
  prix constaté**, aucun prix inventé, aucun prix 0.
- Les 16 fiches cibles `peau-ess-001..016` sont **inchangées** (vérifié).

## 2. Les 26 fiches créées (prefix `src-`)

| id | Marque | Produit | Prix € | Besoin(s) | Canal B2B visé (email phase 3) |
|---|---|---|---|---|---|
| src-lrp-001 | La Roche-Posay | Anthelios Fluide Invisible SPF50+ — 40ml | 22,90 | #30 SPF invisible | n°10 grosiste dermo |
| src-lrp-002 | La Roche-Posay | Hyalu B5 Sérum — 30ml | 31,99 | #2/#24 hydratation | n°10 |
| src-lrp-003 | La Roche-Posay | Hyalu B5 Sérum Yeux — 15ml | 23,03 | #18 cernes | n°10 |
| src-lrp-004 | La Roche-Posay | Retinol B3 Sérum — 30ml | 41,30 | #34/#37 (écarté #50 grossesse) | n°10 |
| src-lrp-005 | La Roche-Posay | Pure Vitamin C12 Sérum — 30ml | 42,10 | #12/#36/#37 vitamine C | n°10 |
| src-lrp-006 | La Roche-Posay | Anthelios Stick Lèvres SPF50+ — 4,7g | 9,90 | #43 bâtonnet SPF lèvres | n°10 |
| src-lrp-007 | La Roche-Posay | Cicaplast Baume B5+ — 100ml | 13,39 | #4/#7/#25 barrière | n°10 |
| src-euc-001 | Eucerin | UreaRepair Plus Émollient 10% Urée — 400ml | 16,99 | #40/#41 urée 10–20 % | n°10 |
| src-euc-002 | Eucerin | Sun Pigment Control Gel-Crème Teinté SPF50+ — 50ml | 12,59 | #15/#16 SPF teinté anti-taches | n°10 |
| src-avene-001 | Avène | Solaire Stick Lèvres SPF50+ — 3g | 6,59 | #43 | n°10 |
| src-bio-001 | Bioderma | Créaline Huile Micellaire — 150ml (identification corrigée — §7.3) | 24,15 (cf. §7.3) | #45 démaquiller | n°10 |
| src-ducray-001 | Ducray | Kelual DS Shampoing Antipelliculaire — 100ml | 11,89 | #44 cuir chevelu | n°10 |
| src-klorane-001 | Klorane | Shampoing Antipelliculaire — 200ml | 5,99 | #44 cuir chevelu | n°10 |
| src-isdin-001 | Isdin | Eryfotona Ageless Teinté SPF50 — 100ml | 91,19 | #15 SPF teinté oxydes de fer | n°10 (prix à confirmer) |
| src-isdin-002 | Isdin | Stick Invisible SPF50 | 14,99 | #33 réapplication | n°10 |
| src-loreal-001 | L'Oréal Paris | True Match Fond de Teint — 30ml | 18,99 | #47 teintes 8+ (48 teintes) | n°10 |
| src-inoya-001 | IN'OYA | SUN'OYA Fluide Solaire SPF50+ — 50ml | 18,90 | #30/#10 SPF peaux noires (FR) | n°7 |
| src-weleda-001 | Weleda | Déodorant Solide 24H Sensitive — 50g | 11,50 | #42 déo sans alcool | n°8 |
| src-weleda-002 | Weleda | Lait Corps Nourrissant à l'Argousier — 200ml | 15,00 | #41 corps | n°8 |
| src-cosmo-001 | Cosmo Naturel | Lait Corps au Karité Bio — 500ml | 9,67 | #41 corps karité FR bio | n°9 |
| src-cosrx-001 | COSRX | BHA Blackhead Power Liquid | 18,99 | #13/#19/#21 BHA | n°1–2 K-beauty |
| src-cosrx-002 | COSRX | Acne Pimple Master Patch — 24 patchs | 5,79 | #22 picking (patch occlusif) | n°1–2 |
| src-isntree-001 | Isntree | Chestnut BHA 2% Clear Liquid — 100ml | 21,95 | #13/#19 BHA 2 % | n°1–2 |
| src-to-001 | The Ordinary | Azelaic Acid Suspension 10% — 30ml | 13,50 | #9/#16/#27 azélaïque | n°10 (à identifier) |
| src-to-002 | The Ordinary | Niacinamide 10% + Zinc 1% — 30ml | 13,50 | #11/#23 niacinamide | n°10 (à identifier) |
| src-inkey-001 | The INKEY List | Super Solutions Sérum Azélaïque 10% — 30ml | 18,40 | #9/#27 azélaïque | n°10 (à identifier) |

Champs communs : `badges = [sourcing en cours]`, `source_supplier = « Candidat — [marque] »`,
`supplier_id = NULL` (les fournisseurs ne sont pas encore des lignes `suppliers` vérifiées —
table vide aujourd'hui, on ne crée pas de fournisseur fictif).

## 3. CSV latéral sur les 100 lignes du registre

`docs/sourcing/MARQUES_CANDIDATES_100_PRODUITS_2026-09-14.csv` — **fichier additif**,
indexé sur les refs `PEAU-001..100` du registre du 2ᵉ agent (que l'on ne réécrit pas).
**46 mappings**, **35/100 refs** avec au moins un candidat à prix public constaté.
Les 65 refs restantes restent **sans candidate** (pas de prix public constaté cette
session → aucune donnée inventée). Colonne `variante` documente chaque écart de
concentration/texture par rapport au cahier des charges. 2 shampoings cuir chevelu
(src-ducray-001, src-klorane-001) portés en lignes `SANS-REF` (le registre peau du
2ᵉ agent ne couvre pas le cuir chevelu).

## 4. En attente de prix (pas de fiche créée)

Ces produits candidats sont identifiés mais **sans prix public constaté cette session**
→ aucune fiche tant qu'un prix ne sera pas observé (règle `price` NOT NULL honnête) :
CeraVe Crème hydratante, CeraVe Crème Yeux, Eucerin Anti-Pigment Correcteur,
Avène Cicalfate+, COSRX Snail 96 Mucin.

## 5. Avant toute publication d'une fiche (checklist, rien n'est publié)

1. Réponse fournisseur (email phase 3 envoyé) → `supplier_authorization_status = authorized`
   + ligne `suppliers` + document d'autorisation dans `supplier_documents`.
2. INCI complète obtenue → `ingredients`/`inci` + `ingredient_verification_status = verified`.
3. Dossiers CPNP / personne responsable UE vérifiés pour le marché visé.
4. Prix d'achat revendeur constaté (le prix public reste une donnée de référence, pas un prix de vente).
5. Visuel de la fiche + `images_validation_status`.
6. Puis seulement : `catalog_status = published` + `is_active = true` (garde
   `isCatalogPubliclyListable` re-vérifiée automatiquement).

## 5bis. Visibilité boutique — « Bientôt disponible » (demande de l'utilisateur, 14/09)

« En attendant les fournisseurs, les produits doivent apparaître dans la boutique. »
Ils **apparaissent** — sans être **vendables** (cette ligne reste fermée : pas
d'autorisation fournisseur, pas d'INCI vérifiée, pas d'enregistrement UE, pas de
visuels ; la garde `isCatalogPubliclyListable` continue de les refuser au
catalogue achetable).

- **Route publique** `GET /api/produits/avenir` (server.ts, à côté de
  `/api/peau/gamme`) : sert les fiches `src-*` **tant qu'elles sont en brouillon**
  (`catalog_status='draft'` + préfixe `src-`). Le jour où une fiche est réellement
  publiée, elle sort de cette liste d'elle-même et entre au catalogue.
- **Projection client minimale** (`getComingSoonProducts`, `catalogStore.ts`) :
  marque, nom, prix public constaté (jamais un prix de vente), étape de routine,
  sous-catégorie. Aucune note interne, aucun email fournisseur, aucun statut
  d'autorisation n'est exposé.
- **UI** (`BoutiquePage.tsx`) : section « Bientôt disponible — sourcing en cours »
  (vue « tous » et « peau ») : cartes marque + produit + prix public constaté
  « non prix de vente » + bouton **Non vendable** (structurellement désactivé).
  Pas de panier, pas de comparateur, pas de schéma Product — sur le même modèle
  que la section Kits.
- Fixtures d'inventaire régénérées (route + méthode store) ; suite 156 PASS.

## 6. Garanties vérifiées à la création

- `published` = **63** avant et après insertion (inchangé).
- `draft` : 16 → 42 (+26). `unavailable` : 17 (inchangé).
- Les 26 fiches : `is_active = false`, `brand_verification_status = not_provided`,
  prix entre 5,79 € et 91,19 € (tous constatés).
- Site prod : aucune fiche nouvelle visible (les drafts ne sont ni listés, ni vendus,
  ni référencés comme publia — la route gamme cible sert toujours les 16 fiches cibles).

## 7. Visuels officiels — 14/09/2026 (suite)

Consolidation demandée : chaque fiche `src-*` obtient le visuel officiel de la
marque, tel qu'il figure sur la plateforme de l'entreprise.

### 7.1. Packshots récupérés (25/26)

- **25 packshots** téléchargés depuis les plateformes officielles des marques
  (La Roche-Posay FR/ES, Eucerin, Avène, Bioderma, Ducray, Klorane, IN'OYA,
  L'Oréal, ISDIN, Weleda, COSRX, The Ordinary, INKEY List, ISNTREE),
  compressés (≤ 1000 px, ≤ ~90 Ko chacun, 960 Ko au total) et servis par le
  site depuis **`public/images/sourcing/<id>.jpg`**.
- Chaque produit : `image_url` → packshot, ligne `product_images`
  (`image_type='primary'`) avec **`source_note`** (plateforme + date de
  vérification 14/09/2026) et **`ownership_status='unverified'`**.

### 7.2. Statut de propriété — correction de l'état hérité fictif

Les 26 fiches héritaient du template de création `images_validation_status =
'verified'` + `image_ownership_status = 'brand_provided'` avec un placeholder
Unsplash générique — un état **fictif** (aucune marque n'a fourni ni validé de
visuel). Tout a été corrigé :

- **25 fiches** : `images_validation_status='pending'`,
  `image_ownership_status='unverified'` (visuel officiel consté,
  autorisation de la marque non obtenue — la garde de publication reste
  fermée tant que l'autorisation n'est pas formelle).
- **cosmo-001** : `images_validation_status='not_provided'`,
  `image_ownership_status='unverified'`, `image_url = NULL` (aucun visuel
  officiel n'existe), ligne d'audit `product_images.image_type='placeholder'`
  + note.

### 7.3. Flags issus de la vérification

- **cosmo-001 — pas d'image officielle** : « Lait Corps Nourrissant Karité
  Amande douce 500 ml » (EAN 3489940049503) est **absent de la plateforme
  cosmonaturel.fr** (vérifié le 14/09/2026 : recherches karité/lait/EAN,
  sondage d'identifiants, sitemaps). Le produit existe chez des distributeurs
  (ex. penntybio.com, 10,75 €, réf. NCO4950) — **visuel officiel à demander au
  fournisseur** (ajouté aux attentes de la phase 3).
- **bio-001 — identification corrigée** : le produit exact sur bioderma.fr est
  la **Créaline Huile Micellaire 150 ml** (gamme Créaline, PDP
  `/p/crealine-huile-micellaire`), et non « Sensibio Huile Micellaire 500 ml »
  (la gamme Sensibio regroupe les eaux micellaires). Fiche mise à jour : nom,
  slug (`src-bio-001-crealine-huile-micellaire`), prix public constaté
  **24,15 €** (LookFantastic, 14/09/2026 — 150 ml) ; l'ancien prix 11,99 €
  concernait la référence 500 ml erronée.
- **lrp-006** : la plateforme FR liste la version **4,7 g** (réf. p6756), la
  plateforme ES la version **9 ml** — même gamme ; le packshot retenu est la
  version ES. **Format à confirmer au sourcing.**

### 7.4. Garanties

- Non vendable : inchangé — aucune des 26 fiches n'est publiée, `is_active`
  reste `false`, la garde `isCatalogPubliclyListable` continue de les refuser.
- Publiés : inchangés par cette opération (69 = 63 initiaux + 6 kits de
  précommande ajoutés par un autre chantier entre-temps).
- La section boutique « Bientôt disponible » affiche désormais les packshots
  officiels (25). Affichage : champ `image` ajouté à la projection
  `getComingSoonProducts` (catalogStore.ts) + bloc visuel `object-contain`
  dans `SectionAvenir` (BoutiquePage.tsx). **cosmo-001** : `image_url =
  NULL` → la carte affiche le marqueur « Visuel officiel en attente du
  référencement fournisseur » (jamais d'image usurpée).
- Garde anti-usurpation : la projection ne sert qu'un visuel hébergé par
  KURLA (`/images/sourcing/…`) via `comingSoonImage()` (catalogStore.ts) ;
  toute URL de type placeholder/illustration (unsplash, etc.) — y compris
  la ligne d'audit `product_images` d'une fiche sans visuel — est écartée.
- Fixture `tests/fixtures/store_api_inventory.json` régénérée
  (`KURLA_UPDATE_FIXTURE=1` + diff vérifié) : +`comingSoonImage/0`,
  329 méthodes, aucune retirée.

## 8. Phase de test — fiches en boutique + gardes-fous administrés (consigne 14/09)

> Consigne : « pour la phase de teste, je voudrais que ces produits apparaissent
> dans la boutique. Dans le dashboard admin, il faut prendre le soin de mettre
> ces gardes fou : ① autorisation fournisseur écrite, ② INCI complète vérifiée,
> ③ CPNP + personne responsable UE, ④ visuel autorisé, avec un bouton dépublier
> le produit. »

Le plan est conservé (26 fiches visibles non vendables) ; la phase de test y
ajoute **la visibilité en boutique** et **l'administration des 4 gardes-fous**.

### 8.1. Boutique — mode test `?test=1`

Les 26 fiches `src-*` passent en fiches test (mécanisme existant de l'autre
chantier, migration `20260926000000`), sans toucher au shop réel :

- `is_test_listing = true`, `is_active = true`, `catalog_status = 'published'`,
  `test_listing_note` documentant la phase. **Appliqué en production après le
  déploiement du code** (l'ordre est important : la section « Bientôt
  disponible » est servie par du code).
- Porte test `isTestListableProduct` (catalogTruth) : fiche test + publiée +
  active + marque + visuel → servie en mode test ; la porte réelle
  `isCatalogPubliclyListable` reste fermée (preuves non vérifiées) — aucune des
  26 fiches n'est vendable, panier fermé, prix « à contractualiser ».
- **Boutique réelle : 63 fiches inchangées.** Mode test : 63 + 6
  (`peau-test-*` existantes) + 26 = **95 fiches**, 32 fiches test.
- Section « Bientôt disponible » **conservée** : `getComingSoonProducts`
  accepte désormais les fiches `src-*` brouillon **ou** publiées+drapeau test
  (catalogStore) ; en mode test, `SectionAvenir` (BoutiquePage) exclut les
  fiches déjà dans la grille — pas de doublon ; en boutique réelle la section
  retrouve ses 26 fiches.
- **cosmo-001** : plus d'image usurpée — le repli composite
  `image_url || galerie[0]` de `getProducts` exclut désormais les lignes
  `product_images` de type `placeholder` (l'audit « pas d'image officielle »
  ne pouvait plus réapparaître en visuel). La carte affiche le marqueur
  « Image en attente de validation ».

### 8.2. Dashboard admin — les 4 gardes-fous nommés + Dépublier

Nouveau panneau « Phase de test — gardes-fous des fiches sourcing », en tête
du tab **Fiches peau** du dashboard (workspace peau), au-dessus du panneau de
publication TEST contrôlée existante :

- **`GET /api/admin/catalog/test-phase`** (catalogGovernance.ts, admin,
  rate-limité, scopé par espace) → `getTestPhaseGatesReport` (catalogStore) :
  périmètre = préfixes `src-*` + `peau-test-*`, par fiche : les 4 gardes
  nommés (état + détail lisible) + statut + drapeau test + visuel + prix public
  constaté.
- Le calcul est **pur** : `evaluateTestPhaseGates`
  (`src/lib/testPhaseGates.ts`), contexte CPNP injecté depuis le fournisseur
  rattaché (`getSupplierCompliance`).
- **①** `supplier_authorization_status = 'authorized'` **et date** (cohérence
  exigée par la contrainte `produits_authorization_date_coherence`).
- **②** `ingredient_verification_status = 'verified'` **et composition non
  vide**.
- **③** conformité cosmétique (`evaluateCosmeticCompliance`) : CPSR +
  notification CPNP + Personne Responsable UE tenus, non expirés, fournisseur
  vérifié. **Règle fail-closed du garde-fou** : une fiche non accessoire/kit
  dont la composition n'est pas reçue n'est pas exemptée — le verdit
  « non cosmétique » de l'heuristique (composition inconnue) est refusé et le
  garde reste au rouge, nominativement.
- **④** `image_ownership_status ∈ (brand_provided, licensed)` **et**
  `images_validation_status = 'verified'`.
- **Bouton « Dépublier »** par fiche publiée → `PATCH
  /api/admin/catalog/:id/status {status:'draft'}` (route existante, aucune
  condition sur la dépublication) : la fiche sort immédiatement du mode test
  et réapparaît en « Bientôt disponible ». Confirmation explicite avant
  l'action.
- **4/4 verts ≠ publiable** : le panneau le dit en permanence — la
  publication réelle exige en plus la porte complète (statuts vérifiés, stock,
  pays, TVA, truth layer) et la garde d'écriture `updateCatalogStatus` (422
  nominatif) reste la source de vérité.

### 8.3. Garanties du chantier

- Fichiers : `src/lib/testPhaseGates.ts` (nouveau, pur),
  `src/lib/db/catalogStore.ts` (mapping `supplierAuthorization*`, repli image
  sans placeholder, `getComingSoonProducts` étendu, `getTestPhaseGatesReport`),
  `src/server/routes/catalogGovernance.ts` (route test-phase),
  `src/components/TestPhaseGatesPanel.tsx` (nouveau),
  `src/pages/AdminDashboardPage.tsx` (montage tab Fiches peau),
  `src/pages/BoutiquePage.tsx` (dédoublonnage SectionAvenir),
  `tests/kurla_test_phase_gates.test.ts` (nouveau, câblé dans `npm test`),
  fixtures régénérées (admin 74→75 routes ; store 329→330 méthodes).
- Banc : 10 contrats — 4 gardes échouent nommément sur une fiche fresh ;
  4/4 verts sur fiche complète ; chaque garde échoue indépendamment (+ cascade
  fail-closed INCI vide → CPNP non opposable) ; CPNP non applicable sur
  accessoire ; porte test ouverte / porte réelle fermée sur la même fiche ;
  brouillon test jamais montré ; « Bientôt disponible » = draft + publiées
  drapeau test, jamais un produit réel ; Dépublier = sortie mode test + retour
  section avenir ; rapport admin = périmètre + 4 gardes.
- Aucune donnée réglementaire inventée : les gardes lisent des champs dont
  l'état réel est 14/09/2026 `not_contacted` / `not_provided` /
  `unverified` — tout est donc au rouge en production, c'est le point.
- **Aucun email fournisseur n'a été envoyé** (boîte + mandat + SIREN toujours
  manquants) ; les 4 gardes resteront au rouge jusqu'aux réponses réelles.
