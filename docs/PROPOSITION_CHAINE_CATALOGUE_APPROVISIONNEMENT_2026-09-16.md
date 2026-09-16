# Proposition — la chaîne Approvisionnement → Catalogue → Boutique

**Date** : 16/09/2026 · **Objet** : visibilité, critères de vente, et passage automatique d'un produit de l'approvisionnement vers la boutique · **Statut** : étude à valider avant exécution

Ce document répond à quatre demandes : voir l'ensemble des produits dans
Catalogue et Approvisionnement ; faire entrer automatiquement en boutique un
produit qui respecte les critères ; signaler les fiches déjà en boutique qui
ne les respectent pas ; et relier les deux domaines, avec fournisseurs,
contacts et messages prêts.

Il s'appuie sur des chiffres relevés en production le 16/09 (lecture seule,
`scripts/mesureCatalogueApprovisionnement.ts`) et sur les pratiques des
logiciels d'achat (cycle *procure-to-pay*), de gestion d'information produit
(PIM) et des places de marché.

---

## 1. L'état réel, mesuré

### Catalogue

| | |
|---|---|
| Fiches au total | **138** |
| Publiées | 105 |
| — dont conformes aux critères | **63** |
| — dont **non conformes** | **42** |
| Retirées (`unavailable`) | 17 |
| Brouillons | 16 |
| Fiches marquées « test » | 42 |
| Dérogations enregistrées en table | **0** |

Croisement statut × aptitude (`evaluateKurlaReady`) :

| Statut | Bloqué | Partiel | Prêt |
|---|---|---|---|
| `published` | **42** | 0 | 63 |
| `unavailable` | 17 | 0 | 0 |
| `draft` | 16 | 0 | 0 |

**Les 42 fiches que vous avez mises en boutique pour tester sont bien les 42
bloquées.** Elles sont protégées du retrait par leur marque « test », et la
table des dérogations est vide : c'est le drapeau `is_test_listing` qui joue
ce rôle, de façon informelle. Conséquence directe : **la porte ne propose
rien** — 0 publication, 0 retrait — parce qu'elle ne peut pas toucher aux 42,
que les 63 prêtes le sont déjà, et que les 16 brouillons sont tous bloqués.
Votre porte fonctionne ; elle n'a simplement rien à proposer dans l'état.

### Ce qui bloque vraiment

| Bloquant | Fiches |
|---|---|
| **Visuel placeholder ou droits non établis** | **58** |
| Ne satisfait pas la porte de publiabilité | 42 |
| Produit inactif | 32 |
| **Précommande externe non documentée** (fournisseur, SKU, source) | **26** |
| Contrat C1 peau incomplet | 20 + 10 + 6 |
| Statut administratif `unavailable` / `draft` | 17 + 16 |
| Aucun produit fabriqué/achetable démontré | 16 |

Deux leçons. D'abord, **le premier frein n'est pas réglementaire : ce sont
les droits sur les visuels** (58 fiches) — un problème d'exploitation, pas un
problème de logiciel. Ensuite, 26 fiches butent sur l'absence de fournisseur,
SKU ou source documentés : c'est exactement la liaison Approvisionnement →
Catalogue qui manque, et elle bloque déjà des fiches existantes.

### Approvisionnement

| | |
|---|---|
| Candidats | 121 |
| — avec une marque vérifiée | **0** (toutes « À confirmer ») |
| — avec un prix d'achat, une marge, un échantillon, des visuels | **0** |
| — rattachés à un prospect | 121 / 121 |
| Vue consolidée | **492** lignes (121 produits + 121 candidats + 250 positions) |
| — avec fournisseur nommé | 492 / 492 |
| — **avec un contact** | **119 / 492** |
| — avec un prix | 358 / 492 |
| — avec un e-mail prêt | 102 / 492 |
| Prospects (fournisseurs) | 28 |
| — **avec un contact renseigné** | **3 / 28** |

