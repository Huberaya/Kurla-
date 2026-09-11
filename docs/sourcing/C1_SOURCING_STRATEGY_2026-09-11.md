# C1 — Sourcing peau sans stock propre en année 1

**Date de cadrage :** 11 septembre 2026  
**Marché de départ :** France métropolitaine  
**Statut :** sourcing exécuté au niveau fournisseurs/canaux ; aucun SKU déclaré prêt à vendre sans dossier produit.

## 1. Décision opératoire

KURLA ne constituera pas de stock propre en année 1. Le catalogue peau est donc séparé en trois canaux :

| Canal | Usage C1 | Qui détient le stock ? | Checkout KURLA |
|---|---|---|---|
| **Affiliation** | Tester les besoins, les contenus et les marques sans prise de commande KURLA | Le marchand affilié | Non : lien sortant tracké, mention affiliation |
| **Dropshipping fournisseur** | Vendre une référence déjà documentée ; le fournisseur expédie directement | Fournisseur / distributeur | Seulement après contrat, flux de commande, retours et preuves vérifiés |
| **3PL** | Passer les références validées et répétitives en expédition KURLA ou en kits | Fournisseur ou KURLA chez le 3PL | Oui uniquement après stock réceptionné, lots tracés et intégration opérationnelle |

**Règle de sécurité :** un fournisseur trouvé n'est pas une référence publiable. La fiche passe par la truth layer KURLA et par le contrat C1 : fournisseur résolu, SKU fournisseur, INCI final, RP UE, CPSR/PIF/CPNP lorsque cosmétique, claims revus, visuel sous droits, lot/PAO, pays FR, stock ou précommande documentée.

## 2. Ce que KURLA recommande sur le site

Les recommandations restent organisées autour des 15 besoins de `src/lib/skinTaxonomy.ts` : `hydrater`, `eclat`, `taches`, `seche`, `grasse`, `imperfections`, `sensible`, `spf`, `anti_age`, `contour_yeux`, `levres`, `corps`, `cicatrices`, `barriere` et `par_ingredient`. Le filtre `par_ingredient` couvre notamment niacinamide, acide azélaïque, vitamine C, rétinol, AHA/BHA, céramides, squalane et acide hyaluronique.

La première vague commerciale vise 12 besoins, comme prévu par le plan P0. `cicatrices`, `levres` et `corps` peuvent être recherchés dans la matrice mais restent d'abord en contenu/affiliation tant qu'aucune référence documentée n'est retenue.

### Cibles actuelles des trois kits

Les sept composants actuellement prévus par `src/lib/peauKits.ts` sont des cibles de formulation et restent bloqués :

| ID cible | Rôle | Besoins/filtres couverts |
|---|---|---|
| `peau-ess-001` | Nettoyant doux sans parfum | sensible, hydrater, barrière |
| `peau-ess-002` | Crème céramides + squalane | hydrater, seche, barrière, sensible |
| `peau-ess-003` | SPF 50 invisible fluide | spf, taches, éclat ; whitecast IV/V/VI obligatoire |
| `peau-ess-006` | Sérum niacinamide 5 % | taches, eclat, grasse, par_ingredient |
| `peau-ess-011` | Gel acide hyaluronique | hydrater, seche, barrière, par_ingredient |
| `peau-ess-005` | Exfoliant AHA/BHA hebdomadaire | imperfections, eclat, taches, par_ingredient |
| `peau-ess-013` | Baume lèvres céramides | levres, seche, barrière |

Aucun de ces identifiants KURLA ne correspond encore à un SKU fournisseur accepté. Le sourcing doit trouver une référence réelle, puis conserver l'identifiant fournisseur et la correspondance vérifiable avant toute substitution.

### Périmètre de 40 références à rechercher

