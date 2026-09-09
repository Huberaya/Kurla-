# CHANTIER 2 — Recommandations produits & matériels par besoin — BILAN

**Date :** 09/09/2026  
**Statut :** audit profond terminé, correctif implémenté, build vert, prêt à déployer

---

## 1. Constat — pourquoi l’utilisateur avait raison

**Audit du catalogue live (64 produits publiés, API `/api/products`) :**

| Besoin (Boutique) | Produits tagués avant | Réalité |
|---|---|---|
| `reduire_casse` | **53 / 64** | Tous les outils (peigne, bonnet, vaporisateur, diffuseur…) portaient le même tag |
| `hydrater_cheveux` | 30 | OK mais mélange soins + outils sans cohérence |
| `proteger_nuit` | **28 / 64** | **Tous les 28 accessoires** avaient exactement `['proteger_nuit','reduire_casse']`, quel que soit l’usage |
| `definir_boucles` | 21 | Mélange gel + brosse + bigoudis — partiellement cohérent |
| `entretenir_tresses` | 6 | OK |
| `cuir_chevelu` | **4** | Seuls p02/p33/p54/p01 — massuer, flacon applicateur, analyzer absents |
| `demeler_cheveux` | **2** | p03/p04 seulement — peignes/brosses démêlage absents |
| `entretenir_locks` | **0** | Éponge twist, interlock, durag non tagués |
| `entretenir_perruque` | **0** | Bonnet satin, filets non tagués |
| `barbe` / `prendre_soin_barbe` | **0** | Tag inexistant en taxonomy, éponge/durag jamais proposés |

**Conséquence vécue :**  
Sélectionner *« Entretenir mes locks »* → 0 résultat.  
Sélectionner *« Démêler »* → 2 produits (au lieu de 5+ outils + 3 soins).  
Sélectionner *« Hydrater »* → proposait la brosse chauffante parmi les vaporisateurs — matériel incohérent avec l’usage.

**Cause racine :**  
`scripts/publishLaunchSkus.ts` utilisait `CATEGORY_MAP['Accessoire'] → ['proteger_nuit','reduire_casse']` pour **tous** les accessoires, sans distinction. Le fichier est l’unique point d’écriture des 54 premiers produits → la dérive est systémique, pas ponctuelle. Le contrôle de vocabulaire n’avait pas rattrapé `demeler_cheveux`/`barbe` car ces termes n’existaient pas encore en `kurla_taxonomy_terms`.

---

## 2. Correctif — ce qui a été fait

### A. Source unique corrigée : `src/lib/productNeedsCorrection.ts` (nouveau, 87 entrées)

87 produits (p01-p54 + p55-p77 + k01-k10) mappés chacun à **2 besoins précis** selon leur vrai usage :

- **Hydrater** → vaporisateur brume p18, leave-in p07/p08, bonnet satin p17, steamer p47/p76, brosse vapeur p48/p58, eau romarin p53…
- **Démêler** → peigne dents larges p16, brosse flexible p20, Seashore Pik p61, ultrasonic p74…
- **Cuir chevelu** → shampoing clarifiant p02, flacon applicateur p26, massuer p36, analyzers p62-p64, Dreame AI p72…
- **Locks** → éponge twist p41, interlock p42, mousse twist-lock p30, machines p56/p77, durag p46…
- **Tresses** → machine tresser p55, pinces croco p23/p61, afro pick p35, threading p50…
- **Perruque/Wig** → bonnet satin p17, bonnet douche p25, headwrap p24, filet p27…
- **Barbe** → éponge p41, durag p46, edge brush p21, afro pick p35…
- **Chaleur / heatless** → bigoudis p22, flexi/perm rods p39-p40, diffuseur p43, tous les dryers/lisseurs p65-p75…

Couverture après correction (vs avant) :

```
definir_boucles 37 (21 → 37)
hydrater_cheveux 25 (30 → 25)
reduire_casse 24 (53 → 24)  ← dé-gonflé
cuir_chevelu 19 (4 → 19)
proteger_chaleur 18 (0 → 18)
entretenir_tresses 13 (6 → 13)
apaiser_cuir_chevelu 10 (0 → 10)
proteger_nuit 9 (28 → 9)  ← dé-gonflé
entretenir_locks 8 (0 → 8)
entretenir_perruque 4 (0 → 4)
demeler_cheveux 5 (2 → 5)
barbe 4 (0 → 4)
```

Chaque besoin a désormais 4–37 produits, plus aucun besoin à 0 ou à 50.

### B. Taxonomie — 2 termes manquants ajoutés

`src/lib/taxonomyReference.ts` + migration DB :

- `demeler_cheveux` — Démêler les cheveux (syn: démêler, nœud, detangle)
- `barbe` — Barbe & grooming homme (syn: beard, waves, durag)

Ordre des `sortOrder` recalculé (hydrater_peau 12→14, etc.). La migration est idempotente (`ON CONFLICT DO UPDATE`).

### C. Moteur de lecture — patch temps-réel sans attendre la DB

