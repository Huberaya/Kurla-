# 06 — Architecture données : Single Source of Truth

> 123 tables, 83 migrations, RLS systématique. Le principe : **un fait, une table,
> une écriture autorisée, un test.** Tout le reste est projection ou rapport.

---

## 1. Les cinq SSOT de la plateforme

### 1.1 L'utilisateur et son profil beauté — `beauty_profiles`

**Le seul profil.** Cheveux et peau vivent dans le même enregistrement
(`profile` = `BeautyProfile { hair, skin, … }`). Les deux diagnostics y écrivent
via `PUT /api/beauty-profile` (vérifié : `DiagnosticHairPage` →
`/api/recommendations` sauvegarde le profil hair ; `DiagnosticSkinPage` →
`PUT /api/beauty-profile` directement).

Autour, la constellation :

| Table | Rôle |
|-------|------|
| `beauty_profiles` | Profil unique (JSONB normalisé + version) |
| `beauty_profile_history` | Historique daté de chaque évolution (le profil est comparable dans le temps) |
| `beauty_profile_photos` | Photos privées (consentement explicite et rétractable, URLs signées temporaires) |
| `archetypes` | Archétypes k-anonymes (publication des agrégats — jamais nominatif) |

**Règles** : jamais de valeur inventée (`unknown` explicite), confiance calculée
par champ (`calculateProfileConfidence`), export + suppression RGPD incluant
historique, photos, journal, observance.

### 1.2 Le catalogue — `products` (+ variantes, stock, images)

**Un seul catalogue** pour tous les domaines. Les 7 colonnes de validation +
`catalog_status` sont la porte de publication ; `isPublishableProduct` est la
seule fonction de vérité (appliquée lecture **et** écriture).

| Table | Rôle |
|-------|------|
| `products` | Fiches (les 15+ champs métier + 7 statuts + TVA + pays) |
| `product_variants` | Variantes (format, parfum, couleur) avec prix et stock propres |
| `product_images` | Visuels (position, ownership vérifiée) |
| `inventory` | Stock par produit/variante : `quantity`, `reserved_quantity`, `available_quantity` |
| `product_batches` | Lots (DDM, traçabilité) |
| `product_ingredients` / `ingredients` / `ingredient_incompatibilities` / `ingredient_provenance` / `ingredient_jurisdiction_restrictions` | Graphe ingrédients (231 ingrédients, 36 liaisons, 44 incompatibilités mesurés) |
| `catalog_validation_events` | Audit de chaque vérification (daté) |
| `catalog_imports` / `catalog_import_rows` | Imports CSV/fournisseur tracés ligne par ligne |
| `catalog_categories` / `kurla_taxonomy_terms` | Taxonomie contrôlée (needs, textures, marchés, steps) |

**La couche peau** (`skinCatalogStore.ts`) n'est **pas** une table : c'est un
rapport de readiness calculé sur `products WHERE category='peau'`. C'est la
réponse architecturale au risque « deux catalogues » — il n'y en a jamais eu un
second ; il y en a un, avec une vue d'acceptation peau.

**Les formulations cibles** (`kurlaSkinRange.ts` → migration `formulation_target`)
sont des fiches `products` marquées, jamais achetables (`isCatalogPubliclyListable`
refuse le marqueur de formulation) — le staging vit dans le catalogue, pas à côté.

### 1.3 La commande — `orders` + cycle de vie atomique

`orders` / `order_items` / `order_status_history` / `payments` / `stripe_events` :
prix relus en base au checkout (un prix client est rejeté), stock atomique
(réservation → définitivation → restauration idempotente), idempotence webhook
(`claimEventForProcessing`), remboursements par ligne (`finalize_refund` SQL).

### 1.4 La connaissance produit — graphe ingrédients + taxonomie

- `ingredients` + `ingredient_provenance` : chaque ingrédient a une source
  localisable (pas de donnée « de mémoire »).
- `ingredient_incompatibilities` : gravité + niveau de preuve + explication +
  geste concret (c'est ce que lit le Shelf et le moteur).
- `kurla_taxonomy_terms` : vocabulaire contrôlé (18 needs cheveux, 15 needs peau,
  textures 3A–4C, steps de routine, marchés, carnations) — la boutique, le
  diagnostic et l'IA partagent le même vocabulaire (banc de garde).
- Vocabulaire CosIng + restrictions UE : **fichiers sources de migration**
  (`cosingFunctions.ts`, `ingredientRegulatory.ts`) → scripts → SQL. La base est
  l'exécutable ; le fichier est la provenance.

### 1.5 Le consentement — RGPD comme donnée

- Consentements photos (AIPD) : versionnés, rétractables, servés avant upload.
- `privacyStore` : export/suppression (profil, historique, photos, journal peau,
  observance, Shelf, outcomes) — **tout** ce qui a été ajouté à la plateforme y est
  passé (règle : une nouvelle table de données utilisateur = ajout à l'export +
  test).
- `ai_usage_events` : usage IA tracé (transparence, limites).

## 2. Le flux Beauty Intelligence (données)

```
beauty_profiles ──
diagnostics (historique) ──┤
user_products (Shelf) ──┤
outcome_observations ──┼──→ recommendationEngine (règles, contextes)
carts/orders (achats) ──┤                    │
routine_plans/journal/  │                    ▼
observance (peau) ──────┘            produits retenus → routines → achats
                                              │
                                              ▼
                                   feedback (outcomes, abandons,
                                   journal) → le profil s'enrichit
```

**Séparation des données (RGPD)** :
- Les **observations** (`outcome_observations`) sont individuelles et privées —
  elles alimentent le moteur du **seul** utilisateur.
- Les **agrégats** publiés passent par `archetypes` (k-anonymat) — un agrégat
  n'existe que si l'archétype est suffisamment peuplé, sinon il est masqué.
- Les **photos** ne quittent jamais le bucket privé (URLs signées temporaires),
  jamais de base64 réinjecté dans le profil (corrigé C6).
- La **cohorte de lancement** (`launch_*`) référence les participants de manière
  minimisée (pas de données de beauté dans les entretiens NPS).

## 3. Règles d'extension du modèle de données

1. **Une table, une migration versionnée, un test** — aucun DDL manuel en production.
2. **RLS par défaut** sur toute table à utilisateur ; `SECURITY DEFINER` au strict
   nécessaire (search_path verrouillé).
3. **Données utilisateur** → passage obligatoire dans l'export/suppression RGPD
   (test inclus).
4. **Vocabulaire** → taxonomie contrôlée (`kurla_taxonomy_terms`) ; un terme
   nouveau entre par migration, pas par string dans le code.
5. **Donnée réglementaire** (INCI, restrictions, SPF) → source localisable
   (fichier + date + méthode, `ingredient_provenance`) ou absente — jamais
   complétée (règle d'or des chantiers, tenue).
6. **Jamais de seed de données utilisateurs** pour faire progresser un chantier
   (règle C6/C7, vérifiée : 0 ligne dans les tables de suivi en base distante).

## 4. Mode mémoire & réel

- **Mémoire** (`KURLA_STORE_MODE=memory`) : même surface de 303 méthodes, données
  RAM — 119 bancs tournent sans infrastructure ; c'est lui qui verrouille la
  sémantique.
- **Réel** (`KURLA_STORE_MODE=server`) : Supabase ; la suite `npm run test:realdb`
  (preflight + intégrations + contrats de schéma) est exécutée contre un projet de
  test — **à refaire après chaque migration** avant déploiement.
