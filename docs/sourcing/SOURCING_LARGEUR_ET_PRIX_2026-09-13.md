# Sourcing élargi — largeur de gamme et bas prix
**KURLA Beauty · 13 septembre 2026 · suite de `SOURCING_FOND_FR_EU_MONDE_2026-09-13.md`**

---

## 0. Deux demandes, deux réponses différentes

La commande mélange deux choses qui n'ont ni la même difficulté ni la même limite.

| Demande | Nature | Réponse |
|---|---|---|
| **« tout type de produits »** | problème de **taxonomie** | soluble — mais d'abord dans le code, pas chez les fournisseurs |
| **« à n'importe quel prix »** | problème **juridique** | il existe un **plancher légal**. On peut l'atteindre, pas le franchir |

Traiter les deux comme un seul problème d'approvisionnement produirait un catalogue large, pas cher, et illégal. C'est précisément le piège de ce secteur.

---

## 1. La largeur : le blocage n'est pas chez les fournisseurs

**Mesure du code** (`src/lib/catalogManagement.ts`, `CATALOG_CATEGORIES`) : le site ne déclare que **2 départements** et **28 sous-catégories**.

| Département | Sous-catégories |
|---|---|
| **cheveux** (12) | Ondulés · Bouclés · Frisés · Crépus · Locks · Tresses · Extensions · Perruques · Colorés · Défrisés · Barbe · Cuir chevelu |
| **peau** (16) | Sèche · Grasse · Mixte · Sensible · Imperfections · Acné · Taches · Hyperpigmentation · Cicatrices · Rasage · Poils incarnés · Protection solaire · Corps · Lèvres · Mains · Pieds |

**Mesure de la base** — 6 valeurs de `category` existent réellement : `accessoires`, `cheveux`, `enfants`, `hommes`, `kits`, `peau`. Trois d'entre elles (`accessoires`, `kits`, `enfants`, `hommes`) **ne sont pas dans `CATALOG_CATEGORIES`**.

**Conséquence directe** : il n'existe **aucun département** pour

- maquillage / teint
- parfum
- ongles
- hygiène (savon, déodorant, dentifrice)
- bébé / enfant en tant que département
- bain & corps hors « peau »
- accessoires en tant que département

👉 **Sourcer 500 produits pas chers ne sert à rien tant qu'ils n'ont nulle part où vivre.** La première action de largeur est une action de code, pas d'achat. C'est un point que je n'avais pas mesuré hier et qui invalide une partie de mon raisonnement précédent : je parlais de « gammes manquantes » comme d'un problème d'approvisionnement, alors que le plafond est dans la taxonomie.

### Bonne nouvelle mesurée au passage

La gamme peau **n'est pas absente** : la base contient déjà **20 fiches `peau`** réparties en 7 sous-catégories (Traitement 4 · Protection Solaire 4 · Éclat & Uniformité 4 · Hydratation 4 · Nettoyage 2 · Masques 1 · Exfoliation 1). Elles sont en brouillon, pas inexistantes. Il manque `accessoires` et `kits` comme départements, et tout le reste.

---

## 2. Le plancher légal du prix

### Ce qu'un cosmétique doit porter avant d'être vendu en France

Règlement (CE) 1223/2009 — une personne responsable dans l'UE, un dossier d'information produit conservé **10 ans** (art. 11), une évaluation de sécurité par une personne qualifiée (art. 10), une notification **CPNP** avant mise sur le marché (art. 13), l'étiquetage de l'art. 19 (DDM ou PAO, INCI, lot), les BPF ISO 22716 (art. 8), la cosmétovigilance.

**Ces coûts existent quelle que soit la taille du produit.** Ils sont portés par la personne responsable — donc, selon le palier, par le fournisseur ou par vous.

### Les trois fausses économies

| Route | Prix apparent | Coût réel |
|---|---|---|
| **Contrefaçon de marque** | très bas | **délit**. Code de la propriété intellectuelle : saisie, dommages-intérêts, pénal |
| **Éclaircissants dépigmentants** | très bas | hydroquinone **interdite** (annexe II entrée 1339), mercure **interdit** (Minamata). Produit non cosmétique = médicament. Retrait-rappel à votre nom |
| **Import parallèle hors UE** | bas à l'unité | vous devenez **personne responsable** (art. 4.5) : DIP + CPSR + CPNP + étiquetage, **par référence** |

### ⚠️ Le piège que j'ai trouvé en cherchant le bas prix

Un grossiste européen affiche, parmi d'autres : **rouge à lèvres Chanel à 23,90 €** (barré 38 €), **Cabotine de Grès 100 ml à 9,90 €** (barré 67,50 €), **palette Huda Beauty à 9,90 €** (barré 29,95 €), avec la mention « pas de minimum de commande, achat à l'unité, expédition en marque blanche ».

