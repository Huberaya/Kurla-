# RAPPORT D'AUDIT — KURLA Skin

**Date** : 17 septembre 2026  
**Périmètre** : dépôt `github.com/Huberaya/Kurla-`, branche `main`, commit `6834b5a` (17/09/2026 13:11 UTC)  
**Méthode** : lecture du code, des migrations, des stores, de l’admin, de COORDINATION.md. **Aucune modification de code.**  
**Limite** : pas d’accès à la base de production depuis cet environnement. Les volumes « prod » cités viennent des mesures déjà consignées dans `COORDINATION.md` (16–17/09). Les volumes « code » sont vérifiés dans le dépôt.

**Décision demandée** : valider ce rapport **avant** tout chantier. Rien n’est codé tant que ce n’est pas validé.

---

## Synthèse en une page

KURLA Skin n’est **pas** un second site à construire. C’est une **catégorie + métadonnées + pages publiques + espace admin**, branchée sur le **même PIM** que Hair (`products`). Hair est opérationnel (boutique ~63 SKU publiés accessoires/cheveux/kits). Skin **n’a aucun soin peau vendable en boutique** : 0 SKU Skin listable, 16 cibles de formulation `peau-ess-*` (non vendables), un diagnostic et un univers éditorial déjà riches.

Le vrai problème n’est pas « il manque un modèle Produit / Fournisseur ». Ces objets **existent déjà**, souvent **plusieurs fois**, avec des règles métier **déjà strictes** (preuve documentaire, pas d’envoi mail automatique, pas de publication auto, pas de matching silencieux de fournisseur). Le vrai problème est un **pipeline fragmenté** :

- 6 vocabulaires d’état qui ne se recouvrent pas ;
- 2 couches fulfillment (constantes année 1 vs `product_sources`) ;
- 2 espaces d’approvisionnement empilés dans l’admin ;
- 2 taxonomies peau (15 besoins code vs 50 besoins docs) ;
- un import CSV déjà capable de créer des **brouillons non publiés**, mais pas un objet « 500 produits identifiés » unifié.

**Dropshipping / affiliation / 3PL** : **modélisés**, **pas branchés**. Aucune API AfricanFabs, Afro Wholesale, AliExpress, CJ, Spocket, Huboo, Cubyn. Le dropship année 1 = case à cocher + badge + mailto + bon de commande. L’affiliation = colonnes (`affiliate_url`, `commission_pct`). Le 3PL = tampon 75 SKU hardcodé + shortlist d’entrepôts.

**Recommandation d’architecte** : **ne pas recréer** Product / Supplier / Offer. **Unifier le cycle de vie** autour des tables déjà là, **protéger Hair**, **importer ~500 identifiés sans publier**, **rendre les fiches fournisseur cliquables partout** (déjà vrai dans une partie de l’admin), **ne brancher aucune API dropship tant que le modèle d’offre N:N n’est pas le chemin unique**.

---

## 1. Architecture actuelle

### 1.1 Stack réelle

| Couche | Choix | Fichiers |
|---|---|---|
| Front | Vite + React 19, lazy routes | `src/lib/routeTable.tsx`, `src/pages/*` |
| Back | Express monolithique (`server.ts` compose des routeurs) | `server.ts`, `src/server/routes/*` |
| Données | Supabase Postgres (~100 migrations, ~142 `CREATE TABLE`) | `supabase/migrations/` |
| Auth | Supabase Auth uniquement (plus de mot de passe local / clé admin partagée) | `src/context/AuthContext.tsx`, admin 401 si rôle ≠ admin/superadmin |
| Paiement | Stripe (TEST / LIVE explicite) | routes commandes, dashboard « Stripe : MODE TEST » |
| Email transactionnel | Resend / SendGrid / Postmark **si** `EMAIL_PROVIDER` + clé + `EMAIL_FROM` | `src/lib/emailService.ts` — défaut = `console` (log, **non envoyé**) |
| Email fournisseurs / RFQ | **jamais** `emailService` : `mailto:` + copie presse-papiers | `src/lib/outreachEmails.ts`, `sourcingStore.sendRfq` |
| IA | Gemini **côté serveur uniquement** | routes IA |
| Dual store | mémoire (tests) / serveur (prod) | `src/lib/db/*Store.ts` |
| Déploiement | Vercel | `.vercelignore` |

### 1.2 Un seul catalogue, deux univers

