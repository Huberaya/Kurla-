# RAPPORT FINAL — SYSTÈME D'ACHAT, APPROVISIONNEMENT, CATALOGUE & FULFILLMENT
**Date : 2026-09-16 · Auteur : Agent Arena · Bancs : 6 `[PASS]` · tsc : exit 0**

---

## 1. Architecture du système

Le cycle complet **TROUVER → SOURCER → VÉRIFIER → VALIDER → PUBLIER → ORGANISER → VENDRE → ROUTER → FULFILL → SUIVRE → ANALYSER** repose sur 5 couches, toutes adossées à l'existant (rien n'a été détruit ni recréé) :

| Couche | Composants | Statut |
|---|---|---|
| Vérité & critères | `catalogTruth` (blocages durs), `kurlaReadyScore` (0-100), `catalogGate` (porte), `derogations` (exceptions datées) | ✅ en prod |
| Approvisionnement | `sourcing_fond_positions` (250), `sourcing_product_candidates` (121), `sourcing_prospects`, `suppliers` (16), `rfqs`, **`product_sources` (NOUVEAU)**, vue consolidée + panel Ops | ✅ en prod |
| Liaison | `sourcingFicheLink` (candidat→fiche par clés `source_candidate_id` ↔ `draft_product_id`) | ✅ en prod |
| Fulfillment | `fulfillment.ts` (dropship 24-48h, précommande, devis 3PL), **routeur `supplyModel.routeFulfillment` (NOUVEAU)**, `order_status_history` (traçage statuts) | ✅ moteur en prod, branchement commande = restant |
| Traçabilité | `catalog_gate_journal`, `catalog_imports`/`catalog_import_rows`, `order_status_history`, **`sourcing_workflow_events` (NOUVEAU)**, `catalog_derogations` | ✅ en prod |

## 2. Modèle de données

- **Produit** (`products`) : nom, marque, slug, prix, catégorie, INCI, besoins (taxonomie 15 besoins peau `skinTaxonomy`), statut, vérité catalogue, `source_candidate_id`.
- **Fournisseur** (`suppliers` + `supplier_documents`) : raison sociale, pays, contacts, MOQ, délais, certifications, statut de vérification.
- **Source / offre fournisseur** (**`product_sources`, 20 colonnes, créé ce jour**) : produit × fournisseur × **modèle** (`dropshipping | affiliation | 3pl | stock_kurla | other`), `is_primary`, coût, frais, coût fulfillment, commission %, lien affilié + cookie, délai, pays d'expédition, disponibilité. **Un coût inconnu reste NULL — jamais 0 inventé** (bug `Number(null)=0` attrapé par le banc et corrigé).
- **Workflow** (**`sourcing_workflow_events`, créé ce jour**) : entityType/entityId, from→to, raison, commentaire, auteur, horodatage.
- **Dérogations** (`catalog_derogations`) : motif, décideur, expiration.

## 3. Workflow produit (8 étapes, §4)

`identified → supplier_identified → evaluation → validated → approved → ready_to_publish → published → active`, plus `refused` (motif **obligatoire**, reconsidération possible). Transitions illégales refusées par le moteur (`canTransitionSupplyWorkflow`) — **pas de saut identifié→publié**. Chaque transition passe par `POST /api/admin/sourcing/workflow/transition` et écrit dans `sourcing_workflow_events` (§8, §28).

## 4. Workflow fournisseur

Enregistrement (`suppliers`) → documents (`supplier_documents`) → prospection (`sourcing_prospects`, statuts) → RFQ (`rfqs`, 5 brouillons rédigés) → sources rattachées (`product_sources`) → alerte automatique si fournisseur sans contact (§23). Vue : `SupplierAdminPanel` existant + panel Ops (compte sans contact).

## 5. Workflow commande

Client → `orders`/`order_items` (Stripe en prod) → `order_status_history` trace chaque changement de statut. **Le routeur de fulfillment existe et est banc-testé** : produit → source principale → modèle → responsable. Le branchement automatique commande→route au moment du paiement est le premier chantier restant (l'architecture est prête, la jonction orders→product_sources n'est pas encore câblée — dit honnêtement).

## 6. Workflow fulfillment

`routeFulfillment` répond à « **qui expédie ?** » : dropshipping → fournisseur nommé ; 3PL → logisticien nommé ; affiliation → partenaire (exige le lien réel) ; stock KURLA → KURLA. Sans source ou source indisponible : **routage BLOQUÉ avec motif**, jamais de responsable inventé, **pas de bascule automatique** sur une autre source (décision humaine).

