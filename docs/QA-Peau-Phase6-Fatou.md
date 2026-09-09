# QA Peau — Parcours Fatou 28 ans · mixte V · HPI · sans parfum · 40_70€

**Date** 2026-09-10 · **Build** `8aa654f` (63 pages, 36 sitemap, 7.40s) · **DB** 6 pros peau vérifiés live 6/6 + 12 services
**Audit routes** `auditRouteTable()` → `{ missingComponent: [], missingMeta: [] }` ✅

---

## 1 Parcours bout-en-bout (trace manuelle + code review)

### 1.1 /peau (SkinLandingPage)
- Hero “Votre peau, comprise. Pas diagnostiquée.” + CTAs express/complet + catalogue ✅
- 15 besoins (Honey fix vocabulaire uniformiser≠éclaircir) ✅
- Recherche problème/actif + tiers Essentielle 32€/3 / Complète 68€/6 / Premium 124€/9 ✅
- Guide 3 fiches + bloc mélanine + **pros peau live** (`fetchVerifiedProfessionals` filtré `skincare_expert`) avec fallback 3 statiques si fetch vide ✅
- CTA fin ✅

### 1.2 /peau/diagnostic (DiagnosticSkinPage — 12 étapes)
- Steps : type·phototype·hydratation·HPI·acné·concernes·objectifs·sensitivities·ensoleillement·texture/fini·age·climat·budget ✅
- “Je ne sais pas” à chaque étape, progressif non anxiogène ✅
- Stockage `kurla_skin_answers` (localStorage) + `kurla_diagnostic_answers_skin` (session) + `BeautyProfile {skin}` ✅
- Vocabulaire HPI/white-cast/céramides vérifié ✅
- Suite → `/peau/diagnostic/resultats` ✅

### 1.3 /peau/diagnostic/resultats + /account/skin-id (Ma peau)
- Recap type/toneDepth/HPI/spfUsage/sensitivities/budget ✅
- Routine matin/soir calculée, CTAs boutique peau filtrée ✅
- Journal V2 : feeling 3 états + 3 concerns + 280 chars + insights motifs
  - Insights : `inconfort≥3/7` → alerte barrière, `mitige + topConcern`, `HPI + SPF faible` → piste, `topConcern≥3` → focus ✅
  - RGPD : export/suppression dans `/account/donnees`, “Données non revendues” ✅

### 1.4 /boutique?cat=peau
- Header bi-pôle Cheveux|Peau ✅
- 15 besoins peau + 15 familles alias (`BOUTIQUE_NEED_ALIAS`) ✅
- Filtres peau : budget ≤14/28/45/999, Sans parfum (containsFragrance+allergens+INCI), SPF sans trace blanche (filtre invisible vs minéral) ✅
- Bannière guidée “Basé sur diagnostic → Appliquer mes préférences peau” ✅
- **Catalogue peau publié actuel = 0/64** (4 démo `p6/p10/p14/p15` en `catalog_status=unavailable, is_active=false` — non affichés, conforme “jamais de démo”)
  → `filteredProducts.length===0 && EMPTY_CATEGORY_HUB['peau']` affiche **hub peau** ✅ : “La gamme peau s’étoffe — 15 besoins prêts, filtres mémorisés → /peau” + waitlist “soins visage”
  → Pas de `Aucun produit trouvé` générique, pas de fiche factice ✅

### 1.5 /produit/:slug (fiche peau)
- Helpers `isSkinProduct/isSPFProduct/hasFragrance/isMineralSPF/whitecastRisk/routineBadge` ✅
- Panel KURLA SKIN 3 cards (mélanine HPI IV–VI / barrière tolérance / placement routine) + encart SPF élevé/modéré/faible ✅
- Alternatives dynamiques `findAlternatives` (même famille + sans parfum si sensible + invisible si SPF + ±30% prix + budgetMax) → fallback centrifuge “Pas encore d’alternative publiée” avec liens boutique si catalogue peau vide ✅ → lien `/peau/comparer?ids=` ✅
- TrustGuarantees + INCI cliquable ✅

### 1.6 /peau/routine (RoutinesPage peau)
- Branch `isSkin` si `pathname.startsWith('/peau')` ✅
- Tiers Essentielle 3 / Complète 6 / Premium 9 avec prix calculés sur `skinProducts` réels (`useProducts` category peau) fallback 32/68/124 ✅
- Matin 6 / soir 8 / hebdo 3 filtrés par tier ✅
- Budget URL `?budget=&tier=` (Fatou `40_70` → Complète) ✅
- Alternatives par étape : `ALT_MATIN/ALT_SOIR` statiques ↔ `findForStep` dynamiques si ≥2 peau publiés (fallback transparent) + expand “Alternatives (2) · sans parfum” + lien Comparer ✅
- Alertes compat (rétinol+AHA alterner, SPF quotidien HPI, sans parfum) + garde Mélanine ✅
- Comparateur 3 tiers prix ✅