**Deux corrections nécessaires à votre description.** Vous parlez de « plus
de 250 produits identifiés, les fournisseurs correspondants, leurs contacts ».
Dans les faits : les 121 candidats ne sont pas des produits identifiés mais
des **besoins** formulés en types de produits (un « Gel Nettoyant Doux Sans
Savon », sans marque, sans prix, sans échantillon). Les 250 supplémentaires
sont des **positions de fond**, pas des produits sourcés. Et sur 28
fournisseurs, **3 seulement ont un contact**. Ce n'est pas un approvisionnement
constitué : c'est une liste d'intentions. Aucun mécanisme, aussi bon soit-il,
ne fera entrer en boutique un produit dont on ne connaît ni la marque, ni le
prix, ni l'échantillon.

---

## 2. Ce qui existe déjà — et qu'il ne faut pas refaire

L'autre agent a construit l'essentiel du mécanisme. Le recenser évite les
doublons :

| Existant | Rôle |
|---|---|
| `evaluateKurlaReady` | score d'aptitude, bloquants durs, seuil « prêt » à 95 |
| `POST /api/admin/catalog/gate/scan` | propositions publier / retirer, **mode proposition** |
| `POST /api/admin/catalog/gate/apply` | application + journal `catalog_gate_journal` |
| Dérogations (`catalog/derogations`, renouvellement en masse) | protéger une fiche non conforme assumée, avec échéance |
| `POST /api/admin/sourcing/candidates/:id/create-fiche` | **la liaison Approvisionnement → Catalogue** |
| Flux 8 étapes (`sourcing/workflow/transition`, `…/events`) | transitions légales, refus à raison obligatoire, historique tracé |
| Vue consolidée (492 lignes, e-mails prêts) | produits + fournisseurs + contacts + messages |
| Recherche globale unifiée | traverse catalogue, candidats, fournisseurs |
| Sources d'approvisionnement (`sourcing/sources`) | référentiel des origines |

La brique manquante n'est donc **pas** le mécanisme : c'est son **amont**. Le
modèle de candidat contient déjà les jalons d'un vrai processus d'achat —
`inciReceived`, `ingredientsMapped`, `sampleValidated`, `visualsReceived`,
`purchasePriceCents`, `marginPct`, `firstOrderQty`, `go` — et **tous sont
vides** (0 renseigné sur 121). On a construit le tuyau ; rien n'y coule.

---

## 3. Ce que font les logiciels du marché