## 7. Automatisations disponibles (aujourd'hui)

- Scan de la porte : calcule publier/retirer selon les critères (mode proposition, apply journalisé).
- Création de fiche depuis candidat en 1 clic (idempotente, données réelles uniquement).
- Alertes d'approvisionnement calculées à la volée (9 types, §23).
- Marge recalculée à chaque lecture (hausse de prix fournisseur = marge mise à jour immédiatement).
- Import CSV audité (`catalog_imports`), jamais de publication automatique d'un flux externe (§26).

## 8. Automatisations futures (architecture prête, non simulées — §31)

- Sync catalogue/stock/commandes/tracking dropshipping : la table `product_sources` porte `affiliate_url`, `lead_time_days`, `ships_from`, `available` — il manque les connecteurs par partenaire, **à construire quand un partenaire réel est signé**.
- API 3PL : `fulfillment.ts` a déjà la notion de devis 3PL ; l'intégration viendra avec le partenaire.
- Passage de la porte en mode 100 % auto : décision d'arbitrage, pas un défaut.

## 9. Points nécessitant une intervention humaine (volontaires)

1. Appliquer les décisions de la porte (mode proposition). 2. Refus de workflow (raison obligatoire). 3. Renouvellement des dérogations. 4. Choix d'une autre source en cas de rupture. 5. Envoi des e-mails fournisseurs (copier/coller). 6. Saisie des coûts réels (jamais estimés automatiquement).

## 10. Fonctionnalités restantes à développer

1. **Jonction commande→routeur** : au paiement, figer la route (`order_items.source_id`) et afficher « qui expédie » dans le panel Commandes. 2. **Écran de gestion des sources par produit** (CRUD complet côté UI — les routes API existent déjà). 3. **Besoins multi-étiquettes côté admin** (la taxonomie 15 besoins existe côté boutique ; l'édition par fiche dans Catalogue est à exposer). 4. **Recherche globale unifiée** produits+appro+fournisseurs (§24). 5. **Statistiques affiliation** (clics/conversions — nécessite le programme partenaire réel). 6. Suivi tracking par source (champ prêt, collecte à venir).

## 11. Risques identifiés

- **Coûts partiels** : une marge calculée avec frais=0 par défaut est signalée « à obtenir » mais peut être lue comme réelle → le panel liste explicitement les hypothèses.
- **Dérogations qui expirent en cascade le 15/10** : 42 fiches d'un coup → la porte proposera 42 retraits ; renouveler avant ou assumer.
- **Jetons en clair** (GitHub `ghp_UeBg…`, Supabase `sbp_de6d…`) : à révoquer.
- **Concurrence multi-agents sur git** : gérée par merge systématique avant push.

## 12. Recommandations

1. Câbler la jonction commande→routeur en priorité (c'est ce qui rend le système opérationnel le jour de la première vente). 2. Signer 1 partenaire dropship + 1 affilié réels avant toute intégration. 3. Passer la porte en auto après 2 semaines de mode proposition sans incident. 4. Saisir les coûts réels des 20-30 références à plus fort potentiel pour fiabiliser les marges.

## 13. Audit — les 10 cas réels (§33), exécutés par le banc `kurla_supply_model.test.ts`

| Cas | Comportement vérifié |
|---|---|
| 1 Dropshipping | route = fournisseur nommé, aucun blocage |
| 2 Affiliation | partenaire responsable ; commission 12 % de 20 € = 2,40 € ; **sans lien réel = bloqué** |
| 3 3PL | logisticien nommé responsable |
| 4 Multi-fournisseurs | la source principale explicite décide ; marge 48 % calculée |
| 5 Non conforme | alerte critique `not_compliant` |
| 6 Incomplet | marge = null (pas 0), manquants listés, fournisseur sans contact signalé |
| 7 Validé → catalogue | sauts interdits, refus exige une raison, reconsidération possible |
| 8 Rupture fournisseur | routage bloqué « source principale indisponible », pas de bascule auto |
| 9 Vendu mais indisponible | alerte critique `source_unavailable` |
| 10 Hausse de prix | marge 12 € → 0 € immédiatement visible |

**Vérifications d'infrastructure** : migrations appliquées en prod et relues (`product_sources` 20 colonnes, `sourcing_workflow_events` 9 colonnes, RLS activées) · 6 bancs `[PASS]` · tsc exit 0 · push vérifié sur le distant.
