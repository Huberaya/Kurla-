# Sourcing de fond — France → Europe → Monde
**KURLA Beauty · 13 septembre 2026 · base mesurée au commit `507201a`**

---

## 0. La règle d'entrée, avant toute liste

Vous avez posé la règle : *les produits doivent respecter la règle des cosmétiques en France et dans l'UE*. Cette règle n'est pas un filtre appliqué après coup sur une liste de fournisseurs. Elle **classe** les fournisseurs. Voici le texte, lu et non supposé.

### Ce que dit le règlement (CE) n° 1223/2009

**Article 2 — définitions**

- (e) « **distributeur** » : toute personne physique ou morale faisant partie de la chaîne d'approvisionnement, **autre que le fabricant ou l'importateur**, qui met un produit cosmétique à disposition sur le marché communautaire.
- (h) « **mise sur le marché** » : la **première** mise à disposition d'un produit cosmétique sur le marché communautaire.
- (i) « **importateur** » : toute personne physique ou morale établie dans la Communauté qui met sur le marché communautaire un produit cosmétique **provenant d'un pays tiers**.

**Article 4 — personne responsable**

- 4(1) : « Seuls les produits cosmétiques pour lesquels une personne physique ou morale est désignée dans la Communauté comme "personne responsable" sont mis sur le marché. »
- 4(2) : « La personne responsable garantit, pour chaque produit cosmétique mis sur le marché, la conformité aux obligations applicables. »
- 4(5) : « Pour un produit cosmétique importé, **chaque importateur est la personne responsable** du produit cosmétique spécifique qu'il met sur le marché. »
- 4(6) : « Le distributeur est la personne responsable lorsqu'il met un produit cosmétique sur le marché **sous son nom ou sa marque**, ou modifie un produit déjà mis sur le marché de telle manière que sa conformité risque d'en être affectée. **La traduction des informations relatives à un produit cosmétique déjà mis sur le marché n'est pas considérée comme une modification** de ce produit de nature à affecter sa conformité. »

### La conséquence qui décide de tout

| Comment KURLA se fournit | Rôle juridique de KURLA | Ce que ça coûte |
|---|---|---|
| Grossiste **établi en UE, stock déjà dans l'UE** | **Distributeur** (art. 2e) | Rien. Une traçabilité à tenir 3 ans (art. 4§7) |
| Marque blanche chez façonnier UE | **Distributeur** — le labo est PR | Rien, si le contrat le dit |
| Import direct depuis les **États-Unis** | **Importateur = personne responsable** (art. 4.5) | DIP + CPSR + CPNP + étiquetage + cosmétovigilance, **par référence** |
| Import direct depuis la **Chine** (cosmétique) | **Importateur = personne responsable** | idem, plus contrôle renforcé à l'importation |
| Revente sous marque KURLA | **Personne responsable** (art. 4.6) | idem |

**Deux bonnes nouvelles dans ce texte.**

1. **Traduire en français ne fait pas de vous la personne responsable.** L'article 4(6) le dit explicitement. L'étiquetage français n'est donc pas un obstacle juridique au sourcing européen — c'est un travail de mise en page.
2. **Acheter du stock déjà dans l'UE vous place en distributeur, pas en importateur.** C'est la raison pour laquelle les paliers 1 et 2 ci-dessous sont classés avant le palier 3, et non par proximité géographique.

> ⚠️ **Ce classement est une lecture du règlement, pas un avis juridique.** La frontière entre « distributeur » et « importateur » dépend du contrat de vente, de l'Incoterm et du lieu de transfert de propriété. À faire valider avant le premier achat hors UE.

### Le piège exact du segment « moins cher »

Le gros afro à bas prix, en France comme ailleurs, a sur ses étagères des produits **interdits dans l'UE** :

- **Hydroquinone** — interdite dans les produits cosmétiques, **annexe II du règlement 1223/2009, entrée 1339**, la seule exception (annexe III entrée 14) ne concernant que les systèmes d'ongles artificiels. Une crème éclaircissante à l'hydroquinone **n'est pas un cosmétique dans l'UE** : c'est un médicament.
- **Mercure et composés mercuriels** — interdits ; interdiction mondiale entrée en vigueur au titre de la **Convention de Minamata**.
- **Corticoïdes** — substances pharmaceutiques, pas cosmétiques.

