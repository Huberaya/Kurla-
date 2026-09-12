# Rapport G1 — Vérification RLS A/B sur données réelles (prod)

**Date** : 2026-09-12 · **Environnement** : prod Supabase `qzwgsarfdegqtfdnqiql` + `kurlabeauty.vercel.app`
**Méthode** : 2 comptes réels créés via signup public (clé publishable), données réelles, accès croisé brut PostgREST/GoTrue (aucun bypass service role — c'est le point entier).

## Comptes & données créés
| | Compte A | Compte B |
|---|---|---|
| email | `kurla.glive.a.1789226224641@example.com` | `kurla.glive.b.1789226224641@example.com` |
| profil | créé (id A) | créé (id B) |
| Shelf (user_products) | 1 produit réel (id `e2240e4f-8494-48b9-b6b6-25d345453b27`) | 1 produit (id `6e9c2453-2e83-428e-92b8-16a3c5b56928`) |

## Assertions (toutes exécutées avec les JWT des utilisateurs — pas de clé service)
| # | Assertion | Résultat | Preuve |
|---|---|---|---|
| 1 | B ne lit PAS la Shelf de A | ✅ **VERT** | `GET /rest/v1/user_products?user_id=A&select=*` avec JWT de B → `[]` (200, zéro ligne) |
| 2 | B ne lit PAS le profil de A | ✅ **VERT** | `GET /rest/v1/profiles?id=eq.A` avec JWT de B → `[]` |
| 3 | B n'écrit PAS dans la Shelf de A | ✅ **VERT** | `POST /rest/v1/user_products` (user_id=A) avec JWT de B → **403** |
| 4 | A lit sa propre Shelf (contrôle positif) | ✅ **VERT** | 1 ligne (son produit), 0 ligne de B |
| 5 | B lit sa propre Shelf (contrôle positif) | ✅ **VERT** | 1 ligne (son produit), 0 ligne de A |
| 6 | Intrusion résiduelle (scan complet) | ✅ **VERT** | `count user_products` total = 2 (exactement les 2 légitimes), aucune ligne croisée, 0 orphelin |

**Caractérisation** : la table privée la plus exposée (`user_products`, lue/écrite côté client) présente **0 fuite** entre 2 utilisateurs réels sur la base live. La politique RLS de `beauty_profiles` est SELECT-only (owner/admin) — l'écriture passe par l'endpoint serveur (comportement vérifié : insert direct PostgREST → 403 même pour l'owner, donc la surface d'écriture est réduite au flux app validé).

## Bonus vérifié en production (flux RGPD article 17)
- `POST /api/account/delete` (JWT utilisateur) sur les 2 comptes → **200** ×2
- Re-login ensuite → **400** (utilisateur réellement supprimé)
- Audit base : 0 user `kurla.glive.%`, 0 profil orphelin (`profiles.id NOT IN auth.users` = 0) → cascade complète et propre.

## Les 6 bancs `test:realdb` — verts en prod (2026-09-12)
Exécutés contre la base live avec `KURLA_STORE_MODE=server` + service role (Node 22, WebSocket natif requis par supabase-js) :

| Banc | Résultat |
|---|---|
| `real_database_preflight` | ✅ Base réelle utilisable : création de compte, triggers et authentification vérifiés |
| `supabase_integration` | ✅ Comptes A/B isolés, ressources privées protégées, rôle admin et mise à jour retour hors cache vérifiés |
| `phase7_atomic_stock` | ✅ Course concurrente, rollback d'échec partiel, confirmation et remboursement idempotents validés |
| `schema_query_contract` | ✅ 191 requêtes distinctes (254 sites dans le code) acceptées par la base réelle |
| `chantier_b_professional` | ✅ chantiers b professional + service payment |
| `chantier_7_ingredients` | ✅ 209 fiches ingrédient vérifiées servies depuis la base réelle |

Base laissée propre : 0 produit/orphelin de test (`phase7-%`, `probe%`, `kurla.glive.%`, `kurla.integration.%` = 0).

### Régressions réelles trouvées par les bancs (et corrigées)
1. **PGRST203 sur `create_order_with_stock_reservation`** — la migration TVA (20260860) avait laissé l'ancienne signature 11 paramètres comme « relais de compatibilité » en surcharge de la version étendue 17 paramètres. PostgREST ne peut pas résoudre un appel nommé à 11 paramètres quand les deux coexistent → le banc Phase 7 (et tout appelant REST à 11 paramètres) échouait alors qu'aucun code n'était en cause. Le relais ne protégeait personne (il est créé dans la même migration que la version étendue : absent sur les bases où le repli applicatif 11 paramètres opère, inutile sur les autres). **Correction** : migration `20260923000000_drop_order_rpc_relay.sql` (supprime la surcharge 11 paramètres ; l'appel 11 renvoie désormais PGRST202, exactement ce que surveille le repli applicatif) + banc Phase 7 aligné sur le contrat courant (signature 17 paramètres).
2. **3 requêtes sur colonnes inexistantes** (contrat de schéma) : `products.title` (la colonne s'appelle `name`) et `cost_price`/`unit_cost`/`purchase_price` (aucune colonne de coût sur `products` — par conception, le coût est sourcé par lot dans `product_batches`, CHANTIER 16D). **Correction** : code aligné sur le schéma réel ; la métrique « produits sans prix de revient » et la marge par produit lisent désormais `product_batches.served_cost_cents` (coût servi réel du lot le plus récent non rejeté), sinon cible catalogue estimée.

## Statut G1 — COMPLÉTÉ
| Critère | État |
|---|---|
| 0 migration en retard | ✅ (82 versions, 0 en retard, après migration 20260923) |
| A/B RLS accès croisé | ✅ **ce rapport** (4/4 assertions + RGPD) |
| 6 bancs `test:realdb` verts | ✅ (table ci-dessus) |
