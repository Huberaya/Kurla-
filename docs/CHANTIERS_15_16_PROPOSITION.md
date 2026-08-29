# Chantiers 15 et 16 — ce que j'ai mesuré avant de proposer

Rédigé le 29/08/2026. Chaque affirmation ci-dessous vient d'une commande exécutée,
pas d'une intention.

---

## Chantier 15 — Le tableau de bord d'administration

### Ce qui est mesuré

| Fait | Comment je l'ai vérifié |
|---|---|
| **29 routes `/api/admin/*`** | dénombrement des chemins déclarés dans `src/server/routes/*.ts` |
| **2 pages admin côté client** (`/admin`, `/admin/texture-gap`) | `src/lib/routeTable.tsx` |
| Une page unique de **830 lignes** porte tout | `src/pages/AdminDashboardPage.tsx` |
| **Aucun profil admin n'existait en production** jusqu'à aujourd'hui | `public.profiles` : 2 lignes, les deux `customer`, avant mon passage de `hubertbay@gmail.com` en `superadmin` |
| L'historique des vérifications n'a **aucun écran** | j'ai dû lire `catalog_validation_events` en SQL pour vérifier mes propres écritures |
| Le rapport de préparation n'a **aucun écran** | idem : `GET /api/admin/catalog/publication-readiness` n'est appelé par aucune page |

### Le constat qui compte

La surface d'administration n'a **jamais tourné sous une vraie session** : aucun
compte ne pouvait l'ouvrir. Vingt-neuf routes existent donc sans qu'aucune ait
été exercée autrement que par des bancs en mémoire. Et le chantier 14 vient d'en
faire la démonstration par l'absurde : j'ai écrit 80 événements de vérification,
et pour les relire je suis passé par SQL — **un outil d'administration dont
l'auteur du système doit contourner l'interface n'est pas un outil**.

### Ce que je propose

1. **Un inventaire vérifié, route par route** (un banc, pas un écran). Pour
   chacune des 29 : quel écran l'appelle, et que répond-elle avec une vraie
   session `superadmin`. Les routes sans écran sont listées nommément — c'est la
   dette réelle, et elle est mesurable.
2. **L'écran de publication**, celui qui manque le plus et dont tout le reste
   découle : la liste des produits avec leurs blocages nommés (l'API existe
   déjà) et l'historique des vérifications par produit (la table existe déjà).
   Aucun nouveau calcul, seulement rendre visible ce qui est déjà écrit.
3. **Le découpage de la page unique** en sections routées, mais **seulement pour
   les écrans qui servent une décision**. Découper pour découper ne fait que
   déplacer 830 lignes.

### Ce que je ne ferais pas

Un tableau de bord de KPI, des graphes, des compteurs animés. Un écran
d'administration se juge à une seule question : **quelle décision permet-il de
prendre ?** Si la réponse est « aucune, mais c'est joli », c'est une fonction de
spectacle — et c'est exclu de nos règles.

---

## Chantier 16 — Les fournisseurs

### Ce qui est mesuré

| Fait | Comment je l'ai vérifié |
|---|---|
| **Il n'existe aucune table `suppliers`** | `information_schema.tables` : seule `inventory` apparaît sur les motifs fournisseur/achat/stock |
| `source_supplier` et `supplier_sku` sont **vides sur les 16 produits** | requête groupée sur `public.products` |
| Une seule route : `POST /api/admin/catalog/import/supplier` | `src/server/routes/catalogGovernance.ts:93` |
| Cette route prend le fournisseur comme **chaîne libre** | `req.body.supplier` tronqué à 240 caractères, passé tel quel à `importCatalogRecords` |
| `inventory` (le stock) n'a **aucun lien** avec un fournisseur | colonnes de la table |

### La question à trancher avant d'écrire une ligne

« Fournisseur » peut vouloir dire deux choses très différentes, et le chantier
n'est pas le même :

**(a) Provenance et traçabilité.** Savoir d'où vient un produit, pouvoir le
rappeler, afficher son origine, rattacher les documents de conformité (CPSR,
dossier d'information produit). C'est léger, et c'est ce qui manque aujourd'hui :
le fournisseur n'est qu'une chaîne de caractères que personne ne remplit.

**(b) Approvisionnement.** Commander, suivre les délais, les prix d'achat, la
marge, les ruptures, le réassort. C'est un ERP.

**Ma recommandation : (a) d'abord.** Un module d'approvisionnement construit sur
zéro historique d'achat serait une coquille vide — des écrans de commande sans
commande, des délais sans fournisseur réel. Ce serait exactement la fonction de
spectacle que nos règles excluent. (b) se justifiera le jour où il y aura des
achats à suivre.

### Ce que je propose pour (a)

1. Une table `suppliers` : raison sociale, pays, contact, et **ce qu'on sait de
   sa conformité** (CPSR fourni ou non, dossier produit reçu ou non). Pas de
   note, pas de score.
2. `products.source_supplier` devient une **référence** à cette table. Aujourd'hui
   c'est une chaîne libre : deux imports avec « Laboratoire X » et « laboratoire x »
   feraient deux provenances distinctes, et rien ne le signalerait.
3. La route d'import **résout** le fournisseur au lieu de l'enregistrer tel quel,
   et remonte les correspondances ambiguës au lieu de les trancher en silence —
   le même principe que le lieur d'ingrédients : on ne devine jamais.
4. Un écran : « d'où vient ce produit, et que sait-on de son fournisseur ».

### Ce que je ne ferais pas

- **Noter ou classer les fournisseurs** : sans données d'achat, un classement
  serait une opinion habillée en mesure.
- **Le réassort automatique** : il faut un historique de ventes et de commandes
  qui n'existe pas.
- **Une place de marché fournisseurs** : hors sujet, et hors de nos règles.

---

## Ordre que je recommande

**15 avant 16**, pour une raison concrète : le chantier 16 produit des données
(provenance, conformité fournisseur) qu'il faudra **lire et vérifier** quelque
part. Sans écran d'administration, elles finiront comme les 80 événements de
vérification du chantier 14 — écrites en base, invisibles, et relues en SQL.

L'inventaire du chantier 15 dira aussi, route par route, si le chantier 16 a déjà
des morceaux épars à recoller plutôt qu'à construire.
