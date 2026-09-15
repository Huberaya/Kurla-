# Proposition — Espace de travail acheteur (Catalogue + Approvisionnement)

**Date** : 15/09/2026 · **Rédigé par** : l'agent en rôle d'acheteur/fondateur · **Statut** : proposition à valider avant exécution

## 1. Ce que fait réellement un acheteur dans ce dashboard

Le travail d'acheteur au quotidien tient en quatre questions :

1. **« Qu'est-ce que je dois faire aujourd'hui ? »** — débloquer des fiches,
   envoyer des RFQ, traiter des lots, relancer un fournisseur.
2. **« Pour ce produit : puis-je le vendre, et sinon qu'est-ce qui manque ? »**
3. **« Que dois-je commander, à qui, et combien ? »** — demande précommandes,
   MOQ, coût servi, délais, pièces (CPNP / personne responsable / INCI).
4. **« Où en est chaque fournisseur ? »** — statut, documents, e-mails envoyés.

## 2. État des lieux (constaté dans le code, 15/09)

**Famille Catalogue** (4 sous-onglets) :

| Sous-onglet | Contenu | Nature |
|---|---|---|
| Pilotage catalogue | KPIs + « Ce qui bloque, nommé » (+ gates C1/C5 en skin) | Lecture, 1 seule question : vendable ? |
| Catalogue produits | Audit de claims · publication peau (skin) · fiches produits + formulaire long + imports CSV/flux | CRUD un par produit, **zéro action groupée** |
| Lots & traçabilité | Enregistrer un lot reçu · lots · allocation aux commandes · double sourcing | Opérationnel |
| Guide dropship | Écran pédagogique 0 carton | Documentation |

**Famille Approvisionnement** (2 sous-onglets) :

| Sous-onglet | Contenu | Nature |
|---|---|---|
| Demande précommandes | Firm orders + déroulage des kits en quantités à commander (+ gap stock skin) | Analyse |
| Fournisseurs & sourcing | **11 panels empilés** : cahier peau · tracking mails J0 · lot whitecast J+3/J+7 · matrice pays · tampon A3 3PL · contacts & messages prêts · kitting · rattachement produits↔fournisseurs · vue sourcing consolidée (RFQ) · prospects · référentiel fournisseurs | Le plus long scroll du dashboard |

**Données déjà disponibles** (API admin existantes, donc aucune donnée à inventer) :
`catalog/products` · `publication-readiness` · `sourcing-readiness` · `claims-audit` ·
`vocabulary-audit` · `ingredient-coverage` · `taxonomy` · `imports` · `validation` ·
`batches` (+ double sourcing) · `preorder-demand` · `sourcing/candidates` ·
`sourcing/consolidated` · `sourcing/items` · `sourcing/prospects` ·
`sourcing/strategy` · `suppliers`.

## 3. Points de douleur (du point de vue acheteur)

1. **Pas de file d'actions** : le cockpit liste les blocages en texte, mais il n'y a
   nulle part « X actions à faire aujourd'hui, avec un bouton qui m'y dépose ».
   L'acheteur doit reconstituer sa tâche dans 4 onglets.
2. **Un produit éclaté sur 4 onglets** : statut commercial (pilotage), claims/INCI
   (audit), fournisseur (sourcing), lots (traçabilité), demande (précommandes).
   Connaître l'état complet d'une fiche = croiser 4 écrans.
3. **Zéro action groupée** : rattachement fournisseur, validation, statut — un par
   un, à la main, sur des dizaines de fiches.
4. **11 panels empilés** dans « Fournisseurs & sourcing » : même la barre de
   sections (max 8 chips) ne couvre plus la page ; on perd le fil entre
   « qui je dois contacter » (RFQ) et « ce qui est arrivé » (lots, tampon).
5. **Pas de structure de titres homogène** : plusieurs panels n'ont aucun
   `h2`/`h3` (titres en `<p>` stylisés) → la navigation par sections, l'accessibilité
   et la recherche dans la page en pâtissent.
6. **La proposition d'achat n'existe pas comme objet** : la demande (onglet
   précommandes), le rattachement fournisseur et la vue consolidée (e-mails) sont
   trois écrans séparés — il n'y a pas de tableau « ce que je vais commander à
   chacun, au coût estimé, avec les pièces requises » que l'on valide d'un geste.

## 4. Proposition — 4 phases (chaque phase = livrable testé, cumulatif)