**Notre code est déjà aligné** : `src/lib/catalogClaims.ts:141` bloque lexicalement `mercure`, `corticoïde`, `hydroquinone`. La règle de sourcing et la règle du site disent la même chose.

👉 **Règle de sourcing n° 1** : tout fournisseur dont le catalogue contient des éclaircissants dépigmentants doit être interrogé référence par référence, et sa gamme éclaircissante **exclue d'office**. Un seul produit illégal en catalogue = un retrait-rappel à votre nom.

---

## 1. Ce que notre base couvre aujourd'hui (mesuré, pas estimé)

Requête SQL directe sur la base `qzwgsarfdegqtfdnqiql`, table `products`, filtre `catalog_status='published' and is_active`.

### Catégories publiées — 63 produits

| Catégorie | N | Prix min | Prix moyen | Prix max |
|---|---|---|---|---|
| accessoires | 28 | 4,90 € | 14,72 € | 99,90 € |
| cheveux | 25 | 8,90 € | 14,06 € | 19,90 € |
| kits | 10 | 39,90 € | 68,40 € | 149,90 € |

### Sous-catégories publiées — 10 seulement

| Catégorie | Sous-catégorie | N | Fourchette |
|---|---|---|---|
| accessoires | Outils | 28 | 4,90–99,90 € |
| cheveux | Coiffant | 6 | 8,90–16,90 € |
| cheveux | Hydratation | 5 | 10,90–15,90 € |
| cheveux | Lavage | 5 | 12,90–14,90 € |
| cheveux | Nutrition | 5 | 9,90–14,90 € |
| cheveux | Soin profond | 3 | 16,90–19,90 € |
| cheveux | Démêlage | 1 | 11,90 € |
| kits | Kit CORE | 5 | 39,90–69,90 € |
| kits | Kit PREMIUM | 3 | 74,90–149,90 € |
| kits | Kit ENTRY | 2 | 49,90 € |

### Répartition par tranche de prix

| Tranche | N |
|---|---|
| **< 10 €** | **16** |
| **10–20 €** | **34** |
| 20–35 € | 2 |
| 35–60 € | 5 |
| ≥ 60 € | 6 |

### Constat n° 1 — votre catalogue est *déjà* un catalogue pas cher

**50 produits sur 63 sont sous 20 €. 16 sont sous 10 €.** L'exigence « je veux des produits moins chers pour vendre vite » est, sur les prix affichés, **déjà remplie**. Les 12 produits les moins chers sont tous des accessoires KURLA Essentials de 4,90 € à 8,90 €.

**Le problème n'est donc pas le prix. C'est la largeur.** Avec 3 catégories et 10 sous-catégories, un client qui cherche autre chose qu'un soin capillaire ou un peigne ne trouve rien. Le catalogue ne retient pas — il ne convertit pas plus cher qu'un concurrent.

### Constat n° 2 — les gammes absentes

Aucun produit publié dans :

| Gamme manquante | État mesuré |
|---|---|
| **Soin de la peau — visage** | **0 publié**. 16 fiches `peau-ess-001…016` en `draft` + `is_active=false` |
| Soin du corps | 0 |
| Cuir chevelu / traitement ciblé | 1 seule fiche (Démêlage) |
| Coloration | 0 — et catégorie fortement encadrée (annexe III) |
| Solaire / SPF | 0 — claims encadrées ISO 24444/24443 |
| Maquillage / teint | 0 |
| Barbe / homme | 0 |
| Bébé / enfant | 0 |
| Parfum | 0 |
| Ongles | 0 |
| Défrisage | 0 — **exclusion volontaire**, à maintenir |

### Constat n° 3 — `origin_country` est vide sur les 63 produits

Mesuré. Sans ce champ, **aucune décision de conformité n'est fondée** : on ne peut pas dire si un produit est déjà sur le marché UE ou non. C'est le préalable technique au reste de ce dossier.

