# 04 — Matrice des fonctionnalités Hair / Skin / Commun

> **Source de vérité du projet.** États : ✅ terminé · 🟠 partiel · 🐛 bug ·
> 🔀 à consolider · 🏗️ à reconstruire · ❌ manquant.
> Basée sur l'audit comparatif 10/09/2026, mise à jour au 11/09/2026 après
> vérification code (C0–C7 peau livrés, consolidation de cette session).

## Légende qualité

Qualité = maturité du code + des tests + de la donnée. Le socle « commun » est le
critère d'exigence : un domaine qui passe par le socle hérite de sa qualité.

---

## A. Socle plateforme (indifférent au domaine)

| Fonctionnalité | Hair | Skin | Commun | État | Qualité | Action |
|----------------|:----:|:----:|:------:|:----:|:-------:|--------|
| Compte / auth (Supabase, rôles, guards) | ✅ | ✅ | ✅ | terminé | A | — |
| **Profil unique** (`beauty_profiles`, historique, confiance, RGPD) | ✅ | ✅ | ✅ | terminé | A | Cible de référence — les deux diagnostics y écrivent (vérifié) |
| Catalogue unique (`products` + variantes + images) | ✅ | ✅ | ✅ | terminé | A | La couche peau = rapport sur le catalogue, pas un second catalogue (vérifié) |
| Publication gouvernée (7 validations + trust score) | ✅ | ✅ | ✅ | terminé | A | — |
| Graphe ingrédients (231 ingr., 44 incompat., CosIng, restrictions UE) | ✅ | 🟠 | ✅ | partiel | A- | Le graphe peau est peu alimenté (3 produits live) — suit le sourcing B2 |
| Panier / checkout / commandes / stock atomique | ✅ | ✅ | ✅ | terminé | A | — |
| Paiement Stripe (webhooks signés, idempotence, remboursements) | ✅ | ✅ | ✅ | terminé | A | Mode test → live au go-live |
| TVA / juridictions / VIES | ✅ | ✅ | ✅ | terminé | A | Configurable par pays (doc 08) |
| Notifications (in-app + email, préférences, déduplication) | ✅ | ✅ | ✅ | terminé | A | — |
| Recherche (modal, sémantique, ingrédient, code-barres) | ✅ | 🟠 | ✅ | partiel | B+ | Recherche par actif/phototype/fini côté peau à compléter (B2) |
| SEO (prerender, sitemap, hreflang, JSON-LD) | ✅ | 🟠 | ✅ | partiel | B+ | Pages ingrédient peau vides (niacinamide…) — suit le catalogue |
| i18n FR/EN (dictionnaire typé, hreflang, URLs) | 🟠 |  | ✅ | partiel | B | Chrome traduit, corps de pages à traduire (R2) |
| PWA mobile-first | ✅ | ✅ | ✅ | terminé | A | — |
| Admin (30+ panels, inventaire des routes, guards de rôle) | ✅ | ✅ | ✅ | terminé | A | Archiver les panneaux ops C2x (R6) |
| Observabilité (X-Request-Id, logs 5xx, email health, cockpit traction) | ✅ | ✅ | ✅ | terminé | A+ | CSP en monitoring (doc 09) |
| **Design system** (tokens marque, police) | ✅ | ✅ | ✅ | **terminé (11/09)** | A | Migrer le long tail 95 couleurs (R1) |
| CSP / durcissement HTTP | ✅ | ✅ | ✅ | **terminé (11/09)** | A | Passer en mode imposé après revue des rapports (doc 09) |

## B. Parcours beauté (par domaine)