### Phase 1 — « À faire aujourd'hui » : la file d'actions du cockpit ⭐ (cœur du chantier)
En tête du pilotage catalogue (les 2 workspaces) :
- **3 compteurs** : fiches à débloquer · RFQ à envoyer · lots à traiter.
- **Une file unique priorisée** : chaque ligne = une action + le contexte
  (fiche/fournisseur) + un **bouton qui mène directement au bon panel avec le
  contexte présélectionné** (ex. « Rattacher un fournisseur → 12 fiches » →
  catalogue filtré sur ces fiches ; « Envoyer la RFQ Qudo » → vue consolidée
  sur ce fournisseur).
- Sources 100 % dérivées des endpoints existants (`publication-readiness`,
  `sourcing/items` à `to_source`, `batches`) : **zéro donnée inventée, zéro
  écriture** — la file est une lecture.
- File vide → « Rien à faire — tout est bloquant-vert. » (état honnête).

### Phase 2 — Fiche produit : l'acheteur voit tout d'un coup, et agit en lot
- **Vue produit en 3 colonnes** : Commercial (statut, prix, claims, readiness) ·
  Appro (fournisseur, coût servi, MOQ, délai, lots rattachés) · Demande
  (précommandes fermes, stock). Chaque colonne = un état + l'action qui manque.
- **Actions groupées** : sélection multiple de fiches + barre d'actions
  (rattacher un fournisseur, valider, statut, export) — mêmes endpoints que
  l'unitaire, en boucle validée.
- **Recherche globale** en tête de catalogue (nom, slug, marque, INCI) + filtres
  rapides (bloquant / sans fournisseur / test-sourcing).

### Phase 3 — Approvisionnement : trois sous-onglets au lieu de 11 panels
Découpage de « Fournisseurs & sourcing » (la barre de sections reste active
dans chaque sous-onglet) :
- **Fournisseurs** — référentiel, déclaration, détail (documents, statut,
  coordonnées), rattachement produits↔fournisseurs.
- **Sourcing & RFQ** — prospects, vue consolidée (prix + e-mail prêt), items à
  sourcer, matrice pays.
- **Logistique** — lots & traçabilité (déplacé ici ou relié), kitting, tampon A3
  3PL, contacts & messages prêts, lots peau (whitecast).
- **« Proposition d'achat »** (le nouvel objet acheteur) : tableau généré depuis
  demande + stock + lots : fournisseur · référence · quantité · coût estimé ·
  délai · pièces requises (CPNP / pers. responsable / INCI) — exportable,
  relié aux e-mails prêts existants. **Rien n'est envoyé depuis la plateforme**
  (principe existant conservé : copier / mailto restent des actes humains).

### Phase 4 — Soubassement : homogénéiser les sections (transverse)
- **Tous les panels reçoivent des `h2`/`h3` réels** (titres actuels en `<p>` →
  titres sémantiques) → la navigation par sections couvre 100 % des pages,
  accessibilité corrigée, recherche dans la page fiable.
- **Statuts colorés** (chips vert/ambre/rouge) dans les listes de blocages.
- **« Mis à jour à … »** par panel + rafraîchir central (déjà partiel).

## 5. Critères d'acceptation (communs)

- Aucune donnée inventée : tout est dérivé des endpoints existants ; inconnu = inconnu.
- `tsc` propre + banc de test par phase dans la chaîne `npm test` + CI verte.
- Aucun secret, aucun envoi automatique, gouvernance inchangée (truth layer,
  gardes-fous, RLS).
- Hair et Skin : même mécanique, workspaces séparés (règle de la plateforme).
- Zéro régression : les panels existants continuent de fonctionner (refonte
  additive, pas destructive).

## 6. Ordre et estimation

| Phase | Contenu | Taille |
|---|---|---|
| **1** | File « À faire aujourd'hui » (lecture dérivée + deep links) | ~1 journée |
| **4** | Titres sémantiques + statuts colorés (transverse) | ~1 journée |
| **2** | Fiche produit 3 colonnes + actions groupées | ~2 jours |
| **3** | Découpage approvisionnement + proposition d'achat | ~2 jours |

**Recommandation de démarrage : Phase 1 + Phase 4 en premier lot** — la file
d'actions change le quotidien dès le premier commit, et la normalisation des
titres rend immédiatement la navigation par sections complète.

## 7. Risques & garde-fous

- Les endpoints `publication-readiness` / `sourcing/items` doivent être
  re-vérifiés sur leur forme exacte avant codage (contrats figés par les bancs
  existants — on s'y aligne, on ne les change pas sans banc).
- Le déplacement de panels (Phase 3) modifie l'ordre des sections : la barre de
  sections et les deep links des autres phases doivent être mis à jour dans le
  même commit.
- Le travail parallèle est actif (copilote, vue sourcing consolidée) : chaque
  phase passe par fetch/rebase/push sans force, et les conflits sont tranchés en
  union avec les bancs revérifiés.