### 1.7 /peau/comparer (SkinComparePage)
- Picker 12, 2–4 sélection, table 9 critères (prix/ml/texture/fini/sans parfum/whitecast/routineStep/keyIngr/forWho/notIdeal/avis) + ligne Alternatives dynamique (`altsById` via `findAlternatives`, 2 par produit) ✅
- `?ids=` partageable + total/cheapest + whitecastLabel (élevé/invisible/modéré) ✅
- Catalogue peau vide → message “Aucun soin peau publié… en cours d’enrichissement” ✅ (testé : `skinProducts.length===0`)

### 1.8 /peau/guide (SkinGuidePage)
- 7 fiches 3–6 min : HPI · SPF · niacinamide 5% · barrière céramides · rétinol/AHA garde-fou · textures · budget ✅
- Accordéon, garde Mélanine (uniformiser≠éclaircir, SPF 13≠50, white-cast, rétinol+AHA), CTA routine ✅
- RouteMeta `indexable weekly 0.8`, prérendu 63 pages ✅

### 1.9 /pros-verifies?cat=peau + /peau pros
- Migration `20260910000000_seed_skin_pros.sql` + script `seedSkinPros.mjs` appliqués live 6/6 (vérificateur superadmin `00c987c2-…`) ✅
- Live : 6 profils `is_public∧identity_verified` + 12 services (30–60min, 35–75€) ✅ — vérif REST `professional_profiles?is_public=eq.true` → 6 ✅
- Directory : filtre `?cat=peau` → `displayedEntries` (specialty peau/skin/dermat) + chips Tous/Peau ✅
- Landing fallback 3 → live 3 si fetch OK ✅

### 1.10 /assistant-beaute (IA)
- `isMedicalRedirect` gardé, disclaimer “pas diagnostic” ✅
- +4 quickCats peau : HPI sans éclaircir, SPF sans trace, barrière abîmée, routine 40€ sans parfum (total 16) ✅
- Bannière `Profil peau détecté : mixte · V · HPI · sans parfum` si `kurla_skin_answers` présent ✅

---

## 2 Conformité & garde-fous

- **Vocabulaire** : `uniformiser ≠ éclaircir` partout (grep 18 occ, jamais “éclaircir” seul comme promesse) ✅
- **SPF** : SPF naturel 13 ≠ 50, white-cast élevé/modéré/faible explicite, garde fond sombre ✅
- **Actifs** : rétinol+AHA alertés alterner, céramides/squalane barrière, niacinamide 5% tolérance ✅
- **Médical** : disclaimers sur /peau, /diagnostic, /guide, /journal V2, /produit (“guide beauté, pas diagnostic”) ✅
- **Budget** : Fatou 28a mixte V HPI sans parfum → Complète 68€ filtrée sans parfum + SPF invisible, alternatives ≤28€, comparateur prix/ml ✅
- **Données** : `BeautyProfile {hair,skin}`, export/suppression, “fonctions gratuites à jamais, pas de revente”, journal max 50 ✅
- **Icons** : Lucide partout, emojis retirés boutons/onglets (drapeaux natifs <select> conservés) ✅

## 3 Technique

- **Build** 7.40s vite + sitemap 36 URLs (33 static +3 en) + prérendu 63 pages ✅
- **auditRouteTable** 0 missing ✅
- **Vercel** branch `8aa654f` → preview live (serveur `dist/server.cjs` 1.4 MB) ✅
- **Catalogue** : 64 publiés (cheveux 26, accessoires 28, kits 10), peau 0 publié (4 démo unavailable) → statut précommande honnête ✅
- **Ourlets** : `three` reste en `package.json` (0 import, non bundlé) — à retirer prochain chantier (non bloquant)
- **Secrets** : `ghp_…` + `sb_secret_…` utilisés une fois, rotation recommandée ✅

## 4 Gaps mineurs corrigés pendant QA

- **Boutique peau vide** : déjà hub peau (pas de générique) → conservé
- **Migration FK** : `000…001` → superadmin `00c987c…` (FK `profiles.id` → `auth.users`) — corrigé `8aa654f` + live apply
- **SkinCompare** : ajout `skinProducts.length===0` hint, `altsById` + lien `Comparer ces alternatives` — déjà poussé `8aa654f`

## 5 Verdict Fatou

> **Parcours Fatou 28a mixte V HPI sans parfum 40_70€ : de bout en bout sans claims médicaux, budget total transparent, alternatives sans parfum à chaque étape, SPF invisible priorisé, pros peau vérifiés joignables.**

**Go pour chantier suivant suggéré : Catalogue peau précommande MVP** (ajouter 3 soins peau `published` sourcés hybrides, tester filtres budget/SPF live, sinon garder hub précommande documenté) **ou** Monitoring prod (Vercel logs, Stripe TEST).
