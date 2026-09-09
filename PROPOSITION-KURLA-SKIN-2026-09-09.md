# PROPOSITION KURLA BEAUTY — Architecture bi-pôle Cheveux + Peau
**Date : 09/09/2026 — Suite audit existant**
**Objectif : faire cohabiter deux moteurs d’expertise au même niveau de profondeur, sans dupliquer, sans casser l’existant.**

---

## 1. Principe — 1 plateforme, 2 pôles, 1 profil

> **KURLA ne devient pas “cheveux + une catégorie peau”. Elle devient “cheveux et peau, deux diagnostics, un seul profil beauté, un seul panier, une seule IA”.**

L’utilisateur Fatou (exemple cahier des charges) doit pouvoir :
- faire **deux diagnostics** (cheveux + peau) ou un seul,
- avoir **un profil** `BeautyProfile { hair, skin }` visible dans `/compte`,
- naviguer **sans friction** entre les deux univers,
- recevoir des **recommandations croisées** (“votre cuir chevelu sec + peau déshydratée → même famille d’actifs”).

**Règle d’or : tout ce qui est générique est mutualisé, tout ce qui est métier est spécifique mais branché sur la même architecture.**

---

## 2. Information Architecture proposée

### 2.1 Navigation principale (Navbar)

Actuellement : `Accueil | Boutique | Diagnostic | Routines | Pros | Guide | Compte`

**Proposé :**

```
Accueil | Cheveux | Peau | Diagnostic | Routines | Pros | Guide | Compte
          ▾          ▾
       Cheveux     Peau
       Boutique    Boutique
       Diagnostic  Diagnostic
       Routines    Routines
       Outils      Ingredients
       ...
```

- **Cheveux** → `/cheveux` (landing cheveux actuelle, garde le hero + texture 3A-4C)
- **Peau** → `/peau` (nouvelle landing, miroir premium, cf. §4)
- **Diagnostic** → menu déroulant : `Diagnostic cheveux` / `Diagnostic peau` / `Mon profil complet`
- **Routines** → `/routines` filtré par domaine (tabs Cheveux | Peau)
- **Boutique** reste **unique** (`/boutique`) mais avec **tabs Cheveux | Peau** en haut (évite deux catalogues séparés, DRY, SEO simple). Entrées dédiées `/boutique?cat=peau` et `/peau/produits` redirigent vers le même catalogue filtré.

> Alternative écartée : deux boutiques séparées (`/cheveux/produits` + `/peau/produits`) → duplication du code de filtres, deux logiques de tri, deux paniers. Refusé.

### 2.2 Sitemap peau (7 pages, page par page)

| # | Page | Route | Statut | Mutualisation |
|---|---|---|---|---|
| 1 | **Landing Peau** | `/peau` | À créer | Nouveau, mais réutilise `HeroSection`, `ChooseNeedSection`, `RoutineCarousel` |
| 2 | **Diagnostic Peau** | `/peau/diagnostic` | `DiagnosticSkinPage` existe (5 Q) → **refonte complète 12 étapes** | Stepper extrait de `DiagnosticHairPage` |
| 3 | **Résultat + Profil** | `/peau/diagnostic/resultats` + `/profil/ma-peau` | À créer | Réutilise `DiagnosticResultPage` + `BeautyHub` |
| 4 | **Catalogue Peau** | `/boutique?cat=peau` (vue filtrée) + `/peau/produits` (alias) | Étendre `BoutiquePage` (ajouter filtres peau) | `ProductCard` générique + `FilterBar` générique |
| 5 | **Fiche produit peau** | `/produit/:slug` (même route, template conditionnel) | Étendre `ProductDetailPage` | Template intelligent (si `category==='peau'` → sections SPF/whitecast/texture) |
| 6 | **Routine peau** | `/peau/routine` (`Construisez ma routine`) | À créer | `routineBuilder` + `RoutineTimeline` |
| 7 | **Guide de la peau** | `/guide/peau` | Étendre `IngredientsGuidePage` + `ArticleDetailPage` | Même CMS en dur + catégorie `peau` |

**Option V2 (après) :** `/peau/comparer` (table 2-4), `/professionnels?type=peau` (filtre), `/assistant` (IA peau).

---

## 3. Modèle de données — évolutif sans refonte

**Pas de nouvelle table `products_peau`.** On étend `products` et `beautyProfiles`.

**`products` — 12 champs peau ajoutés (tous nullable, donc zéro régression cheveux) :**
- `skinTypes[]`, `skinConcerns[]`, `targetZones[]`, `keyIngredients[]+concentration`, `routineStep/order`, `spfValue/type/whitecast`, `texture/finish`, `paoMonths`, `melaninRichFriendly`

**`beautyProfiles` — `skin` étendu :**
```ts
skin: {
  skinType, hydration, phototype,
  concerns[], objectives[], sensitivities[], preferences[],
  budget, currentRoutine, useSPF, env, ageRange,
  journal[] { date, feeling, concerns, notes }
}
```