Il n’y a **pas** de table `skin_products`. Skin = `products.category ∈ {soins_visage, teint}` + métadonnées (`skin_type`, `phototype`, `spf`, `finish`, `concerns`, `needs[]`, `routine_slot`, …). Hair reste sur **la même table**. C’est la bonne décision ; tout chantier qui créerait un second PIM casserait Hair et doublerait la dette.

Espace admin : `?base=skin` | `hair` | `copilot`. **Même navigation** (6 familles, 19 onglets) depuis le 17/09. Le filtre workspace (`X-Kurla-Workspace` → `src/server/workspaceScope.ts`) ne change pas le schéma, il **restreint** les listes.

### 1.3 Couches de données (ce qui existe vraiment)

```
PUBLIC (boutique, diagnostic, /peau/*)
        │  isPublishableProduct() — jamais un draft, jamais un test listing
        ▼
products  ←── catalog_status: draft | pending_review | published | unavailable
        │
        ├── products.supplier_id          (1 fournisseur « principal », optionnel)
        ├── products.source_supplier      (MARQUEUR formulation/placeholder — PAS un nom de fournisseur)
        ├── products.fulfillment_channel  (not_set | dropship | third_party_logistics | …)
        │
        ├── product_sources  N sources × modèle
        │     dropshipping | affiliation | 3pl | stock_kurla
        │     = l’OFFRE (coût, délai, URL affilié, 3PL, stock)
        │
        ├── suppliers + supplier_documents
        │     (identité juridique, preuves, types dropship/affiliation/3PL)
        │
        ├── sourcing_prospects  ≠ suppliers  (pistes ; 3/28 liés via supplier_id)
        ├── sourcing_product_candidates      (121, tous bloqués — « identifiés »)
        ├── sourcing_fond_positions          (250 = 50 besoins × 5 — « identifiés »)
        ├── sourcing_items + rfqs + rfq_responses
        └── sourcing_workflow_events         (8 états SUPPLY_WORKFLOW_STATES)
```

**Hair protégé** : `launchCatalog.ts` (573 lignes, catalogue de lancement), `fulfillment.ts` (badges 24–48h, tampon 75, partenaires NL hardcodés), `kurlaFit.ts`, `DiagnosticHairPage`, `hairAdvisory.ts`. Règle d’or déjà écrite dans le dropship guide : *« `launchCatalog.ts` ne bouge jamais »*.

---

## 2. Ce qui existe vraiment vs ce qui a l’air d’exister

### 2.1 Mapping demandé ↔ réel

| Objet demandé | Existe déjà ? | Où | Verdict |
|---|---|---|---|
| Produit identifié | **Oui, éclaté** | `sourcing_product_candidates` (121) + `sourcing_fond_positions` (250) + drafts `src-*` / `peau-test-*` / `fond-*` | Pas un modèle unique. **Aucun n’est un SKU validé.** |
| En sourcing | **Oui** | `sourcing_items` + RFQ + workflow 8 étapes + pipeline 6 stades | 2 workflows parallèles |
| Offre fournisseur | **Oui** | `product_sources` (N:N produit × fournisseur × modèle) + `rfq_responses` (devis) | L’offre n’est **pas** une table manquante |
| Produit validé | **Oui, multi-portes** | `kurlaReadyScore`, `SKIN_REQUIRED_METADATA`, 7 vérifs catalogue, CPNP/RP/CPSR via `supplier_documents`, `catalogGate`, `is_test_listing` | Validation ≠ publication |
| En catalogue | **Oui** | ligne `products` en `draft` / `pending_review` | Un draft n’est pas public |
| Publié | **Oui** | `catalog_status = published` **et** `isPublishableProduct()` (images, stock ou précommande, pas test, vérité boutique) | Porte stricte |
| Fiche fournisseur cliquable | **Oui, partielle** | `SupplierSheet` + `SupplierName` / `EditableRecordName` ; édition **uniquement** dans `SupplierAdminPanel` | Ailleurs : lien vers la base, pas 2e éditeur |
| N fournisseurs / produit | **Oui** | `product_sources` | **et** `products.supplier_id` (1:1) en parallèle — dette |
| Critères Skin | **Oui** | `skinCommercialReadiness.ts`, `skinTaxonomy.ts` (15 `SKIN_NEEDS`), `docs/BESOINS_PEAU_50_*.md` | 15 (code boutique) ≠ 50 (docs / fond) |
| Dropshipping | **Modèle + badge + guide** | `supplyModel.ts`, `fulfillment.ts`, `DropshipGuidePanel`, case admin | **Pas d’API** |
| Affiliation | **Colonnes** | `product_sources.affiliate_url`, `commission_pct`, `cookie_days` | **Pas de réseau / tracking** |
| 3PL | **Constante + shortlist** | tampon 75 SKU, Etx 95, Huboo/Cubyn cités | **Pas de WMS** |
| Import 500 sans publier | **CSV oui, cible « identifié » non** | `POST /api/admin/catalog/import/csv` (plafond 1000, drafts, jamais auto-publish) | Excel / JSON / prévisualisation / dédoublonnage : **absents** |
| Envoi mail fournisseur | **UI mailto** | RFQ `status='sent'` = horodatage local, pas un SMTP | Transactionnel client = autre tuyau |