| Bloc | Références visées | Besoins couverts | Champs à exiger |
|---|---:|---|---|
| Nettoyage doux | 4 | sensible, hydratation, imperfections, barrière | sans parfum, peau sensible, INCI, texture |
| Hydratation/barrière | 7 | hydrater, sèche, barrière, sensible | céramides, squalane, glycérine/HA, fini, parfum |
| HPI / éclat | 6 | taches, éclat, par ingrédient | niacinamide, azélaïque ou vitamine C, concentration vérifiée, claims non éclaircissants |
| SPF | 6 | SPF sans trace blanche, éclat/HPI | SPF/UVA, whitecast documenté, phototypes IV/V/VI, conditions de test |
| Imperfections / pores | 4 | imperfections, grasse, par ingrédient | BHA ou actif équivalent, avertissements, fréquence, incompatibilités |
| Peau grasse / textures légères | 3 | grasse, hydrater, éclat | texture gel/lotion, fini mat ou naturel, non-assèchement documenté |
| Anti-âge / fermeté | 3 | anti_age, barrière, sensible | rétinol ou alternative, fréquence, avertissements, incompatibilité AHA/BHA |
| Contour des yeux | 2 | contour_yeux, sèche, sensible | tolérance et usage contour des yeux, claims contrôlés |
| Nettoyage/hydratation corps ciblé | 2 | première couverture corps uniquement si preuve | INCI, pays, lot, claims corps |
| Lèvres / cicatrices | 3 | affiliation ou contenu en première vague | pas de publication KURLA sans dossier complet |
| **Total** | **40** | **12 besoins commerciaux en vague 1** | — |

Les produits ne seront pas sélectionnés uniquement parce qu'ils contiennent un actif. La sélection exige aussi une texture, un fini, une sensibilité, un pays et un état de preuve utilisables par les filtres C2.

## 3. Fournisseurs et canaux identifiés

### A. Dropshipping ou expédition directe

#### 1. BigBuy — candidat dropshipping UE généraliste

- Catalogue de plus de 400 000 produits annoncé ; stock européen et entrepôt propre annoncé.
- Expédition directe vers le client final et intégrations e-commerce.
- Une catégorie officielle « skin care » existe.
- **Usage KURLA :** sourcing rapide de références de test et accessoires ; ne pas accepter une cosmétique sans dossier produit complet.
- **À demander :** liste des marques autorisées, INCI, RP UE, CPNP, CPSR/PIF, lot/PAO, pays d'expédition, flux de retours, facture et responsabilité des claims.
- **Risque :** catalogue large mais qualité documentaire variable selon la référence ; la plateforme ne remplace pas la validation SKU.
- Source : `https://www.bigbuy.eu/en/dropshipping.html` et `https://www.bigbuy.eu/en/shop/category/beauty-skin-care`.

#### 2. BTSWholesaler — candidat beauté/cosmétiques UE

- Le site annonce wholesale, dropshipping dans l'Union européenne, stock propre et expédition au nom/logo du revendeur.
- **Usage KURLA :** tester des références beauté documentées sans stock KURLA, sous réserve de contrat et d'intégration de commande.
- **À demander :** export catalogue, stock par SKU, provenance, documents CPNP/RP/INCI, conditions de retour et preuve que le colis peut être neutre ou co-brandé.
- Source : `https://www.btswholesaler.com/`.

#### 3. Spocket — marketplace de fournisseurs US/UE

- La catégorie beauté met en avant des fournisseurs US/UE et des options de livraison rapide.
- **Usage KURLA :** outil de découverte et de comparaison, pas une preuve de conformité.
- **À demander à chaque fournisseur :** raison sociale, pays d'expédition, documents réglementaires par SKU, échantillon, délais FR, retours et synchronisation de stock.
- Source : `https://www.spocket.co/dropship/bath-beauty`.

### B. Grossistes européens pour une étape 3PL ultérieure

#### 4. Qogita — marketplace B2B beauté

- Le site annonce plus de 500 fournisseurs vérifiés, plus de 10 000 marques et un catalogue santé/beauté ; les commandes sont expédiées depuis des entrepôts fournisseurs européens.
- **Usage KURLA :** comparer les offres, vérifier l'authenticité et acheter ultérieurement de petites quantités pour un 3PL ; pas un dropship KURLA automatique identifié dans la recherche.
- **À demander :** preuve d'autorisation de revente par SKU, documents UE, MOQ réel, disponibilité FR, lot/PAO, facture et conditions de retour.
- Source : `https://www.qogita.com/` et `https://www.qogita.com/beauty-personal-care/`.

