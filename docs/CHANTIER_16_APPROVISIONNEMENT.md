# Chantier 16 — Approvisionnement : catalogue, besoins, sources, chantiers

Rédigé le 29/08/2026 en posture achats/inventaire.
**Règle tenue ici : aucun fournisseur, aucun chiffre, aucune obligation inventés.**
Chaque nom et chaque date viennent soit de la base KURLA (vérifiée par requête),
soit d'une source citée en fin de document.

---

## A. Le catalogue exhaustif — ce que nous vendons réellement

16 références en base, réparties en 6 sous-marques et 3 univers. État mesuré le
29/08/2026.

### A.1 Soins cheveux (9 références)

| Réf | Produit | Marque | Prix | Composition déclarée | État |
|---|---|---|---|---|---|
| p2 | Shampoing Doux Sans Sulfates | KURLA Botanicals | 14,90 € | Extrait de Guimauve, Aloe Vera Pur, Cocamidopropyl Betaine | bloqué (composition) |
| p3 | Masque Hydratant Profond Porosité Forte | KURLA Botanicals | 24,90 € | Huile de Carapate (Black Castor), Acide Hyaluronique capillaire, Kératine végétale | bloqué (composition) |
| p1 | Leave-In Hydratant Cacao & Mangue | KURLA Botanicals | 10,00 € | Beurre de Mangue, Extrait de Cacao, Protéine de Soie végétale, Huile de Tournesol | bloqué (composition) |
| p9 | Crème Définition Boucles & Twists | KURLA Botanicals | 17,90 € | Beurre de Karité, Protéine de Riz, Huile d'Argan | **publié** |
| p5 | Huile Cuir Chevelu Légère & Pousse | KURLA Botanicals | 15,90 € | Huile de Carapate, Huile de Romarin à Cinéole, Huile de Jojoba, Vitamine E | bloqué (composition) |
| p4 | Spray Apaisant Braids & Locks Menthe | KURLA Care | 16,90 € | Hydrolat de Menthe Poivrée, Aloe Vera Pur, Extrait d'Arbre à Thé, Glycérine Végétale | bloqué (composition) |
| p12 | Kit Protective Style Braids & Locks | KURLA Care | 52,00 € | trio (p4 + p5 + p7) | bloqué (composition) |
| p11 | Kit Complet Kids Douceur & Démêlage | KURLA Kids | 49,00 € | trio (p4 + leave-in + p8) | bloqué (composition + sécurité mineurs) |
| p16* | Taie d'Oreiller 100 % Soie de Mûrier 22 Momme | KURLA Essentials | 34,90 € | matériau, pas un INCI | bloqué (composition) |

### A.2 Soins peau (3 références KURLA + 2 tierces)

| Réf | Produit | Marque | Prix | Composition déclarée | État |
|---|---|---|---|---|---|
| p10 | Sérum Marques Post-Imperfections Niacinamide | KURLA Skincare | 29,90 € | Niacinamide 5 %, Acide Tranexamique 3 %, Zinc PCA | **publié** |
| p6 | Sérum SPF 50+ Invisible Peau Mélaninée | KURLA Skincare | 22,90 € | Niacinamide 4 %, **« Filtres Solaires Organiques invisibles »**, Vitamine E, Squalane Végétal | bloqué (composition + SPF non mesuré) |
| p13 | Baume Apaisant Anti-Poils Incarnés Barbe | KURLA Men | 19,90 € | Acide Salicylique 1,5 %, Huile d'Arbre à Thé, Aloe Vera, Allantoïne | **publié** |
| p14 | Milk Marvel Dark Spot Serum | **Eadem** (tierce) | 62,00 € | Amber Algae, Niacinamide, Vitamin C Ester, Encapsulated Kojic Acid | exclu — marque tierce |
| p15 | Black Girl Sunscreen Broad Spectrum SPF 30 | **Black Girl Sunscreen** (tierce) | 24,90 € | Huile d'Avocat, Jojoba, Jus de Cacao, Tournesol | exclu — marque tierce |

### A.3 Accessoires et matériel (4 références)

