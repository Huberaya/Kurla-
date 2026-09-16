# Analyse & proposition — « Pipeline de mise en vente » : approvisionnement → critères → boutique

**Date** : 15/09/2026 · **Rédigé par** : l'agent en rôle d'acheteur/fondateur · **Statut** : proposition validée — **Lot 1 (B + C) livré le 15/09/2026** (voir § 10)

## 1. Ta demande, en cinq points

1. **Visibilité globale** : voir l'ensemble des produits (les 250+ identifiés et le catalogue actuel) sur un seul écran.
2. **Les critères sont la règle** : un produit qui respecte les critères de vente se retrouve **automatiquement** dans la boutique.
3. **Signaler** : les produits/outils actuels de la boutique qui ne respectent **pas** les critères (ton choix de test) doivent être nommés dans le catalogue.
4. **Approvisionnement** : le registre des ~250 produits identifiés, avec fournisseurs, contacts et messages prêts à envoyer.
5. **La liaison** : un système qui fait passer automatiquement un produit de l'approvisionnement au catalogue quand il devient conforme.

## 2. État des lieux — ce qui existe déjà (plus qu'il n'y paraît)

| Mécanisme | État | Ce qu'il fait |
|---|---|---|
| `catalogTruth` (versionnée `2026-09-12.skin-catalog.v1`) | ✅ | Portes dérivées par produit : `proofState` (preuves conformes ?), `commercialState`, `isPubliclyListable`, `isCheckoutEligible`, `blockers` nommés |
| `publication-readiness` (B1) | ✅ | Manquements **nommés** par produit : CPNP+RP+CPSR (documents fournisseur), INCI, visuels, autorisation |
| 4 gardes-fous fail-closed (phase test) | ✅ | ① autorisation fournisseur ② INCI vérifiée ③ CPNP + pers. responsable ④ visuel + « Dépublier » |
| Vue sourcing consolidée | ✅ | ~242 lignes : produit/candidat + prix + fournisseur + contact + **e-mail prêt** (RFQ existant ou généré) |
| Import fournisseur | ✅ | `POST /api/admin/catalog/import/supplier` : un flux fournisseur → fiches catalogue (audit des lignes) |
| File « À faire aujourd'hui » | ✅ | Débloquer / lots / relances / RFQ, avec deep links |
| Boutique (`getPublicProducts`) | ⚠️ | Liste **tout ce qui est `published`**, indépendamment des critères — c'est exactement pourquoi tes fiches de test non conformes y figurent |

**Diagnostic : la matière première de ta demande existe à 80 %. Ce qui manque, c'est la couche de gouvernance qui la relie** : la carte des critères, le pipeline de statut, l'alarme, l'automatisme.

## 3. Diagnostic expert — 3 manques structurels

1. **Les critères sont dans le code, pas dans les données.** Ils sont implémentés (readiness + truth + gardes-fous) mais non **nominés comme un référentiel** : on ne peut pas les afficher en une carte, les versionner, ni qu'un automate les consomme de façon explicable. C'est le prérequis de tout le reste.
2. **Il n'y a pas de pipeline.** L'état d'un produit est éparpillé entre `administrativeStatus` (draft/published/…), `commercialState` (truth) et `ready` (readiness). Un produit « identifié dans l'appro » n'a même pas de rangée dans le catalogue tant qu'on ne l'importe pas. Or le benchmark (PIM : Akeneo, Salsify, Pimcore ; procurement : SAP Ariba, Coupa) fait exactement ce que tu demandes : **un stade unique par produit, des portes de publication nommées, un score de complétude par produit, un workflow d'approbation avec journal des modifications et rollback**.
3. **Il n'y a pas de boucle d'automatisation.** Les gardes-fous *disent* ce qui manque, mais rien ne **ré-évalue** un produit quand les données changent (enregistrement d'un document CPNP, rattachement d'un fournisseur, import d'un flux, validation d'un contrôle). D'où la demande d'auto-publication — qui, vue comme ça, est l'étape finale d'une chaîne : **données appro → critères re-évalués → publication automatique → boutique**.

## 4. Benchmark — ce que font les logiciels de référence