#### 5. Qudo Beauty — grossiste K-beauty UE

- Le site annonce un entrepôt en Roumanie, une expédition UE, plus de 80 marques, pas de MOQ annoncé et des documents CPNP/INCI/RP disponibles sur demande.
- **Usage KURLA :** candidat prioritaire pour hydratation, barrière, niacinamide, SPF et soins K-beauty ; acheter d'abord quelques unités de test ou faire expédier via un 3PL.
- **À contrôler avant toute publication :** les documents annoncés doivent être réellement transmis et rattachés à chaque SKU, pas seulement à la marque.
- Source : `https://qudobeauty.com/`.

#### 6. Korean Skincare Supply — grossiste NL

- Le site se présente comme grossiste néerlandais pour la skincare coréenne, avec faibles MOQ, expédition UE et produits annoncés CPNP-compliant.
- **Usage KURLA :** alternative NL à Qudo pour réduire les risques de dépendance à un seul fournisseur.
- **À demander :** liste des marques autorisées, preuves CPNP/RP par SKU, INCI final, lots, stock et conditions de réassort.
- Source : `https://koreanskincaresupply.com/`.

#### 7. French Lady — grossiste naturel et dropshipper à qualifier

- Le site annonce des solutions B2B pour marques de cosmétiques naturelles et des services destinés aux retailers et dropshippers.
- **Usage KURLA :** piste pour produits naturels, corps et barrière ; non retenue comme fournisseur accepté tant que la liste de marques et les dossiers SKU ne sont pas reçus.
- Source : `https://frenchlady.co/pages/organic-cosmetics-wholesale`.

### C. Marques à contacter directement

Ces marques sont des pistes d'approvisionnement direct, pas des fournisseurs validés :

- In'oya — intérêt potentiel sur HPI et peaux foncées ; demander compte professionnel, disponibilité, conditions revendeur et dossier UE. Site de marque identifié : `https://inoya-laboratoire.com/fr/`.
- Ametis Cosmetics — intérêt potentiel sur peaux mates/foncées ; demander catalogue, distributeur, dossier UE et capacité d'expédition. Site de marque identifié : `https://www.ametiscosmetics.com/`.
- Nuhanciam — intérêt potentiel sur HPI, hydratation, contour des yeux et SPF ; demander canal B2B, conditions revendeur et dossier UE. Site de marque identifié : `https://nuhanciam.com/`.
- Activilong et autres marques pertinentes — uniquement après confirmation d'un canal B2B réel.

Aucune de ces pistes ne doit être affichée comme « fournisseur KURLA » avant réponse documentée.

### D. Affiliation sans stock

#### 8. YesStyle

- Programme d'affiliation officiel avec jusqu'à 10 % annoncé, créatifs et informations produit ; présence de réseaux Awin pour plusieurs pays européens.
- **Usage KURLA :** recommander certains produits comme « option externe » sur les pages contenu, sans les intégrer au catalogue achetable KURLA.
- Source : `https://www.yesstyle.com/en/affiliate-program.html`.

#### 9. MiiN Cosmetics FR

- Programme Awin identifié ; le site est positionné sur la K-beauty en Europe et annonce des commissions affiliées selon le type de partenaire.
- **Usage KURLA :** tests de demande et liens sortants sur les routines K-beauty ; vérifier les règles de claims, les pays et les produits effectivement disponibles en France.
- Source : `https://ui.awin.com/merchant-profile/29885`.

#### 10. LOOKFANTASTIC Europe / France

- Programme Awin identifié pour une large sélection beauté ; les conditions affichées distinguent contenu/influence, cashback et codes promotionnels.
- **Usage KURLA :** affiliation de test pour les catégories où KURLA n'a pas encore de stock ou de fournisseur.
- Source : `https://ui.awin.com/merchant-profile/10591`.

