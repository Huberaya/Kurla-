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

## Résidu G1 (bloqué credentials, non bloqué code)
Le banc `npm run test:realdb` (preflight + 5 bancs d'intégration) exige `SUPABASE_SERVICE_ROLE_KEY` : le preflight crée/supprime des users via l'admin API GoTrue, et les bancs vérifient les tables internes. La clé de management `vcp_`/`sbp_` est **401 sur GoTrue admin** (vérifié définitivement) — elle ne peut pas servir. **À faire dès réception de la service key : `npm run test:realdb` → 6/6 bancs verts.**

## Statut G1
| Critère | État |
|---|---|
| 0 migration en retard | ✅ (81/81 + audit objets, tour précédent) |
| A/B RLS accès croisé | ✅ **ce rapport** |
| 6 bancs `test:realdb` verts | ⏳ **bloque sur `SUPABASE_SERVICE_ROLE_KEY`** |
