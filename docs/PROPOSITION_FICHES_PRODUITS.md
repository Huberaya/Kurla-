# Proposition de contenu — 16 fiches produit

**Statut : proposition, rien n'est écrit en base.** À valider fiche par fiche.
Rédigé le 29/08/2026 à partir des seules données déjà présentes en base
(`name`, `description`, `ingredients`, `hair_types`, `skin_types`, `concerns`,
`category`, `price`). Aucune donnée externe, aucun chiffre inventé.

Règles appliquées à chaque ligne :
- pas d'allégation thérapeutique, pas de résultat garanti, pas de supériorité
  annoncée — les trois règles du crible `src/lib/catalogClaims.ts` ;
- rien qui ne soit déjà écrit dans la fiche ou déductible de son type
  (un shampoing se rince, un leave-in ne se rince pas) ;
- **un champ laissé vide plutôt que rempli par hypothèse** — c'est le cas de
  `inci` et `estimated_yield` pour les 16 fiches, et la raison est donnée plus bas.

---

## 1. Les trois descriptions à réécrire avant tout

Elles échouent au crible. Proposition de remplacement, puis le contrôle est
relancé pour vérifier.

### p13 — Baume Apaisant Anti-Poils Incarnés Barbe
> **Actuel (non conforme)** : « Formule dermatologique prévenant la
> pseudofolliculite de la barbe (boutons de rasage) et adoucissant les poils
> drus. » — allégation de prévention d'une affection.
>
> **Proposé** : « Baume après-rasage à l'acide salicylique 1,5 % : il adoucit
> les poils drus, exfolie en surface pour limiter l'obstruction du follicule et
> apaise les sensations d'échauffement après le rasage. »

### p6 — Sérum SPF 50+ Invisible Peau Mélaninée
> **Actuel (non conforme)** : « Le premier soin protecteur solaire spécialement
> formulé pour les carnations riches en mélanine. Protège du photo-vieillissement
> et évite l'assombrissement des taches. » — antériorité non étayée.
>
> **Proposé** : « Protection solaire à large spectre formulée pour les carnations
> riches en mélanine : fini invisible, sans trace blanche, qui s'associe au soin
> anti-marques pour limiter l'assombrissement des taches sous exposition. »
>
> ⚠️ **Blocage à trancher** : l'indice SPF et la mention « large spectre » ne
> peuvent être publiés sans rapport de mesure. La composition déclarée
> (« Filtres Solaires Organiques invisibles ») ne nomme **aucun filtre UV** : un
> solaire doit déclarer ses filtres. Sans ces deux éléments, la fiche ne devrait
> pas être publiée.

### p15 — (marque tierce, voir §2)
> **Actuel (non conforme)** : « La référence internationale culte d'écran solaire
> transparent conçu par et pour les femmes aux peaux riches en mélanine. » —
> supériorité non étayée, et histoire de marque d'un concurrent.
>
> **Proposé** : voir la fiche reprise au §2.

---

## 2. p14 et p15 : reprise sous marque KURLA

Ces deux fiches portent aujourd'hui le nom de marques tierces réelles
(`products.brand` = `Eadem` et `Black Girl Sunscreen`) et leurs visuels montrent
les produits de ces marques. Tu as choisi de les reprendre : voici la
proposition, **à valider avant écriture** — je ne renomme pas une marque de ma
propre initiative.

| | Actuel | Proposé |
|---|---|---|
| p14 marque | `Eadem` | `KURLA Skincare` (sous-marque déjà utilisée par p6, p10) |
| p14 nom | `Milk Marvel Dark Spot Serum (Démo)` | `Sérum Anti-Marques Lait & Niacinamide` |
| p14 description | histoire de marque du concurrent | « Sérum lacté à la niacinamide et à l'acide kojique encapsulé : il accompagne l'atténuation progressive des marques sombres sur peaux riches en mélanine, sans éclaircir la peau saine autour. » |
| p15 marque | `Black Girl Sunscreen` | `KURLA Skincare` |
| p15 nom | `Black Girl Sunscreen Broad Spectrum SPF 30 (Démo)` | `Écran Solaire Invisible SPF 30 Peaux Mélaninées` |
| p15 description | « La référence internationale culte… » | « Écran solaire à large spectre, fini transparent sur les carnations riches en mélanine, qui hydrate sans laisser de film gras. » |

