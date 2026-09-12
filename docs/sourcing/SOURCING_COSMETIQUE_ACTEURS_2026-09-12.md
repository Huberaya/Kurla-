# Sourcing cosmétique — gamme large, acteurs et partenaires

Établi le 2026-09-12. Périmètre : les **produits cosmétiques** (soins capillaires
et peau), hors matériel — celui-ci est dans
`SOURCING_MATERIEL_ACCESSOIRES_2026-09-12.md`.

## Sur le mot « exhaustive »

Une liste exhaustive des acteurs cosmétiques n'existe pas : ils sont des
milliers, et toute liste qui prétend l'être est une liste inventée. Ce document
fait donc deux choses distinctes :

- **la typologie des acteurs est exhaustive** — les catégories sont finies, et
  les huit types ci-dessous couvrent toutes les façons d'obtenir un cosmétique
  pour un site français ;
- **la liste d'acteurs par type ne l'est pas** — elle ne contient que des
  acteurs vérifiés ce tour sur source publique citée. Elle est volontairement
  courte plutôt que gonflée.

Ce qui manque est dit à la fin, pas passé sous silence.

---

## 1. Ce que KURLA vend aujourd'hui — MESURÉ

25 soins capillaires publiés. **24 sur 25 sont des marques tierces** en
achat-revente ; un seul est KURLA (`launch-p09`, beurre de karité brut 100 %).

| Sous-catégorie | Nb | Marques présentes |
|---|---|---|
| Coiffant | 6 | Aunt Jackie's, Camille Rose, Cantu, Design Essentials, Eco Style, Kinky-Curly |
| Lavage | 5 | As I Am (×2), Camille Rose, Cantu, Creme of Nature |
| Hydratation | 5 | Camille Rose, Cantu, Kinky-Curly, Mielle (×2) |
| Nutrition | 5 | Mielle (×2), Nature Spell, Sunny Isle, Tropic Isle Living, + karité KURLA |
| Soin profond | 3 | ApHogee, SheaMoisture (×2) |
| Démêlage | 1 | Cantu |

**C'est la donnée qui commande tout le reste.** KURLA n'a pas une gamme à
sourcer : elle a un **catalogue de marques américaines à sécuriser**, et une
gamme propre à construire. Ce sont deux métiers, deux calendriers, deux risques.

---

## 2. Le point bloquant n'est pas la liste de fournisseurs

Deux mesures faites ce tour, qui pèsent plus que n'importe quel nom de
fournisseur :

**a) `origin_country` est vide sur les 63 produits publiés.** On ne sait pas
d'où vient ce qui est vendu. Pour un cosmétique, c'est la question qui
détermine tout le reste.

**b) Le garde de conformité CPNP dans le code ne peut pas se déclencher.**
`catalogTruth.ts:174` teste `readCatalogField(product, 'cpnp_ready') === false`,
mais **la colonne `cpnp_ready` n'existe pas en base** (vérifié dans
`information_schema.columns`). Le champ est donc toujours `undefined`, jamais
`false`, et le blocage ne se produit jamais. Il n'y a pas non plus de colonne
`responsible_person`.

Pourquoi c'est décisif : tout cosmétique mis sur le marché européen exige une
**Personne Responsable dans l'UE**, une **notification CPNP** et un **dossier
d'information produit** (règlement CE 1223/2009). Trois situations, trois coûts
très différents :

| Approvisionnement | Qui est Personne Responsable | Conséquence |
|---|---|---|
| Achat à un **grossiste dont le stock est déjà en France/UE** | le fabricant ou son importateur UE existe déjà | KURLA est **distributeur**. Le plus simple et le moins cher. |
| **Marque blanche** chez un façonnier UE | le façonnier prend en charge CPNP/PIF (à vérifier contrat par contrat) | KURLA est metteur sur le marché, mais porté par le labo. |
| **Import direct depuis les États-Unis** | **KURLA devient importateur**, donc probablement Personne Responsable | Le plus cher et le plus lent : PIF, CPNP, étiquetage, cosmétovigilance. |

**Conclusion qui découle des mesures :** la priorité n'est pas d'allonger la
liste de fournisseurs, c'est de **savoir d'où vient chaque produit** et de
**réparer le garde CPNP** pour qu'il puisse réellement bloquer.

---

## 3. Typologie exhaustive des acteurs — 8 types

### Type 1 — Grossistes de marques afro, stock France/UE

C'est la voie la plus rapide vers une gamme large, et la seule qui ne crée
**aucune** obligation réglementaire nouvelle : les produits sont déjà sur le
marché européen.