| Réf | Produit | Marque | Prix | Nature | État |
|---|---|---|---|---|---|
| p7 | Bonnet Satin Microfibre Premium XL | KURLA Essentials | 12,90 € | textile | bloqué (composition = matériau) |
| p8 | Brosse Démêlante Douce Flex-Bristle | KURLA Essentials | 9,90 € | outil injecté | bloqué (composition = matériau) |
| p16 | Taie d'Oreiller Soie de Mûrier 22 Momme | KURLA Essentials | 34,90 € | textile | bloqué (composition = matériau) |
| p12 | Kit Protective Style | KURLA Care | 52,00 € | coffret | bloqué |

### A.4 Ce que le catalogue ne dit pas encore (mesuré)

| Donnée manquante | Portée | Conséquence achats |
|---|---|---|
| `inci` vide | 16/16 | Impossible de passer commande : un façonnier exige la formule ou la liste INCI cible |
| `size_label` vide | 16/16 | Aucun contenant déclaré → pas de prix de revient, pas de MOQ cohérent |
| `source_supplier`, `supplier_sku` vides | 16/16 | Aucune provenance : le produit n'a pas d'origine |
| `allergens` vide | 16/16 | p4, p5, p12 contiennent menthe poivrée et romarin : allergènes réglementés non déclarés |
| Aucune table `suppliers` | — | Le fournisseur n'existe pas comme entité, seulement comme chaîne libre dans la route d'import |
| Filtres UV non nommés | p6, p15 | Un solaire sans filtres déclarés ne peut être ni acheté ni notifié |

---

## B. Analyse de besoin — ce qu'il nous faut, et ce qu'il nous faudra

Méthode : partir des besoins déjà exprimés dans la base (`concerns`,
`hair_types`, `skin_types`), pas d'une intuition de gamme.

### B.1 Ce que le catalogue couvre

Lavage doux · hydratation scellée · définition boucles · masque porosité forte ·
cuir chevelu (apaisement, huile) · coiffures protectrices (tresses, locks) ·
protection nocturne · démêlage · anti-marques (niacinamide) · protection
solaire · rasage/barbe · enfants.

### B.2 Les trous de gamme, hiérarchisés par besoin utilisateur

**Trou n°1 — l'après-shampoing rincé.** Le catalogue lave (p2) et scelle (p1),
mais ne démêle pas sous la douche. Sur cheveux 4A-4C, l'après-shampoing est le
geste qui précède tous les autres ; son absence rend la routine incomplète.
C'est le premier produit à sourcer.

**Trou n°2 — le shampoing clarifiant.** Le `not_ideal_if` de p2 dit lui-même
qu'il n'est pas fait pour les résidus de coiffage épais. Or les coiffures
protectrices (p4, p12) en produisent. Nous promettons un besoin que nous ne
couvrons pas.

**Trou n°3 — l'équilibre protéine/hydratation.** p3 est annoncé « porosité
forte » avec kératine et acide hyaluronique, mais rien ne couvre le versant
protéiné pur (soin protéiné) ni le versant hydratant profond sans protéine. Sur
cheveux texturés, l'excès de protéine casse autant que son manque : une gamme
qui n'a qu'un côté fait des erreurs de routine.

**Trou n°4 — la fixation.** p9 définit mais ne fixe pas. Pas de gel, pas de
gelée, pas de crème fouettée pour twists-out.

**Trou n°5 — le cuir chevelu traité, pas seulement apaisé.** p4 apaise, p5
nourrit. Rien pour les pellicules sèches récurrentes, rien pour les démangeaisons
liées aux tresses serrées au-delà de l'apaisement immédiat.

**Trou n°6 — le solaire réellement formulé.** p6 existe mais sans filtres UV
déclarés. Soit nous le sourçons sérieusement (mesure ISO incluse), soit nous le
retirons : une fiche SPF sans filtre est un risque, pas un produit.