⚠️ p15 porte le même blocage que p6 : indice SPF et filtres UV non déclarés.
⚠️ Leurs compositions contiennent trois mentions non résolues (p14 : Amber
Algae, Vitamin C Ester, Encapsulated Kojic Acid — les deux premières sont
ambiguës, plusieurs substances différentes portent ces noms commerciaux).

---

## 3. Contenu proposé, fiche par fiche

Légende : `bénéfice` = `benefit_primary`, `pour qui` = `for_who`,
`déconseillé si` = `not_ideal_if`, `mode d'emploi` = `how_to_use`,
`texture` = `texture`, `fréquence` = `usage_frequency`,
`avertissements` = `warnings`.

### p1 — Leave-In Hydratant Cacao & Mangue — KURLA Botanicals — 10,00 €
- **bénéfice** : Scelle l'hydratation dans la fibre et facilite le démêlage.
- **pour qui** : Cheveux texturés 3C à 4C qui cassent au démêlage.
- **déconseillé si** : Cheveux fins à faible densité, la texture riche peut alourdir ; allergie connue au beurre de mangue ou au cacao.
- **mode d'emploi** : Sur cheveux humides, une noisette répartie sur les longueurs et les pointes, en insistant sur les zones les plus sèches. Ne se rince pas.
- **texture** : Crème riche et fondante.
- **fréquence** : À chaque lavage, ou en retouche sur cheveux secs.
- **avertissements** : Usage externe. Éviter le contact avec les yeux. En cas d'irritation, espacer les applications et consulter si elle persiste.

### p2 — Shampoing Doux Sans Sulfates — KURLA Botanicals — 14,90 €
- **bénéfice** : Nettoie le cuir chevelu sans décaper les huiles naturelles.
- **pour qui** : Cheveux texturés 3A à 4C, cuirs chevelus qui tiraillent après le lavage.
- **déconseillé si** : Recherche d'un lavage clarifiant ponctuel (résidus de coiffage épais) : ce shampoing est conçu pour un nettoyage doux, pas pour un décapage.
- **mode d'emploi** : Sur cuir chevelu mouillé, masser du bout des doigts, rincer abondamment. Un second passage est possible si les longueurs sont très chargées en coiffage.
- **texture** : Gel lavant, mousse fine.
- **fréquence** : À chaque lavage, selon le rythme habituel.
- **badges** : `Sans sulfates` (reprend le nom du produit — seul badge soutenu par la fiche)
- **avertissements** : Usage externe. Éviter le contact avec les yeux.

### p3 — Masque Hydratant Profond Porosité Forte — KURLA Botanicals — 24,90 €
- **bénéfice** : Nourrit la fibre poreuse et limite la casse au brossage.
- **pour qui** : Cheveux 4A à 4C à porosité forte, longueurs rêches qui accrochent.
- **déconseillé si** : Cheveux à faible porosité, un masque riche peut rester en surface et alourdir.
- **mode d'emploi** : Après le shampoing, sur cheveux essorés, appliquer sur les longueurs. Laisser poser le temps indiqué sur l'étiquette, démêler aux doigts, rincer abondamment.
- **texture** : Masque épais.
- **fréquence** : Une fois par semaine, ou après chaque séance de coiffage protecteur.
- **avertissements** : Usage externe. Éviter le contact avec les yeux.

### p4 — Spray Apaisant Braids & Locks Menthe — KURLA Care — 16,90 €
- **bénéfice** : Apaise les tiraillements du cuir chevelu après la pose de tresses.
- **pour qui** : Braids, twists et locks, cuirs chevelus qui tiraillent entre deux poses.
- **déconseillé si** : Cuir chevelu lésé, irrité ou présentant des plaies ; sensibilité connue au menthol ou à la menthe poivrée.
- **mode d'emploi** : Vaporiser raie par raie sur le cuir chevelu, masser légèrement. Ne se rince pas.
- **texture** : Spray aqueux léger.
- **fréquence** : Au besoin, entre deux poses.
- **avertissements** : Usage externe. Éviter les yeux et les muqueuses. La présence d'huile de menthe poivrée peut être sensibilisante : test dans le pli du coude 24 h avant la première utilisation.

