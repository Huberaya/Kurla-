# Industrialiser la Truth Layer Skin & Catalog

## Contrat de décision

La version du contrat est `2026-09-12.skin-catalog.v1`, portée par `src/lib/catalogTruth.ts`.

Une fiche ne peut pas être considérée comme achetable parce qu'elle possède un prix ou parce que `catalog_status = published`. La décision combine :

1. état administratif (`draft`, `pending_review`, `published`, `unavailable`) ;
2. preuves minimales catalogue : composition, claims, visuels, stock, certifications, traductions, marque et droits image ;
3. crible déterministe des textes visibles (`src/lib/catalogClaims.ts`) ;
4. provenance de précommande si `is_preorder = true` ;
5. contrat C1 peau pour les fiches explicitement peau ;
6. porte finale de checkout côté serveur.

Les états commerciaux restent distincts :

- `formulation_target` : cible interne non fabriquée ;
- `placeholder` : visuel ou droit non établi ;
- `pending_validation` : preuve manquante ou précommande non documentée ;
- `preorder` : précommande externe documentée, sans la présenter comme du stock ;
- `available` : référence vérifiée et stock positif ;
- `unavailable` : aucune vente possible.

## Précommande externe

Une précommande n'est considérée comme documentée que si la fiche porte explicitement :

- une source fournisseur non interne ;
- un `supplier_id` ;
- un `supplier_sku`.

`formulation interne`, `formulation cible` et `preorder` ne sont jamais combinés pour autoriser une vente. Les tests synthétiques utilisent des identifiants de fixture explicites ; aucune valeur fournisseur réelle n'est inventée.

## Contrat peau

Le contrat C1 est activé pour les fiches de catégorie peau portant un marqueur peau réel : identifiant `peau-*`, taxonomie, types de peau, objectifs ou texture peau. Il exige alors la readiness peau calculée par `evaluateSkinProductReadiness`.

Pour un SPF, les preuves photoprotection, whitecast, phototypes IV–VI, lumières et sous-tons si produit teinté restent obligatoires. Une cible de formulation peut rester visible sur sa route dédiée, mais elle ne franchit ni le catalogue achetable ni le checkout.

## Surfaces protégées

Le même contrat est utilisé par :

- la projection publique catalogue ;
- la décision de checkout ;
- les devis de kits peau ;
- l'écran et le rapport de gouvernance admin ;
- le crible d'allégations ;
- l'audit release.

Aucune surface client ne doit réimplémenter un test de disponibilité. Si un nouveau chemin veut vendre, publier, recommander ou indexer une fiche, il doit passer par la porte serveur existante et ajouter un test de parité.

## Audit de release

Le script est lecture seule par défaut :

```bash
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
KURLA_STORE_MODE=server \
npm run audit:truth -- --json
```

Mode bloquant :

```bash
KURLA_STORE_MODE=server npm run audit:truth -- --strict
```

Il signale au minimum :

- fiche publiée non publiable ;
- fiche peau publiée mais bloquée par C1 ;
- fiche publiée dont le sourcing n'est pas prêt.

L'audit ne modifie aucun statut, prix, fournisseur, claim, stock ou document. Il exige une base Supabase réelle et refuse le repli mémoire.

## Règles de preuve

Une URL de fournisseur, un prix affiché, un stock annoncé ou une affirmation commerciale ne sont pas des preuves suffisantes. La fiche doit porter la preuve ou un statut explicite d'absence. Aucun document, SKU, claim, droit d'image ou conformité ne doit être déduit par le code.

Les preuves réglementaires détaillées (RP, CPSR, PIF, CPNP), la revue humaine des images et les documents fournisseur restent dans le workflow de sourcing. La Truth Layer ne les fabrique pas : elle bloque lorsqu'ils sont absents du dossier requis.

## Migration et données

Cette industrialisation n'ajoute pas de données catalogue et ne publie aucun SKU. Une future modification de schéma doit rester une migration Supabase séparée, vérifiée par `scripts/verifier-schema.mjs`, puis appliquée avec les credentials du propriétaire du projet.