### Constat n° 4 — le garde CPNP du code est inerte

`src/lib/catalogTruth.ts:174` teste `cpnp_ready`. **Cette colonne n'existe pas dans la base** (vérifié dans `information_schema`). Le champ est donc toujours `undefined`, jamais `false` — **le contrôle ne peut jamais bloquer**. Même chose pour `responsible_person`, également absente.

Un contrôle écrit qui ne peut pas se déclencher est **pire** qu'un contrôle absent : il donne l'impression d'être couvert.

---

## 2. Palier 1 — France

Le palier le plus sûr : stock déjà sur le marché français ⇒ KURLA est distributeur, zéro obligation de personne responsable.

### 2.1 Grossistes multi-marques — couvrent nos soins capillaires

| Fournisseur | Localisation | Marques pertinentes | Vérifié |
|---|---|---|---|
| **BLACKETIQUE SASU** | 3 rue Magnier Bédu B12, 95410 Groslay · SIRET 979 710 829 00024 · 01 84 80 62 40 · WhatsApp 07 52 08 23 61 · `info@blacketique.com` | **Mielle, Cantu, Shea Moisture, As I Am, Camille Rose, Aunt Jackie's, Dark & Lovely** — « authentiques, stock France » | ✅ **site + page haircare** |
| **Distristar** | 17-19 rue Eugène Hénaff, 93000 Bobigny · 01 48 91 04 64 · `info@distristar.com` | Source déclarée de nos 21 références KURLA. Travaille avec Auchan/Carrefour/Franprix | ✅ **déjà en base** |
| **Cosmetic 99** | Épinay-sur-Seine (93) | « plusieurs centaines de marques » dont Eco Styler, ORS, Dark & Lovely, Cantu | ✅ Europages |
| **Malik Afro Cosmétiques** | Paris · 25 ans d'activité | Soins cheveux, corps, extensions, maquillage. Livraison mondiale | ✅ Europages + destockplus |
| **JET BEAUTY** | Montereau · créée 2020 | Cosmétiques afro, natural hair, extensions. Livraison Europe | ✅ Europages |
| **DB MARKET** | Saint-Martin-sur-le-Pré · créée 2025 | Cantu, « black cosmetics » | ⚠️ très récente |
| **MELINADESTOCK** | Aubervilliers · showroom 400 m² | Fabricant-revendeur grandes marques | ✅ Europages |
| **SOCADE** | Aubervilliers · créée 1989 | Hygiène, entretien, beauté en gros | ✅ Europages |
| **MUSOYA** | Paris | **Marque française** natural hair afro/crépu/frisé/locksé. Fabricant + distributeur | ✅ Europages |

**BLACKETIQUE est la trouvaille principale du dossier.** Elle porte *exactement* les 7 marques tierces qui constituent l'essentiel de nos 25 soins capillaires, en stock France, avec un compte professionnel gratuit et des tarifs de gros après validation. C'est le chemin le plus court vers la largeur **sans créer la moindre obligation de personne responsable**.

> ⚠️ **Écart mesuré à trancher en RFQ** : la page d'accueil annonce « **50 marques partenaires** », la page haircare en liste « **35** ». À faire préciser — l'écart porte probablement sur le périmètre (skincare coréenne incluse ou non).

### 2.2 La découverte utile : BLACKETIQUE fait aussi de la skincare coréenne

BLACKETIQUE se présente comme « Grossiste B2B Skincare Coréenne & Haircare Ethnique ». **C'est notre plus grand trou de gamme** — 0 produit de soin du visage publié, 16 fiches en brouillon. Un grossiste français avec stock France sur de la K-beauty comble cette gamme **sans aucune obligation de personne responsable**, à des prix de gros.

À mettre en tête de l'ordre du jour du premier appel.

### 2.3 Façonniers français — marque propre à bas MOQ