**Nouvelles tables (Phase 2, via 1 migration) :**
- `skin_types`, `skin_concerns`, `skin_objectives`, `ingredients`, `ingredient_incompatibilities`, `routine_templates` (matin 6 / soir 8 / hebdo 3)

> Tous les champs sont **tags** (array), pas de colonnes rigides → on ajoutera `ongles`, `maquillage` sans migration lourde.

---

## 4. Proposition page 1 — Landing Peau `/peau` (à valider)

**Objectif :** en 3 secondes, l’utilisatrice comprend : “je peux cliquer sur mon problème **ou** me laisser guider”.

**Structure (5 sections, 1 écran chacune) :**

1. **Hero** — “Pas de panique. On va comprendre votre peau ensemble.” + 2 CTA : `Diagnostic express (2 min)` / `Diagnostic complet (5 min)` + visuel phototypes diversifiés (V2 : pas un stock photo médical)
2. **Qu’est-ce que vous voulez améliorer ?** — grille 15 cards visuelles (💧 Hydratation, ✨ Éclat, 🎯 Taches, 🧴 Sèche, 🫧 Grasse, 🔬 Imperfections, 🌿 Sensible, ☀️ SPF, ⏳ Anti-âge, 👁️ Contour yeux, 💋 Lèvres, 🧖🏾‍♀️ Corps, 🩹 Cicatrices, 🧬 Barrière, 🧪 Par ingrédient) — clic → catalogue filtré + routine suggestion + article
3. **Barre de recherche peau** — autocomplétion `taches → Taches pigmentaires | Produits anti-taches | Routine anti-taches`
4. **Routines types** — 3 carrousels : `Essentielle (3 produits)` / `Complète (6)` / `Premium (9)` — prix total + CTA `Voir ma routine`
5. **Guide de la peau** — 3 articles mis en avant : “HPI”, “SPF peaux foncées”, “Niacinamide” + CTA `Explorer le guide`

**Design :** même `font-serif-title`/`#C8753D`, mais accent peau = `rose poudré #D9A8A4` (subtil, pas un site différent) ; illustrations phototypes V inclus dès le hero.

---

## 5. Mutualisation concrète (extrait)

| À extraire maintenant | À créer spécifique peau |
|---|---|
| `components/diagnostic/Stepper.tsx` (depuis `DiagnosticHairPage`) | `data/skinDiagnosticQuestions.ts` (12 étapes, branching) |
| `components/catalog/FilterBar.tsx` (depuis `BoutiquePage`) | `data/skinFilters.ts` (6 familles : type peau, zone, type produit, texture, moment, phototype) |
| `components/catalog/ProductCard.tsx` (depuis `BoutiquePage` grid) | Badges peau : `SPF 50`, `Sans trace blanche`, `Niacinamide 5%` |
| `lib/routineBuilder.ts` (ajouter `SKIN_STEPS`) | `data/skinRoutineTemplates.ts` (matin 6 / soir 8) |
| `CustomerAccountPage` + `BeautyHub` (ajouter onglet `Ma peau`) | `pages/SkinProfilePage.tsx` |

---

## 6. Roadmap page par page (vous validez chaque page)

**Phase 2 — Infra (1j, invisible mais bloque tout) :** migration `skin_domain` + `taxonomyReference` + `beautyProfile` étendu + seed 6 types peau / 17 préoccupations / 12 objectifs / 45 ingrédients.

**Phase 3 — Core (3 semaines, 1 page = 1-2j) :**
1. `/peau` (landing)
2. `/peau/diagnostic` (12 étapes)
3. `/peau/diagnostic/resultats` + `/profil/ma-peau`
4. `/boutique` étendu (filtres peau)
5. `/produit/:slug` template peau intelligent
6. `/peau/routine` (builder matin/soir/hebdo)

**Phase 4 — Personnalisation (1 semaine) :** comparateur table 2-4, alternatives, budget.

**Phase 5 — Contenu & Pros (1 semaine) :** `Guide peau` (7 axes) + `Pros peau` (6 types + filtres phototype).

**Phase 6 — IA (1 semaine) :** `KURLA AI peau` + gardes-fous mélanine + journal peau V1.

> Chaque page est livrée **desktop + mobile**, testée non-régression cheveux, avec sa migration si besoin.

---

## 7. Ce que je vous propose de décider maintenant

**Option A (recommandée) :** je démarre **Phase 2 Infra** (1 jour) puis **Page 1 Landing `/peau`** — vous voyez un résultat visuel en 48h, mais sur des bases solides.

**Option B :** je démarre direct **Landing `/peau` en mock** (données en dur, sans DB) pour aller plus vite, infra en parallèle.

**Dites “go A” ou “go B” et je lance le code immédiatement — page par page, avec votre feu vert à chaque fois.**
