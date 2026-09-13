# Sourcing de fond — cheveux

**Date** : 13/09/2026 · **Périmètre** : soins, coiffants, mèches & extensions, accessoires
**Géographie** : toutes origines, classées par rôle juridique de KURLA

---

## 0. Point de méthode — ce qui est vérifié et ce qui ne l'est pas

Ce dossier applique la règle déjà en vigueur sur les autres chantiers :
**aucun fournisseur, prix ou obligation inventé**. Concrètement :

- **VÉRIFIÉ** = j'ai trouvé une source primaire ou croisée (registre légal,
  site officiel, fiche Europages/Kompass avec SIREN). Le numéro de SIREN ou
  l'adresse est écrit quand il existe.
- **DÉCLARATIF** = le fournisseur l'affirme, je n'ai pas pu le contrôler.
  C'est le cas de la quasi-totalité des conditions commerciales (MOQ, délais,
  prix) : **je n'ai pas de boîte mail et pas de mandat pour interroger
  personne.**
- **NON VÉRIFIÉ** = piste trouvée dans une annonce, sans identité légale
  établie.

**Aucun prix d'achat n'est affirmé dans ce dossier.** Les prix publics vus en
vitrine sont cités comme *ordres de grandeur non contractuels*, avec leur
source et leur date, jamais comme des conditions obtenues.

---

## 1. Diagnostic du catalogue cheveux — mesuré en base le 13/09/2026

### 1.1 Ce qui est publié

**33 fiches** `category='cheveux'`, dont **25 publiées** et visibles.

| Population | Fiches | Visibles | Fournisseur | Composition | INCI |
|---|---|---|---|---|---|
| Marques réelles | 26 | **25** | 26 | 25 | **25** |
| Fiches KURLA « (Démo) » | 7 | **0** | 7 (fictif) | 3 | **0** |

Les 7 fiches KURLA se déclarent elles-mêmes comme fictives :
`source_supplier` = *« Fiche de démonstration — aucun sourcing réel ; canal
pressenti : DLAB Custom Cosmetics »*, `supplier_id` = `sup-demo-fixtures`,
`catalog_status` = `unavailable`.

**Elles ne sont visibles par personne.** Sur l'ensemble du catalogue, les
**16 fiches « (Démo) » sont toutes `unavailable`, 0 visible.**

> ⚠️ **Correction d'une hypothèse.** Le risque n'était pas « des produits
> inexistants sont affichés » — la mesure dit le contraire. Le risque réel est
> ailleurs, en §1.3.

### 1.2 Le fournisseur des 21 fiches visibles existe

Les 21 fiches de marques afro-américaines déclarent :
**« Distristar (grossiste marques afro US, Bobigny) — achat-revente »**.

**VÉRIFIÉ — Distristar existe :**
- 17-19 rue Eugène Hénaff, 93000 Bobigny
- 01 48 91 04 64 · `info@distristar.com`
- Deux sites : `distristar.com` (boutique en ligne) et `distristar93.fr` (vitrine)
- Se présente comme grossiste en produits capillaires, cosmétiques afro,
  mèches et perruques ; cite Auchan, Carrefour, Franprix comme clients

⚠️ **Ce que je n'ai PAS pu vérifier :**
- que Distristar livre **effectivement** les 21 références de notre catalogue.
  Sa vitrine met en avant **Red One, X-Pression, Dark and Lovely, TCB** —
  des marques qui **ne sont pas** celles de nos fiches (Cantu, Mielle,
  Camille Rose, ApHogee, Kinky-Curly…).
- `distristar93.fr` ne répondait pas à ma requête au moment de la rédaction.
- **aucune pièce** (bon de commande, facture, attestation) n'est enregistrée
  dans `supplier_documents` : la table contient **0 ligne**.

**C'est là que se joue la crédibilité.** Pas dans les fiches démo : dans le
fait que 21 fiches visibles reposent sur un fournisseur dont le catalogue
publié ne montre pas nos marques, et dont aucune pièce ne prouve la relation.

### 1.3 Les trois trous mesurés