| Acteur | Localisation | Ce qui est VÉRIFIÉ |
|---|---|---|
| **BLACKETIQUE** — `blacketique.com` | Groslay (95), livraison IDF | **35 marques** dont **Mielle, Cantu, Shea Moisture, As I Am, Camille Rose, Aunt Jackie's, Dark & Lovely** — « authentiques, **stock France** ». C'est presque exactement le catalogue KURLA actuel. |
| **Distristar** — `distristar.com` | 17-19 rue Eugène Hénaff, 93000 Bobigny · 01 48 91 04 64 · `info@distristar.com` | Source actuelle de 21 références KURLA. Grossiste capillaire, travaille avec Auchan/Carrefour/Franprix. **Catalogue à filtrer : contient des défrisants.** |
| **Malik Afro Cosmétiques** | Paris | +25 ans, distribution et gros, livraison mondiale |
| **JET BEAUTY** | Montereau, fondé 2020 | Grossiste cosmétique afro, natural hair, extensions ; livraison Europe |
| **Cosmetic 99** | Épinay-sur-Seine | « une centaine de marques » en stock : Eco Styler, ORS, Dark & Lovely, Cantu |
| **Calcagni Diffusion** | France, depuis 1995 | Grossiste beauté et cosmétique |
| **AfricanFabs B.V.** / **Afro Wholesale** | Pays-Bas | Déjà dans le pack de mails KURLA. **Dina Afro Shop** (FR) en repli. |

**Recommandation.** Contacter **BLACKETIQUE en premier** : son portefeuille
recoupe presque exactement les 24 marques déjà au catalogue, avec stock France.
C'est le chemin le plus court vers la largeur de gamme, et il ne crée aucune
obligation de Personne Responsable.

### Type 2 — Façonniers / marque blanche capillaire

Pour construire la gamme **propre** KURLA. C'est ce qui transforme un
revendeur en marque.

| Acteur | Localisation | Ce qui est VÉRIFIÉ | DÉCLARATIF |
|---|---|---|---|
| **LissCréation** — `lisscreation.com` · `info@lisscreation.com` · +33 6 74 53 08 95 | 137 av. Anatole France, 94600 Choisy-le-Roi | laboratoire **ISO 22716**, fabrication 100 % européenne, **CPNP et DIP inclus**, shampooings/masques/lissages sans formol, conformité CE 1223/2009 | **MOQ 200**, production **4–8 semaines** |
| **MY.LAB (STARTEC)** — `mylab-shop.com` · `contact@mylab-shop.com` · +33 4 85 69 33 47 | 231 av. de la Voguette, 84300 Cavaillon · SIRET 49950066800060 | formules **96 % naturelles**, vegan, sans sulfate/silicone/parabène, Made in France, conformité **CE 1223/2009** et **CPNP**, gamme shampoings/masques/coiffants/sérums/huiles/homme | **dès 6 unités par référence** — le MOQ le plus bas trouvé, à confirmer |
| **Rémanence Brands** — `remanence-brands.com` | usine partenaire sud de la France, **ISO 22716** | +30 ans, private label clé en main ou sur mesure, 100 % Made in France | MOQ non publié |
| **Laboratoire Dôm Labs** | Lyon | full service / façonnage / private label, produits capillaires personnalisables | — |
| **Laboratoire Eurotel** | Paris / sud de la France, 20-49 salariés | né en 2019 du rachat des Laboratoires Eliane | — |
| **Carmel Cosmetics Labs** | France | industrialisation de gammes ; shampooings marque blanche dont anti-chute | — |

**Le point d'attention pour KURLA.** Aucun de ces laboratoires n'est présenté
comme spécialiste du **cheveu texturé 3A-4C**. Leurs formules sont conçues pour
la coiffure professionnelle générale. **Un échantillonnage sur cheveu crépu est
donc une étape obligatoire, pas une validation de plus** — c'est exactement ce
que KURLA reproche aux recommandations génériques.

### Type 3 — Façonniers cosmétiques généralistes (peau)

Pour les 16 fiches de la gamme peau, actuellement en formulation cible.
Le pack C1 existant (`docs/sourcing/`) couvre déjà ce volet avec 18
fournisseurs fichés ; il n'est pas reproduit ici.

### Type 4 — Marketplaces et grossistes B2B généralistes

Utile pour élargir vite, au prix d'une traçabilité plus faible.

| Acteur | Ce qui est VÉRIFIÉ |
|---|---|
| **Qogita** — `qogita.com/beauty-personal-care/` | marketplace B2B UE ; déjà fiché dans la shortlist C1 |
| **BigBuy** — `bigbuy.eu` | dropship UE ; déjà fiché dans la shortlist C1 |
| **Europages** | annuaire B2B — outil de découverte, pas un fournisseur |

### Type 5 — Distributeurs internationaux