**Un rouge à lèvres Chanel à 23,90 € en gros n'existe pas.** Ces écarts ne sont pas des fins de série : ce sont des indicateurs de contrefaçon ou de circuit non autorisé. Le mot « prix cassé » sur une marque de luxe est le signal, pas l'argument.

**Règle de sourcing n° 2** : aucun produit de **marque de luxe** à un prix qui s'écarte fortement du prix public conseillé. Le bas prix légal se trouve sur des **marques de distributeur et des marques propres**, jamais sur du Chanel.

### Ce qui est réellement atteignable — prix constatés

Voici le bas prix **légal**, c'est-à-dire des produits **fabriqués dans l'UE** par un fabricant identifié, vendus par un grossiste européen établi. Prix relevés le 13/09/2026 sur les sites des fournisseurs, tels qu'affichés :

| Produit | Prix affiché | Fournisseur |
|---|---|---|
| Masque tissu concombre 22 g (IDC Institute) | **0,98 €** | grossiste-parfum-generique.com |
| Masque pieds camomille 40 g (IDC Institute) | **1,33 €** | idem |
| Masque mains camomile 40 g (IDC Institute) | **1,33 €** | idem |
| Déodorant roll-on coco (The Fruit Company), carton de 12 | **1,57 €/unité** | grossiste-en-live.com |
| Lotion corps sorbet mangue/fraise 250 ml (IDC Institute) | **1,85 €** | grossiste-parfum-generique.com |
| Set beauté « Radiant Skin » Bright Duo (IDC Institute) | **3,22 €** | idem |
| Crème corps 400 ml « Berry Bloom » (Sence), lot de 6 | **4,40 €/unité** — 26,40 € HT | grossiste-de-france.fr |
| Coffret brumes corporelles 4 pièces (IDC Institute) | **7,50 € HT** | idem |

**C'est ça, le plancher réaliste : entre 1 € et 5 € l'unité, sur des produits d'une société établie en Espagne, donc déjà conformes.** Ce ne sont pas des prix de revient garantis ni des engagements contractuels — ce sont des prix affichés publiquement, à confirmer en compte pro.

---

## 3. Fournisseurs élargis, classés par palier de prix

### 3.1 Palier « entrée de gamme » — 1 à 5 € l'unité

C'est ici que se joue la promesse « moins cher ». Tous sont **fabriqués dans l'UE**.

| Fournisseur | Pays | Ce qu'il couvre | Vérifié |
|---|---|---|---|
| **IDC Institute** (via ses grossistes) | 🇪🇸 | Skincare, corps, maquillage, masques tissu, bombes de bain, gel douche, **outils** (peignes, miroirs, ciseaux ongles, blenders, gua sha), soins homme | ✅ **4 grossistes distincts** le référencent |
| **Grossiste Beauté IDC** (`grossiste-beaute-idc.com`) | 🇪🇸 | **1 500 références**, –10 % revendeurs, vernis, masques, patchs, parfumerie, accessoires, peignes, huiles, savons, shampoings, déodorants. Base & primer **1,19 €/unité** par pack de 24 | ✅ site |
| **Grossiste-en-live** (`grossiste-en-live.com`) | 🇪🇸 | Distributeur direct **Prady, Ambar, The Fruit Company**. Maquillage, parfum générique et équivalence, soins. **Livraison gratuite dès 100 € pour la France et l'Europe** | ✅ site |
| **Kcosmétiques** (`grossiste-maquillage-yes-love.com`) | 🇫🇷 | Grossiste beauté, **boutiques à Paris et Lyon**, 44 réf. IDC Institute. Tarifs visibles après connexion | ✅ site |
| **Grossiste-de-France** (`grossiste-de-france.fr`) | 🇪🇺 | IDC Institute + Sence, **livraison dans toute l'Europe**, prix affichés HT | ✅ site |

**Pourquoi c'est la bonne piste** : IDC Institute est la marque d'**Aquarius Cosmetic, SLU** — C. Picapedrers 3, 08508 Les Masies de Voltregà (Barcelone), fondée en 1995, sociétés sœurs Magic Studio, Martinelia et AQC Fragrances, membre d'Amfori (`aquariuscosmetic.com`, +34 938 861 366, `info@aqc.es`).

⚠️ **Précision importante** : j'ai vérifié que la **société est établie dans l'UE**, pas qu'elle fabrique elle-même tous ses produits — la sous-traitance est probable et non documentée. Mais c'est le point qui compte juridiquement : une société établie dans l'UE qui met le produit sur le marché en porte la responsabilité (art. 4.3 et 4.4). **Dans les deux cas, KURLA est distributeur, pas personne responsable.** Aucun dossier réglementaire à monter, et un prix unitaire sous 2 €.