| Façonnier | Localisation | Déclaré | Conformité déclarée |
|---|---|---|---|
| **LissCréation** | 137 av. Anatole France, 94600 Choisy-le-Roi · +33 6 74 53 08 95 · `info@lisscreation.com` | **MOQ 200 unités/SKU**, production 4-8 semaines | **ISO 22716, CE, CPNP enregistré, CPNP + dossier PIF fournis** |
| **MY.LAB / STARTEC** | Cavaillon (84) · SIRET 49950066800060 | **« dès 6 unités »** | CE 1223/2009 + CPNP, 96 % naturel |
| **Carmel Cosmetics Labs** | Aït Melloul · 50-99 salariés | Shampooings et masques **cheveux crépus** en marque blanche | À demander |
| Rémanence Brands | Sud France | — | ISO 22716 |
| Dôm Labs | Lyon | — | À demander |
| Laboratoire Eurotel | — | — | À demander |

**LissCréation est le seul à écrire noir sur blanc « CPNP + PIF dossier delivered for EU market access ».** Pour une marque propre lancée vite et légalement, c'est la pièce maîtresse.

**Carmel Cosmetics Labs est le seul à se présenter explicitement sur le cheveu crépu** — c'est rare, cf. angle mort §5.

### 2.4 Dropship France — compatible avec l'année 1 sans stock

| Fournisseur | Modèle | Vérifié |
|---|---|---|
| **Naturare** | Dropshipping **cosmétiques bio français**, acheminement 48 h France | ✅ source liste |
| **Balqis France** | Dropshipping cosmétiques, « boutique sans stock », préparation + expédition + livraison | ✅ source liste |
| **grossiste-dropshipping-cosmetique-lithotherapie.fr** | Cosmétiques naturels + lithothérapie, colis discrets sans mention du site, réservé aux professionnels | ✅ site |

> ⚠️ Ces trois sont issus d'une liste tierce de 2024. **Aucun n'a été contacté, aucun tarif vérifié.** À traiter comme des pistes, pas comme des partenaires.

---

## 3. Palier 2 — Europe hors France

Toujours dans l'UE ⇒ toujours distributeur, toujours zéro obligation de personne responsable.

### 3.1 Grossistes

| Fournisseur | Pays | Note |
|---|---|---|
| **B. Futurist B.V.** | 🇳🇱 Capelle aan den IJssel · 50-99 salariés | Le plus gros profil européen identifié sur ce segment |
| **Exotic City** | 🇧🇪 Alleur · créée 2006 · 20-49 sal. | Se présente comme « le plus important grossiste en produits africains et asiatiques en Europe », livraison mondiale |
| **HQ Cosmetics BV** | 🇳🇱 Puth | Beauté, soins peau, soins capillaires, parapharmacie |
| **Dancohr Cosmetics B.V.** | 🇳🇱 Weert · depuis 1975 | Fabricant familial, 40+ ans |
| **Calcagni Diffusion** | 🇮🇹 Gallarate · depuis 1995 · **100-199 salariés** | Beauté et cosmétique, livraison mondiale |
| **KM Afro Lux SRL (Fuuta-Shop)** | 🇱🇺 Troisvierges · 50-99 salariés | — |
| **Contiments Beauty** | 🇳🇱 Vriezenveen | — |
| **Afro-Gémeos, Lda** | 🇵🇹 Vialonga | — |
| **Top Beauty Cosmetics SL** | 🇪🇸 A Coruña | — |
| **AfroPassion Group** | 🇩🇪 Augsbourg | — |
| **Purfet Hair** | 🇧🇪 Malines | — |
| **Chierici Afro** | 🇮🇹 Fornovo di Taro | — |
| **Cosmetic 99 / O'Vétal** | 🇧🇪 Bruxelles | — |

### 3.2 ⚠️ Le piège post-Brexit

**Le Royaume-Uni n'est plus dans l'UE.** Un fournisseur anglais est un **pays tiers** : acheter chez lui, c'est **importer**, donc devenir personne responsable au sens de l'article 4(5) — même si le produit est britannique et parfaitement conforme.

Acteurs identifiés au Royaume-Uni, **à traiter comme palier 3 et non palier 2** :