| Acteur | Localisation | Ce qui est VÉRIFIÉ |
|---|---|---|
| **B. Futurist B.V.** | Capelle aan den IJssel (NL), 50-99 salariés, fondé 2020 | grossiste international, portefeuille parfums/cosmétiques/**soins capillaires** |
| **Join Stadskanaal B.V.** | Pays-Bas, depuis 2003 | distributeur international cosmétiques et soins, livraison mondiale |

### Type 6 — Marques en direct (revente ou partenariat)

Le pack S1 contient déjà des mails prêts pour **Nappy Queen, Activilong, Les
Secrets de Loly, Soarn, Kalia Nature, Carolina B, Musoya** (marques françaises
cheveux texturés) et **In'oya, Ametis Cosmetics, Nuhanciam** (peaux mélaninées).
Ce sont des interlocuteurs de **partenariat**, pas des fournisseurs anonymes :
la relation se négocie marque par marque.

### Type 7 — Affiliation

Aucun stock, aucune responsabilité produit, aucun SKU. Quatre programmes sont
déjà fichés dans la shortlist C1 (**LOOKFANTASTIC Europe, MiiN Cosmetics FR,
YesStyle, iHerb EUR**) et les mails sont écrits dans
`EMAILS_FOURNISSEURS_MANQUANTS_2026-09-12.md`. Le cadre est dans
`docs/PLAN_AFFILIATION.md`.

**C'est le seul type qui permet d'élargir la gamme immédiatement sans achat.**

### Type 8 — Matière première et coopératives

Pour les références KURLA propres à base d'ingrédient unique (le karité).
**Aucune coopérative n'est vérifiée ce tour** — je n'en nomme donc aucune. Le
mail générique est prêt dans `EMAILS_FOURNISSEURS_MANQUANTS_2026-09-12.md`.

---

## 4. Ce que la combinaison de ces types permet réellement

| Objectif | Type à mobiliser | Délai réaliste |
|---|---|---|
| **Sécuriser les 24 marques déjà vendues** | 1 (grossiste stock FR) | jours |
| **Élargir la gamme sans achat** | 7 (affiliation) | semaines |
| **Ajouter des marques françaises texturées** | 6 (direct) | semaines à mois |
| **Créer la gamme propre KURLA** | 2 (façonnier) | mois, avec échantillonnage 4C |
| **Couvrir la gamme peau** | 3 (pack C1 existant) | mois |

**Il n'existe pas un partenaire qui donne « tous les produits cosmétiques ».**
Quiconque le promet vend de la largeur sans traçabilité. La largeur réelle vient
de la combinaison, et chaque type a un coût différent en responsabilité
réglementaire — c'est le tableau du §2 qui doit décider, pas la taille du
catalogue annoncé.

---

## 5. Les trois actions qui comptent, dans l'ordre

1. **Renseigner `origin_country` sur les 63 produits.** Sans ça, aucune décision
   d'approvisionnement n'est fondée. C'est une saisie, pas un chantier.
2. **Réparer le garde CPNP.** Créer la colonne `cpnp_ready` (et
   `responsible_person`) ou retirer le test du code. **L'état actuel est le pire
   des deux : un contrôle écrit, qui ne peut jamais bloquer, et qui donne
   l'impression d'être couvert.**
3. **Contacter BLACKETIQUE.** Son portefeuille recoupe le catalogue KURLA, avec
   stock France — donc sans obligation de Personne Responsable.

---

## 6. Ce que ce dossier ne couvre pas, explicitement

- **Pas de liste exhaustive des acteurs** — elle n'existe pas, et je n'en ai pas
  fabriqué une.
- **Aucun prix.** Je n'en ai vérifié aucun.
- **Les MOQ marqués DÉCLARATIF** sont des annonces commerciales : 200 pièces
  chez LissCréation et « dès 6 unités » chez MY.LAB doivent être confirmés par
  écrit avant toute décision.
- **Aucune coopérative de karité nommée**, faute d'en avoir une vérifiée.
- **Pas de vérification de la conformité réelle** des 24 marques tierces : le
  fait qu'un grossiste les ait en stock France est un indice fort, pas une
  preuve. La notification CPNP et la Personne Responsable se vérifient produit
  par produit.
- **Le cheveu texturé n'est la spécialité affichée d'aucun façonnier trouvé.**
  C'est un angle mort du marché, et c'est aussi l'occasion de KURLA — mais cela
  veut dire qu'aucune formule existante ne peut être reprise telle quelle.
- **Rien n'est envoyé.** Les mails existants sont dans
  `EMAILS_FOURNISSEURS_MANQUANTS_2026-09-12.md` et `EMAILS_SEGMENTES_PAR_PAYS.md`.