#### 11. iHerb EUR

- Programme Awin identifié avec catalogue santé/beauté et expédition annoncée vers de nombreux pays européens, dont la France.
- **Usage KURLA :** contenu/affiliation pour produits naturels et beauté ; pas de revente KURLA ni de promesse de conformité au seul motif qu'un produit apparaît sur iHerb.
- Source : `https://ui.awin.com/merchant-profile/76734`.

## 4. 3PL à qualifier après validation des premiers SKU

### FLEX. Logistique

Candidat prioritaire France/Europe : le site annonce des hubs France, Allemagne et Pologne, un WMS, le suivi des lots, FEFO/FIFO, les kits, les retours et l'expédition le jour même pour les commandes éligibles.

Source : `https://flexlogistique.fr/health-beauty-3pl-france-europe/`.

### byrd

Candidat réseau européen : le site présente du fulfillment beauté avec entrepôts notamment en France, Allemagne, Autriche et Royaume-Uni, manipulation des produits fragiles et stockage ambiant adapté.

Source : `https://www.getbyrd.com/uk/health-beauty`.

### WAPI

Candidat pour une étape multi-pays : le site annonce un réseau de 16 entrepôts, du stockage contrôlé, pick-and-pack, intégrations Shopify/WooCommerce et une livraison 24–48 h annoncée selon le réseau.

Source : `https://wapi.com/cosmetics-fulfillment/`.

### everstox

Candidat à comparer pour le suivi FEFO, les lots et les réseaux de fulfillment beauté en Europe.

Source : `https://www.everstox.com/solutions/industries/cosmetics`.

## 5. Stratégie par phase

### Phase 0 — maintenant, sans stock

- Affiliation YesStyle, MiiN, LOOKFANTASTIC et iHerb sur des pages clairement marquées « lien partenaire ».
- Prospection BigBuy, BTSWholesaler, Qudo Beauty, Korean Skincare Supply et Spocket.
- Échantillons uniquement lorsque le fournisseur accepte de transmettre le dossier produit.
- Aucun SKU KURLA publié sur la base d'un simple catalogue fournisseur.

### Phase 1 — première demande prouvée

- Sélectionner 3 à 5 héros réellement documentés.
- Commencer par le dropshipping fournisseur si l'expédition, les retours, la traçabilité et les documents sont contractualisés.
- Conserver l'affiliation pour les références complémentaires non encore sourcées.

### Phase 2 — demande répétée

- Négocier un achat minimal auprès de Qogita, Qudo ou Korean Skincare Supply.
- Réceptionner chez FLEX, byrd ou WAPI.
- Activer la gestion des lots, PAO/DDM, retours et kits.

### Phase 3 — kits

- Ne créer les kits vendables qu'après validation de leurs composants.
- Réconcilier les prix bundle depuis les prix serveurs réels.
- Expédier via 3PL uniquement lorsque les composants et les lots sont réellement présents.

## 6. Règles de rejet fournisseur

Un fournisseur est rejeté pour une référence peau si :

- il refuse de fournir l'INCI final ou le nom de la Personne Responsable UE ;
- le CPNP, CPSR/PIF ou les preuves nécessaires ne sont pas disponibles ;
- le stock est affiché mais non confirmé par SKU et date ;
- les images ou claims ne sont pas réutilisables légalement ;
- l'expédition France ou les retours ne sont pas contractuellement clairs ;
- le fournisseur ne permet pas la traçabilité du lot ;
- un SPF ne dispose pas de tests utilisables pour les phototypes IV, V et VI ;
- le fournisseur pousse des claims médicaux ou dépigmentants incompatibles avec KURLA.

## 7. Livrable de ce sourcing

Le sourcing est maintenant cadré et documenté. Il ne constitue pas encore une validation commerciale : les fournisseurs doivent répondre et transmettre leurs dossiers SKU.

Le fichier compagnon `C1_SOURCING_MATRIX_2026-09-11.csv` contient les pistes, canaux, usages, priorités et prochaines demandes.