### 2.2 L’illusion principale

L’admin Skin **ressemble** à un back-office Skin complet (mêmes 19 onglets que Hair, pipeline, fournisseurs, RFQ, dropship, lots). COORDINATION.md (16/09) a mesuré : **0 SKU Skin public**. Les 16 `peau-ess-*` sont des **cibles de formulation**, pas des fiches vendables. Publier l’UI sans produits = vitrine vide.

Les 14 composants `Peau*.tsx` existent encore sur disque mais **ne sont plus montés** (gouvernance Skin retirée de la nav le 17/09). Un fichier présent ≠ une fonctionnalité vivante.

`docs/ARCHITECTURE` (11/09) est **périmé**. La vérité opérationnelle est `COORDINATION.md` + les stores.

---

## 3. Ce qui est mock / test / placeholder / démo

| Artefact | Nature | Ne pas traiter comme |
|---|---|---|
| `is_test_listing` / `peau-test-*` | Listings test, **interdits** à la porte de publication | Produits validés |
| `src-*` coming-soon | Drafts vitrine « à venir » (`/api/produits/avenir`) | Catalogue publié |
| `fond-*` | Positions de fond matérialisées en produits draft | Offres fournisseurs |
| `peau-ess-001..016` | Cibles de formulation / héros Skin | SKU en stock |
| `p1`… et `launch-pXX` | Catalogue Hair de lancement / démo | Preuve Skin |
| `EMAIL_PROVIDER=console` | Log stdout, `delivered: false` | Mail parti |
| RFQ « Envoyer » | Ouvre `mailto:` ; DB `sent_at` | Mail délivré |
| `DROPSHIP_TOOLS_IMMEDIATE` (p35, p17, p41…) | IDs **hardcodés** Hair accessoires | Connecteur dropship |
| Tampon 75 SKU / AfricanFabs / Afro Wholesale | Constantes + emails publics | Compte B2B API |
| Stripe TEST | Commandes fictives | Trésorerie |
| Seed prospects (25) / candidates (21) | Jeu de pistes | Fournisseurs vérifiés |
| `source_supplier` texte libre | **Marqueur** formulation/placeholder | Nom du fournisseur |
| Mode mémoire des stores | Tests unitaires | Prod |
| `publication_policy` strict | **OFF par défaut** | Politique déjà active en prod |
| CAC admin | `localStorage` du poste admin | Comptabilité |

Règle déjà dans le code, à conserver : **un test / une dérogation / un coming-soon ne satisfait jamais la porte de publication réelle.**

---

## 4. Ce qui fonctionne vraiment

Vérifié dans le code (comportement implémenté, pas seulement un écran) :

**Plateforme / Hair (à ne pas casser)**
- Auth Supabase, rôles admin/superadmin, plus de backdoor mot de passe local.
- Boutique Hair : produits `published` + `isPublishableProduct`.
- Checkout Stripe, commandes, retours, tickets, expédition manuelle (n° de suivi).
- Diagnostic cheveux, Kurla Fit, routines, avis.

**Gouvernance catalogue (partagée Hair/Skin)**
- 7 vérifications catalogue + score KURLA Ready.
- Porte C4 : **propositions** de publication, **jamais** d’auto-publish test/dérogation (`catalogGate.ts`).
- Import CSV → drafts, plafond 1000, journal `catalog_imports`.
- Pipeline 6 stades + bannière anomalies boutique + horloge d’expiration docs.
- `source_supplier` non écrasé (sécurité formulation).

**Fournisseurs**
- CRUD `suppliers` + documents (preuve : `file_url` + `issued_on` obligatoires).
- `verified` seulement si ≥ 1 document.
- Raison sociale **immuable**.
- `SupplierAmbiguityError` : **jamais** de matching silencieux sur le nom.
- Fiche `SupplierSheet` éditable dans `SupplierAdminPanel` ; clic-nom (`SupplierName`) ailleurs.