- Afro Wholesale (Londres) · Ethica Fashion Store (Londres) · Eapol Wholesale (Birmingham) · A&F Supplies (Preston) · Grow Afro Ltd (Coventry) · Headlines (Londres) · Prime Skincare (Amersham)

C'est une erreur coûteuse et fréquente : beaucoup de grossistes afro européens les mieux fournis sont britanniques.

### 3.3 Façonniers européens — la vraie voie « pas cher + légal »

| Façonnier | Pays | MOQ déclaré | Conformité déclarée |
|---|---|---|---|
| **Cosmetic Lab Ltd.** | 🇱🇻 Riga · `sales@cosmeticlab.eu` · +371 66051000 | **500 unités** | **ISO 22716 GMP, COSMOS Organic, NATRUE**, 3 000+ formules prêtes, depuis 2005 |
| **Galvagni Kosmetikmanufaktur** | 🇩🇪 Bad Mergentheim | **12 unités** ⚠️ | Marque privée, formules personnalisées |
| **Individual Cosmetics** | 🇩🇪 Knüllwald-Remsfeld | **25 unités** ⚠️ | Marque privée |
| **Trat Development GmbH** | 🇩🇪 | **dès 20 kg** ⚠️ | Clean beauty, petites séries |
| **Szaidel Cosmetics** | 🇩🇪 Bruchmühlbach-Miesau | 10 000 pcs ⚠️ | 60 ans, NaTrue + Ecocert |
| **Skinovators** | 🇩🇪 Hessisch Lichtenau | 10 000 pcs ⚠️ | 400+ formules, vegan et bio |
| **Nortempresa** | 🇵🇹 | — | ISO 22716, parfums et cosmétiques |
| **Cosmetics Margo** | 🇨🇿 Prague 9 · créée 2015 | — | Marque blanche |

> ⚠️ **Les MOQ marqués ⚠️ proviennent d'un agrégateur (Accio), pas du site du fabricant.** Ce sont des chiffres **déclaratifs**, pas contractuels. À confirmer en RFQ — je ne les présente pas comme des engagements.

### 3.4 Dropship européen

| Fournisseur | Pays | Modèle vérifié sur leur site |
|---|---|---|
| **Nova Engel / Grupo Engel** | 🇪🇸 | **800+ marques, 30 000+ références**, intégration **REST API + CSV + XML**, expédition anonyme sous votre marque, **24/48 h**, dépôt initial **500 € non remboursable** mis à disposition en portefeuille de commandes |
| **BigBuy** | 🇪🇸 | Stock en Europe, livraison 24 h, expédition à votre image |
| **Octopia** | 🇫🇷 | 20 000+ produits, 1 300 marques, account manager dédié |
| **Cosmetix Club** | — | Maquillage en gros, dropshipping **sans MOQ** |

**Nova Engel est le seul dont j'ai lu les conditions précises.** C'est le candidat le plus réaliste pour une intégration catalogue automatisée dès l'année 1 — l'API REST tombe directement sur notre architecture.

---

## 4. Palier 3 — Monde, avec la porte de conformité

Ici, chaque ligne coûte un dossier réglementaire. À n'ouvrir **qu'après** les paliers 1 et 2, et référence par référence.

### 4.1 États-Unis — nos marques sont américaines