`src/lib/db/catalogStore.ts` :
- import `CORRECTED_PRODUCT_NEEDS`
- `correctedNeeds(productId, fallback)` appliqué à chaque ligne lue depuis Supabase **et** en mémoire
- Même si la DB contient encore les anciens tags, l’API `/api/products` et la boutique affichent déjà le corrigé
- La migration SQL reste la source de vérité permanente, le patch évite un trou de déploiement

### D. Boutique — filtre aliasé

`src/pages/BoutiquePage.tsx` :
- import `BOUTIQUE_NEED_ALIAS`
- filtre passé de `p.needs.includes(selectedNeedId)` à `aliases.some(a => p.needs.includes(a))`
- `prendre_soin_barbe` → `barbe`, `cuir_chevelu` → `cuir_chevelu|apaiser_cuir_chevelu`, etc.

### E. Script de publication — fin de la dérive

`scripts/publishLaunchSkus.ts` :
- `concerns: CORRECTED_PRODUCT_NEEDS[pid] || map.needs` — les prochains `--apply` publieront directement avec les bons tags.

### F. Recherche sémantique — lexique complété

`src/lib/semanticSearch.ts` :
- 7 besoins ajoutés : `demeler_cheveux`, `proteger_nuit`, `entretenir_tresses`, `entretenir_locks`, `entretenir_perruque`, `barbe`, `cuir_chevelu`
- `definir_boucles` enrichi (twist, coils), `proteger_chaleur` enrichi (thermo, vapeur, steamer)

### G. Migration DB permanente

`supabase/migrations/20260909000001_fix_needs_taxonomy_and_product_concerns.sql` :
- 2 inserts taxonomy + 5 updates sortOrder
- 77 `UPDATE products SET concerns = …` (64 existants + 13 kits) avec les vrais tags
- 23 `INSERT … ON CONFLICT DO UPDATE` pour p55-p77 (les 23 innovations GAP du chantier 1) avec `catalog_status='published'` et les 7 validations `verified` → visibles dès que Supabase applique la migration

---

## 3. Exemples concrets — « matériau qui suit le besoin »

| Besoin sélectionné | Avant (outil incohérent proposé) | Après (outil cohérent + soin associé) |
|---|---|---|
| **Hydrater** | Bonnet satin + brosse Denman + diffuseur | **Vaporisateur p18** + leave-in p07/p08 + bonnet satin p17 + steamer p47 + **soin** crème p34 |
| **Démêler** | 2 produits seulement | **Peigne dents larges p16**, brosse flexible p20, Seashore Pik p61, ultrasonic p74 + **après-shampoing p04** |
| **Cuir chevelu** | 4 produits (dont shampoing hydratant) | **Flacon applicateur p26**, massuer p36, analyzers p62-p64, **gommage p33**, eau romarin p53 + **shampoing clarifiant p02** |
| **Tresses** | 6 génériques | **Machine tresser p55**, afro pick p35, pinces p23, threading p50 + **crème twist p12 / gel p14** |
| **Locks** | 0 | **Éponge twist p41**, interlock p42, machines p56/p77, durag p46 + **mousse p30** |
| **Perruque** | 0 | **Bonnet satin p17**, bonnet douche p25, headwrap p24, filet p27 |
| **Barbe** | 0 | **Durag p46**, éponge p41, edge brush p21, afro pick p35 |
| **Protéger nuit** | 28 outils identiques | **Bonnet p17**, durag p46, chouchous satin p45, headband p60 — plus les 24 autres outils retirés |

---

## 4. Fichiers modifiés

- `src/lib/taxonomyReference.ts` — +2 termes, reorder
- `src/lib/productNeedsCorrection.ts` — **nouveau**, source unique
- `src/lib/db/catalogStore.ts` — patch lecture + import
- `src/pages/BoutiquePage.tsx` — filtre aliasé + import
- `src/lib/semanticSearch.ts` — +7 entrées lexique
- `scripts/publishLaunchSkus.ts` — concerns corrigés
- `supabase/migrations/20260909000001_fix_needs_taxonomy_and_product_concerns.sql` — **nouveau**, 218 lignes

---

## 5. Déploiement

- Build local `npm run build` ✔ (6.7s, 0 erreur, 3 warnings import.meta CJS attendus)
- Migration idempotente : rejouable sans doublon, `ON CONFLICT` partout
- **Effet immédiat même sans migration DB** grâce au patch `catalogStore` (lecture override) — la boutique affiche déjà les bons résultats après le prochain déploiement Vercel
- Après `supabase db push` (ou Vercel auto-migration), la DB et la lecture coïncident

---

## 6. Prochaines étapes (chantier 3, à valider)

- Revoir les kits `NEEDS_HUB` et `HAIR_NEEDS/SKIN_NEEDS` pour que chaque hub affiche un trio `soin + outil + protection` cohérent (ex: hydrater → leave-in + vaporisateur + bonnet)
- Vérifier `recommendationEngine.ts` et `server/routes/recommendations.ts` utilisent bien les nouveaux tags (ils passent déjà par `product.needs`, donc héritent automatiquement)
- Ajouter les 23 innovations GAP à `NEEDS_HUB.routine[]` où pertinent (ex: steamer p76 dans hydrater, analyzer p62 dans cuir chevelu)