| Trou | Mesure | Conséquence |
|---|---|---|
| **Étroitesse** | 15 marques, **toutes afro-américaines**, 8,90–19,90 € | Aucune marque française ni européenne. Un client qui cherche « Les Secrets de Loly » ne trouve rien. |
| **Canal unique** | 1 seul fournisseur déclaré pour 21/26 fiches | Aucune redondance. Une rupture Distristar vide les deux tiers du rayon. |
| **Provenance** | **0/33 fiches** ont `origin_country` | Impossible d'afficher l'origine. Champ créé par la migration `20260924000000`, jamais renseigné. |

### 1.4 Ce qui est déjà bien couvert

- **11 sous-catégories cheveux sur 12** déclarées dans `CATALOG_CATEGORIES`
- **19 fiches accessoires capillaires**, dont 16 publiées, de **4,90 € à 34,90 €**
- Le tri par prix et les **paliers de prix** sont en place (commit `39bb91c`)
- Les 10 départements existent, dont `maquillage`, `parfum`, `hygiene`,
  `ongles` (commit `e409aac`)

**Le problème n'est pas la profondeur, c'est la largeur et la traçabilité.**

---

## 2. Le pivot juridique — il détermine le coût réel

Règlement (CE) 1223/2009, articles 2 et 4, lus au texte.

| Approvisionnement | Rôle de KURLA | Coût de conformité |
|---|---|---|
| Grossiste **UE, stock déjà UE** | **Distributeur** — art. 2(e) | **Rien.** Traçabilité 3 ans |
| Marque blanche chez façonnier UE | Distributeur, le labo est PR | Rien si le contrat le dit |
| Import direct US / Afrique / Chine | **Importateur = PR** — art. 4(5) | DIP + CPSR + CPNP + étiquetage, **par référence** |
| Revente sous marque KURLA | **PR** — art. 4(6) | idem |

**Points qui comptent pour les cheveux :**

1. **Les marques afro-américaines sont hors UE.** Les acheter auprès d'un
   **importateur établi en UE** qui a déjà déposé le CPNP → KURLA reste
   distributeur. Les importer soi-même → KURLA devient **personne
   responsable**, par référence. C'est la différence entre zéro et plusieurs
   milliers d'euros de mise en conformité.
2. **Les mèches, extensions, perruques et accessoires ne sont PAS des
   cosmétiques.** Pas de CPNP. Mais :
   - **traçabilité de l'origine** obligatoire (information du consommateur)
   - **EUDR** pour les fibres d'origine végétale/bois selon le produit
   - **PPWR** sur les emballages
   - les **cheveux humains** posent une question de **provenance éthique**
     qu'il faut pouvoir documenter
3. **Traduire en français ne fait pas de KURLA la personne responsable** —
   art. 4(6) le dit explicitement.
4. **Royaume-Uni = pays tiers** post-Brexit → palier importateur.

---

## 3. Pistes — classées par rôle juridique

### Palier 1 — Stock déjà en UE : KURLA reste distributeur

**C'est le palier à privilégier. Zéro obligation de personne responsable.**

#### 3.1 BLACKETIQUE SASU — VÉRIFIÉ, la piste la plus alignée