**Trou n°7 — les formats.** Aucun format voyage, aucun format recharge. La loi
AGEC pousse au réemploi (10 % d'emballages réemployables visés en 2027) et nos
utilisateurs voyagent.

**Trou n°8 — les hommes au-delà de la barbe.** p13 est seul. Pas de shampoing
barbe, pas d'huile barbe, pas de soin post-rasage sans acide.

### B.3 Ce que je recommande de **ne pas** ajouter maintenant

Rien qui exige un historique que nous n'avons pas : pas de gamme capillaire
« professionnelle salon » (il faudrait un réseau), pas de compléments alimentaires
(réglementation distincte, et notre règle exclut le diagnostic), pas de
coloration (risque allergène majeur et obligation de test).

---

## C. Où nous approvisionner — le réel, par catégorie

### C.1 Formulation et fabrication cosmétique (p1 à p6, p9 à p13)

Le modèle adapté à notre taille est le **façonnier full-service** : il formule,
fabrique, conditionne, et — point décisif — fournit le dossier réglementaire.

**France** (argument : délai court, « Made in France », pas de douane, un seul
fuseau pour les échantillons) :
- **Lessonia** (Saint-Thonan, Finistère) — façonnier depuis 2002, site de
  16 000 m², marque blanche et sur-mesure, ISO 22716 (GMP).
- **ABC Texture** — laboratoire R&D et sous-traitant, ISO 22716, du vrac au
  full-service.
- **Laboratoires Biotic Phocéa**, **Laboratoire Alvend** (depuis 1995, marques
  de distributeur bio), **Pôle Cosmétique** (full-service, de l'idée au produit
  fini), **Laboratoire de Cosmétologie Moderne** (Limoges, depuis 1965).
- **Hair Liss / Liss Creation** (Choisy-le-Roi) — laboratoire capillaire
  spécialisé en marque blanche, livraison Europe. C'est le plus proche de notre
  cœur de métier : capillaire, pas cosmétique généraliste.

**Europe** (argument : MOQ plus bas, coût moindre, même cadre réglementaire) :
- **Noesis** (Bulgarie) — MOQ **à partir de 500 pièces**, fournit PIF + CPSR par
  expert agréé **et** la notification CPNP.
- **Laboratoires BEA** (France) — ISO 9001, ISO 22716, ECOCERT, COSMOS, NOP, BDIH.
- **NISHA Manufacturing** (Pologne) — GMP, ISO 22716, production compétitive
  conforme UE.
- **Cita Lieta** (Lettonie) — white label et full contract, support CPNP, expédie
  UE/US/Asie/Australie.

**Ordre de grandeur à retenir** : les MOQ vont de **500 pièces** (façonnier
boutique, formule existante) à **5 000–10 000 pièces par référence** pour une
formule propriétaire avec actifs brevetés. Délai typique après validation :
**6 à 12 semaines**.

### C.2 Solaire (p6, et p15 si reprise)

C'est la catégorie la plus encadrée, et la seule où **l'indice se prouve** :
- SPF mesuré **in vivo selon ISO 24444** ;
- UVA-PF vérifié **in vitro selon ISO 24443**, avec l'exigence européenne
  **UVA-PF ≥ 1/3 du SPF** et le logo UVA ;
- photostabilité, résistance à l'eau (40/80 min) si revendiquée.
Un façonnier qui ne propose pas ces tests ne peut pas nous vendre un SPF
revendiqué. MOQ observés : 500 à 5 000 selon filtres et contenant.
Le fini « invisible sur peau mélaninée » se traite par la taille de particule,
les enrobés et la teinture — c'est un critère à écrire dans l'appel d'offres,
pas un adjectif.

### C.3 Accessoires textiles (p7 bonnet, p16 taie, kits p11/p12)

La soie de mûrier vient du **Jiangsu (Chine)**, région présentée par les marques
françaises du secteur comme le berceau historique de la soie. Les critères à
exiger, tous vérifiables :
- **grade 6A** et **momme** (19 / 22 / 25) écrits au contrat ;
- **OEKO-TEX Standard 100** (contact peau prolongé, produit destiné aux enfants
  dans le cas du kit p11) ;
- fermeture et finition (zip cousu, passepoil) définies sur échantillon.
Alternative au 100 % soie : le **satin de polyester** (p7 l'est déjà) et le
**Tencel**, moins chers et plus simples à entretenir — à trancher par produit,
pas par principe.

### C.4 Outils (p8 brosse démêlante)

- **Union européenne** : **DR Farnos** (Castellón, Espagne) — private label
  clé en main, spécialisé brosses démêlantes ergonomiques. Argument décisif :
  pas de douane, pas de fret longue distance, et un « Made in EU ».
- **Italie** : **Tek Brushes** (Milan, depuis 1977) — brosses bois FSC faites
  main, private label, positionnement premium.
- **Chine** : **JunYi Beauty** (Dongguan, depuis 1999, OEM/ODM complet),
  **Mackay Hair Tools** (Guangzhou, ISO 9001 + BSCI, outillage et moules en
  interne), **Yaeshii** (Jiangxi, ISO 9001, CE, BSCI, FSC, SGS, RoHS),
  **Vickky** (MOQ annoncé **300 pièces par design**, 35 presses, échantillonnage
  en 7 jours).
Pour une brosse, le **moule** est le vrai sujet : soit nous prenons un moule
existant (rapide, peu cher, produit non exclusif), soit nous ouvrons un moule
(exclusif, investissement, délai). À trancher avant de consulter.

### C.5 Matières premières — là où se joue notre récit

Notre catalogue déclare du **beurre de karité** (p9), du **cacao** (p1), du
**carapate/ricin** (p3, p5, p12), de l'**argan** (p9), de l'**aloe** (p1, p2,
p4, p11, p13).

Le karité se sourcit au **Burkina Faso** auprès de coopératives de femmes —
c'est la troisième exportation du pays derrière le coton et le bétail, et la
filière est structurée (Coopake, UPROKA), avec du karité bio certifié Ecocert et
du commerce équitable labellisé SPP. INCI : *Butyrospermum parkii butter*.
Acheter le karité en direct d'une coopérative plutôt qu'à un négociant européen
change trois choses : le prix payé aux productrices, la traçabilité, et la
preuve que nous pouvons montrer. C'est le seul poste où l'approvisionnement
**est** le récit de la marque.

---

## D. Le socle réglementaire que l'approvisionnement doit porter

C'est la partie que personne ne voit et qui décide si le produit peut être vendu.
Elle doit être **une donnée du fournisseur**, pas un document perdu dans un mail.

| Obligation | Contenu | Échéance / portée |
|---|---|---|
| **Personne Responsable (RP)** | Toute personne mettant un cosmétique sur le marché UE doit avoir une RP établie dans l'UE, dont l'adresse figure sur l'étiquette | permanente, par produit |
| **PIF + CPSR** | Dossier d'information produit et rapport de sécurité signé par un évaluateur qualifié | avant mise sur le marché |
| **CPNP** | Notification sur le portail européen avant toute vente | avant mise sur le marché |
| **SPF : ISO 24444 / 24443** | SPF in vivo, UVA-PF ≥ 1/3 du SPF, logo UVA | p6, p15 |
| **EUDR (Règlement UE 2023/1115)** | Diligence raisonnée et géolocalisation des parcelles pour 7 matières, dont **huile de palme et ses dérivés oléochimiques (cosmétiques)** et **cacao** | **30 décembre 2026** (grandes/moyennes), **30 juin 2027** (micro et petites entreprises) |
| **AGEC — microplastiques** | Interdiction des microplastiques dans les **cosmétiques rincés** au-delà de 0,01 % en masse | **1er janvier 2026** — concerne directement p2 (shampoing) ; non-rincés en janvier 2027 |
| **AGEC — REP emballages** | Adhésion à un éco-organisme (Citeo), déclaration annuelle, éco-contribution, **logo Triman + Info-Tri** | opérationnel au **1er juillet 2026**, première déclaration au 31 décembre 2026 |
| **PPWR (Règlement UE 2025/40)** | S'applique directement ; contenu recyclé obligatoire dès 2028, objectifs de réemploi à 2030 | **12 août 2026** |

**Conséquence concrète pour nous** : deux produits du catalogue actuel tombent
sous des obligations déjà en vigueur ou imminentes — **p2** (microplastiques
rincés) et **p1** (extrait de cacao → EUDR). Ce n'est pas un sujet juridique
abstrait, c'est un critère d'appel d'offres : un façonnier doit nous dire si sa
formule est sans microplastique et nous fournir l'origine de ses dérivés.

---

## E. Le modèle de données — ce que la base doit porter

Aujourd'hui : **aucune table `suppliers`**, et `source_supplier` est une chaîne
libre que la route d'import enregistre telle quelle. Deux imports avec
« Laboratoire X » et « laboratoire x » feraient deux provenances distinctes.

Ce que je propose (détail en chantier 16B) :

- `suppliers` : identité, pays, site, contact, type (façonnier / textile / outil /
  matière première), MOQ annoncé, délai annoncé, certifications détenues.
- `supplier_documents` : **le CPSR, le PIF, la notification CPNP, le certificat
  OEKO-TEX, l'attestation EUDR comme documents datés et rattachés** — pas comme
  une case cochée. Un document sans date et sans fichier ne prouve rien.
- `supplier_products` : ce que ce fournisseur nous fournit, sous quel SKU, à quel
  prix d'achat, avec quel contenant — le lien manquant entre `products` et
  `inventory`.
- `purchase_orders` : seulement quand il y aura des commandes réelles. Pas avant.
- `supplier_messages` : l'historique des échanges (appels d'offres, relances),
  avec le modèle envoyé et la réponse reçue.

**Ce que je ne ferais pas** : noter ou classer les fournisseurs. Sans historique
d'achat, un score serait une opinion habillée en mesure. Un fournisseur se juge
sur des faits datés — documents fournis, délais tenus, lots conformes — et ces
faits n'existent pas encore.

---

## F. Au-delà de la demande — ce à quoi il faut penser maintenant

1. **La conformité comme donnée de premier rang.** Le vrai actif d'un
   approvisionnement, ce n'est pas le contact, c'est la preuve. Un tableau de
   bord qui affiche « fournisseur : Lessonia » ne vaut rien ; un tableau qui
   affiche « CPSR reçu le 12/03, CPNP notifié, attestation sans microplastique
   du 04/05, origine karité : coopérative X, parcelles géolocalisées » est un
   outil de décision et un bouclier en cas de contrôle.

2. **Le rappel de lot.** Le jour où un lot pose problème, la question est :
   *quelles commandes contiennent ce lot ?* Sans lien lot → commande → client,
   la réponse est « on ne sait pas ». Ce lien coûte peu à mettre en place dès le
   départ et est impossible à reconstituer après.

3. **Le double sourcing comme règle, pas comme option.** Pour toute référence
   qui se vend, un second fournisseur qualifié. La soie vient d'une seule région
   du monde ; un aléas là-bas arrête la gamme ici.

4. **Le coût servi, pas le prix d'achat.** Prix d'achat + fret + douane +
   éco-contribution + perte. Sans lui, une marge affichée est une fiction. C'est
   un calcul, pas un module comptable.

5. **La carte du sourcing — seulement si elle porte une décision.** Une carte
   avec des points colorés est décorative. La même carte qui affiche *délai
   total, risque pays EUDR, exposition mono-source* devient un outil. C'est la
   condition que je mets à cet écran.

6. **L'appel d'offres comme objet, pas comme mail.** Un RFQ structuré (produit,
   contenant, quantité, exigences réglementaires, date de réponse attendue)
   envoyé depuis la plateforme, avec les réponses comparées côte à côte. C'est
   là que « envoyer un message aux fournisseurs » prend tout son sens : un
   message libre se perd, un RFQ se compare. L'infrastructure d'envoi existe
   déjà (un fournisseur e-mail est configuré en production).

7. **La boucle réemploi.** L'AGEC pousse au réemployable. Un contenant consigné
   ou rechargeable se décide **à la conception du produit**, donc maintenant,
   pas après le choix du flacon.

8. **Ce que je refuse explicitement** : utiliser les données des membres
   (profils, diagnostics, routines) pour dimensionner nos achats ou négocier nos
   prix. C'est exclu par nos règles — la donnée de l'utilisateur n'est pas un
   avantage commercial. Le dimensionnement se fera sur les ventes et sur des
   hypothèses déclarées, pas sur des profils individuels.

---

## G. Chantiers subdivisés

### Chantier 16A — Le référentiel fournisseurs (fondation)
Table `suppliers` + `supplier_documents`, migration appliquée et vérifiée,
résolution du fournisseur à l'import (plus de chaîne libre), route et banc.
**Critère d'acceptation** : deux imports nommant le même fournisseur de deux
façons différentes produisent **une** seule entité, et l'ambiguïté est remontée,
pas tranchée en silence.

### Chantier 16B — La conformité rattachée
`supplier_documents` alimenté pour les 14 références KURLA : RP, PIF, CPSR,
CPNP, ISO 24444/24443 pour les solaires, OEKO-TEX pour les textiles,
attestation sans microplastique pour p2, origine et géolocalisation EUDR pour
p1. **Critère** : pour chaque produit, l'écran répond « quels documents avons-nous,
de quand datent-ils, que manque-t-il ». Aucun document ne peut être marqué reçu
sans fichier et sans date — même règle que les vérifications du chantier 14.

### Chantier 16C — Le sourcing réel, par vague
Vague 1 : l'après-shampoing rincé et le shampoing clarifiant (les deux trous
critiques) + un façonnier qualifié pour les 9 soins cheveux.
Vague 2 : les accessoires (textile Jiangsu ou satin, brosse UE ou Chine).
Vague 3 : le solaire, uniquement avec un partenaire qui fournit ISO 24444/24443.
**Critère** : chaque vague produit un RFQ structuré envoyé, des réponses
comparées, et un fournisseur retenu avec ses documents.

