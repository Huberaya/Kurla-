# PLAN P0 — KURLA PEAU : 42 → 65 /100 en 8 semaines
> **Feu vert requis page par page.** Ce plan est l’unique document d’exécution P0. Aucun code ne part sans ta validation sur chaque chantier.  
> **Date :** 11 septembre 2026 · **Owner :** KURLA ops+dev · **Réf :** `AUDIT_KURLA_SKIN_VS_CHEVEUX_2026-09-10.md`  
> **Objectif P0 :** passer peau de 42 à **65** en rendant le parcours **Fatou 28 ans, peau mixte sensible, phototype V, HPI, budget moyen, sans parfum** réalisable de bout en bout sans dead-end.

---

## 0) RÈGLE D’OR

**Nous n’ouvrons pas l’Europe en bloc.** P0 = **FR (34/40) + NL (30/40) + BG (32/40) uniquement.** GB/US/RP restent fermés jusqu’à preuves chiffrées.  
**Sourcing hybride validé :** 70% revente marques (NappyQueen / IN’OYA / Activilong / Afro Wholesale NL) + 30% façonnier (petits lots).  
**Stock = précommande Stripe TEST** tant que CPNP/RP fichier+date non reçus.

---

## 1) VUE D’ENSEMBLE — 5 CHANTIERS · 8 SEMAINES

| # | Chantier | Score visé | Jours dev | Jours ops | S1→S8 | Livrable qui débloque le suivant |
|---|---|---|---|---|---|---|
| **C0** | **INFRA & TAXONOMIE** — migration + `BeautyProfile` + taxonomy unifiée | 42→47 | 3j | 0j | **S1** | `sourcing_country_strategy` live + `product_taxonomy` peau + `BeautyProfile.skin` 15 champs stabilisé |
| **C1** | **CATALOGUE 40 REF** — sourcing S1 FR/NL exécuté | 47→56 | 2j | 18j | **S1–S5** | 40 SKU `published` couvrant 12/15 besoins (grille peau vivante) |
| **C2** | **FILTRES + MOTEUR PEAU** — actif/phototype/texture + `skinRecommendation` | 56→60 | 5j | 1j | **S3–S5** | Filtre « niacinamide sans parfum mat ≤28€ » renvoie 6 résultats, pas 0 |
| **C3** | **KITS + ROUTINE ADAPTATIVE V1** — 3 kits + `buildSkinRoutine` | 60→62 | 3j | 1j | **S5–S6** | AOV peau 14€ → 52€ (kit Essentielle 49,70€) |
| **C4** | **SHELF / JOURNAL PEAU V1** — étagère + observance + photo | 62→65 | 6j | 0j | **S6–S8** | Fatou suit sa routine J+0/J+30, réassort déclenché |
| **TOTAL** | | **+23pts** | **19j dev** | **20j ops** | **S1–S8** | **65/100 — parité structurelle, pas cosmétique** |

> **Jours dev = 19j étalés sur 8 semaines** → charge soutenable 2,5j/sem. Ops = sourcing + validation 7 critères.

---

## 2) GANTT P0 — semaine par semaine (M0–M2)

```
S1 (8–14 sept)   ███ C0 infra + C1 sourcing GO (emails S1 → 11 envoyés J+2)
S2 (15–21 sept)  ██████ C1 négociation + échantillons FR/NL (4 marques répondent)
S3 (22–28 sept)  ██████ C1 validation 7 critères + C2 filtres dev (actif/phototype)
S4 (29–5 oct)    ██████ C1 ingestion 20 ref + C2 moteur peau (incompatibilités)
S5 (6–12 oct)    ██████ C1 40 ref live + QA catalogue + C3 kits dev
S6 (13–19 oct)   ██████ C3 routine adaptative + pricing bundle + tests Fatou
S7 (20–26 oct)   ██████ C4 shelf/journal dev (étagère + photo)
S8 (27–31 oct)   ██████ C4 finition + QA parcours complet + GO 65/100
```

**Jalon M2 (31 oct) :** `preprod.kurla` → parcours Fatou vert de bout en bout → `prod` 1/11.

---

## 3) DÉTAIL CHANTIER PAR CHANTIER — tâches, critères d’acceptation, décisions concrètes

### C0 — INFRA & TAXONOMIE · S1 · 3j dev · 🔴 CRITIQUE

> **Nous allons commencer par verrouiller l’infra** — sans ça, chaque ref ajoutée cassera les filtres.