**Sourcing**
- Prospects ≠ fournisseurs ; `upsertProspect` **n’écrit pas** `supplier_id`.
- RFQ créées, relancées, attribuées ; attribution **bloquée** sans document sur le fournisseur.
- Workflow 8 étapes horodaté (`sourcing_workflow_events`).
- `product_sources` CRUD + une source primaire par produit.

**Skin public (éditorial / diagnostic — pas commerce)**
- `/peau`, `/peau/diagnostic` (12 étapes), `/peau/science`, `/peau/comparer`, `/peau/guide`, `/peau/gamme`, `/peau/journal`, `/melanin-skin`, `/account/skin-id`.
- Taxonomie 15 besoins, 8 types de peau, phototype + consentement, HPI, SPF sans voile blanc.
- 50 besoins documentés (`docs/BESOINS_PEAU_50_2026-09-13.md`) : beaucoup déjà couverts en **éducation**, pas en SKU.

**Ops année 1 (procédure, pas API)**
- Guide dropship 0 carton (accessoires, pas cosmétique).
- Fulfillment : accessoires 24–48h vs soins 3–5j, panier mixte 1 colis via 3PL.
- Gel de route à la ligne de commande (`order_item_routes`) au paiement.

**Email client**
- Tuyau réel Resend/SendGrid/Postmark **si** configuré ; bandeau admin si ça ne part pas. Défaut = console.

---

## 5. Ce qui ne fonctionne pas, ou est incomplet

1. **Boutique Skin vide** — pages Skin oui, SKU Skin publiés non. Diagnostic → routine → panier Skin n’a rien de vrai à vendre.
2. **Cycle de vie éclaté** — 4 systèmes d’états (voir §10). L’utilisateur ne peut pas dire « ce produit est identifié / en sourcing / offert / validé / catalogue / publié » sur **un** objet.
3. **Double fournisseur** — `products.supplier_id` (1) **et** `product_sources` (N). Le N:N existe ; le 1:1 reste le champ « officiel » de beaucoup d’écrans.
4. **Double fulfillment** — `fulfillment.ts` (IDs hardcodés, catégorie `accessoires` ⇒ dropship auto) **vs** `product_sources` + `orderRouting.ts`. Une nouvelle source Skin en `product_sources` **ne** pilote **pas** le badge boutique Hair/accessoires.
5. **Double admin appro** — « Fournisseurs & sourcing » (3 sous-onglets) **et** « Appro par étapes (nouveau) » (4 étapes). Mêmes panneaux, deux arbres. Commentaire code : *rien n’est supprimé tant que la comparaison n’est pas tranchée.*
6. **Dropship non connecté** — pas de sync stock/prix/commande vers AfricanFabs, Afro Wholesale, ni aucun agrégateur. Case + mailto.
7. **Affiliation non connectée** — pas de génération de lien, pas de postback, pas de cookie pixel.
8. **3PL non connecté** — pas d’API WMS, pas d’ASN, tampon = constante.
9. **Mails fournisseurs non envoyés** — volontaire (pas de boîte KURLA dédiée RFQ). `sent` = « l’humain a ouvert mailto ».
10. **Import 500 identifiés** — CSV crée des **produits draft** (PIM), pas des **positions identifiées** (fond/candidats). Excel/JSON/preview/dédoublon absents.
11. **15 vs 50 besoins** — filtres boutique = 15 `SKIN_NEEDS`. Fond sourcing = 50 besoins × 5 = 250 positions. Relier un SKU au besoin #17 (plis) n’est pas un champ du PIM.
12. **Prospects orphelins** — 3/28 liés à `suppliers`. Convertir une piste en fournisseur n’est pas un flux unique.
13. **Skin admin = copie Hair** — volontaire (17/09), mais le dashboard commercial Skin affiche CA Hair/test, stock Hair, précommandes Hair. Pas de KPI Skin dédié (0 vente).
14. **Composants Peau* démontés** — 14 fichiers morts dans la nav. Risque de les « réparer » en les remontant alors que la parité Hair/Skin était une demande explicite.
15. **`publication_policy` OFF** — la politique stricte existe en SQL, n’est pas le défaut.

---

## 6. Inventaire détaillé

Légende : **E**xiste · **F**onctionne (code + flux réel) · **C**orriger · **N**ouveau · **R**isque Hair