### Chantier 16D — Lot, coût servi, double sourcing
Lien lot → commande, calcul du coût servi, règle du second fournisseur qualifié
par référence vendue. **Critère** : la question « quelles commandes contiennent
le lot X » a une réponse en une requête.

### Chantier 15A — L'inventaire vérifié de l'administration (préalable)
Les 29 routes `/api/admin/*` passées en revue avec une vraie session
`superadmin`, et la liste nominative de celles qui n'ont aucun écran.
**Critère** : chaque route a un statut mesuré — écran existant, écran manquant,
ou route morte.

### Chantier 15B — Le tableau de bord fournisseurs et catalogue
L'écran qui réunit : ce que nous vendons (état de publication, blocages
nommés), d'où cela vient, quels documents nous avons, quel est le coût servi,
et ce qu'il faut commander. Avec l'envoi de RFQ et l'historique des échanges.
**Critère** : une personne qui ouvre l'écran peut répondre à « ce produit
peut-il être vendu, et sinon qu'est-ce qui manque » sans ouvrir une base de
données.

### Ordre recommandé
**15A → 16A → 16B → 16C → 15B → 16D.**
15A d'abord parce qu'il dit ce qui existe déjà et évite de reconstruire.
16A et 16B avant 16C parce que consulter des fournisseurs sans endroit où
ranger leurs documents produit des preuves perdues. 15B après 16B parce qu'un
écran sans données vraies derrière est une maquette.