- **3 rue Magnier Bédu B12, 95410 Groslay** (Val-d'Oise)
- **SIRET 979 710 829 00024** · 01 84 80 62 40 · `info@blacketique.com`
- Se déclare grossiste B2B afro, salons Paris & Île-de-France, revendeurs

**Pourquoi c'est la piste n° 1 :** leur catalogue annonce **exactement nos
marques** — *« Mielle, Cantu, Shea Moisture, As I Am, Camille Rose, Aunt
Jackie's, Dark & Lovely — authentiques, stock France »*, **35 marques** au
total. C'est précisément ce que les 21 fiches Distristar ne montrent pas.

- **Rôle KURLA** : distributeur
- **À exiger par écrit** : attestation de notification CPNP par référence,
  nom de la personne responsable UE, INCI, DDM/PAO
- **DÉCLARATIF** : MOQ, délais, tarifs revendeurs — non vérifiés

#### 3.2 Distristar — VÉRIFIÉ comme société, catalogue à recouper

Voir §1.2. **À conserver comme second canal**, mais la priorité est de
recouper la liste des 21 références avant de s'appuyer dessus.

#### 3.3 Cosmetic 99 — DÉCLARATIF

- 153 route de Saint-Leu, 93800 Épinay-sur-Seine · 09 52 84 09 09 ·
  `cosmet99@gmail.com`
- Se déclare spécialiste cosmétiques africains, karité, huiles, soins
  capillaires
- ⚠️ l'adresse est à Épinay-sur-Seine alors que la communication dit
  « Bobigny » — **à clarifier avant tout engagement**

#### 3.4 La Boutique du Coiffeur — VÉRIFIÉ comme enseigne

Enseigne de matériel de coiffure, réseau de magasins, orientée professionnels
puis grand public. Pertinente pour les **accessoires** (brosses, peignes,
matériel), pas pour les soins de marque.

### Palier 2 — Marques françaises et européennes

**Absent du catalogue aujourd'hui. C'est le trou de crédibilité le plus
visible pour un client français.**

#### 3.5 Activilong — VÉRIFIÉ, fabriqué en France

- Laboratoire fondé par **Yannick Cheffre**, **basé à Paris**, depuis **1983**
- Soins capillaires, coiffants, formulés à base d'ingrédients naturels
  (coco, avocat, karité, ricin)
- Positionné « **la marque la plus utilisée par les afro-françaises** », 30 ans
  d'expérience en salons
- Distribuée par les réseaux professionnels de coiffure

- **Rôle KURLA** : distributeur — produit **déjà sur le marché UE**, CPNP
  déposé par le laboratoire
- **Intérêt** : répond directement à la demande « fabrication française »,
  et le canal salon est cohérent avec la cible KURLA
- **DÉCLARATIF** : conditions revendeurs

#### 3.6 Les Secrets de Loly — VÉRIFIÉ, fabriqué en France

- Fondée en **2009 à Paris** par **Kelly Massol**
- Formules annoncées à **plus de 96 % d'ingrédients d'origine naturelle**
- Gamme complète : shampoings, après-shampoings, masques, leave-in, coiffants
- **Prix publics constatés** (Pharma GDD, 13/09/2026, **non contractuels**) :
  après-shampoing Pink Paradise 250 ml **13,99 €** · Kurl Nectar **12,99 €** ·
  Cream Conditioner 250 ml **12,89 €** · Kurl Potion 250 ml **17,79 €** ·
  Care Fusion co-wash 250 ml **12,99 €** · Pink Power Mask 300 ml **19,99 €** ·
  routines 4 étapes **29,99 €**
- Distribuée en pharmacie, chez les coiffeurs, en boutiques spécialisées

- **Rôle KURLA** : distributeur
- **Intérêt** : marque française de référence sur le segment, **prix publics
  dans la tranche 12–20 € qui concentre déjà 43 % de notre catalogue** —
  cohérence de positionnement
- ⚠️ **les prix ci-dessus sont des prix publics, pas des prix d'achat**

#### 3.7 Autres marques françaises identifiées — à vérifier une par une

Repérées dans la presse spécialisée et les distributeurs, **existence non
vérifiée par registre** : Nappy Queen · Soarn · Carolina B · Crenabe ·
Kalia Nature · In'oya · Flora & Curl · Tropikalbliss · Akhaîa · Zawadi ·
Little Frimousse (enfants).

**Ne pas mettre en catalogue avant vérification** : identité légale,
statut UE, CPNP.

### Palier 3 — Mèches, extensions, perruques

**Ce ne sont pas des cosmétiques.** Pas de CPNP, mais traçabilité d'origine
et, pour les cheveux humains, **provenance éthique à documenter**.

#### 3.8 X-Pression / Outré — fibre Kanekalon

- Mèches synthétiques **100 % Kanekalon**, référence mondiale du tressage
- **Prix publics constatés** (diouda.fr, **non contractuels**) : mèches
  Wavy Bomb Twist 12" **9,10 €** · Butterfly Locs 18" **dès 7,40 €** ·
  Passion Waterwave 18" **dès 5,10 €**
- Distribuées en France par plusieurs grossistes

#### 3.9 Grossistes français identifiés

| Société | Localisation | Statut |
|---|---|---|
| **La Boutique Malik** | France | Se déclare « grossiste leader en Europe », distributeur officiel X-Pression — **DÉCLARATIF** |
| **Royal Extension** | 3 bd d'Alsace, 06400 Cannes · 04 89 68 80 63 · `julien.royalextension@gmail.com` | **SIREN 507 734 085 00016** — VÉRIFIÉ au registre. Réservé aux professionnels et revendeurs |
| **Velvety Hair** | Paris | Se déclare leader français du cheveu naturel — **DÉCLARATIF** |
| **TYPANIA' Hair** | Maxéville | Société française, 5-9 salariés, extensions human hair pour salons — **DÉCLARATIF** |
| **Liv Hair Extension** | Lille | 20-49 salariés, grossiste — **DÉCLARATIF** |
| **Cindy Hair Shop** | France | Boutique, pas grossiste confirmé — **ne pas affirmer de vente en gros** |

⚠️ **Piège spécifique à ce palier** : les extensions « cheveux humains »
à prix très bas posent une question de provenance. **Ne pas sourcer de
cheveux humains sans pouvoir documenter l'origine.** Un Kanekalon
synthétique, lui, est traçable industriellement.

### Palier 4 — Matières premières : karité, huiles

**Le seul canal qui permet la marque propre sans être importateur.**

#### 3.10 SENIMPEX — VÉRIFIÉ au registre

- **SAS/SASU**, **SIREN 881 596 084**, RCS **Le Havre**, capital 10 000 €
- Créée le **06/02/2020** · dirigeante **Emily Mendy** (président)
- 115 avenue du Maréchal Foch, 76290 Montivilliers (siège transféré au
  Havre le 01/12/2022)
- NAF 4639B — commerce de gros
- Importateur/exportateur de **matières premières cosmétiques** issues de
  l'agriculture africaine
- Beurre de karité **origine Burkina Faso**, brut, non raffiné, non
  désodorisé, non décoloré · **certifié bio Ecocert**, commerce équitable
- **Déclare des analyses cosmétiques en laboratoire en France** pour assurer
  la conformité réglementaire — c'est exactement la pièce qu'il faut exiger

- **Rôle KURLA** : si KURLA achète la matière et la conditionne sous sa
  marque → **personne responsable**. Si KURLA achète un produit fini déjà
  conditionné → distributeur.
- ⚠️ **les certifications Ecocert et commerce équitable sont DÉCLARATIVES** :
  exiger les certificats avec numéro et date de validité

#### 3.11 Autres pistes karité — NON VÉRIFIÉES

Trouvées dans des annonces, **identité légale non établie** :

- **ARGANisme COSMETICS** (92320) — karité bio équitable, origine Burkina
- **PATERNEBIO** — pots 150 g, marque blanche
- **LOBIKO** — `lobikocosmetique@gmail.com`
- **SOFOCOT** (Aix-les-Bains) — commerce équitable avec coopératives de
  femmes au **Tchad**
- **KARITEDUFASO** — karité, cacao, mangue, Burkina Faso
- **SAS KING MALAL** (Mulhouse, créée 2020, 5-9 salariés)

⚠️ **Je n'ai nommé aucune coopérative de karité**, conformément à la règle :
je n'en ai vérifié aucune. Les prix vus dans les annonces (de l'ordre de
5 à 17,60 €/kg) sont des **prix d'annonce**, pas des prix obtenus.