| Fonctionnalité | E | F | C | N | R | Preuve / commentaire |
|---|---|---|---|---|---|---|
| Table `products` unique Hair+Skin | ✓ | ✓ | | | **H** | Ne pas splitter |
| Catégories Skin `soins_visage` / `teint` | ✓ | ✓ | | | | Workspace Skin filtre là-dessus |
| Métadonnées Skin (type, phototype, SPF, finish…) | ✓ | partiel | ✓ | | | `SKIN_REQUIRED_METADATA` ~18 champs ; héros C1 demandent PIF+GMP en plus |
| Taxonomie 15 `SKIN_NEEDS` | ✓ | ✓ | | | | `skinTaxonomy.ts` — **réutiliser**, ne pas inventer |
| 50 besoins peau (docs + fond 250) | ✓ | docs | ✓ | | | Relier au PIM, ne pas recréer 50 IDs |
| Diagnostic peau 12 étapes | ✓ | ✓ | | | | Ne pas casser |
| Pages `/peau/*` | ✓ | éditorial | | | | Commerce vide derrière |
| Boutique Skin (SKU publiés) | ✓ pages | **non** | ✓ | | | 0 SKU public |
| Coming-soon `src-*` | ✓ | ✓ | | | | Hors porte publish |
| Produit identifié (objet unique) | éclaté | | ✓ | | | Unifier candidats + fond + items |
| Import CSV drafts | ✓ | ✓ | | | | Max 1000, pas d’auto-publish |
| Import Excel / JSON / preview / dédoublon | | | | ✓ | | Chantier import |
| Import 500 → **identifiés** (pas PIM publié) | | | ✓ | ✓ | **H** | Ne pas passer par `published` |
| `suppliers` + documents + preuve | ✓ | ✓ | | | **H** | Réutiliser |
| Fiche fournisseur cliquable | ✓ | partiel | ✓ | | | Généraliser `SupplierName` |
| Prospects ≠ suppliers | ✓ | ✓ | | | | Garder la séparation |
| Lien prospect → supplier | ✓ colonne | 3/28 | ✓ | | | Flux de conversion |
| `products.supplier_id` 1:1 | ✓ | ✓ | ✓ | | **H** | Dériver de la source primaire, ne pas drop tout de suite |
| `product_sources` N:N + modèle | ✓ | CRUD | ✓ | | | **L’offre**. La rendre chemin unique |
| RFQ + réponses | ✓ | ✓ (hors SMTP) | | | | Attribution bloquée sans docs |
| Envoi mail RFQ réel | mailto | non | | ✓? | | Décision métier : rester mailto ou brancher `emailService` |
| Workflow 8 étapes | ✓ | events | ✓ | | | Recaler sur le vocabulaire demandé |
| Pipeline catalogue 6 stades | ✓ | ✓ | ✓ | | | Recaler, ne pas supprimer |
| Porte publication C4 | ✓ | ✓ | | | **H** | Ne pas relâcher |
| Dérogations datées | ✓ | ✓ | | | | |
| Listings test exclus du publish | ✓ | ✓ | | | **H** | |
| Dropship badge 24–48h | ✓ | Hair accessoires | | | **H** | Ne pas étendre aux cosmétiques Skin |
| Dropship API fournisseur | | | | **non** an 1 | | Procédure manuelle suffisante an 1 |
| Affiliation modèle | ✓ | colonnes | | ✓ tracking | | Pas de réseau |
| 3PL modèle | ✓ | constantes | ✓ | WMS plus tard | | Tampon 75 = Hair lancement |
| `stock_kurla` | ✓ enum | | | | | **Pas** le modèle an 1 |
| Gel route commande | ✓ | ✓ | | | **H** | |
| Admin 19 onglets parité | ✓ | ✓ | ✓ clutter | | | Trancher Appro v1 vs v2 |
| Dashboard Skin KPI | copie Hair | trompeur | ✓ | | | Afficher 0 vente Skin, pas le CA Hair |
| Lots / traçabilité | ✓ | Hair | | | **H** | |
| Emails clients | ✓ | si clés | | | | Bandeau santé déjà là |
| Auth admin | ✓ | ✓ | | | **H** | |
| Gemini serveur | ✓ | ✓ | | | | Pas de clé au front |

---

## 7. Architecture cible (proposition — à valider)

Principe : **un graphe, pas un deuxième Kurla**.

