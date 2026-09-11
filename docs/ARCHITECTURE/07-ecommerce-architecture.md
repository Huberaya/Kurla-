# 07 — Architecture e-commerce

> Le socle e-commerce est **terminé et testé** (chantiers 1–6 + C3 checkout kits).
> Cette doc décrit le flux de bout en bout, les points de force, et les extensions
> indexées (cross-sell, subscriptions avancées, international).

---

## 1. Flux de conversion (vérifié dans le code)

```
Découverte                          Parcours achat                      Post-achat
─────────                           ──────────────                      ──────────
Boutique (filtres besoins/         Panier (normalisé + validé           Confirmation (Stripe return)
 marque/pays/KURLA ID/SPF/           côté serveur, prix relus en         → Suivi colis (transporteur
 budget/actif/texture)               base, déduplication,                saisi admin, pas d'URL inventée)
 ↓                                   idempotence)                            ↓
Diagnostic (hair/skin)        →    Checkout (Stripe, TVA par           Commandes (cycle de vie daté)
 recommandations expliquées        juridiction, coupons, vérif.            ↓
 routine M/S/H + kits            vérité catalogue)                 Retours (liés aux quantités
Need Hub (/besoin/:slug)            ↓                               commandées) / Support (tickets)
Produit unitaire              →   Commande (stock atomique :           ↓
 (route dédiée, 1 requête)        réservation → définitivation)      Notifications (email + in-app,
Comparateur (2–4 produits)                                    préférences, déduplication)
Shelf (scan code-barres/INCI)   →   Réachat (réassort suggéré)      Loyalty / KURLA+ / parrainage
```

## 2. Points de force (ne pas toucher)

| Point | Preuve |
|-------|--------|
| **Prix serveur** | Le checkout recalcule tous les prix depuis la base ; un prix falsifié par le client est rejeté (bancs phase 3/4) |
| **Stock atomique** | `payment_pending_webhook → paid → refunded` avec réservation/libération/définitivation sous verrous PG ; restauration idempotente par ligne de remboursement |
| **Idempotence** | `stripe_events` + claim atomique ; webhook Stripe signé (`constructEvent`), jamais de traitement en aveugle |
| **TVA par juridiction** | `checkoutVat` + `vatRateForCountry` + reverse charge + VIES B2B (bancs `chantier-7-vat`, `vat-rate`) |
| **Vérité catalogue au paiement** | `isCheckoutEligibleProduct` — un produit non publishable n'est pas payable même s'il apparaît dans le panier |
| **Coupons** | Validation serveur (`validateAndApplyCoupon`), limites et dates |
| **Suivi authentique** | L'admin saisit le vrai transporteur + n° de suivi — l'URL de suivi est générée ensuite, jamais avant |
| **Précommande honnête** | Promesse datée explicite, stock 0 affiché, pas de date inventée |
| **Abonnements** | KURLA+ (Stripe subscription, activation idempotente, montant vérifié) + abonnements produit + fidélité + parrainage anti-abus |

## 3. Recherche & filtres

- **Recherche** : `SearchModal` (auto-complétion), intent parsing déterministe
  (`semanticSearch`), recherche par ingrédient, code-barres (Shelf),
  `SmartSearchPage` (SEO des requêtes).
- **Filtres boutique** : catégorie/sous-catégorie, besoin (10 cheveux + 15 peau),
  marque, communauté afro, pays, budget, sans parfum, SPF invisible, tri
  fit/prix/avis. Filtres peau « actifs/phototype/texture/fini » : **code prêt**
  (`skinTaxonomy.ts` + `scoreSkinProduct`), branchement UI en cours avec le
  sourcing B2 (les filtres sans produits seraient des dead-ends).
- **SEO e-commerce** : JSON-LD produits, sitemap produits, hub de besoin indexé,
  pages pays/langues (framework prêt).

## 4. Ce qui manque pour l'e-commerce scale (classé, doc 12)

| # | Manque | Classe | Note |
|---|--------|:------:|------|
| E1 | Cross-sell/upsell explicites sur fiche + panier | P1 | Le moteur a déjà les données (complémentarité par `needs`/`routineStep`) — il faut les exposer : « complète votre routine » calculé, pas un carrousel générique |
| E2 | Bundles dynamiques (au-delà des kits statiques) | P2 | Le pricing bundle existe (kits) ; la construction dynamique attend le catalogue 100+ refs |
| E3 | Pagination/trie serveur de la boutique | P2 | 67 produits : client-side suffit ; à 1 000+ : `?page=&sort=` serveur + index (doc 10) |
| E4 | Multi-devises (affichage) | P2 | Le prix est déjà calculé en EUR HT + TVA par pays ; l'affichage multi-devises est cosmétique (devise de règlement = juridiction) |
| E5 | Points de vente / marketplace pro (paiement en ligne pro) | P3 | Booking pro en place ; le paiement de service pro attend la marketplace |
| E6 | Retours self-service (étiquette) | P2 | Le flux retour admin est complet ; l'étiquette auto attend un agrégateur (Sendcloud/Boxtal) |

## 5. Règles d'extension e-commerce

1. Tout prix affiché = prix serveur projeté (`effectiveCatalogPrice`) — jamais de
   prix calculé côté client.
2. Toute nouvelle brique d'achat (bundle, abonnement, pro) passe par le **même**
   `orders`/`payments`/stock — jamais de schéma parallèle.
3. Toute promesse (délai, stock, précommande) est datée et source — sinon absente.
4. L'ajout d'un flux de paiement = webhook + idempotence + test de réconciliation
   (le pattern est posé par le checkout).