### p5 — Huile Cuir Chevelu Légère & Pousse — KURLA Botanicals — 15,90 €
- **bénéfice** : Nourrit le cuir chevelu et les longueurs sans les alourdir.
- **pour qui** : Tous types de cheveux, cuirs chevelu secs, longueurs qui cassent.
- **déconseillé si** : Cuir chevelu gras ou sujet aux folliculites : une huile peut entretenir l'obstruction.
- **mode d'emploi** : Quelques gouttes en massage du cuir chevelu, ou une goutte sur les pointes. Ne se rince pas.
- **texture** : Huile sèche.
- **fréquence** : 2 à 3 fois par semaine.
- **avertissements** : Usage externe. Éviter le contact avec les yeux. Test cutané préalable conseillé.
- ⚠️ Le nom annonce la « Pousse » : aucune donnée en base ne soutient un effet sur la croissance. Le nom devrait être revu, ou le mot retiré.

### p6 — Sérum SPF 50+ Invisible Peau Mélaninée — KURLA Skincare — 22,90 €
- **bénéfice** : Protège des UVA et UVB avec un fini invisible sur peaux mélaninées.
- **pour qui** : Peaux mates à foncées exposées au soleil, en complément d'un soin anti-marques.
- **déconseillé si** : Exposition prolongée sans réapplication ; enfants sans avis médical.
- **mode d'emploi** : Dernière étape de la routine du matin, sur l'ensemble du visage et du cou. Réappliquer toutes les deux heures en cas d'exposition continue, et après avoir transpiré.
- **texture** : Sérum fluide, fini invisible.
- **fréquence** : Chaque matin, avec réapplication en exposition.
- **avertissements** : Aucune protection solaire n'est totale. Réduire l'exposition aux heures les plus intenses. L'exposition excessive au soleil est un risque pour la santé.
- ⚠️ **Bloqué** : filtres UV non déclarés, indice non mesuré. Voir §1.