```
Besoin peau (50 docs, 15 filtres boutique)
        │
        ▼
IDENTIFIÉ ──────── sourcing_fond_positions / sourcing_product_candidates / sourcing_items
  (~500 importables, jamais publics)
        │  RFQ, mailto, documents
        ▼
OFFRE ──────────── product_sources  (N par produit)
                    modèle: dropshipping | affiliation | 3pl | stock_kurla
                    supplier_id → suppliers (jamais un nom libre)
        │  preuves + critères Skin existants
        ▼
VALIDÉ ─────────── workflow validated/approved + docs + CPNP si cosmétique
        │  porte C4 (humaine)
        ▼
CATALOGUE ──────── products.catalog_status = draft | pending_review
        │  isPublishableProduct()
        ▼
PUBLIÉ ─────────── published + vérité boutique (images, stock/préco, pas test)
        │
        ▼
COMMANDE ───────── order_item_routes figée (dropship / affilié / 3PL / stock)
```

### 7.1 Objets — réutiliser, pas inventer

| Rôle métier | Table / module canonique | Interdit |
|---|---|---|
| SKU catalogue | `products` | `skin_products`, second PIM |
| Identifié | **une** vue unifiée au-dessus de candidats + fond + items | Créer `identified_products` parallèle sans migration des 250+121 |
| Fournisseur | `suppliers` + `supplier_documents` | Stocker le fournisseur en texte |
| Piste | `sourcing_prospects` jusqu’à conversion | Fusionner piste et fournisseur vérifié |
| Offre | `product_sources` | Table `offers` en plus |
| Devis | `rfq_responses` | |
| Validation Skin | `SKIN_REQUIRED_METADATA` + docs existants | Inventer une 3e grille de critères |
| Publication | `catalog_status` + `catalogGate` + `isPublishableProduct` | Auto-publish à l’import |
| Fulfillment an 1 | `product_sources.model` **source de vérité** ; `fulfillment.ts` = **compat Hair accessoires** jusqu’à bascule contrôlée | Brancher AliExpress |

### 7.2 Cycle de vie unique (vocabulaire demandé, états déjà nommés)

Ne pas ajouter un 5e enum. **Mapper** :

| Langage demandé | État existant à afficher | Où ça vit |
|---|---|---|
| Identifié | fond / candidat / item `identified` | hors `products` public |
| En sourcing | `supplier_identified` → `evaluation` + RFQ open | `sourcing_items` / workflow |
| Offre fournisseur | ≥ 1 `product_sources` **ou** `rfq_response` chiffrée | N:N |
| Validé | `validated` / `approved` + preuves | docs + score |
| En catalogue | `products` draft / pending_review | PIM |
| Publié | `published` + publishable | boutique |
| Refusé | `refused` + motif | events |

`catalog_status` reste la porte **boutique**. Le workflow 8 étapes reste la porte **achat**. L’UI doit montrer les deux sans les fusionner dans une seule colonne magique.

### 7.3 Skin vs Hair

- **Même** tables, **mêmes** portes réglementaires (1223/2009).
- **Scope** workspace pour les listes.
- **Ne pas** appliquer le badge dropship 24–48h aux cosmétiques Skin (CPNP / douane — déjà écrit dans le guide).
- An 1 Skin : dropship **uniquement** si accessoire / non cosmétique, sinon affiliation ou 3PL tampon, **pas** stock appartement.

### 7.4 Échelle 500 → 10k

Déjà prévu : import 1000 lignes, index SQL, pas de N+1 évident sur les listes admin. Manques pour 5k/10k : pagination admin partout, dédoublon EAN/nom+marque, recherche, pas d’empilement de 11 panneaux sur un onglet.

---

## 8. Garder / améliorer / recréer / ne pas toucher

### Garder (ne pas réécrire)

- Table `products`, auth, Stripe, porte C4, `supplier_documents`, `SupplierAmbiguityError`, séparation prospect/fournisseur, `product_sources`, RFQ sans auto-mail, `is_test_listing`, coming-soon, diagnostic peau, 15 `SKIN_NEEDS`, `launchCatalog.ts`, gel `order_item_routes`.

### Améliorer (refactor ciblé)

- Vue unique « Identifiés » (500) au-dessus des 3 stocks existants.
- `product_sources` = chemin unique d’offre ; `supplier_id` produit = **projection** de la source primaire.
- Un seul arbre Appro (trancher v1 vs v2 — v2 est plus proche du travail réel).
- Fiches fournisseur cliquables **partout** (lots, catalogue, pipeline, RFQ).
- Import : preview + dédoublon + Excel/JSON + cible **identifié**.
- Dashboard Skin : dire 0 SKU / 0 vente, pas recycler les KPI Hair.
- Relier 50 besoins (fond) aux 15 besoins (boutique) par table de mapping, sans inventer une 3e taxonomie.

### Recréer : **rien de structurel**

Pas de nouveau Product, pas de nouveau Supplier, pas de Skin-PIM, pas de connecteur dropship an 1.