**Cycle d'achat (*procure-to-pay*).** Demande → approbation → commande →
réception → facture → **rapprochement à trois** (commande, réception,
facture). Deux principes transposables : l'**auto-approbation sous seuil**
(les demandes à faible risque passent seules, l'humain traite les exceptions)
et le **rapprochement** (on ne paie que si les trois documents concordent —
chez vous : on ne publie que si fournisseur, preuve et fiche concordent).

**PIM (Akeneo, AtroPIM, Odoo).** Brouillon → enrichissement → revue →
approbation → publication → maintenance. Trois principes décisifs :
(1) un **score de complétude par canal**, calculé en continu ;
(2) une **porte de qualité qui bloque la transition** — un enregistrement
incomplet ne peut pas avancer, il est renvoyé avec les manques nommés ;
(3) des **transitions liées à un rôle**, journalisées, avec retour arrière.

**Places de marché (Amazon, Mirakl, Shopify).** Grille de qualité de fiche
(Amazon LQD — votre seuil de 95 s'y réfère déjà), suppression automatique des
annonces incomplètes, et **validation du flux à l'import** : un produit qui
n'a pas les attributs requis n'entre même pas au catalogue.

**Ce qui manque chez vous au regard de ces références :** vos portes ne
contrôlent qu'**à l'entrée en boutique**. Le marché contrôle **à chaque
transition**, depuis l'import du candidat. C'est pourquoi 121 candidats vides
peuvent aujourd'hui devenir 121 fiches, qui seront bloquées plus bas — le
contrôle arrive trop tard, et le blocage se découvre à la fin.

---

## 4. L'architecture cible : quatre portes, un journal

```
   DÉCOUVERTE        QUALIFICATION         FICHE            BOUTIQUE
  ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
  │ Candidat │─P1──▶│ Jalons   │─P2──▶│ Produit  │─P3──▶│ Publié   │
  │  (besoin)│      │ prouvés  │      │ conforme │      │ vendable │
  └──────────┘      └──────────┘      └──────────┘      └──────────┘
       ▲                 ▲                  ▲                 ▲
       └─────────────────┴──────────────────┴─────────────────┘
                    P4 : le retrait (non-conformité
                    surgie, document expiré, droits tombés)
```

Chaque porte a des **conditions d'entrée nommées**, un **journal** et une
**possibilité de retour**. Une porte ne « propose » pas : elle **empêche**, et
dit ce qui manque. C'est le principe PIM, et c'est ce qui évite de déplacer du
vide d'un bout à l'autre de la chaîne.

- **P1 — Origine** : un candidat n'entre en qualification qu'avec une marque
  vérifiée, un fournisseur nommé et un contact. Aujourd'hui : 0 marque,
  3 contacts sur 28.
- **P2 — Jalons d'achat** : INCI reçue → ingrédients cartographiés →
  **échantillon validé** → **visuels reçus et droits établis** → prix d'achat,
  marge et quantité → `go`. Ces champs existent ; il faut les rendre
  obligatoires pour franchir la porte.
- **P3 — Publication** : la porte actuelle, qui devient **automatique** pour
  toute fiche prête non marquée test, avec journal et retour arrière.
- **P4 — Retrait** : déclenché par un document expiré, des droits visuels
  tombés, ou une non-conformité surgie. C'est ce qui rend P3 acceptable :
  si la sortie est fiable, l'entrée peut être automatique.

**Un journal unique par référence.** Vous en avez deux aujourd'hui
(`catalog_gate_journal` et `sourcing_workflow_events`). Les fusionner en une
seule chronologie lisible — qui a fait quoi, quand, pourquoi — est ce qui
permettra, dans six mois, de répondre à « pourquoi ce produit est-il en
boutique ? » sans reconstituer l'histoire.

---

## 5. Aller plus loin que la demande

1. **Rendre l'échantillon obligatoire.** Aucun bureau d'achat sérieux ne met
   en vente un produit qu'il n'a pas eu en main. Le champ `sampleValidated`
   existe et n'est jamais rempli. C'est la barrière la plus économique contre
   les fiches invendables — et contre les retours clients.
2. **Le coût servi, pas le prix d'achat.** Prix d'achat + transport + droits
   de douane + préparation = le coût réel. Sans lui, la marge affichée est
   un vœu. À calculer **avant** la décision de mise en vente, jamais après.
3. **Le dossier fournisseur avec échéances.** Un fournisseur, ce n'est pas un
   nom : c'est un contact, des documents (CPNP, CPSR, personne responsable),
   des dates d'expiration, et un comportement (réactivité, délais tenus,
   conformité documentaire). Avec 3 contacts sur 28, c'est le chantier le
   plus rentable de tous.
4. **La détection de doublons à l'import.** Avant de créer une fiche depuis un
   candidat, chercher si elle existe déjà parmi les 138 fiches et les 492
   lignes. Évite le catalogue en double, le mal le plus coûteux à rattraper.
5. **Le signalement des 42, avec une échéance.** Votre demande est juste, et
   la réponse n'est pas de les retirer : c'est de les afficher comme une
   cohorte assumée, avec la raison et une date de revue. Une dérogation sans
   échéance n'est pas une décision, c'est un oubli.
6. **Une seule vue d'ensemble.** Une table unique : référence · nature · état ·
   ce qui manque · fournisseur · contact · prochaine action · responsable.
   C'est votre demande de visibilité, et c'est ce qui rend le reste pilotable.
7. **Ne jamais publier sans délai fournisseur.** Une fiche en boutique sans
   délai de réapprovisionnement connu crée une promesse qu'on ne peut pas
   tenir. Avertissement, pas blocage.

---

## 6. Les chantiers

Chaque chantier est un livrable testé, cumulatif, exécuté dans l'ordre.
Aucune donnée inventée, aucun envoi automatique, gouvernance inchangée.

| # | Chantier | Contenu | Taille |
|---|---|---|---|
| **A** | **Signaler les non-conformes** | Vue « conformité » du catalogue : chaque fiche avec son état, sa raison, son éventuelle protection. Les 42 en tête, datées. Lecture seule. | ~1 j |
| **B** | **Compléter les fournisseurs** | Dossier fournisseur : contacts, documents, échéances. Rattachement aux 121 candidats. Partir des 3 contacts existants, et des 119 lignes qui en ont un. | ~2 j |
| **C** | **La porte amont** | Les jalons deviennent des conditions : un candidat n'avance que si le jalon précédent est prouvé. Reprend le flux 8 étapes existant. | ~2 j |
| **D** | **La vue d'ensemble** | Une table unique sur les deux domaines, avec filtres, tri et action suivante. | ~2 j |
| **E** | **Le coût servi et la marge** | Saisie du prix d'achat, calcul du coût servi, marge avant décision. Alerte si marge < seuil. | ~1,5 j |
| **F** | **La promotion automatique** | Toute fiche prête, non test, avec droits visuels établis et délai connu → publication automatique, journalisée, réversible. Seuil réglable. | ~1,5 j |
| **G** | **Le journal unique** | Une chronologie par référence, fusion des deux journaux. | ~1 j |

**Ordre recommandé : A → B → C → D → E → F → G.**

Pourquoi cet ordre : **A** répond à votre demande immédiate et se fait sans
dépendance. **B** et **C** remplissent le tuyau — les lancer avant rendrait F
inutile (il n'y a rien à promouvoir) voire nuisible (il automatiserait le
passage de fiches vides). **F** vient donc en avant-dernier : c'est le
chantier que vous attendez, mais il n'a de valeur qu'une fois l'amont
alimenté. **G** consolide.

**Alternative, si vous voulez du visible très vite :** A + D forment un
premier lot cohérent (~3 j) qui change le quotidien sans toucher aux données.

### Critères d'acceptation communs

- Aucune donnée inventée : inconnu = inconnu, et l'écran le dit.
- `tsc` propre + un banc par chantier dans `npm test` + CI verte.
- Aucun envoi depuis la plateforme : copier / `mailto` restent des actes humains.
- Cheveux et Peau : même mécanique, espaces séparés.
- Zéro régression : ajout, jamais destruction.
- Toute automaticité est journalisée et réversible.

---

## 7. Risques

- **Automatiser trop tôt.** Publier automatiquement des fiches vides ou non
  conformes détruirait la confiance dans la boutique plus vite que n'importe
  quel gain de temps. D'où l'ordre proposé : F après B et C.
- **Les 42 fiches de test.** Elles sont protégées par un drapeau, pas par une
  dérogation datée. Le chantier A doit les rendre visibles ; une décision
  ultérieure devra choisir entre les régulariser (droits visuels : 58 fiches
  concernées) et les retirer.
- **Le premier frein est hors logiciel.** 58 fiches bloquées sur les droits
  visuels : c'est un travail de négociation avec les marques, pas une
  fonctionnalité. Le chantier A le rendra visible ; il ne le résoudra pas.
- **Travail parallèle.** L'autre agent construit dans les mêmes écrans.
  Chaque chantier passe par fetch/rebase/push sans force, conflits tranchés
  en union.