| Fonctionnalité | Hair | Skin | Commun | État | Qualité | Action |
|----------------|:----:|:----:|:------:|:----:|:-------:|--------|
| **Diagnostic** | ✅ 8 étapes visuelles | ✅ 12 complètes / 5 express + phototype consenti | ✅ contrat `diagnosticResult` + persistance unique | terminé | A | Parité atteinte ; visuels peau à enrichir (P2) |
| Résultat traceable (disponibilité explicite, prix jamais fallback) | ✅ | ✅ | ✅ | terminé | A+ | Référence de la plateforme |
| **Recommandations** (moteur v2 + règles explicites, scores expliqués) | ✅ `kurlaFit` | ✅ `skinRecommendation` (incompat. actifs, whitecast, HPI) | ✅ `recommendationEngine` orchestrateur | terminé | A | — |
| Recommandation « pourquoi ce produit » (profil→besoin→produit→justification) | ✅ | ✅ | ✅ | terminé | A+ | Le cœur du différenciateur |
| **Routines** | ✅ builder + adaptatif + kits + tracker + éco. réelle | ✅ M6/S8/H3 × 3 niveaux + kits KPEAU + conflits | ✅ conflits sur usage réel (Shelf), sauvegarde serveur | terminé | A | Kits KPEAU en `formulation_target` jusqu'aux preuves C1 (volontaire) |
| **Suivi** : Shelf (étagère, scan INCI, réassort) | ✅ | ✅ (C7 : INCI + conflits + photo consentie) | ✅ `intelligenceStore` | terminé | A | — |
| **Suivi** : journal | ✅ ProgressJournal + Journey (photos, tendances) | ✅ Journal persistant (J+0/7/30) + observance M/S | ✅ | terminé | A+ | C6/C7 livrés — la boucle de résultat existe |
| **Suivi** : spécifiques | ✅ Protective timeline, wash day | ❌ HPI/SPF tracker photo standardisée | — | manquant | — | P2 (ne pas bloquer) |
| **Boutique** (filtres, besoins, tri fit, hub besoin) | ✅ 10 besoins + 15 familles de filtres | 🟠 15 besoins + 4 filtres (budget, sans parfum, SPF invisible, actif) | ✅ | partiel | B+ | Filtres phototype/texture/fini à brancher (B2, code prêt) |
| **Fiches produit** (INCI, avis vérifiés, compliance, alternatives) | ✅ | ✅ bande peau experte + SPF whitecast + alternatives | ✅ même `ProductDetailPage` | terminé | A | — |
| **Fiche produit unitaire** (sans charger tout le catalogue) | ✅ | ✅ | ✅ `GET /api/products/:productId` | **terminé (11/09)** | A | B1 : requête ciblée en base (P2) |
| Kits | ✅ K01–K10 | 🟠 KPEAU-01..03 (cibles, non achetables tant que C1) | ✅ kitting + pricing serveur | partiel | A- | B2 (sourcing) |
| Contenus éducatifs | ✅ 100+ pages (ingrédients, textures, gestes) | 🟠 7 fiches guide + 3 profils de connaissance + comparateur | ✅ `educationalContent` DB | partiel | B+ | 15 fiches ingrédient peau (B2, contenu) |
| Professionnels | ✅ 6 pros Trust 70 + booking | 🟠 6 pros labellisés peau, **0 dermato**, trust identique à cheveux | ✅ annuaire + application + booking | partiel | B | Spécialités + critères de confiance peau (P1 ops) |
| Communauté / UGC | ✅ | ❌ | ✅ stores modérés | manquant | — | P2 (contenu) |
| Kids / Hommes | ✅ | ❌ (hors scope) | ✅ | terminé | A | — |

## C. Intelligence & business

| Fonctionnalité | Hair | Skin | Commun | État | Qualité | Action |
|----------------|:----:|:----:|:------:|:----:|:-------:|--------|
| IA (assistant, catalogue contraint, triage médical, revue humaine) | ✅ | ✅ | ✅ | terminé | A+ | Rôle verrouillé : langage ≠ verdict (doc 05) |
| Beauty Intelligence (feedback→perso) | ✅ Shelf/outcomes | ✅ journal/observance | ✅ `intelligenceStore`, k-anonymat | terminé | A+ | Alimenter avec la traction réelle (B5) |
| Loyalty / KURLA+ / parrainage | ✅ | ✅ | ✅ | terminé | A | — |
| Marketplace marques (tests, contrats, factures) | ✅ | 🟠 | ✅ | partiel | B+ | Suivi des ouvertures par vague |
| B2B (sourcing, RFQ, stratégie pays, texture gap) | ✅ | 🟠 (cahier C1 en cours) | ✅ | partiel | A- | C1 = P0 business (FR+NL, 40 refs) |
| Cockpit de lancement (cohorte France) | ✅ | ✅ | ✅ | terminé (instrumenté) | A+ | Zéro ligne : le lancement n'a pas commencé — ne pas seed |

---

## Lecture de la matrice

1. **Le socle commun est la force du dépôt** : chaque ligne « ✅✅✅ » a été vérifiée
   dans le code — il n'existe pas de deuxième profil, de deuxième catalogue, de
   deuxième moteur de recommandation ou de deuxième contrat de diagnostic.
2. **L'écart Hair↔Skin n'est plus d'architecture** : il est (a) de **substance
   catalogue** (3 refs peau live vs 150 cibles — sourcing/preuves, B2), (b) de
   **filtres peau** à brancher (code prêt), (c) de **contenu** (fiches, UGC),
   (d) de **pros spécialisés** (ops).
3. **Rien n'est « à reconstruire »** côté code : la consolidation a trouvé une base
   saine. Les REBUILD (doc 03 §6) sont des extensions, pas des casses.
4. **La référence reste Hair** : aucun parcours cheveux n'a été modifié dans cette
   session (la suite de 121 bancs est verte) ; les ajoints (route produit unitaire,
   tokens, CSP) sont additifs et testés.
