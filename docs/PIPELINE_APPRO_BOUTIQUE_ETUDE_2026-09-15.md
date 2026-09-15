# ÉTUDE — Pipeline Approvisionnement → Catalogue → Boutique
**Date : 2026-09-15 · Auteur : Agent Arena · Statut : PROPOSITION (aucun code, aucun go reçu)**

> Demande : « visibilité complète sur les produits dans Catalogue et Approvisionnement ; un produit qui respecte les critères définis doit se retrouver **directement dans la boutique** ; les produits en boutique hors critères (choix de test) doivent être **signalés** ; l'Approvisionnement doit montrer les **250+ produits identifiés**, fournisseurs, contacts, messages prêts ; une **liaison** Appro → Catalogue ; passage **automatique** quand les critères sont remplis. Étudier, améliorer, pousser plus loin, proposer des chantiers, en regardant les logiciels d'achat/appro/commande/vente du marché. »

---

## 1. Ce qui existe déjà (mesuré, pas supposé)

| Bloc | État réel |
|---|---|
| **Critères de vente** | Déjà codés dans `catalogTruth.ts` : statut actif + publié, preuve produit validée, visuel non-placeholder + droits, CPNP non expiré, allégations conformes, contrat C1 peau complet, stock/précommande documentée → `isPubliclyListable` et `isCheckoutEligible`. Les blockers sont nommés un par un (ligne 446-463). |
| **Mode test** | `is_test_listing` + porte séparée `isTestListableProduct` (42 fiches test en base). Elles ne sont jamais achetables. Badge + filtre « Test / sourcing » dans le panel catalogue (commit `12d4f9f`). |
| **Approvisionnement** | 3 sources disjointes : `sourcing_fond_positions` (**250 lignes**, seedées par l'autre agent : marque, produit, format, prix constaté, statut prix, canal fournisseur), `sourcing_product_candidates` (**121**), `sourcing_prospects` + `suppliers` (16, dont 7 avec e-mail), `rfqs` (5 brouillons). |
| **Vue consolidée** | Panel « 242 lignes » (produits + candidats) avec prix, fournisseurs, contacts, e-mails prêts — déployé. **Mais elle n'inclut PAS les 250 positions de fond.** |
| **Liaison Appro → Catalogue** | **Inexistante.** Aucune fonction ne transforme un candidat/position en fiche produit. Tout est manuel aujourd'hui. |
| **Auto-publication** | **Inexistante.** Les portes calculent l'éligibilité mais personne ne l'exécute : la publication reste un acte manuel. |

**Diagnostic expert** : les briques de jugement existent (c'est le plus dur, et c'est fait). Ce qui manque, c'est **l'exécution** (publier automatiquement quand c'est vert), **l'unification** (une seule vue des 3 sources d'appro), **la liaison** (candidat → fiche) et **la gouvernance des exceptions** (les fiches test en boutique signalées comme telles, avec expiration).

---

## 2. Ce que font les logiciels du marché (benchmark vérifié)

### PIM (Akeneo, Pimcore, Apimio)
- **Akeneo** : un produit n'est exporté vers un canal QUE si (a) il est associé au canal, (b) son **indice de complétude = 100 %** sur les attributs requis de ce canal, (c) il est **activé**. C'est exactement le mécanisme « critères remplis → boutique » demandé, industrialisé. ([api.akeneo.com](https://api.akeneo.com/guides/ecommerce-connection/step3-reconcile-PIM-data-with-eCommerce-data.html))
- **Apimio « Quality Guard »** : score 0-100 % par produit, **règles par catégorie** (un canapé ≠ une bougie ≠ un soin), et **porte de publication bloquante** sous le seuil — « score, impact, fix, block ». Le score est relié au taux de remboursement (« impact layer »). ([apimio.com](https://apimio.com/))
- **Akeneo SDM** : portail **self-service fournisseur** — le fournisseur remplit lui-même INCI, prix, visuels ; validation automatique à l'arrivée.

### Marketplaces (Amazon)
- **Suppression de fiche** : une fiche non conforme (attribut requis manquant, image non conforme, doc de conformité absente) est **retirée de la recherche mais reste dans le catalogue vendeur** — c'est le modèle exact pour nos fiches test : visibles pour nous, invisibles pour les clients. ([qubeq.com](https://qubeq.com/amazon-listing-suppression/))
- **Listing Quality Dashboard** : score A-F (A ≥ 80 points = acceptable), **le dashboard dit exactement quels champs bloquent**, et alerte sur les échéances (« à remplir avant telle date sinon suppression »). ([m.media-amazon.com](https://m.media-amazon.com/images/G/28/AS/AGS/SU/CN_Ys_Listing_Basics_1.4_Uploading_EN.pdf))

### ERP achat (SAP MM, Odoo Achats — pratiques standard du secteur)
- **Fiche article = pivot unique** : un article porte à la fois l'onglet « ventes » (publiable, prix public) et l'onglet « achats » (fournisseur, prix d'achat, délai, MOQ). La liaison Appro ↔ Catalogue n'est pas une vue : c'est **le même objet**.
- **Info-record fournisseur** : chaque couple produit×fournisseur a sa fiche (prix, délai, historique) — notre table candidats en est l'ébauche.
- **Cycle de vie à états** : identification → appel d'offres (RFQ) → commande (PO) → réception → activé à la vente. Chaque transition est **tracée et conditionnée**.
- **Réappro automatique (MRP)** : stock < seuil → proposition de commande générée. Transposable chez nous : candidat validé → fiche draft générée.

### Synthèse des 5 principes à retenir
1. **Une porte, pas un avis** : la conformité doit *bloquer/publier*, pas juste s'afficher.
2. **Score de complétude pondéré par catégorie** + liste explicite des champs bloquants.
3. **Exceptions explicites et périssables** : une fiche hors critères en boutique = dérogation nommée, datée, qui expire.
4. **Même objet des deux côtés** : candidat sourcing et fiche catalogue liés par une clé, jamais recopiés à la main.
5. **Journal d'audit** : chaque publication/suppression automatique est tracée (qui/quoi/quand/pourquoi).

---

## 3. Conception cible (ma recommandation experte)

### 3.1 Pipeline unifié à 6 états
```
IDENTIFIÉ → CONTACTÉ → SOURCÉ → CONFORME → PUBLIÉ → EN VENTE
 (250 pos.)  (RFQ/envoyé) (prix+INCI+ (porte verte)  (boutique)  (stock>0)
                            visuels)
```
Chaque position des 250 + chaque candidat + chaque produit est rattaché à **un seul objet** « référence d'assortiment » avec son état, son fournisseur, son contact, son message, son score. Fin des 3 tables disjointes dans l'UI : une seule vue « Approvisionnement » avec filtres par état/fournisseur/canal.

### 3.2 Score de conformité « KURLA Ready » (0-100)
Réutilise les blockers déjà codés, pondérés :
- **Bloquants durs (0 = non publiable)** : preuve produit, CPNP/RP valide, visuel + droits, allégations, contrat C1, fournisseur identifié, prix d'achat réel.
- **Pondérés (qualité)** : INCI complète, DDM/PAO, 3+ visuels, description, EAN, marge cible ≥ X %.
- Affiché sur chaque fiche du catalogue : pastille verte/orange/rouge + **« ce qui bloque » listé champ par champ** (façon Amazon LQD).

### 3.3 Porte automatique + dérogations
- Score bloquants = 100 % → **publication automatique** (état PUBLIÉ), tracée au journal.
- Un bloquant apparaît plus tard (CPNP expiré…) → **suppression automatique de la recherche** (modèle Amazon), fiche reste en admin.
- **Dérogations** : les fiches test actuelles deviennent des « dérogations » explicites — motif, décideur, **date d'expiration** (ex. 30 j). Le catalogue affiche un compteur rouge « N dérogations actives, M expirent cette semaine ». À expiration : retour automatique en brouillon. C'est la réponse propre à « c'était mon choix pour tester, il faut le signaler ».

### 3.4 Liaison Appro → Catalogue en 1 clic (+ auto)
- Bouton **« Créer la fiche »** sur chaque candidat/position : pré-remplit marque, produit, prix constaté (source + date), fournisseur, contact — **uniquement des données réelles**, fiche créée en `draft`.
- Quand le fournisseur renvoie INCI + prix pro + visuels (champs remplis côté appro), le score passe à 100 % → la porte publie **sans intervention**. C'est le « directement dans la boutique » demandé.
- Aucun prix, aucune obligation inventés : un champ vide = un champ vide, la porte reste fermée.

---

## 4. Chantiers proposés (ordonnancés)

| # | Chantier | Contenu | Dépend | Effort estimé |
|---|---|---|---|---|
| **C1** | **Score « KURLA Ready »** | Helper pur qui agrège les blockers existants en score 0-100 + liste des champs bloquants ; exposé dans `/api/admin/catalog/products` ; pastille + « ce qui bloque » dans le panel catalogue. Banc complet. | — | S (1 session) |
| **C2** | **Vue Appro unifiée (250+121+16)** | Fusionner `sourcing_fond_positions` + candidats + prospects dans la vue consolidée existante : un seul pipeline 6 états, filtres état/fournisseur/canal, KPIs (contactés, réponses, convertis). Les e-mails prêts déjà construits y sont rattachés par fournisseur. | — | S-M |
| **C3** | **Liaison candidat → fiche** | Bouton « Créer la fiche » (pré-remplissage données réelles → draft) + lien réciproque fiche → candidat d'origine (traçabilité prix/source). | C2 | M |
| **C4** | **Porte automatique** | Cron/événement : score 100 % → publication auto tracée ; bloquant apparu → suppression auto de la recherche ; journal d'audit consultable. Bascule progressive : d'abord mode « proposition » (la porte propose, tu valides), puis mode auto. | C1, C3 | M |
| **C5** | **Dérogations & alertes** | Les 42 fiches test converties en dérogations datées (motif + expiration) ; panneau rouge « dérogations actives » ; alerte hebdo (e-mail déjà dispo) : scores en baisse, CPNP bientôt expirés, dérogations qui expirent. | C1 | S-M |
| **C6** *(plus loin)* | **Portail fournisseur self-service** | Lien unique envoyé par e-mail : le fournisseur dépose INCI, prix pro, visuels → les champs appro se remplissent → la porte fait le reste. (Modèle Akeneo SDM ; réduit 80 % des relances manuelles.) | C4 | L |
| **C7** *(plus loin)* | **Boucle vente → score** | Taux de retour/avis par fiche remonté dans le score (modèle Apimio « impact layer ») ; seuil mini → alerte réassort/suppression. | C4 | M |

**Séquence recommandée** : C1 → C2 (indépendants, lançables ensemble) → C3 → C4 → C5, puis C6/C7 selon l'appétit. C1+C2 donnent déjà 80 % de la visibilité demandée ; C4 est le cœur « automatique ».

---

## 5. Ce que j'ai amélioré par rapport à la demande initiale

1. **« Automatique » sécurisé en 2 temps** : mode proposition d'abord, mode auto ensuite — une publication automatique sans filet le premier jour est le meilleur moyen de publier une fiche non conforme. Amazon et Akeneo font pareil (sandbox avant syndication).
2. **Les fiches test ne sont pas un bug à cacher mais des dérogations à gouverner** : datées, motivées, périssables. C'est plus fort qu'un simple signalement.
3. **La liaison n'est pas une vue mais une clé** : candidat et fiche = le même objet, comme la fiche article SAP. Sinon la donnée diverge en 2 semaines.
4. **Le score ouvre la porte à C6/C7** : portail fournisseur et boucle retour-client se branchent dessus sans refonte.

## 6. Arbitrages à trancher (3 questions)

1. **Mode de la porte au démarrage** : « proposition » (tu valides chaque publication) ou « auto » direct ? Ma reco : proposition 2 semaines, puis auto.
2. **Expiration des dérogations test** : 30 jours par défaut, renouvelable ? Et les 42 fiches actuelles : toutes converties en dérogations, ou certaines à retirer tout de suite ?
3. **Périmètre C2** : les 250 positions de fond entrent-elles toutes dans le pipeline, ou seulement celles avec prix constaté (68 du registre + colonnes `prix_constate_cents` renseignées) ?

---
*Références : api.akeneo.com (complétude + canaux) · apimio.com (Quality Guard, publish gate) · qubeq.com & m.media-amazon.com (suppression, Listing Quality Dashboard) · pratiques standard SAP MM / Odoo Achats (fiche article pivot, info-record, MRP).*