- **Procurement (SAP Ariba, Coupa, Jaggaer)** : pipeline à stades (requisition → RFx → devis → attribution → bon de commande) ; **compliance gating** — on ne peut pas acheter auprès d'un fournisseur non conforme ; approbations par seuils (auto au-dessous, escalade au-delà) ; les **dérogations sont nommées et tracées**, jamais silencieuses. → Pour nous : les critères = gates, la dérogation = un acte nommé et daté, pas un contournage.
- **PIM / PXM (Akeneo, Salsify, Pimcore, Apimio)** : **publish gate sur chaque listing** ; **data quality dashboard / score de complétude par produit** (« ce qui manque pour publier ») ; **validation workflows + change logs + rollbacks** ; single source of truth distribuée aux canaux. → Pour nous : la « carte des critères » + le pipeline + le journal d'audit sont exactement ce que ces outils industrialisent.
- **GRC réglementaire cosmétique (Règl. 1223/2009, CPNP)** : la notification CPNP doit être **tenue à jour** (formulation, étiquetage, personne responsable) ; une notification obsolète ou une pers. responsable partante = le produit **ne doit plus être mis sur le marché** ; le PIF/CPSR doit être disponible à tout moment. → Pour nous : **un document expiré (CPNP/RP/CPSR) doit rendre le produit non conforme, avec dépublication ou alerte nommée** — c'est un garde-fou légal, pas une option.
- **ERP/Odoo (purchase)** : PO → réception → **three-way match** (PO / réception / facture) ; **points de réassort min/max** → proposition d'achat automatique. → Pour nous : la proposition d'achat existe ; le réassort min/max est l'évidence de l'extension.

## 5. La vision — « le pipeline de mise en vente »