### Ne pas toucher (Hair / prod)

| Zone | Pourquoi |
|---|---|
| `src/lib/launchCatalog.ts` | Catalogue Hair de lancement |
| `src/lib/fulfillment.ts` IDs `p35`… | Badges boutique accessoires |
| `src/lib/kurlaFit.ts`, `DiagnosticHairPage`, `hairAdvisory.ts` | Cœur Hair |
| Checkout / Stripe / commandes | Prod |
| Règles « pas de matching silencieux », « pas d’auto-publish », « pas d’auto-mail RFQ » | Invariants déjà douloureux à réapprendre |
| `source_supplier` | Marqueur formulation |
| Cosmétique en dropship 24–48h | Interdit métier (CPNP) |

---

## 9. Plan de chantiers (un par un, validation à chaque fois)

Ordre imposé par les dépendances. **Aucun chantier ne commence sans validation du précédent.**

| # | Chantier | Objectif | Dépend de | Sortie attendue |
|---|---|---|---|---|
| **1** | **Architecture Skin + modèle de données** | Cycle de vie unique **affiché**, mapping identifié/offre/validé/catalogue/publié, **sans** nouvelle table fantôme ; spec d’unification candidats/fond/items ; `product_sources` déclaré chemin d’offre | — | Schéma + mapping d’états + liste des champs réutilisés. **Peu ou pas de migration destructive.** |
| 2 | Produits identifiés | Vue admin « Identifiés » (~500), import sans publier, jamais boutique | 1 | Liste cliquable, filtres besoin/statut |
| 3 | Fournisseurs | Fiches cliquables partout, conversion piste→fournisseur, 0 nom libre | 1 | `SupplierName` généralisé |
| 4 | Produit ↔ fournisseur | Offres N:N via `product_sources` ; primaire → `supplier_id` | 1, 3 | 1 produit = N offres |
| 5 | Critères Skin | Brancher **les critères déjà dans le projet** sur l’objet identifié/catalogue | 1 | Checklist UI, **aucun critère inventé** |
| 6 | Workflow sourcing | Un vocabulaire, 8 étapes alignées sur le langage demandé | 1, 2, 4 | Entonnoir unique |
| 7 | Comms fournisseurs | Rester mailto **ou** brancher `emailService` (décision) ; jamais d’envoi silencieux | 3, 6 | Journal d’envoi honnête |
| 8 | Catalogue Skin | Drafts Skin dans `products`, hors boutique | 2, 5 | 0 publish accidentel |
| 9 | Dropshipping | Procédure an 1 (badge, PO, mailto) branchée sur `product_sources` ; **pas d’API** | 4 | Cosmétique Skin ≠ dropship 24–48h |
| 10 | Affiliation | Saisie URL/commission + affichage honnête « lien partenaire » | 4 | Pas de faux tracking |
| 11 | 3PL | Tampon / partenaire comme `product_sources.model=3pl` | 4, 9 | Pas de WMS |
| 12 | Dashboard Skin | KPI vrais (0 SKU, pipeline, RFQ, docs) | 1–8 | Plus de CA Hair dans l’onglet Skin |
| 13 | Import 500 | CSV/Excel/JSON, preview, dédoublon, cible identifié | 2 | 500 lignes → identifiés, 0 publié |
| 14 | UX Skin | Boutique / diagnostic : empty state honnête tant que 0 SKU ; puis fiches | 8 | Pas de « Ajouter au panier » fantôme |
| 15 | Tests / sécu | Recettes Hair non régression + portes publish/docs | tous | Hair inchangé |
| 16 | (option) Connecteurs API | Seulement si un fournisseur a une API réelle et un contrat | 9–11 | Hors an 1 sauf besoin explicite |

Les intitulés 2–15 reprennent ta liste ; le **1** est le prérequis que tu as toi-même placé en tête.

---

## 10. Risques

| Risque | Gravité | Mitigation |
|---|---|---|
| Casser Hair en touchant `products` / `fulfillment.ts` / launch catalog | **Critique** | Chantiers étroits, tests boutique Hair, ne pas bouger les IDs `p*` |
| Publier 500 identifiés par erreur | **Critique** | Import → candidats/fond, `catalog_status=draft`, porte C4, `is_test_listing` si jeu de test |
| Inventer des critères / catégories Skin | Élevé | Réutiliser `SKIN_NEEDS` + `SKIN_REQUIRED_METADATA` + docs 50 besoins |
| 2e table Product/Supplier | Élevé | Refusé par ce rapport |
| Cosmétique Skin en dropship 24–48h | Réglementaire | Interdit déjà documenté ; garder le garde-fou |
| Matching fournisseur au nom | Fraude / doublon | Garder `SupplierAmbiguityError` |
| Auto-mail RFQ | Spam / RGPD / pas de boîte | Garder mailto jusqu’à décision |
| Double Appro admin | Opérateur perdu | Trancher v1 vs v2 au chantier 6/12 |
| `fulfillment.ts` vs `product_sources` divergent | Mauvaise promesse délai | Chantier 9 : une source de vérité |
| Dashboard Skin qui affiche du Hair | Décision fausse | Chantier 12 |
| Docs ARCHITECTURE 11/09 pris pour vérité | Mauvaise spec | COORDINATION + stores |