| Tâche | J | Owner | Détail concret | Critère DONE |
|---|---|---|---|---|
| **C0.1** Push migration `20260910000002_sourcing_segmented_countries.sql` | 0,5j | Dev | Table `sourcing_country_strategy` 8 pays + c22/c23/c24 + RLS. `sb push --linked` + `SUPABASE_URL` injecté Vercel | `SELECT count(*) =8` en prod |
| **C0.2** Panel admin `SourcingCountryStrategyPanel` | 1j | Dev | Matrice scorée FR34/NL30/BG32 visible `/admin/sourcing` + toggle wave1/wave2/wave3 | Admin voit 8 lignes + scores /40 |
| **C0.3** Taxonomie peau | 1j | Dev | `src/lib/skinTaxonomy.ts` : 15 needs peau + 5 filtres manquants (actif 8 valeurs : niacinamide, ac azélaïque, vitC, rétinol, AHA/BHA, céramides, squalane, ac hyaluronique) + phototype I–VI + texture gel/crème/baume + fini mat/glowy | `BoutiquePage` lit `skinTaxonomy` unique source |
| **C0.4** Stabiliser `BeautyProfile.skin` | 0,5j | Dev | Figer 15 champs + `journal[50]` + `reactionHistory` ; migration `beautyProfile.ts` → pas de champ supplémentaire P0 | Tests `calculateProfileConfidence` skin = 15/15 |

**Hors P0 :** pas de `HpiTracker` photo IA, pas de `SpfTracker` UV — C4 V1 = photo simple.

---

### C1 — CATALOGUE 40 REF · S1–S5 · 2j dev + 18j ops · 🔴 CRITIQUE

> **Notre segment initial sera FR + NL revente directe.** Nous visons **40 SKU publiés** couvrant **12/15 besoins** (hors `cicatrices`/`levres`/`corps` reportés P1).

**Fournisseurs cibles (décisions chiffrées) :**
- **FR vague1 (20 ref) :** IN’OYA (8 ref peau HPI/SPF invisible, MOQ 24, 11€ HT) + Activilong Atox (6 ref céramides/sensible, 8€ HT) + NappyQueen lab (6 ref niacinamide 5%, 12€ HT) — **marge brute 54% HT**
- **NL vague1 (15 ref) :** Afro Wholesale NL (15 ref mixtes, MOQ 12, 9€ HT, CPNP existant, délai 5j)
- **BG fallback (5 ref) :** façonnier BG 32/40 si rupture FR (MOQ 100, 6€ HT, 21j)

| Tâche | J | Owner | Détail | Critère DONE |
|---|---|---|---|---|
| **C1.1** Envoi S1 | J+2 S1 | Ops | 11 emails `S1_EMAILS_PRETS_A_ENVOYER` envoyés (3 FR marque + 2 NL + 1 BG RFQ + 5 relances J+7) | 11 threads Gmail trackés |
| **C1.2** Réception & tri | S2 | Ops | Grille 7 validations : CPNP/RP fichier+date, INCI complet, allégation « uniformise » pas « éclaircit », SPF ISO 24444 si SPF, sans parfum vérifié `containsFragrance`, DDM >12 mois, MOQ ≤24 | 0 ref sans fichier+date |
| **C1.3** Échantillons + whitecast test | S2–S3 | Ops | 10 SPF testés sur phototypes IV–VI (photo studio + note whitecast faible/modéré/élevé) | Galerie 10 photos validée |
| **C1.4** Ingestion 20 ref | S3–S4 | Dev | `product_import` : `products` + `product_variants` + `product_ingredients` + `product_needs_correction` (12 needs) + `inventory` stock 0 `preorder` | 20 SKU `published=true` en staging |
| **C1.5** Ingestion 20 ref + QA | S5 | Dev+Ops | 40 SKU prod, chaque `need` renvoie ≥3 résultats ; `Budget ≤14` renvoie 8 ; `sitemap.xml` produits peau >0 | Parcours Fatou sans dead-end |

**Budget C1 :** stock précommande 0€ (TEST) ; si switch réel M3 : 40×24 unités ×9€ = **8 640€** HT — financé par préco.

**Risque :** 30% non-réponse FR → fallback BG activé S3 (délai +7j, marge 61%).

---

### C2 — FILTRES + MOTEUR PEAU · S3–S5 · 5j dev · 🔴 CRITIQUE

> **Nous allons rendre la boutique peau interrogeable comme cheveux** — filtrer par actif/phototype n’est pas un bonus, c’est le cœur de l’achat peau.

**Filtres à ajouter (décisions) :**

