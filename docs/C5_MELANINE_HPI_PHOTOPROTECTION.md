# C5 — mélanine, HPI et photoprotection

**Version :** `2026-09-19.c5`
**Périmètre :** données de profil, données produit et preuves rattachées au SKU
**Principe :** mieux servir les peaux riches en mélanine sans réduire une personne à sa couleur, son origine supposée ou une promesse médicale.

## 1. Ontologie HPI

HPI signifie ici **hyperpigmentation post-inflammatoire**. KURLA conserve une observation de besoin, pas un diagnostic :

| Code | Sens | Source admise |
|---|---|---|
| `post_inflammatory_marks` | marques après une inflammation rapportée | auto-déclaration ou observation contrôlée |
| `post_acne_marks` | marques rapportées après boutons | auto-déclaration ou observation contrôlée |
| `post_friction_marks` | marques associées à un frottement rapporté | auto-déclaration ou observation contrôlée |
| `sun_related_darkening` | assombrissement rapporté après soleil | auto-déclaration ou observation contrôlée |
| `uneven_tone_observed` | teint perçu comme irrégulier, sans diagnostic | auto-déclaration ou observation contrôlée |
| `unknown` | non renseigné | aucune inférence |

Le moteur ne déduit jamais un code HPI depuis `toneDepth`, une photo, un nom, une origine supposée ou un phototype. Les dimensions suivantes restent distinctes : type de peau, profondeur de ton, sous-ton, phototype, déclencheur rapporté, zone et objectif.

Les formulations et contenus utilisent « atténuer l’apparence des marques », « uniformiser progressivement » ou « protéger », jamais « blanchir », « dépigmenter la peau saine », « guérir » ou une promesse de résultat garanti.

## 2. Phototype, mélanine et sous-ton

- Le phototype reste une réaction déclarée au soleil, conservée uniquement avec consentement explicite.
- IV, V et VI constituent un périmètre de test produit, pas une identité ou une couleur obligatoire.
- `toneDepth` et `undertone` ne classent jamais un phototype.
- Le sous-ton sert à documenter un rendu de teinte ou de fini d'un produit ; il n'est pas une catégorie de personne.
- Un SPF teinté ne peut être déclaré documenté qu'après test des sous-tons réellement couverts et conservation de la preuve correspondante.

## 3. Porte photoprotection

Pour un SPF candidat, le rapport C1/C5 attend :

1. preuve SPF/UVA rattachée au SKU, datée et relue ;
2. risque white cast explicite, sans déduction depuis le nom « invisible » ;
3. test white cast documenté sur les phototypes IV, V et VI ;
4. conditions de lumière de test, dont au moins une lumière du jour ;
5. statut lumière visible explicite : test vérifié si la fiche revendique une protection lumière visible ou si le produit est teinté, sinon `not_applicable` ;
6. pour un produit teinté, sous-tons testés et preuve rattachée.

Un résultat « faible » de white cast n'est pas équivalent à « invisible pour tout le monde ». La fiche doit conserver la portée du test : produit, lot si pertinent, phototypes, sous-tons, lumière, méthode et date.

## 4. Traçabilité des preuves

Les pièces sont stockées dans `skin_photoprotection_evidence` et reliées à `products.id` par `product_id`. Une preuve vérifiée exige :

- type de preuve (`spf_uva`, `white_cast`, `visible_light`, `undertone`) ;
- source qualifiée et libellé ;
- identifiant, URL ou chemin de fichier localisable ;
- date de collecte ;
- méthode ;
- date et relecteur de validation.

Une page marketing ou une URL seule reste une piste. `brand_claim` peut être conservé comme source à examiner, mais ne permet pas à lui seul de passer la porte d'acceptation SPF.

La table est réservée à l'administration. Les projections produit (`*_evidence_status`, `tested_lights`, `tested_phototypes`, `tested_undertones`) ne sont valides que si elles correspondent à une preuve rattachée et relue.

## 5. États honnêtes

- `not_provided` : aucune preuve reçue ; ne pas compléter.
- `pending` : pièce attendue ou en cours de revue ; ne pas publier comme preuve.
- `verified` : pièce localisable, portée comprise et relue pour le SKU.
- `rejected` : preuve inadéquate ou incohérente ; le champ reste bloquant.
- `not_applicable` : uniquement pour une absence de revendication lumière visible sur un SPF non teinté ; ce n'est pas une preuve de protection lumière visible.

Le résultat C5 n'autorise jamais à lui seul un checkout. La disponibilité, le pays FR, le stock, le dossier réglementaire, les claims et la truth layer C1 restent obligatoires.