### Palier 5 — Dropship et affiliation

Permet d'élargir sans stock ni risque de conformité, mais sans marge de
négociation ni contrôle du produit.

- **Ankorstore** — 20 000+ marques européennes dont **1 200 marques de
  beauté françaises**, minimum **100 € par marque**, franco 300 €,
  **paiement à 60 jours**, 0 % commission sur les réassorts depuis
  janvier 2026. **VÉRIFIÉ** sur sources croisées.
- **Nova Engel / Grupo Engel** (Espagne) — 800+ marques, 30 000+ réf.,
  REST + CSV + XML, expédition anonyme, dépôt 500 € non remboursable
- **Qudo Beauty** (Roumanie, VAT RO50381912) — 1 800+ produits K-beauty,
  MOQ 300 € total, **seul fournisseur déclarant par écrit** CPNP + INCI +
  RP UE. ⚠️ **déclaration non vérifiée** — mais c'est la preuve à exiger
  de tous les autres.

⚠️ **Rappel de la règle n° 2** : aucune marque de luxe à un prix s'écartant
fortement du prix public conseillé. Un Chanel à 23,90 € en gros, constaté
chez un déstockeur, est un **indicateur de contrefaçon** — délit au code de
la propriété intellectuelle.

---

## 4. Plan d'action