**Une seule vue où les 250+ produits avancent dans les mêmes 6 stades**, chaque stade contrôlé par des critères nommés ; la machine fait avancer les produits quand les critères passent au vert (journal d'audit + interrupteur), et la boutique n'affiche que ce qui a passé la porte — ou, à défaut, **nomme** ce qui ne l'a pas :

```
IDENTIFIÉ → FICHE CRÉÉE → DOSSIER EN COURS → CONFORME → PUBLIÉ → VENDABLE
(appro)      (catalogue)   (manques nommés)   (critères verts) (boutique)  (checkout OK)
```

- **L'approvisionnement** = le haut du pipeline (candidats identifiés).
- **Le catalogue** = le milieu (fiches + dossiers fournisseurs).
- **La boutique** = la fin (vendable).
- **Une ligne par produit, d'un bout à l'autre** : c'est la « liaison » qui manque, et elle donne la visibilité globale demandée.

## 6. Les chantiers (6, ordonnancés, cumulatifs)

### Chantier A — La carte des critères de mise en vente (soubassement) · ~1 j
Un module `SALES_CRITERIA` (id, libellé, famille : légale/éditoriale/visuelle/commerciale, règle, source de donnée) = **la source unique** consommée par le moteur de readiness, l'UI et l'automate. Écran « Critères » dans l'admin : la liste nommée, la version, ce que chaque critère lit. API `GET /api/admin/catalog/criteria`.
**Acceptation** : la carte correspond exactement au comportement existant (aucune règle ne change), versionnée, banc qui fige la liste.

### Chantier B — Vue d'ensemble : le pipeline catalogue · ~1,5 j
Écran « Pipeline » (en tête du pilotage, ou sous-onglet du catalogue) : **kanban 6 stades** + KPIs (total, conformes, bloqués par critère, en boutique non conformes, test) + **filtre-matrice** (critère × produits : « tous les produits sans CPNP ») + ligne par produit (nom, stade, critères bloquants nommés, fournisseur). 100 % dérivé.
**Acceptation** : chaque produit est exactement dans un stade (banc de cohérence), les compteurs se réconcilient avec les endpoints, un clic mène au bon écran.

### Chantier C — Alarme « anomalies en boutique » + mode strict + veille d'expiration · ~1 j
- Bandeau rouge **en tête du catalogue** : « N fiches visibles ne respectent pas les critères » + liste nominative + 2 actions par ligne : **Dépublier** (route de statut existante) ou **Compléter le dossier** (deep link fiche).
- **Mode strict** (paramètre persistant, interrupteur visible, action journalisée) : la boutique n'affiche que les fiches conformes. **Désactivé par défaut** — ton choix de test reste intact tant que tu ne l'armes pas.
- **Veille d'expiration** : documents CPNP/RP/CPSR expirés ou expirant sous 60 j → produit requalifié non conforme + alerte nommée (pratique GRC/CPNP).
**Acceptation** : l'alarme compte le réel (banc), le mode strict est testable des deux côtés, zéro donnée masquée sans nom.

### Chantier D — Le registre approvisionné : les 250 avec leur pipeline · ~1,5 j
La vue consolidée devient **le registre unique** : statut de pipeline **par ligne** (identifié / fiche créée / conforme / publié — dérivé, jamais supposé), fournisseur + contact + e-mail prêt, filtres (fournisseur, statut, vague), **export CSV** du registre entier, et par ligne : **« Créer la fiche »** (via la route d'import fournisseur existante, auditée) + **« Voir dans le catalogue »** (deep link) + « Copier l'e-mail ».
**Acceptation** : chaque ligne a un statut réel, la création de fiche passe par l'import gardé (zéro écriture hors route), le registre réconcilie avec le catalogue (même produit = même id des deux côtés).

### Chantier E — L'auto-publication : watch → actif · ~2 j
- **E1 — mode watch (simulation)** : à chaque événement déclencheur (document enregistré, fournisseur rattaché, import, validation, expiration), le moteur ré-évalue les produits et **journalise ce qui serait publié** — visible dans l'admin (« 3 fiches deviendraient conformes »). Rien n'est écrit.
- **E2 — mode actif** : `draft → published` (+ listable) quand tous les critères sont verts, avec :
  - **journal d'audit** (produit, version des critères, déclencheur, date) — consultable, avec **rollback en un clic** de la dernière action,
  - **exclusions** : fiches test, kits, drapeau « publication manuelle » par produit,
  - **interrupteur global** (pause en un clic),
  - ligne dans la file « À faire aujourd'hui » : « X a été auto-publié — vérifier ».
**Acceptation** : un banc prouve qu'**aucune fiche non conforme n'est auto-publiée** (tous les cas de bord), l'audit est complet, la pause et le rollback fonctionnent.

### Chantier F — Plus loin : scorecard fournisseurs + réassort · ~1,5 j
- **Réactivité fournisseur** mesurée sur les RFQ réelles (taux de réponse, délai moyen, documents tenus) → badge « fournisseur fiable » dans le registre ; **expirations à 60 j** → alerte.
- **Points de réassort min/max** par produit (donnée optionnelle, jamais inventée) → nouvelle famille « réassort » dans la file d'actions + intégration à la proposition d'achat (pratique ERP/Odoo).
**Acceptation** : tout est mesuré sur données réelles ; sans données, rien n'est affiché.

## 7. Ordre d'attaque et dépendances

```
Lot 1 (valeur immédiate, lecture + contrôles existants) :  B + C
Lot 2 (la liaison appro ↔ catalogue) :                      D
Lot 3 (la machine) :                                         A → E
Lot 4 (plus loin) :                                          F
```

- **B et C ne dépendent de rien** et donnent dès le premier commit ce que tu décris : « je vois tout, je vois ce qui est non conforme dans la boutique, je corrige en un clic ».
- **D** rend l'approvisionnement pilotable ligne à ligne (les 250 + leurs fournisseurs + e-mails + « créer la fiche »).
- **A précède E** (l'automate doit consommer la carte des critères, pas une copie).
- **F** se greffe après (réagit, ne bloque rien).

Total ≈ 8 jours d'agent ; chaque chantier = commit testé, tsc propre, bancs dans la chaîne, CI verte, push sans force.

## 8. Risques & garde-fous (non négociables)

1. **L'auto-publication est une écriture** sur une plateforme dont la règle est « sourcé ou absent, jamais inventé, fail-closed » : watch d'abord, audit complet, exclusions, pause, rollback. Aucun mode actif sans le banc « rien de non conforme n'est publié ».
2. **Le mode strict change la boutique** : désactivé par défaut (ton choix de test est respecté), interrupteur visible, chaque armement journalisé.
3. **L'expiration CPNP/RP est un sujet légal** : la requalification est un fait (document expiré) ; l'action (dépublication) reste sous contrôle humain en C, l'automatisme possible seulement via E avec les mêmes garde-fous.
4. **Travail parallèle actif** : fetch/rebase/push sans force, conflits en union, bancs revérifiés à chaque commit.
5. **Aucune donnée inventée** : le pipeline et la carte sont des vues sur les endpoints existants ; la version de la carte des critères est inscrite dans chaque décision d'audit.

## 9. Ce que je te recommande

**Attaquer le Lot 1 (B + C)** : la visibilité totale + l'alarme anomalies + le mode strict + la veille d'expiration. C'est ce qui transforme immédiatement la situation actuelle (fiches de test non conformes visibles) en une situation **maîtrisée et nommée**, et pose les briques (matrice des critères, alarme) que D/E/F réutiliseront.

## 10. Statut de livraison — Lot 1 (B + C) — livré le 15/09/2026

**Validé par l'acheteur : « Lot 1 : B + C (recommandé) ».** Livré, bancs dans la chaîne, tsc propre, push sans force.

### Livré (chantiers B + C, partie lecture & alarme)

- **B — Pipeline catalogue** : nouvel onglet admin « Pipeline de mise en vente » (premier du groupe catalogue). Vue d'ensemble des 6 stades (Identifié → Fiche créée → Dossier en cours → Conforme à publier → Publié → Vendable) avec compteurs par stade, total, badges test, matrice des critères manquants les plus fréquents (nommés, plafonnée à 8) et le détail ligne à ligne (fiche ou candidat). Logique pure dans `src/lib/catalogPipeline.ts`, vue dans `src/components/CatalogPipelinePanel.tsx`.
- **C1 — Alarme « anomalies en boutique »** : bandeau compact en tête de l'onglet catalogue (`src/components/BoutiqueAnomalyBanner.tsx`) + section dédiée dans le pipeline. Liste nominative des fiches **publiées ET visibles ET non conformes** (exactement le cas de test laissé volontairement), triées par nombre de manquants. Action par fiche : **Dépublier** (→ draft, via l'endpoint de statut existant) ou **Compléter** (→ ouvre le catalogue sur la fiche). Signalé, jamais masqué.
- **C2 — Veille d'expiration réglementaire** : documents CPNP / pers. responsable UE / CPSR / PIF expirés ou expirant sous **60 jours**, mappés aux produits concernés. Section dédiée dans le pipeline + compteur de fournisseurs en alerte. Un document **sans date** n'est pas surveillé (on ne devine pas une date) ; type non suivi ignoré ; `now` injectable (calcul figé et testé). La route fournisseurs (`src/server/routes/suppliers.ts`) expose désormais `complianceDocs` (types suivis + `expiresOn`) en plus de `documentCount`/`expiredDocumentCount`.

**Banc** : `tests/kurla_catalog_pipeline.test.ts` (5 blocs) ajouté à la chaîne `npm test`. Régressions revérifiées : sourcing, sourcing consolidé, fournisseur, fournisseur admin, dashboard, cockpit opérations, publication catalogue, inventaire de routes (80 routes, fixture régénérée car les nouveaux écrans appellent des routes existantes).

### C3 — Mode strict : code livré, il ne manque que la table (SQL à coller)

- **Tout le code C3 est livré et bancé** :
  - `src/lib/db/publicationPolicyStore.ts` — lecture/armement de la politique (fail-closed : table absente = état **nommé** + repli OFF, jamais d'armement par défaut) ;
  - `GET`/`PATCH /api/admin/publication-policy` — gardées `requireAdmin`, chaque armement **daté, nommé et journalisé** dans `audit_logs` ;
  - **interrupteur réel** dans le panneau « Pipeline de mise en vente » : état ARMÉ/Désarmé + date + acteur + note, armement/désarmement avec confirmation, état « non mesurable » affiché telle quelle tant que la table n'existe pas ;
  - **la liste publique consomme `strict_mode`** : armé = la boutique (liste, fiches, devis de kits) ne sert que les fiches dont la publication-readiness est au vert — **masque de vue, jamais de dépublication** ; désarmé = comportement d'avant, à l'identique (zéro surcoût quand OFF, cache 60 s aligné sur le CDN).
- **Il ne reste qu'à créer la table** — l'éditeur SQL du dashboard Supabase suffit (aucun jeton requis) : SQL idempotent dans `supabase/migrations/20261003000000_publication_policy.sql` (une ligne, `strict_mode` OFF par défaut, RLS admin).
- Banc `tests/kurla_publication_policy.test.ts` (5 blocs) : table absente → armement refusé · OFF = zéro changement · armement daté/nommé + masque liste & kits · désarmement fidèle + historique conservé · écriture invalide rejetée sans effet.
- C'est alors que le point 2 de ta demande (« se retrouve directement / automatiquement dans la boutique ») passe de l'aperçu au réel — et que le chantier **E** (auto-publication) pourra réutiliser exactement cette table comme interrupteur de la machine.

### Ce qui reste (lots 2 à 4)

- **Lot 2 — D** : registre des 250 avec statut pipeline par ligne + « Créer la fiche » (import `POST /api/admin/catalog/import/supplier`, qui existe déjà) + « Voir dans le catalogue ».
- **Lot 3 — A → E** : carte des critères comme données versionnées (A), puis auto-publication watch → actif avec audit, rollback 1 clic, exclusions test/kits/manuel et kill switch (E).
- **Lot 4 — F** : scorecard fournisseurs (réactivité mesurée sur les RFQ réelles) + réassort min/max.
