# Vue croisée — les deux registres de sourcing de fond (15/09/2026)

Deux registres ont été livrés **le même jour (14/09/2026)** sur le même modèle
« 5 produits par besoin, prix accessibles » :

| Registre | Périmètre | Positions | Prix constatés | Commit |
|---|---|---|---|---|
| **A — 50 besoins** (ce travail) | diagnostic + éducation + spécifiques peau | 250 | 242 (2ᵉ passe 15/09) | `717f757` + passe 15/09 |
| **B — 15 besoins du diagnostic** (travail parallèle) | les 15 besoins `skinTaxonomy` du diagnostic | 75 | 68 + 7 ouverts | `ddb997f` |

Ce document les confronte **avant toute RFQ** : correspondance besoin par besoin,
meilleur prix de chaque registre, et les points à harmoniser.

## 1. Correspondance — meilleur prix par besoin

*Prix publics constatés 14/09 (registre B) et 14-15/09 (registre A). « — » = pas de
*prix observé dans ce registre. Entre parenthèses : canal B, besoin # du registre A.*

| Besoin du diagnostic | Besoins registre A | Meilleur prix — registre B (parallèle) | Meilleur prix — registre A (50 besoins) |
|---|---|---|---|
| Hydrater | #2, 3, 24 | **7,50 €** — The Ordinary Natural Moisturizing Factors + HA (DECIEM/The Ordinary) | **8,72 €** — CeraVe Crème lavante hydratante éco-recharge (#24) |
| Sensible | #4, 26 | **7,50 €** — The Ordinary Natural Moisturizing Factors + HA (DECIEM/The Ordinary) | **8,67 €** — CeraVe Pommade réparatrice intensive (#4) |
| Sèche | #2, 29, 41 | **7,50 €** — The Ordinary Natural Moisturizing Factors + HA (DECIEM/The Ordinary) | **8,72 €** — CeraVe Crème lavante hydratante éco-recharge (#29) |
| Grasse | #21, 23 | **11,93 €** — Beauty of Joseon Glow Serum Propolis + Niacinamide (Qudo Beauty) | **5,59 €** — The Ordinary Niacinamide 10 % + Zinc 1 % (#23) |
| Imperfections | #19–22 | **5,79 €** — COSRX Acne Pimple Master Patch (Qudo Beauty) | **2,48 €** — Vaseline Original (#22) |
| Éclat | #11, 12, 14 | **11,93 €** — Beauty of Joseon Glow Serum Propolis + Niacinamide (Qudo Beauty) | **5,59 €** — The Ordinary Niacinamide 10 % + Zinc 1 % (#11) |
| Taches | #9–17 | **11,93 €** — Beauty of Joseon Glow Serum Propolis + Niacinamide (Qudo Beauty) | **5,59 €** — The Ordinary Niacinamide 10 % + Zinc 1 % (#9) |
| Cicatrices | #9, 22 | **5,79 €** — COSRX Acne Pimple Master Patch (Qudo Beauty) | **2,48 €** — Vaseline Original (#22) |
| Contour des yeux | #18 | **12,32 €** — The Ordinary Caffeine Solution 5% + EGCG (DECIEM/The Ordinary) | **8,85 €** — The Ordinary Caffeine Solution 5 % + EGCG (#18) |
| Anti-âge | #34–37 | **10,00 €** — The Ordinary Retinol 1% in Squalane (DECIEM/The Ordinary) | **5,59 €** — The Ordinary Niacinamide 10 % + Zinc 1 % (#36) |
| Lèvres | #43 | **6,59 €** — Avène Solaire Stick Lèvres SPF50+ (Ankorstore) | **2,59 €** — Carmex Baume à lèvres Classic (#43) |
| Corps | #39–42 | **1,90 €** — IDC Institute (Aquarius Cosmetic SLU) | **5,75 €** — Sanoflore Déodorant Coton 24 H (#42) |
| SPF | #5, 10, 30–33 | **12,59 €** — Eucerin Sun Pigment Control Gel-Crème Teinté SPF50+ (Ankorstore) | **4,29 €** — Carmex Baume SPF15 (#33) |
| Barrière | #7, 25 | **7,50 €** — The Ordinary Natural Moisturizing Factors + HA (DECIEM/The Ordinary) | **8,67 €** — CeraVe Pommade réparatrice intensive (#25) |
| Par ingrédient | #49 | **10,00 €** — The Ordinary Retinol 1% in Squalane (DECIEM/The Ordinary) | **5,59 €** — The Ordinary Niacinamide 10 % + Zinc 1 % (#49) |

## 2. Ce que chaque registre apporte en propre

### 2.1 Apport du registre B (travail parallèle) — à intégrer

- **Canaux B2B nommés** que le registre A listait seulement « à désigner » :
  - **DECIEM / The Ordinary — compte pro à ouvrir** (prix publics TO en plafonds :
    Niacinamide 13,50 €, HA 2 % + B5 10,12 €, Rétinol 1 % 10,00 €, Azélaïque 13,50 €) ;
  - **Qudo Beauty (RO)** — MOQ 300 € total, aucun minimum par référence, port offert
    dès 500 €, **seul à déclarer par écrit CPNP + personne responsable UE + INCI** ;
  - **Aquarius Cosmetic SLU (ES, marque IDC Institute)** — corps/bain 0,98–4,40 €/u ;
  - **Ankorstore** — 0 % commission réassorts (constaté janv. 2026).