### Immédiat — sécuriser l'existant (crédibilité)

1. **Recouper les 21 fiches Distristar.** Demander la liste des références
   réellement disponibles. Toute référence non confirmée doit passer à
   `unavailable`, pas rester publiée.
2. **Ouvrir un compte BLACKETIQUE.** C'est le substitut direct : mêmes
   marques, stock France, identité légale vérifiée.
3. **Enregistrer les pièces dans `supplier_documents`.** La table existe,
   elle accepte `cpnp_notification`, `responsible_person`, `pif`, `cpsr`,
   avec contrainte **`file_url` ET `issued_on` obligatoires**. Elle contient
   **0 ligne**. Le garde CPNP réparé (commit `683a593`) la lit : dès qu'une
   notification expirée y sera enregistrée, la fiche se dépubliera
   automatiquement.

### Court terme — élargir

4. **Deux marques françaises minimum** : Activilong et Les Secrets de Loly.
   Répond directement à « fabrication française » et couvre le trou le plus
   visible pour un client français.
5. **Renseigner `origin_country` sur les 33 fiches cheveux.** Le champ
   existe, trois contraintes le protègent, il est vide. Sans cela
   l'affichage d'origine reste impossible.
6. **Ouvrir le rayon mèches et extensions.** X-Pression en synthétique
   d'abord — traçable industriellement, pas de question de provenance.
   Le cheveux humains seulement avec origine documentée.

### Moyen terme — marque propre

7. **SENIMPEX pour le karité**, en exigeant les certificats Ecocert et
   commerce équitable avec numéro et validité.
8. **Ne pas ressusciter les 7 fiches KURLA avant d'avoir un façonnier.**
   Elles sont correctement neutralisées. Les publier sans INCI ni CPNP
   créerait exactement le problème de crédibilité qu'on veut éviter.

---

## 5. Ce que ce dossier ne dit pas

- **Aucun fournisseur n'a été contacté.** Pas de boîte mail, pas de mandat.
  Le critère 16C du cahier des charges (*RFQ envoyé, réponses comparées,
  fournisseur retenu*) reste **non remplissable ici**.
- **Aucun prix d'achat affirmé.** Les prix cités sont des prix publics ou
  des prix d'annonce, sourcés et datés.
- **Aucun MOQ affirmé.** Les minimums cités sont ceux que les fournisseurs
  publient eux-mêmes.
- **Aucune coopérative nommée.** Je n'en ai vérifié aucune.
- **Le classement distributeur / importateur est une lecture du règlement,
  pas un avis juridique.**

---

## Sources

- Base de données KURLA, projet `qzwgsarfdegqtfdnqiql`, requêtes SQL directes
  du 13/09/2026
- `distristar.com` · `distristar93.fr`
- `blacketique.com/haircare/`
- `beautycoiffure.com` (Activilong) · `laboutiqueducoiffeur.com`
- `pharma-gdd.com/fr/les-secrets-de-loly` (prix publics)
- `europages.fr` · `fr.kompass.com` · `societe.com` (SENIMPEX, SIREN 881 596 084)
- `destockplus.com` (Royal Extension, SIREN 507 734 085 00016)
- `diouda.fr` (prix publics mèches X-Pression)
- Règlement (CE) 1223/2009, art. 2 et 4 — lu au texte