---

## Sources

- Façonniers français et européens : annuaires Europages « sous-traitance
  cosmétique » et « marque blanche France » ; lessonia.com ; abctexture.com ;
  noesiscosmetics.com ; wonnda.com (comparatif 2026 : Laboratoires BEA, NISHA,
  Cita Lieta, Cosmewax).
- MOQ et délais private label : noesiscosmetics.com (500 pièces, PIF/CPSR/CPNP) ;
  yeddahaircare.com (5 000–10 000 pièces pour formule propriétaire) ;
  madebynaturelabs.com (MOQ 500, 4–6 semaines) ; zrwcosmetic.com (1 000–5 000,
  6–12 semaines).
- Solaire, méthodes et exigences : zrwcosmetic.com (ISO 24444 / ISO 24443,
  UVA-PF ≥ 1/3 SPF, logo UVA, photostabilité) ; zeruncosmetic.com ;
  sunscreenmanufacturer.com ; hairodm.com (RP, PIF, CPSR, CPNP).
- Brosses et outils : mackayhairtools.com (top 15, 2026 : JunYi, DR Farnos,
  Yaeshii, Tek, Kent) ; haircarecn.com ; vickkybeauty.com (MOQ 300 par design).
- Soie de mûrier : emilyspillow.com et taie-oreiller.fr (Jiangsu, grade 6A,
  OEKO-TEX Standard 100, 19/22/25 mommes) ; nesely.com (soie + Tencel).
- Karité : lesechos.fr (filière Burkina Faso, coopératives, troisième poste
  d'exportation) ; ethiquable.com (coopérative Coopake, label SPP) ;
  lafabrikabulles.fr (Ecocert, INCI *Butyrospermum parkii butter*).
- EUDR : orki.green, agrinfo.eu, qualitairsea.com, swim.legal (Règlement UE
  2023/1115, 7 matières dont palme et cacao, 30/12/2026 grandes et moyennes,
  30/06/2027 micro et petites entreprises).
- AGEC et PPWR : hellocarbo.com (microplastiques cosmétiques rincés au
  01/01/2026, PPWR au 12/08/2026) ; recy.net ; blog.ovol.fr ;
  reglementation-environnement.com (REP emballages professionnels, opérationnel
  au 01/07/2026, première déclaration au 31/12/2026) ; ecommercemag.fr
  (Triman, Info-Tri, Citeo/Refashion).
