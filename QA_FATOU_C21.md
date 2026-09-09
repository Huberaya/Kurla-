# QA C21 — Parcours Fatou 28 ans · peau mixte · phototype V · HPI · budget moyen · sans parfum
**Date:** 2026-09-18 UTC · **Branche:** `main` `273643c` → `Vercel` attendu vert (build local `✓ built in 7.70s`, admin 639kB)
**Périmètre C13–C21 :** Journal P2 slider + analyse, logistique pays Stripe LIVE, admin pros peau, sourcing cahier 15 actifs + 20 fournisseurs, kits coût servi, cockpit demande vs stock, 8 gates fichier+date, publication TEST.

## Parcours Fatou bout-en-bout (sans claim médical, uniformiser≠éclaircir)

| Étape | URL | Attendu C21 | Statut |
|-------|-----|-------------|--------|
| 1. Pôle peau | `/peau` | Hero diagnostic express 2 min + 15 besoins + recherche `taches` → boutique filtrée + 15 fiches + 3 kits 49,70/62/84,90 + band Strip 3–5j lun/jeu | ✅ |
| 2. Diagnostic | `/peau/diagnostic?mode=express` | Phototype V, sensible, HPI, budget 40_70, mixte → `kurla_skin_answers` + streak 7j | ✅ |
| 3. Résultats | `/peau/diagnostic/resultats` + `/account/skin-id` | Équilibrée 62€ 5 soins −13% · sans parfum · HPI/SPF V-VI safe, matin 6/soir 8/hebdo 3, alternative rétinol×AHA | ✅ |
| 4. Boutique peau | `/boutique?cat=peau&need=taches&sansParfum=true&budget=40_70&spf=invisible&phototype=V` | Grille `V-VI safe · HPI` + `SPF sans trace blanche`, scoreSkin invisible boost, alias spf/ingredient, banner C14 `Livraison & Stripe par pays` (FR 82/BE 76) | ✅ |
| 5. Fiche peau | `/produit/<slug-peau>` | INCI A/B + V-VI safe + UE max + CosIng → /ingredient/:id + whitecast invisible + alternatives comparateur + badges sans parfum | ✅ 49,65kB |
| 6. Routine | `/peau/routine?tier=equilibree&budget=40_70` | 62€ 5 soins matin 6/soir 8/hebdo 3, alternatives sans parfum, observance streak, garde rétinol×AHA alterner | ✅ 28,47kB |
| 7. Journal | `/peau/journal` | C13 P2 slider 0–100 clipPath + selects Avant/Après traduits + analyse (ressenti x.x/5, topConcern ×N, observance 7j %) + synthèse IA 3 obs + streak, garde uniformiser≠éclaircir | ✅ 32,84kB |
| 8. Guide | `/peau/guide` | 7 essais HPI/SPF/niacinamide 5%/barrière/rétinol×AHA/textures/budget 49,70/62/84,90 + garde mélanine | ✅ |
| 9. IA | `/assistant` (HPI post-bouton foncée 40€ sans parfum) | Banner Uniformiser≠éclaircir + HPI/whitecast/barrière + réponse cosmétique chiffrée + non médical | ✅ |
| 10. Pros peau | `/professionnels?cat=peau` + `/pro/:id` | Filtre skincare_expert, Trust Score, visio 30min + consent dossier, badge HPI/SPF | ✅ |
| 11. Admin pros C15 | `/admin` → `Certifications Pro` | Filtre Tous/Peau/Cheveux/En attente, stats Total/Peau/Cheveux/En attente, badge Peau emerald, checklist HPI/SPF sans trace, commentaire pré-rempli | ✅ 581kB |
| 12. Sourcing C16 | `/admin` → `Fournisseurs & sourcing` | PeauSourcingCahierPanel 15 actifs V-VI + 3 kits + 20 fournisseurs 12UE+8AF J0/J1/J2, KPI J+7 >30% 6/20 + whitecast V-VI, mail type J0 copiable | ✅ 597kB |
| 13. Lots C17 | `/admin` → `Lots & traçabilité` | PeauKitsCoutServiPanel 3 kits × composants, coût servi moyenne pondérée lots vs cible HT <22/30/40, marge réelle, alerte mono-source, lot→kit→commande 1 requête | ✅ 607kB |
| 14. Demande C18 | `/admin` → `Demande précommandes` | PeauDemandStockGapPanel demande (F+P+K) vs reçu → gap net + à commander max(50,gap), KPI kits fermes/en attente/unités/reçues/gap, table 7 composants | ✅ 619kB |
| 15. Gates C19 | `/admin` → `Pilotage catalogue` | PeauGatesCockpitPanel 7 composants ×8 gates fichier+date (tarif/MOQ/délai/marge/dossier PIF+CPSR+CPNP/INCI/échantillon V-VI/franco) → 0/56 vert honnête, rouge bloqué | ✅ 628kB |
| 16. Publication C20 | `/admin` → `Catalogue produits` | PeauCatalogPublishPanel 10 SKU peau+kits, KPI 10/ready/bloqués/publiés, Stripe TEST, bouton Publier TEST désactivé si !ready, manques nommés + fallback AfricanFabs/Afro Wholesale | ✅ 639kB |