### p7 — Bonnet Satin Microfibre Premium XL — KURLA Essentials — 12,90 €
- **bénéfice** : Limite la friction du coton et préserve l'hydratation des longueurs pendant la nuit.
- **pour qui** : Tous types de cheveux texturés, coiffures protectrices et perruques.
- **déconseillé si** : — (accessoire, aucune contre-indication d'usage)
- **mode d'emploi** : Rassembler les longueurs, glisser le bonnet en partant de la nuque. Lavage à la main ou en cycle doux, séchage à l'air libre.
- **texture** : Satin microfibre, format XL.
- **fréquence** : Chaque nuit.
- **avertissements** : — 
- ⚠️ Sa « composition » déclarée (`Satin de Soie Synthétique Haute Densité Non Absorbant`) est un matériau, pas un ingrédient INCI : la règle de publication devrait distinguer les accessoires.

### p8 — Brosse Démêlante Douce Flex-Bristle — KURLA Essentials — 9,90 €
- **bénéfice** : Démêle les spires serrées sans arracher les nœuds.
- **pour qui** : Cheveux 3B à 4C, démêlage sur cheveux humides.
- **déconseillé si** : Démêlage à sec sur cheveux très emmêlés : le démêlage commence aux pointes, sur cheveux hydratés.
- **mode d'emploi** : Sur cheveux humides et imprégnés de leave-in, démêler des pointes vers les racines par sections.
- **texture** : Picots flexibles.
- **fréquence** : À chaque démêlage.
- **avertissements** : —
- ⚠️ Même point que p7 : composition = matériau.

### p9 — Crème Définition Boucles & Twists — KURLA Botanicals — 17,90 €
- **bénéfice** : Définit les boucles et les twists avec de la brillance, sans effet cartonné.
- **pour qui** : Boucles 3B à 4A, coiffages qui durcissent ou s'effritent.
- **déconseillé si** : Cheveux fins qui perdent le volume au coiffage.
- **mode d'emploi** : Sur cheveux humides, répartir par sections, froisser les longueurs vers le haut. Laisser sécher à l'air libre ou au diffuseur.
- **texture** : Crème de coiffage souple.
- **fréquence** : À chaque coiffage.
- **avertissements** : Usage externe. Éviter le contact avec les yeux.
- ✅ Composition complète (3 mentions rattachées sur 3) — candidate à la publication.

### p10 — Sérum Marques Post-Imperfections Niacinamide — KURLA Skincare — 29,90 €
- **bénéfice** : Accompagne l'atténuation progressive des marques sombres.
- **pour qui** : Peaux mates, foncées ou mixtes, marques laissées par les imperfections.
- **déconseillé si** : Peau lésée ou en poussée inflammatoire active ; grossesse ou allaitement sans avis médical (acide tranexamique).
- **mode d'emploi** : Matin et soir sur peau propre, quelques gouttes sur les zones concernées, puis crème hydratante. En journée, protection solaire indispensable.
- **texture** : Sérum fluide.
- **fréquence** : Matin et soir.
- **avertissements** : Usage externe. Test cutané préalable conseillé. Éviter le contour des yeux. L'atténuation des marques prend plusieurs semaines et varie d'une peau à l'autre.
- ✅ Composition complète — candidate à la publication.

### p11 — Kit Complet Kids Douceur & Démêlage — KURLA Kids — 49,00 €
- **bénéfice** : Une routine de démêlage complète pour les enfants, sans tiraillement.
- **pour qui** : Enfants de 3 à 12 ans aux cheveux texturés.
- **déconseillé si** : Cuir chevelu irrité ou lésé ; enfant de moins de 3 ans.
- **mode d'emploi** : Vaporiser le spray démêlant sur les longueurs humides, laisser agir quelques instants, démêler avec la brosse en partant des pointes, terminer par le leave-in. Utilisation par un adulte.
- **texture** : Kit (spray + leave-in + brosse).
- **fréquence** : À chaque démêlage.
- **avertissements** : Utilisation sous la surveillance d'un adulte. Usage externe. Éviter le contact avec les yeux. En cas de contact, rincer abondamment à l'eau claire.
- ⚠️ **Écart de sécurité à corriger avant publication** : produit destiné aux 3-12 ans alors que `recommended_age_min`/`recommended_age_max` sont vides, `parental_supervision_required = false` et `minor_safety_status = 'not_provided'`. Ces trois champs doivent être renseignés.

### p12 — Kit Protective Style Braids & Locks — KURLA Care — 52,00 €
- **bénéfice** : Entretien complet des coiffures protectrices, du cuir chevelu à la nuit.
- **pour qui** : Braids, twists et locks, de la pose à la dépose.
- **déconseillé si** : Cuir chevelu lésé ou sensible au menthol.
- **mode d'emploi** : Spray apaisant sur le cuir chevelu au besoin, huile sur les longueurs 2 à 3 fois par semaine, bonnet chaque nuit.
- **texture** : Kit (spray + huile + bonnet satin).
- **fréquence** : Selon les besoins, tout au long de la pose.
- **avertissements** : Usage externe. Test cutané préalable conseillé pour les formules contenant de la menthe poivrée.
- ⚠️ Le kit contient un accessoire (bonnet) : sa mention « Satin Grade A » n'est pas un ingrédient.

### p13 — Baume Apaisant Anti-Poils Incarnés Barbe — KURLA Men — 19,90 €
- **bénéfice** : Adoucit les poils drus et apaise la peau après le rasage.
- **pour qui** : Barbes à poils drus, peaux sensibles au rasage.
- **déconseillé si** : Peau lésée, coupures de rasage ouvertes ; enfants ; allergie à l'acide salicylique.
- **mode d'emploi** : Après le rasage, sur peau propre et sèche, une fine couche sur la zone. Ne pas rincer. En journée, appliquer une protection solaire.
- **texture** : Baume fondant.
- **fréquence** : Après chaque rasage.
- **avertissements** : Usage externe. L'acide salicylique peut être irritant : test cutané préalable conseillé. En cas de boutons persistants, douloureux ou étendus, consulter un médecin — ce produit n'est pas un traitement.
- ⚠️ Description à réécrire (§1) et « Allantoïne » non rattachée au référentiel.

### p14 — reprise sous KURLA Skincare — voir §2
- **bénéfice** : Accompagne l'atténuation des marques sombres sans éclaircir la peau saine.
- **pour qui** : Peaux mélaninées présentant des marques d'hyperpigmentation.
- **déconseillé si** : Peau lésée ; grossesse ou allaitement sans avis médical.
- **mode d'emploi** : Le soir sur peau propre, quelques gouttes sur les zones concernées. Protection solaire le jour.
- **texture** : Sérum lacté.
- **fréquence** : Le soir.
- **avertissements** : Usage externe. Test cutané préalable conseillé. Les résultats varient d'une peau à l'autre.
- ⚠️ Marque, nom et visuel à changer ; 3 mentions de composition non résolues.

### p15 — reprise sous KURLA Skincare — voir §2
- **bénéfice** : Protection solaire à fini transparent sur peaux mélaninées.
- **pour qui** : Peaux noires et métissées, exposition quotidienne.
- **déconseillé si** : Enfants sans avis médical ; exposition prolongée sans réapplication.
- **mode d'emploi** : Dernière étape de la routine du matin. Réappliquer toutes les deux heures en exposition continue.
- **texture** : Crème solaire invisible.
- **fréquence** : Chaque matin.
- **avertissements** : Aucune protection solaire n'est totale. L'exposition excessive au soleil est un risque pour la santé.
- ⚠️ **Bloqué** : filtres UV non déclarés, SPF 30 non mesuré.

### p16 — Taie d'Oreiller 100 % Soie de Mûrier 22 Momme — KURLA Essentials — 34,90 €
- **bénéfice** : Réduit la friction nocturne et aide à conserver l'hydratation des longueurs.
- **pour qui** : Tous types de cheveux, coiffures protectrices, perruques.
- **déconseillé si** : — (accessoire)
- **mode d'emploi** : Enfiler sur l'oreiller, face soie au contact des cheveux. Lavage à la main ou cycle délicat à basse température, séchage à l'air libre.
- **texture** : Soie de mûrier 22 momme.
- **fréquence** : Chaque nuit ; lavage hebdomadaire.
- **avertissements** : —
- ⚠️ La description actuelle dit « réduit les frictions capillaires **à zéro** » : formulation absolue à adoucir. Composition = matériau, pas un INCI.

---

## 4. Champs laissés volontairement vides

| Champ | Pourquoi |
|---|---|
| `inci` | La liste INCI réglementaire ne peut pas être reconstituée à partir des mentions commerciales (« Aloe Vera Bio », « Vitamine E »). Elle doit venir de l'étiquette du produit. **Aucune des 16 fiches ne l'a.** |
| `estimated_yield` | `size_label` est vide pour les 16 produits : aucun volume, donc aucun rendement possible sans inventer. **Le contenant n'est déclaré nulle part.** |
| `allergens` | Vide pour les 16, alors que p4, p5 et p12 contiennent des huiles essentielles allergisantes (menthe poivrée, romarin). La déclaration des allergènes réglementés reste à faire. |
| `contains_fragrance` | `null` pour les 16. |

---

## 5. Les 17 emplacements visuels à remplacer

Tu as de vraies photos produit : voici ce qu'il faut remplacer. Toutes les
URL actuelles pointent vers `images.unsplash.com` ; `ownership_status` est
`unverified` et `source_note` est vide sur les 17 lignes.

| Produit | Emplacement | alt actuel |
|---|---|---|
| p1 | image principale + galerie #1 | Leave-In Hydratant Flacon |
| p1 | galerie #2 | Texture Cacao Mangue |
| p2 | image principale + galerie | Shampoing Doux Flacon |
| p3 | image principale + galerie | Masque Hydratant Pot |
| p4 | image principale + galerie | Spray Apaisant Braids |
| p5 | image principale + galerie | Huile Pipette Cuir Chevelu |
| p6 | image principale + galerie | Sérum SPF 50 Tube |
| p7 | image principale + galerie | Bonnet Satin XL |
| p8 | image principale + galerie | Brosse Démêlante Flex |
| p9 | image principale + galerie | Crème Définition Boucles |
| p10 | image principale + galerie | Sérum Niacinamide Taches |
| p11 | image principale + galerie | Kit Kids Douceur |
| p12 | image principale + galerie | Kit Protective Style Braids |
| p13 | image principale + galerie | Baume Rasage Barbe |
| **p14** | image principale + galerie | **« Eadem Milk Marvel Serum » — produit d'un concurrent** |
| **p15** | image principale + galerie | **« Black Girl Sunscreen SPF 30 » — produit d'un concurrent** |
| p16 | image principale + galerie | Taie d'Oreiller 100 % Soie |

À la réception des photos, chaque ligne devra porter `ownership_status =
'brand_provided'` et une `source_note` datée : c'est la trace qui autorise le
statut `verified`.

---

## 6. Ce qui reste bloqué après ce contenu

Une fois ce contenu validé et écrit, il manquera encore, pour chaque fiche :

1. **les visuels réels** (aucun statut ne peut être `verified` sans eux) ;
2. **la liste INCI** et **le contenant** ;
3. **la déclaration des allergènes** ;
4. pour p6 et p15 : **les filtres UV et le rapport de mesure SPF** ;
5. pour p11 : `recommended_age_min`/`max`, `parental_supervision_required`,
   `minor_safety_status` ;
6. pour p14 et p15 : le changement de marque, de nom et de visuel ;
7. pour 13 fiches : la résolution des 18 mentions de composition ambiguës.