### 3.2 Palier « largeur sans stock » — la réponse à « tout produit »

| Plateforme | Modèle | Conditions vérifiées |
|---|---|---|
| **Ankorstore** (Paris) | Marketplace B2B, **20 000+ marques européennes dont 1 200 marques de beauté françaises** | **Minimum 100 € par marque**, franco de port 300 €, **paiement à 60 jours**, commande groupée multi-marques, **0 % de commission sur les réassorts depuis janvier 2026** |
| **Qudo Beauty** (Roumanie, `RO50381912`, +40 752 200 449) | Grossiste K-beauty, entrepôt en Roumanie | **1 800+ produits, 86+ marques**, **MOQ 300 € au total, aucun MOQ par référence**, port offert dès 500 €, catégories visage / cheveux / maquillage / parfums |
| **Nova Engel / Grupo Engel** (Espagne) | Dropship | 800+ marques, 30 000+ réf., API REST + CSV + XML, expédition anonyme, 24/48 h, dépôt 500 € |
| **Cosmetix Club** | Dropship maquillage | **sans MOQ** |

**Ankorstore est la pièce centrale de la largeur.** 1 200 marques de beauté françaises, un minimum à 100 € par marque, et 60 jours de délai de paiement : c'est le seul mécanisme identifié qui permette de **tester beaucoup de gammes sans immobiliser de trésorerie**. Et toutes ces marques étant européennes, les produits sont déjà sur le marché UE — vous restez distributeur.

**Qudo Beauty est la réponse au trou « soin du visage ».** Et surtout, c'est le seul fournisseur trouvé qui **répond par écrit à la bonne question** :

> « Each item comes with full EU compliance documentation, including **CPNP notification, INCI list, and Responsible Person (EU RP) information**. All products are officially registered in the European Cosmetics Portal (CPNP) upon import. »

⚠️ C'est **leur déclaration**, pas une vérification. Mais c'est exactement la preuve à exiger de tous les autres — et le fait qu'ils la formulent spontanément est un signal.

### 3.3 K-beauty — le raccourci vers la gamme peau

| Fournisseur | Pays | Marques |
|---|---|---|
| **EOLYS Beauté** | 🇫🇷 | Whamisa, Torriden, Beauty of Joseon, SKIN1004, COSRX. Plateforme B2B |
| **Kocosmetic / Bizdistribution** | 🇫🇷 créée 2021 | B2B `kocosmetic.fr`, relations directes laboratoires coréens |
| **BLACKETIQUE** | 🇫🇷 Groslay | Skincare coréenne + haircare ethnique, stock France |
| **Pibukare** | 🇫🇷 Boulogne-Billancourt 92 · 01 40 91 48 32 | 34 marques, entrepôt France, 48 h. ⚠️ **boutique B2C — programme B2B non vérifié** |
| **Skinorea** | 🇫🇷 Paris | Stock Paris |

**Attention spécifique à la K-beauty** : les produits viennent de Corée, donc **hors UE**. Ils ne sont conformes que si un importateur européen a fait le CPNP et désigné une personne responsable. C'est précisément ce que Qudo Beauty déclare faire. **Pour tout autre fournisseur K-beauty, c'est la première question à poser** — sinon vous êtes l'importateur.

### 3.4 Destockage — à manier avec une règle stricte