---

## 11. Dépendances entre chantiers

```
[1 Architecture / modèle]
        ├──► [2 Identifiés] ──► [13 Import 500]
        │         └──► [8 Catalogue Skin] ──► [14 UX]
        ├──► [3 Fournisseurs] ──► [7 Comms]
        └──► [4 Offres N:N] ──┬──► [9 Dropship]
                              ├──► [10 Affiliation]
                              ├──► [11 3PL]
                              └──► [5 Critères] ──► [6 Workflow]
[12 Dashboard] après 2–8 (sinon il ment)
[15 Tests] en continu, gate Hair à chaque merge
[16 API] après 9–11, seulement si contrat réel
```

On **ne** peut **pas** faire l’import 500 avant le chantier 1+2 (sinon 500 lignes atterrissent dans `products` « comme Hair »).  
On **ne** peut **pas** « connecter le dropshipping » avant le chantier 4 (sinon on hardcode une 3e couche).

---

## 12. Premier chantier proposé — à valider

**Chantier 1 — Architecture Skin + modèle de données (sans casser Hair)**

Périmètre **proposé** (code **après** ta validation de ce rapport, puis validation du périmètre 1) :

1. **Documenter dans le code** (constantes / types déjà là, pas un nouveau schéma) le mapping :
   - identifié / sourcing / offre / validé / catalogue / publié / refusé.
2. **Vue lecture** admin Skin : un produit ou une position affiche **son** stade réel, calculé depuis les tables existantes (pas un 5e enum écrit partout).
3. **Spec d’unification** identifiés : laquelle des 3 tables est **canonique** pour l’import 500 (recommandation interne : `sourcing_fond_positions` + `sourcing_product_candidates` comme entrée, `sourcing_items` quand le sourcing démarre, `products` seulement à « en catalogue »).
4. **Déclarer** `product_sources` comme l’offre ; lister les écrans qui lisent encore `products.supplier_id` ou un nom texte.
5. **Ne pas** : migrer destructif, supprimer Appro v1, toucher `launchCatalog.ts` / `fulfillment.ts` / checkout, inventer des critères, brancher une API.

Hors chantier 1 : import 500, UX boutique, dropship API, dashboard cosmétique.

---

## Volumes de référence (code + COORDINATION)

| Stock | Volume | Statut réel |
|---|---|---|
| Boutique Hair publiée | ~63 (mesure COORDINATION 16/09) | Vendable |
| Soins peau publics | **0** | |
| Cibles formulation `peau-ess-*` | 16 | Non vendable |
| Fond 50×5 | 250 lignes CSV + table | Identifié |
| Candidats sourcing | 121, tous bloqués | Identifié |
| Registre 100 peau (CSV) | 100 | Doc |
| Prospects seed | 25–28 | Pistes |
| Prospects liés supplier | 3 | |
| Admin onglets | 6 familles / 19 onglets | Parité Hair/Skin |
| Composants `Peau*.tsx` démontés | 14 | Fichiers morts nav |
| Migrations SQL | 100 fichiers | |
| Commits | 581 | `6834b5a` |

---

## Décisions à tranchera avant / pendant le chantier 1

1. **Table canonique des identifiés** : fond, candidats, items, ou vue unifiée (reco : vue unifiée, écriture selon le stade).
2. **Appro v1 vs v2** : lequel on garde comme nav principale (reco : v2 « par étapes », v1 en repli un sprint).
3. **Mails RFQ** : rester mailto (reco an 1) ou `emailService`.
4. **Connecteurs dropship** : **pas an 1** sauf si tu as un contrat API nommé — le code actuel n’en a aucun.
5. **15 vs 50 besoins** : mapping 50→15, les 15 restent les filtres boutique.

---

*Fin du rapport. Aucun fichier applicatif n’a été modifié. En attente de validation pour ouvrir le chantier 1.*