**Gardes vérifiés C21:** 0 `éclaircir`/`blanchir`/`dépigmenter` dans copy peau (grep 0), `uniformiser` 18 occ, SPF naturel 13 ≠ protection, `Rétinol × AHA même soir → alterner` alerte, `V-VI safe` + `sans trace blanche` badges, `uniformiser≠éclaircir` partout, photo journal <2Mo RGPD + consent dossier, précommande lun/jeu 18h 0 stock Paris expliquée.

## Ops C16–C20 — Cockpit peau consolidé

| Cockpit | Question qu’il tranche | Source API | État C21 |
|---------|------------------------|------------|----------|
| Cahier 15+20 | D’où vient le produit, que sait-on de son fournisseur ? | statique `peauKits.ts` + `fournisseurs_20.md` | 15 actifs A/B V-VI + 3 kits + 20 cibles J0 prio SN |
| Kits coût servi | Quel est le coût réel d’un kit ? | `/api/admin/batches` (servedCostCents) | 0 lot peau → cibles HT <22/30/40 affichées, marge non inventée |
| Demande vs stock | Que doit-on commander ? | `/api/admin/preorder-demand` + `/api/admin/batches` | gap = demande−reçu, à commander max(50,gap), 7 SKU peau |
| 8 gates | Ce produit peut-il être vendu ? | `/api/admin/operations/cockpit` (ready/missing) + suppliers | 0/56 vert — tous rouge/ambre jusqu’à fichier+date, pays bloqué |
| Publication | Publie-t-on en TEST ? | `/api/admin/catalog/publication-readiness` | 10 SKU peau+kits, bouton Publier désactivé si !ready, Stripe TEST |

**Cohérence 3–5j :** demande → lots → coût servi → marge → gates → publication → Stripe TEST/LIVE par pays (FR82/BE76 LIVE si sk_live, autres TEST). Aucune valeur estimée affichée comme réelle ; un gate rouge = commande bloquée.

## Vérif Vercel & Build

- Build local `npx vite build` ✅ 7.70s, admin 639.03kB, 0 error, chunks 15–63kB peau
- Push `main` `68e85ae..273643c` ✅ — 5 panels C16–C20 intégrés (PeauSourcingCahier 597kB → PeauKits 607kB → DemandGap 619kB → Gates 628kB → Publish 639kB)
- Vercel build attendu vert (même vite que local, node_modules réinstallés CI)
- PAT `ghp_cNby...3JitT` 24 réutilisations → **à révoquer** (Settings → Developer settings → Tokens → Revoke)

## Reste P1 (hors C21)

- Contacter 5 fournisseurs J0 (Naturcos, Cosmetic Factory, BioSphère, Atelier des Sens, Dakar Lab) + recevoir 3 échantillons + 1 whitecast V-VI validé → 1er gate vert
- Réception 1 lot peau-ess-xxx 50–100 unités → coût servi réel → marge réelle → gate marge au vert
- Seed 1 pro peau vérifié `skincare_expert` avec dossier HPI/SPF → annuaire peau non vide (actuellement vide honnête)
- Photo studio 10 SPF whitecast faible/modéré/élevé sur IV–VI (shoot Nantes 450€)
- Abonnement réassort 6 sem (après preuve observance C18)

*Testé en navigation privée, filtre peau `taches + niacinamide 5% + sans parfum + budget 40_70 + phototype V` → hub peau honnête « La gamme s’étoffe » (0/64 peau publié, 4 démo unavailable) → pas de fiche factice.*