- **Références produit supplémentaires** absentes du registre A : COSRX Advanced
  Snail 96 Mucin Power Essence 16,99 € (holyskin.fr) · TO NMF + PhytoCeramides 11,60 € ·
  TO Multi-Peptide + HA 21,00 € · TO Glycolic Acid 7 % Toner 13,90 € (**prix UK** —
  boots.com, à convertir en FR avant usage) · LRP Pure Vitamin C12 42,10 € et
  Isdin Eryfotona Ageless teinté 91,19 € (**repères haut de gamme**, pas cibles).
- **IDC Institute (ES)** : plancher corps/bain **1,90 €** — inatteignable en GMS FR.

### 2.2 Apport du registre A (ce travail) — comble les trous du registre B

- Les **placeholders « (à compléter — RFQ) »** du registre B (contour_yeux ×2,
  lèvres ×3) sont pourvus : cernes INKEY yeux rétinol 11,21 € · CeraVe crème yeux
  11,30 € · BOJ Revive Eye 12,75 € · Carmex 2,59–4,29 € · Avène stick lèvres 6,59 € ·
  CeraVe pommade 8,67 €.
- **12 besoins sans équivalent direct dans les 15** : éducation #1 et #8,
  sous-ton #6, rougeurs #27, réactions au parfum #28, cou/décolleté #38,
  cuir chevelu #44, maquillage #45–47, routine 3 gestes #48, grossesse #50 —
  la couche « conseillère » du diagnostic reste couverte par le registre A.
- **Prix revendeurs pharmacie réels** (redcare, boticinal, primor, idealo…) au lieu
  des prix officiels : TO Niacinamide **5,59 €** en pharmacie vs **13,50 €** officiel
  DECIEM — écart de négociation documenté pour les RFQ.
- **Teintes profondes documentées** : L'Oréal Infallible 24H teintes Expresso 380 /
  Ambre Profond 375 à **7,50 €** (idealo, 15/09) · BOJ Tinted Mineral Dayscreen
  15 teintes · essence 11 teintes 7,50 €.

## 3. Points d'harmonisation à trancher avant RFQ

1. **Prix TO : officiel (B) vs revendeur (A).** Le registre B cite theordinary.com
   (13,50 € Niacinamide) ; le registre A cite redcare/boticinal (5,59 €). Pour la
   RFQ DECIEM, l'officiel fait **plafond** ; le revendeur fait **référence de marché**.
   Les deux sont conservés dans les registres, aucun n'est écrasé.
2. **TO Glycolic Toner : prix UK (boots £11,90) converti en FR le 15/09** —
   240 ml constaté **13,15–14,59 €** (idealo / redcare-pharmacie.fr, en stock).
   Cifre utilisable tel quel dans une RFQ DECIEM.
3. **Canal des grandes marques** : les deux registres convergent — distributeur B2B
   FR à désigner (RFQ), Ankorstore pour les marques FR (Sanoflore, Weleda, Cosmo),
   Qudo Beauty pour la K-beauty (CPNP/PR UE/INCI par écrit), IDC/Aquarius pour le corps.
4. **Aucun des deux registres n'a contacté de fournisseur** : 0 email (boîte +
   mandat + SIREN manquants) ; les 4 gardes-fous du dashboard s'appliqueront à chaque
   fiche issue de l'un ou l'autre registre.

## 4. Vue d'ensemble pour la RFQ (recommandation de priorisation)

*Minima constatés de chaque registre pour le groupe de besoins — B = parallèle,
A = 50 besoins. Le plus bas des deux fait référence de marché ; le plus haut fait plafond.*

| Priorité | Groupe de besoins | Min registre B | Min registre A | Canal recommandé |
|---|---|---|---|---|
| P1 — taches (cœur cible) | taches, eclat, cicatrices | **5,79 €** — COSRX Acne Pimple Master Patch (Qudo Beauty) | **5,59 €** — The Ordinary Niacinamide 10 % + Zinc 1 % (#9) | Qudo Beauty (K-beauty) + distributeur TO |
| P1 — SPF (visage, quotidien) | spf | **12,59 €** — Eucerin Sun Pigment Control Gel-Crème Teinté SPF50+ (Ankorstore) | **9,50 €** — La Roche-Posay Anthelios XL teinté gel-crème SPF50+ (#5) | distributeur LRP/Isdin + Qudo (BOJ 12,25 €) |
| P1 — imperfections | imperfections, grasse | **5,79 €** — COSRX Acne Pimple Master Patch (Qudo Beauty) | **2,48 €** — Vaseline Original (#22) | Qudo Beauty + distributeur TO |
| P2 — confort | hydrater, sensible, seche, barriere | **7,50 €** — The Ordinary Natural Moisturizing Factors + HA (DECIEM/The Ordinary) | **8,67 €** — CeraVe Pommade réparatrice intensive (#4) | distributeur TO + Ankorstore (corps FR) |
| P2 — corps | corps | **1,90 €** — IDC Institute (Aquarius Cosmetic SLU) | **5,75 €** — Sanoflore Déodorant Coton 24 H (#42) | IDC/Aquarius (ES) + Ankorstore |
| P3 — lèvres / contours | levres, contour_yeux | **6,59 €** — Avène Solaire Stick Lèvres SPF50+ (Ankorstore) | **2,59 €** — Carmex Baume à lèvres Classic (#43) | GMS + distributeur |

*Sources : `SOURCING_FOND_50_BESOINS_5_PRODUITS_2026-09-14.csv` (registre A, 250 lignes,
2ᵉ passe de vérification 15/09) et `REGISTRE_SOURCING_FOND_75_PRODUITS_2026-09-14.csv`
(registre B, 75 lignes) + `SOURCING_FOND_MOINS_CHER_2026-09-14.md` (note B).*