| Filtre | Valeurs | Source | Comportement |
|---|---|---|---|
| **Actif** | niacinamide 5%, ac azélaïque, vit C, rétinol, AHA, BHA, céramides NP, squalane, ac hyaluronique | `product_ingredients → ingredientGraph` | `?actif=niacinamide` |
| **Phototype** | I–VI (clair→très foncé) | `products.metadata.phototype[]` | SPF pur minéral masqué si VI + whitecast élevé |
| **Texture** | gel / lotion / crème / baume / huile | `metadata.texture` |  |
| **Fini** | mat / naturel / glowy | `metadata.finish` |  |
| **Sensibilité** | sensible / très sensible | `sensitivities` | force `sansParfum` |

| Tâche | J | Owner | Critère DONE |
|---|---|---|---|
| **C2.1** UI filtres peau | 2j | Dev | `BoutiquePage.tsx` : 5 nouveaux `<Select>` + chips actifs ; sticky `Mes préférences peau` + count dynamique `42 produits` |
| **C2.2** `skinRecommendation.ts` V1 | 2j | Dev | Règles : `rétinol×AHA même soir = bloqué + explication + alternance` ; `phototype VI + mineral pur whitecast élevé = déclassé` ; `HPI fréquente + niacinamide = boost +20` |
| **C2.3** Index + perfs | 1j | Dev | `GIN(product_ingredients)`, `GIN(metadata)` ; recherche `q=niacinamide` <200ms |

**Test Fatou :** `Boutique → Peau → besoin taches + actif niacinamide + sans parfum + budget ≤28 + phototype V` → **≥4 résultats triés HPI, 0 whitecast élevé.**

---

### C3 — KITS + ROUTINE ADAPTATIVE V1 · S5–S6 · 3j dev · 🔴 CRITIQUE

> **Nous allons faire passer l’AOV peau de 14€ à 52€. Sans kits, le CAC n’est jamais amorti.**

**3 kits décidés (prix chiffrés, marge 52–55%) :**

| Kit | SKU | Contenu | Prix bundle | Prix séparé | Économie | Cible |
|---|---|---|---|---|---|---|
| **KPEAU-01 Essentielle** | `kit-peau-ess-001` | Nettoyant doux + Crème céramides + SPF50 invisible | **49,70€** | 52,60€ | −5% | Fatou budget moyen |
| **KPEAU-02 Équilibrée** | `kit-peau-eq-001` | KPEAU-01 + Sérum niacinamide 5% + Gel ac hyaluronique | **62,00€** | 71,40€ | −13% | HPI + hydratation |
| **KPEAU-03 Experte** | `kit-peau-exp-001` | KPEAU-02 + Exfoliant AHA/BHA 1×/sem + Baume lèvres céramides | **84,90€** | 99,80€ | −15% | Routine hebdo incluse |

| Tâche | J | Owner | Critère DONE |
|---|---|---|---|
| **C3.1** Créer 3 kits `category=kits` + `kit_items` | 1j | Dev | 3 SKU kits `published`, `yield→monthlyCost` calculé |
| **C3.2** `buildSkinRoutine` V1 | 1,5j | Dev | Routine matin 6 / soir 8 / hebdo 3 **adaptée** : si `phototype V+ + sensible` → SPF hybride + sans parfum ; si `HPI` → niacinamide matin |
| **C3.3** Pricing + livraison | 0,5j | Dev | Bundle −13% si kit vs unité ; livraison 4,90€, gratuite >59€ (KPEAU-02/03) |

**Hors P0 :** abonnement réassort 6 sem (P1).

---

### C4 — SHELF / JOURNAL PEAU V1 · S6–S8 · 6j dev · 🔴 CRITIQUE

> **Nous allons donner à peau son équivalent Shelf cheveux** — sans suivi, pas de réachat ni de preuve.

| Tâche | J | Owner | Détail | Critère DONE |
|---|---|---|---|---|
| **C4.1** `MySkinShelf` | 2,5j | Dev | Page `/account/shelf?cat=peau` : produits ouverts, % restant estimé (`yield`), date ouverture, alerte réassort J-7 | Fatou voit ses 3 produits KPEAU-01 + jauge |
| **C4.2** `SkinJournal` V1 | 2,5j | Dev | Page `/peau/journal` : entrée J+0/J+7/J+30 `feeling (1–5) + concerns + photo optionnelle (1 max)` stocké `beautyProfile.skin.journal[50]` + `localStorage` sync | 1 entrée créée, photo <2Mo, RGPD consent |
| **C4.3** Observance matin/soir | 1j | Dev | Toggle quotidien `matin fait / soir fait` → streak 7j → badge « 7 matins d’affilée » | Streak affiché sur `/peau/routine` |