Identifiés : **Synyco SAS** (jusqu'à –70 % vs supermarché), **HADAR DISTRIBUTION** (Marseille, lots de 100 pièces à 4 € HT), **Société Rose Bleue** (Gagny 93, showroom), **Westock Europe**, **Destockplus** (place de marché B2B, 1 094 annonces cosmétiques), **Stocklot World** (UK — pays tiers).

**Règle de sourcing n° 3** : le déstockage n'est acceptable que sur des **produits déjà mis sur le marché UE**, avec **DDM/PAO lisible** et **lot traçable**. Un lot dont la date est proche ou illisible n'est pas une bonne affaire, c'est un rappel. Et le déstockage de marque de luxe est à **exclure d'office** (cf. §2).

---

## 4. L'architecture « tout produit, tout prix » sans stock

Aucun des trois mécanismes ne suffit seul. C'est leur combinaison qui tient la promesse.

| Couche | Rôle | Prix | Stock | Conformité |
|---|---|---|---|---|
| **1. Marque propre** (IDC-like, ou façonnier UE) | l'entrée de gamme, la marge | 1-5 € | petit ou dropship | fabricant UE = PR |
| **2. Grossistes UE** (BLACKETIQUE, IDC, EOLYS) | le cœur de gamme, la largeur | 5-20 € | stock ou 60 j | distributeur |
| **3. Ankorstore** | la longue traîne, le test | variable | **100 €/marque, 60 j** | distributeur |
| **4. Dropship** (Nova Engel, Qudo) | la profondeur sans risque | variable | **zéro** | distributeur |
| **5. Affiliation** | « tout le reste », sans catalogue | prix du marché | zéro | hors de votre périmètre |

**Les couches 3, 4 et 5 sont ce qui rend « n'importe quel produit » vrai** sans que vous ayez à le référencer vous-même. La couche 1 est ce qui rend « moins cher » vrai **légalement**.

---

## 5. Ce que ça exige côté code

Rien de tout ceci n'est visible par un client tant que la taxonomie ne suit pas. Ordre de dépendance :

1. **Départements manquants** dans `CATALOG_CATEGORIES` : `maquillage`, `parfum`, `ongles`, `hygiene`, `corps_bain`, `accessoires`, `kits`, `enfants`, `hommes`.
2. **Un champ de palier de prix** — sinon « le moins cher » n'est pas triable, et la promesse n'est pas tenue à l'écran.
3. **`origin_country` et son statut** — fait hier (`323f652`) : le mécanisme existe, il attend les réponses fournisseurs.
4. **Le garde CPNP** — toujours inerte : `catalogTruth.ts:174` teste `cpnp_ready`, colonne inexistante. Tant qu'il l'est, **rien n'empêche techniquement une fiche non conforme d'être publiée**. Avec un catalogue qui s'élargit vite, ce garde devient critique.

---

## 6. Les six actions, dans l'ordre

| # | Action | Pourquoi |
|---|---|---|
| **1** | **Ouvrir un compte Ankorstore** | 1 200 marques de beauté françaises, 100 €/marque, 60 jours. Le meilleur ratio largeur/risque identifié |
| **2** | **Réparation du garde CPNP** | Il est inerte. Élargir le catalogue sans lui, c'est élargir le risque |
| **3** | **Compte pro chez un grossiste IDC Institute** | Le bas prix légal, sous 2 € l'unité, fabriqué UE |
| **4** | **RFQ Qudo Beauty** — et exiger le CPNP + RP UE par écrit | 1 800 réf. K-beauty, MOQ 300 € total, comble la gamme visage |
| **5** | **Étendre `CATALOG_CATEGORIES`** | Sans ça, les produits n'ont nulle part où vivre |
| **6** | **Un palier de prix affichable** | La promesse « moins cher » doit être triable, pas seulement vraie |

**Critère 16C (§G)** : inchangé — pas de boîte mail, pas de mandat. Les dossiers sont écrits, l'envoi vous appartient.

---

## 7. Ce que je n'ai pas vérifié

- **Les prix cités sont des prix affichés** sur les sites des fournisseurs le 13/09/2026, HT quand le site le précise. **Ce ne sont pas des prix de revient négociés** et aucun n'est contractuel.
- **Aucun fournisseur contacté**, aucun n'a confirmé de disponibilité, de délai ou de condition.
- **Aucun MOQ vérifié contractuellement** — ceux d'Ankorstore (100 €) et de Qudo (300 €) proviennent de sources journalistiques et du site du fournisseur.
- **La déclaration CPNP/RP de Qudo Beauty n'est pas vérifiée.**
- **IDC Institute** : la marque est référencée par quatre grossistes distincts, ce qui atteste son existence commerciale. Je n'ai **pas vérifié son site fabricant ni son numéro d'enregistrement**.
- **Aucune coopérative de karité nommée.**

---

## Sources

| Sujet | Source |
|---|---|
| Ankorstore (min 100 €, 60 j, 1 200 marques beauté FR) | `premiumbeautynews.com`, `alliancy.fr`, `lemoniteurdespharmacies.fr`, `garnetmarketplace.com` |
| Qudo Beauty (1 800 réf., MOQ 300 €, CPNP/RP déclarés) | `qudobeauty.com` |
| IDC Institute, prix affichés | `grossiste-parfum-generique.com`, `grossiste-de-france.fr`, `grossiste-beaute-idc.com` |
| Prady / Ambar / The Fruit Company | `grossiste-en-live.com` |
| K-beauty France | `eolys-beaute.com`, `kocosmetic.fr`, `pibukare.com` |
| Destockage | `europages.fr`, `destockplus.com`, `westock-europe.fr` |
| Taxonomie du code | `src/lib/catalogManagement.ts` (mesure locale) |
| Catégories en base | SQL direct, projet `qzwgsarfdegqtfdnqiql` |
| Cadre UE | règlement (CE) 1223/2009, art. 4, 8, 10, 11, 13, 19 |
