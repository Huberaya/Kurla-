# QA C12 — Parcours Fatou 28 ans · peau mixte · phototype V · HPI · budget moyen · sans parfum

**Date:** 2026-09-12 UTC · **Branche:** `main` `cf463f0` → `Vercel` attendu vert (build local `✓ built in 6.77s`, 2311 modules)

## Parcours testé (bout en bout, sans claim médical, vocabulaire `uniformiser≠éclaircir`)

| Étape | URL | Attendu | Statut |
|-------|-----|---------|--------|
| 1. Pôle peau | `/peau` | Hero diagnostic express 2 min sticky mobile + 15 besoins + recherche `taches` → boutique filtrée + 15 fiches + kits 49,70/62/84,90 | ✅ |
| 2. Diagnostic | `/peau/diagnostic?mode=express` (5q, <768px → express par défaut) | Phototype V, sensible marquée, HPI, budget 40_70, mixte → `kurla_skin_answers` | ✅ |
| 3. Résultats | `/peau/diagnostic/resultats` + `Ma peau` | Tiers Équilibrée 62€ 5 soins −13% · sans parfum · HPI/SPF, matin 6/soir 8/hebdo 3 | ✅ (DiagnosticResultPage 49,70/62/84,90) |
| 4. Boutique filtrée | `/boutique?cat=peau&need=taches&sansParfum=true&budget=40_70&spf=invisible&phototype=V` | Grille `V-VI safe · HPI` + `SPF sans trace blanche`, `scoreSkinProduct` invisible boost, alias `spf/protection_solaire` + `ingredient/par_ingredient` | ✅ |
| 5. Fiche produit peau | `/produit/<slug-peau>` (ex: crème céramides) | INCI + `Niveau A/B` + `V-VI safe` + `UE max` + `Fiche CosIng → /ingredient/:id` + `Boutique ?actif=` + whitecast `SPF invisible` + alternatives comparateur | ✅ (49,65kB) |
| 6. Routine | `/peau/routine?tier=equilibree&budget=40_70` | 62€ 5 soins, matin 6/soir 8/hebdo 3, alternatives sans parfum par étape, observance streak 7j, garde rétinol×AHA | ✅ (28,47kB) |
| 7. Journal | `/peau/journal` | Observance matin/soir toggle → streak, J+0/J+7/J+30, photo <2Mo RGPD, profil peau V + HPI + budget, synthèse IA 3 obs. chiffrées + conseil sans parfum + invite pro peau | ✅ (27,35kB) |
| 8. Guide | `/peau/guide` (7 essais) | HPI, SPF trace blanche, niacinamide 5%, barrière céramides, rétinol×AHA, textures, budget 49,70/62/84,90 · `Fatou Équilibrée 62€` | ✅ |
| 9. IA | `/assistant` (prompt `HPI post-bouton peau foncée, routine 40€ sans parfum`) | Banner `Uniformiser≠éclaircir` + HPI/whitecast/barrière + double entrée directe/guidée + réponse cosmétique chiffrée + garde non médical | ✅ |
| 10. Pros peau | `/professionnels?cat=peau` + `/pro/:id` peau | Filtre `skincare_expert`, Trust Score, visio 30 min + partage profil peau consentement, placeholder HPI/SPF | ✅ |

**Gardes vérifiés:** 0 `éclaircir`/`blanchir`/`dépigmenter` dans copy peau (grep 0), `uniformiser` partout, SPF naturel 13 ≠ protection rappelé, `Rétinol × AHA même soir → alterner` alerte active, `V-VI safe` badges présents.

## Recap C1—C11

| # | Livrable | Commit | Fichiers clés |
|---|----------|--------|---------------|
| C1 | Infra taxonomy + beautyProfile 22 champs | — | `beautyProfile.ts`, `skinTaxonomy.ts` |
| C2 | Core 6 pages peau (landing, diagnostic, résultats, boutique, produit, routine) | — | `SkinLandingPage`, `DiagnosticSkinPage`, `BoutiquePage` |
| C3 | Kits peau AOV 14→52€ | — | `peauKits.ts` (KPEAU-01/02/03 49,70/62/84,90) |
| C4.3 | Observance matin/soir V1 | — | `skinObservance.ts`, `SkinJournalPage` |
| C5 | 15 fiches peau + graphe CosIng | `4f7a307` | `skinIngredients15.ts` (15 INCI A/B V-VI), `IngredientsGuidePage` 28kB, `products.ts` 5→15, migration 7 INCI |
| C6 | NeedHub 10/15 + Search peau + CTA express mobile | `cbcf015` | `needsHub.ts` +6 peau, `NeedHubPage` kits, `SearchModal` peau prioritaire, `SkinLandingPage` sticky, `DiagnosticSkinPage` mobile express |
| C6b | NeedHub 15/15 | `0c108a5` | +5 peau (contour_yeux/levres/corps/cicatrices/ingredient) |
| C7 | Pros peau + journal (observance intégrée) | `0f658b4` | `ProfessionalDirectoryPage` filtre peau, `SkinLandingPage` EXEMPLE non réservable, `ProProfilePage` visio peau, `SkinJournalPage` observance+phototype |
| C8 | IA gardes mélanine + boutique double entrée | `af43c4b` | `AiBeautyAssistantPage` banner mélanine + `BoutiquePage` SKIN_NEEDS spf/ingredient alias + double entrée + badge V-VI/SPF |
| C9 | Routine 49,70/62/84,90 + fiche produit INCI A/B V-VI | `fd185de` | `RoutinesPage` 49,70/62/84,90 + `ProductDetailPage` matchedSkinIngredients |
| C9c | Correctifs tiers alias | `0810d30` | `RoutinesPage` alias equilibree/experte |
| C10 | Guide prix kits + QA Fatou | `4edba57` | `SkinGuidePage` 49,70/62/84,90 + `DiagnosticResultPage` + `RoutinesPage` |
| C11 | Visio pros peau + synthèse IA journal | `cf463f0` | `SkinJournalPage` queryBeautyAssistant + `ProfessionalDirectoryPage`/`ProProfilePage` visio peau |

## Vérif Vercel

- Build local `npx vite build` ✅ 2311 modules, 6.77s, chunks 15–58kB, 0 error
- Push `main` `0810d30..4edba57..cf463f0` ✅ — Vercel build attendu vert (même `vite` que local)
- PAT `ghp_cNby...3JitT` 13 réutilisations → **à révoquer** (Settings → Developer settings → Tokens → Revoke)

## Reste

- C12 est QA/recap, pas de nouveau code fonctionnel → `QA_FATOU_C12.md` seul artefact
- Prochaines pistes (hors scope C12): enrichir catalogue peau réel (INCI fournisseur), seed pros peau vérifiés réels, P2 slider photo journal + analyse teint