**Hors P0 :** `HpiTracker` slider avant/après + delta teint auto (P2) — V1 = photo brute + note manuelle.

---

## 4) CE QUI N’EST PAS DANS P0 (et pourquoi)

| Reporté P1 (M2–M4) | Raison |
|---|---|
| 15 fiches ingrédient peau + graphe CosIng | Besoin INCI C1 d’abord |
| NeedHub peau + Search peau + CTA express mobile | Dépend C2 taxonomie |
| 2 pros dermato vérifiés | Recrutement 3 semaines, pas bloquant achat |
| `Melanin-skin` fusion → guide | SEO, pas conversion |
| Abonnement / réassort auto | Après preuve observance C4 |
| IA vision photo | Moat P2, pas MVP |

---

## 5) BUDGET & RESSOURCES P0

| Poste | Montant HT | Quand |
|---|---|---|
| Stock précommande TEST | **0€** | S1–S8 |
| Stock réel 40×24 si GO M3 | 8 640€ | M3 |
| Shooting SPF whitecast 10 ref | 450€ (studio Nantes) | S3 |
| Dev 19j (interne) | 0€ externe | S1–S8 |
| Contenu 7→15 fiches (report P1) | 0€ P0 | P1 |
| **Total cash P0** | **450€** |  |

**Seuil GO prod :** 40 SKU + 3 kits + filtres C2 + shelf C4 + parcours Fatou vert.

---

## 6) RISQUES & MITIGATIONS (chiffrés)

| Risque | Proba | Impact | Mitigation concrète |
|---|---|---|---|
| FR non-réponse 30% | 30% | −6 ref | Fallback BG J+7, Afro Wholesale NL +15 ref |
| CPNP manquant | 20% | Bloque 1 ref | Refus catégorique : 0 ref sans fichier+date |
| Whitecast élevé sur 50% SPF testés | 40% | Grille SPF vide | N’acheter que hybride/organique whitecast faible pour phototype V–VI |
| 12 steps mobile abandon 45% | 45% | Funnel diag cassé | P1 : express par défaut mobile ; P0 : CTA express ajouté S6 |

---

## 7) KPI P0 — succès = parcours Fatou sans couture

| KPI | Aujourd’hui | Cible M2 (65/100) | Mesure |
|---|---|---|---|
| Besoins peau avec ≥3 résultats | 3/15 (20%) | **12/15 (80%)** | `BoutiquePage` count |
| Filtre « niacinamide sans parfum mat ≤28 » | 0 résultat | **≥4 résultats** | Search peau |
| AOV peau | 14,30€ | **52€** (kit) | `orders` |
| Taux diag peau complet | ~18% | **35%** | `diagnostic_skin_complete` |
| Shelf peau utilisé | 0% | **25% des acheteuses** | `shelf_peau_created` |
| Score peau global | 42 | **65** | Re-audit P0 |

**Parcours Fatou validé si :** `Visite /peau → diag 12 steps → routine matin 6 (3 produits KPEAU-01) → boutique filtrée phototype V sans parfum → fiche SPF invisible faible → ajout kit → checkout TEST → shelf + journal J+7` sans dead-end ni claim médical.

---

## 8) FEU VERT — comment on avance

**Tu valides chantier par chantier.** Réponds simplement :

- **« GO C0 »** → je push infra S1 (migration + panel admin) cette semaine
- **« GO C1 »** → j’envoie les 11 emails S1 + lance ingestion 20 ref
- **« GO C2 »** → je code filtres actif/phototype + moteur peau
- **« GO C3 »** → je crée les 3 kits
- **« GO C4 »** → je code shelf/journal

**Ordre imposé : C0 → C1 → C2 → C3 → C4** (chaque chantier débloque le suivant).

> **Prochaine action immédiate si tu dis GO C0 aujourd’hui :** `git push` migration `20260910000002` + panel admin + `TAXONOMY peau` en **2h**, visible sur `preprod.kurla`.

---

*Fichiers refs : `docs/AUDIT_KURLA_SKIN_VS_CHEVEUX_2026-09-10.md` · `src/components/SourcingCountryStrategyPanel.tsx` · `supabase/migrations/20260910000002_sourcing_segmented_countries.sql` · `docs/sourcing/S1_EMAILS_PRETS_A_ENVOYER_2026-09-10.md`*