Nos 24 marques tierces (Cantu, Mielle, SheaMoisture, As I Am, Camille Rose, Aunt Jackie's, Kinky-Curly, ApHogee, Design Essentials, Eco Style, Creme of Nature, Nature Spell, Sunny Isle, Tropic Isle Living) sont américaines.

**Ce que j'ai vérifié** : **Colorful Black** (7 rue Poissonnière, 75002 Paris) se présente comme *« Official French Reseller »* de Mielle Organics et distributeur officiel de Cantu. **Donc un canal de distribution UE existe pour ces marques** — ce qui signifie qu'il existe une personne responsable établie dans l'UE pour elles.

**Ce que je n'ai pas pu vérifier** : leur page `/pages/revendeurs` renvoie **404**. **Je n'écris donc pas qu'ils vendent en gros.** Ce qui est prouvé, c'est que le produit est légalement sur le marché français.

Prix de détail constatés sur ce site le 13/09/2026 (repère de marge, pas un prix d'achat) :

| Produit | Prix constaté |
|---|---|
| Shea Moisture — Coconut & Hibiscus Curl Enhancing Smoothie | 15,99 € (barré 17,99 €) |
| Shea Moisture — Manuka Honey & Mafura Oil Masque 340 g | 17,99 € (barré 19,99 €) |
| Les Secrets de Loly — Boost Curl | 16,90 € (barré 19,50 €) |
| Les Secrets de Loly — Kurl Nectar | 18,90 € (barré 21,00 €) |

**Nos soins capillaires sont affichés entre 8,90 € et 19,90 €.** Face à ce repère, notre positionnement prix est déjà dans le marché — la marge dépendra du prix de gros obtenu chez BLACKETIQUE, que je ne connais pas et n'invente pas.

### 4.2 Chine — accessoires seulement, pas de cosmétique

Les accessoires **ne sont pas des produits cosmétiques** : pas de CPNP, pas de personne responsable. En revanche, les 3 fiches électriques (99,90 € / 34,90 € / 24,90 €) relèvent du **marquage CE** et de la directive basse tension — c'est un autre dossier, et c'est notre risque le plus cher.

| Fournisseur | Localisation | Vérifié |
|---|---|---|
| **JunYi Beauty** | Dongguan · depuis 1999 | BSCI, FSC, GRS · clients déclarés Conair, BaByliss, Denman, ghd |
| **Vickky** | Huzhou · `vickkybeauty.com` | 2 M+ unités/an · **MOQ > 300** peignes, 1 000-3 000/style · échantillons 5-10 j |
| **Taihu Snow Silk** | Chine | Soie mûrier 6A, **OEKO-TEX 100**, échantillons 5-7 j |
| **Sino-Silk** | Chine | OEKO-TEX SH015 230473, ISO 9001, Sedex |
| **Taiki Europe** | +33 1 41 22 05 20 | **5 000 pièces/référence — hors de portée** en année 1 |

Repères de preuve vérifiés chez des concurrents : **Emily's Pillow** (OEKO-TEX 21.HCN.67919), **Blissy** (23.HCN.63145, Hohenstein). C'est le niveau de preuve à exiger d'un fournisseur de textile satin.

**Flacons : aucun fournisseur vérifié.** Europages n'est qu'un agrégateur indicatif (500 / 1 000 / 300 unités), non contractuel. Ne rien décider sur cette base.

### 4.3 Matières premières africaines

- **Karité brut (Burkina Faso)** — notre seule référence KURLA. Certifications à exiger : **Ecocert / SPP**. **Je ne nomme aucune coopérative : je n'en ai aucune de vérifiée.**
- **SENIMPEX** (Montivilliers, créée 2020) — importateur-exportateur de matières premières cosmétiques et huiles végétales issues de l'agriculture africaine. ✅ Europages
- **AFRICROPS! GmbH** (Berlin) — matières premières agricoles africaines. ✅ Europages

> ⚠️ Une matière première brute importée hors UE **fait de KURLA l'importateur**, donc la personne responsable du produit fini. À ne pas confondre avec un ingrédient acheté chez un façonnier UE.

### 4.4 Maroc

- **Carmel Cosmetics Labs** — Aït Melloul, 50-99 salariés, marque blanche cheveux crépus. ⚠️ **Le Maroc n'est pas dans l'UE** : produit fini importé ⇒ KURLA personne responsable, **sauf** si le laboratoire désigne un mandataire établi dans l'UE (art. 4(4)). **C'est la première question à poser.**

---

## 5. L'angle mort du marché — et votre occasion

**Aucun façonnier européen identifié ne se présente comme spécialiste du cheveu texturé 3A-4C.** LissCréation fait du lissage brésilien et du botox capillaire. Cosmetic Lab a 3 000 formules génériques. Les laboratoires allemands font du clean beauty. **Carmel Cosmetics Labs est le seul à écrire « cheveux crépus » — et il est au Maroc.**

Conséquence opérationnelle : **l'échantillonnage sur cheveu crépu est une étape obligatoire, pas une validation de plus.** C'est très exactement ce que KURLA reproche aux recommandations génériques — et si vous lancez une marque propre sur une formule conçue pour du cheveu caucasien, vous reproduisez le défaut que vous dénoncez.

C'est aussi l'occasion : il y a une place pour un façonnier ou une marque qui documente ses essais sur 4A-4C. Personne ne le fait publiquement.

---

## 6. Le segment « moins cher » — comment le rendre légal et efficace

### Ce qui est déjà vrai

Votre catalogue est à **79 % sous 20 €**. Vous n'avez pas un problème de prix, vous avez un problème de **largeur** et de **structure de prix**.

### Le vrai levier : une échelle de prix, pas un catalogue uniformément bas

Un catalogue uniformément pas cher ne vend pas plus vite : il vend **moins cher**. Ce qui convertit, c'est un produit d'appel crédible à côté d'un produit qui porte la marge. Mesuré chez vous :

| Rôle | Tranche | État |
|---|---|---|
| **Produit d'appel** (convertit le premier achat) | 4,90–9,90 € | ✅ 16 fiches accessoires |
| **Cœur de gamme** (porte la marge) | 12,90–19,90 € | ✅ 34 fiches |
| **Milieu** | 20–35 € | ⚠️ **2 fiches seulement — le trou** |
| **Premium** (panier moyen) | 39,90–149,90 € | ✅ 10 kits |

**Le trou est au milieu : 2 produits entre 20 et 35 €.** C'est là qu'un client passe de 15 € à 45 € sans transition. C'est le segment à sourcer en priorité — pas le segment le plus bas.

### Les trois seules façons légitimes d'être moins cher

1. **Acheter du stock déjà dans l'UE** (paliers 1-2). Vous ne payez aucun dossier réglementaire. C'est la seule économie qui ne se rembourse pas en avocat.
2. **Marque blanche à bas MOQ avec CPNP+PIF inclus** — LissCréation (MOQ 200, dossier fourni), MY.LAB (dès 6 unités), Galvagni (12 unités, déclaratif). Vous devenez marque, donc vous prenez la marge du fabricant.
3. **Dropship** (Nova Engel, Naturare, Cosmetix Club) — zéro investissement stock, mais marge réduite et aucune maîtrise du délai.

### La façon illégitime, et pourquoi elle est un piège

**L'import parallèle depuis les États-Unis.** C'est le moins cher à l'unité, et c'est précisément ce qui fait de vous la **personne responsable** (art. 4(5)) : DIP, évaluation de sécurité, notification CPNP, étiquetage, cosmétovigilance — **par référence**. Sur 24 marques tierces, c'est un chantier réglementaire, pas un approvisionnement.

**Et le déstockage.** Les grossistes « destockage » afro proposent souvent des lots contenant des produits éclaircissants interdits (hydroquinone, mercure). **Un seul lot contaminé = un retrait-rappel à votre nom et une notification Safety Gate.**

---

## 7. Matrice gammes × fournisseurs

| Gamme manquante | Fournisseur identifié | Palier | Obligation créée |
|---|---|---|---|
| **Soin visage** | **BLACKETIQUE** (K-beauty, stock France) | 1 | **Aucune** |
| Soin visage — marque propre | Cosmetic Lab (Riga), LissCréation | 1-2 | Aucune si le labo est PR |
| Soins capillaires — élargir | **BLACKETIQUE**, Distristar, Cosmetic 99, Malik Afro | 1 | **Aucune** |
| Marque propre capillaire | **LissCréation** (MOQ 200, CPNP+PIF inclus), **Carmel** (cheveux crépus) | 1 / 3 | Aucune / ⚠️ à vérifier |
| Cuir chevelu ciblé | BLACKETIQUE, façonniers | 1-2 | Aucune |
| Corps | Cosmetic Lab, NaturaRe | 2 / 1 | Aucune |
| Maquillage | Cosmetix Club (dropship, sans MOQ) | 2 | Aucune |
| **Coloration** | — | — | ⚠️ **Annexe III, catégorie à fort encadrement. À ne pas ouvrir en année 1** |
| **Solaire / SPF** | — | — | ⚠️ **ISO 24444/24443. À ne pas ouvrir sans dossier** |
| **Défrisage** | — | — | 🚫 **Exclusion volontaire maintenue** |
| Accessoires non cosmétiques | JunYi, Vickky (Chine) | 3 | Pas de CPNP, mais CE si électrique |
| Textile satin | Taihu Snow Silk, Sino-Silk | 3 | OEKO-TEX 100 à exiger |

---

## 8. Ce que je n'ai pas vérifié — et que je n'invente pas

- **Aucun prix d'achat.** Aucun grossiste n'affiche ses tarifs de gros sans compte professionnel validé. Les 4 prix cités §4.1 sont des prix de **détail** constatés sur un site, servant de repère.
- **Aucun MOQ contractuel.** Les MOQ allemands viennent d'un agrégateur. Seuls LissCréation (200) et Cosmetic Lab (500) l'écrivent sur leur propre site.
- **Aucune coopérative de karité nommée** — je n'en ai aucune de vérifiée.
- **Aucun fournisseur contacté.** Aucun n'a répondu. Aucun n'a confirmé de disponibilité.
- **BLACKETIQUE, Cosmetic 99, Malik Afro, JET BEAUTY, DB MARKET** : identités issues d'Europages ou de leur site, **non recoupées au RCS**. À vérifier avant tout engagement.
- **Les fournisseurs de dropship français** proviennent d'une liste tierce de 2024.

---

## 9. Les cinq actions, dans l'ordre

| # | Action | Pourquoi avant les autres |
|---|---|---|
| **1** | **Renseigner `origin_country` sur les 63 produits** | Sans ce champ, aucune ligne de ce dossier n'est applicable. C'est une saisie, pas un chantier |
| **2** | **Réparer le garde CPNP** — créer `cpnp_ready` et `responsible_person`, ou retirer le test de `catalogTruth.ts:174` | L'état actuel est le pire des deux : un contrôle qui ne peut jamais bloquer |
| **3** | **Contacter BLACKETIQUE** — ouverture compte pro, prix de gros des 7 marques, périmètre réel (35 ou 50 marques), **gamme skincare coréenne**, politique dropship | Couvre 2 gammes d'un coup, sans obligation de personne responsable |
| **4** | **Sourcer la tranche 20-35 €** | C'est le trou mesuré, pas le segment le plus bas |
| **5** | **RFQ LissCréation + Carmel Cosmetics Labs** | Marque propre légale à bas MOQ. Poser à Carmel la question du mandataire UE (art. 4(4)) |

**Critère 16C (§G) — RFQ envoyé, réponses comparées, fournisseur retenu** : toujours non remplissable ici. Pas de boîte mail, pas de mandat. Les dossiers sont écrits, l'envoi vous appartient.

---

## Annexe — sources

| Sujet | Source |
|---|---|
| Règlement 1223/2009 art. 2 et 4 | EUR-Lex, `eur-lex.europa.eu/eli/reg/2009/1223/oj` |
| Hydroquinone, annexe II entrée 1339 | Version consolidée du règlement |
| Mercure, Convention de Minamata | PNUE |
| BLACKETIQUE | `blacketique.com`, `blacketique.com/haircare/` |
| Colorful Black | `colorfulblack.com` — page revendeurs **404** |
| LissCréation | `lisscreation.com/en/white-label` |
| Cosmetic Lab | `cosmeticlab.eu/white-label-cosmetics-manufacturer/` |
| Nova Engel | `novaengel.com/en/dropshipping_perfumes_cosmetics_haircare_products` |
| Grossistes FR/UE | Europages (agrégateur — à recouper au RCS) |
| MOQ allemands | Accio (**agrégateur, déclaratif**) |
| Base produits | SQL direct, projet Supabase `qzwgsarfdegqtfdnqiql` |
