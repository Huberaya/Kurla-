# C1 — Catalogue peau réellement commercialisable

## Objet

Ce contrat sépare une fiche de formulation d’un SKU cosmétique réellement achetable dans le premier marché KURLA. Il ne crée ni fournisseur, ni stock, ni document réglementaire.

Premier marché : **FR**.

Périmètre héros proposé :

- `peau-ess-001` — nettoyant ;
- `peau-ess-002` — hydratant/barrière ;
- `peau-ess-003` — SPF.

Ces trois identifiants sont un périmètre de vérification, pas une déclaration de disponibilité.

## États de décision

| État | Signification | Peut être recommandé comme achetable ? |
|---|---|---:|
| `ready_to_buy` | Dossier, sourcing, métadonnées, pays FR et stock vérifiés ; porte checkout satisfaite | Oui |
| `preorder_verified` | Dossier et sourcing vérifiés, précommande explicitement documentée | Non comme stock disponible ; oui seulement dans un parcours précommande dédié |
| `formulation_target` | Formule interne, cible de gamme ou provenance interne ; produit non fabriqué démontré | Non |
| `blocked` | Une ou plusieurs preuves ou métadonnées obligatoires manquent | Non |

## Dossier obligatoire par SKU

### Preuves réglementaires et industrielles

À rattacher au fournisseur et/ou au produit selon la portée réelle du document :

- Personne Responsable UE ;
- INCI final fourni par la source ;
- CPSR et PIF ;
- notification CPNP si le produit est cosmétique ;
- claims revus et statut `verified` ;
- fabrication / GMP documentée ;
- pays autorisés, avec validation explicite de `FR` ;
- avertissements ;
- lot ou mécanisme de traçabilité ;
- DDM ou PAO ;
- fournisseur résolu, vérifié et SKU fournisseur ;
- stock positif vérifié ;
- image de marque fournie ou licence valide, validation d’image `verified`.

Les documents sans fichier et date d’émission ne sont pas des preuves. Les documents expirés bloquent la readiness.

### Métadonnées peau

Champs comptés par le rapport C1 :

- types de peau ;
- préoccupations ;
- objectifs peau ;
- actifs et concentrations, avec statut de vérification ;
- INCI final et visibilité vérifiée ;
- texture ;
- fini ;
- parfum / sans parfum ;
- allergènes, y compris une liste vide explicitement confirmée ;
- étape de routine ;
- avertissements ;
- fabrication / GMP ;
- lot ;
- DDM/PAO ;
- pays ;
- droits du packshot ;
- stock.

### Couverture SPF

Pour toute fiche identifiée comme SPF/solaire :

- risque whitecast noté (`none`, `low`, `medium` ou `high`) ;
- notation whitecast vérifiée ;
- phototypes **IV, V et VI** effectivement testés ;
- si produit teinté : sous-tons testés et renseignés.

Aucun “phototype safe”, “invisible” ou équivalent ne doit être déduit du nom du produit.

## Porte d’acceptation

Le rapport `GET /api/admin/catalog/skin-readiness` expose :

- couverture des champs obligatoires ;
- revue des claims ;
- droits des images ;
- stock et pays du premier marché ;
- état sourcing et documents manquants ;
- acceptation des héros ;
- états `ready_to_buy`, `preorder_verified`, `formulation_target`, `blocked`.

La cible de sortie est atteinte seulement si :

- 3 à 5 héros sont `ready_to_buy` ;
- au moins 95 % des champs peau obligatoires sont renseignés ;
- 100 % des claims sont revus ;
- 100 % des images sont sous droits et validées ;
- aucun SKU accepté n’a une provenance `formulation interne` ;
- les pays et le stock sont testés pour `FR`.

## État de clôture du sourcing C1 — 11 septembre 2026

Aucun SKU peau présent dans la base distante ne satisfait cette porte : **0/3 héros `ready_to_buy`**. Les fournisseurs et les 21 lignes candidat restent non vérifiés ou bloqués, et aucun document fournisseur n'est disponible. Les formulations internes et les anciennes précommandes restent non achetables tant que les preuves externes ne sont pas versées et validées.

Le détail fournisseur par fournisseur, les compteurs contrôlés et la décision opérationnelle sont consignés dans [`docs/sourcing/C1_CLOSURE_REPORT_2026-09-11.md`](sourcing/C1_CLOSURE_REPORT_2026-09-11.md).
