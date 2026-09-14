# Sourcing de fond — 50 besoins × 5 produits, prix accessibles (14/09/2026)

**Consigne** : « fais un sourcing de fond. Pour chaque besoin, j'ai besoin de 5
produits. Trouve des fournisseurs avec des produits moins chers sur le marché.
Notre clientèle est plus attirée par des produits moins chers. »

**Règle tenue** : sourcée ou absente, jamais inventée. Chaque ligne porte un statut :
- **prix en gras** = constaté le 14/09/2026 sur le revendeur cité (source URL dans le CSV) ;
- *(fiche)* = prix public constaté dans la base le 14/09/2026 (fiches `src-*`/`peau-test-*`) ;
- **à vérifier** = produit réel identifié, prix non observé cette session — à confirmer
  avant toute fiche (jamais de prix supposé).

**2ᵉ passe (15/09/2026)** : 33 des 41 positions « à vérifier » du 14/09 ont été
re-vérifiées sur des revendeurs FR (statut « vérifié le 15/09/2026 — <source> »).
Total : **242/250 prix constatés**, 8 lignes restantes sans prix (détail en §5).

**Périmètre et partage** : ce document couvre les **50 besoins** de
`BESOINS_PEAU_50_2026-09-13.md` (diagnostic + éducation + besoins spécifiques).
Le travail parallèle du 14/09 (commit `ddb997f`) couvre les **15 besoins produit
du diagnostic** sur le même modèle — 75 produits, `docs/sourcing/
SOURCING_FOND_MOINS_CHER_2026-09-14.md` + registre CSV. Sur les besoins communs
(imperfections, hydrater, barrière, corps, éclat, anti-âge, lèvres…), les deux
registres se complètent : confronter les deux avant toute RFQ.
La vue croisée des deux registres (besoin par besoin, meilleurs prix, points
d'harmonisation) : `docs/sourcing/VUE_CROISEE_2_REGISTRES_SOURCING_FOND_2026-09-15.md`.

## 1. Stratégie prix — trois canaux, un plafond volontaire

La clientèle KURLA est attirée par le prix accessible. Le marché français offre,
besoin par besoin, des produits **réels et sourçables** entre **2,50 € et 25 €** qui
répondent au même besoin que les fiches actuelles (LRP 23–42 €, Isdin 91 €).
Trois canaux se combinent :

| Canal | Gamme de prix constatée | Exemples vérifiés | Rôle |
|---|---|---|---|
| **1. K-beauty value** (Torriden, Isntree, COSRX, Beauty of Joseon, Round Lab, SKIN1004) | 4–25 € | BOJ Relief Sun 12,25 € · COSRX patch 3,63 € · Isntree HA 18,90 € | Cœur de gamme : sérums, SPF, tonics — culture du fini invisible sur teintes foncées |
| **2. Pharmacie accessible** (CeraVe, The Ordinary, Sanoflore, Weleda, Eucerin, LRP bas de gamme) | 2,50–18 € | Niacinamide TO 5,59 € · CeraVe crème lavante 8,72 € · Sanoflore déo 5,75 € | Les références dermatologiques au prix plancher |
| **3. Grande distribution** (Carmex, Garnier, Maybelline, essence, Yves Rocher, Klorane) | 2,50–13 € | Carmex 2,59 € · essence FT 7,50 € · Klorane antipelliculaire 5,99 € | Les gestes du quotidien et le maquillage teintes |

**Constat chiffré** : après la 2ᵉ passe du 15/09, **les 50 besoins ont chacun au moins
un produit sous 25 €** (50/50, contre 45/50 le 14/09). Les produits au-dessus de 25 €
restent des repères haut de gamme, pas des indispensables. Le trio « routine 3 gestes »
(#48) coûte **≈ 34 €** en produits réels sourçables contre 49,70 € pour le kit cible.
**≈ 34 €** en produits réels sourçables contre 49,70 € pour le kit cible.

## 2. Le parc de fournisseurs moins chers

### 2.1 K-beauty B2B — 4 canaux repérés ce 14/09 (2 ici, 2 au travail parallèle)

| Fournisseur | Statut | Marques / points clés | Coordonnées (site officiel) |
|---|---|---|---|
| **Kocosmetic / Bizdistribution** | repéré 14/09 (site) — à recouper RCS | SAS Choisy-le-Roi, SIRET 911 096 642 00010, fondée 2021 ; **Nacific, SKIN1004, COSRX, Beauty of Joseon** ; import direct des laboratoires coréens ; compte pro sous 24 h | 127 av. Anatole France, 94600 Choisy-le-Roi · contact@kocosmetic.fr · kocosmetic.fr |
| **Get Your K-Beauty** | repéré 14/09 (site) — à recouper | importateur/distributeur K-beauty France + Europe depuis 2014 ; **MOQ bas, stock Europe, pas de droits de douane** | getyourkbeauty.com |
| BLACKETIQUE SASU | ✔ vérifié (dossier 13/09, re-contrôlé 14/09) | 50 marques, stock France, B2B exclusivement | 3 rue Magnier Bédu B12, 95410 Groslay · 01 84 80 62 40 · info@blacketique.com · SIRET 979 710 829 00024 |
| EOLYS Beauté | ✔ vérifié (dossier 13/09) | plateforme B2B ; Whamisa, Torriden, SKIN1004, COSRX, Beauty of Joseon, Biodance | eolys-beaute.com (page « devenir revendeur ») |
| **Qudo Beauty** (RO) | constaté au travail parallèle, 14/09 | MOQ **300 € total, aucun minimum par référence**, port offert dès 500 € ; **seul à déclarer par écrit CPNP + personne responsable UE + INCI** ; COSRX, BOJ, Torriden, Isntree, SKIN1004 | cf. `SOURCING_FOND_MOINS_CHER_2026-09-14.md` |
| **Aquarius Cosmetic SLU** (ES, marque IDC Institute) | constaté au travail parallèle, 14/09 | corps / bain / gifts à **0,98–4,40 €/u** (prix publics) | info@aqc.es · +34 938 861 366 |

### 2.2 Les grandes marques (CeraVe, The Ordinary, Garnier, Maybelline, essence,
Sanoflore, Weleda, Eucerin, LRP, Isdin, Ducray, Klorane)

Sourcables en **B2B via leurs distributeurs France** — le nom du distributeur
n'est pas confirmé dans les registres existants : **à désigner** (RFQ : conditions
pro, minimum, CPNP + personne responsable UE, INCI, DDM). C'est le chemin le plus
court vers les prix les plus bas (CeraVe 8,72–17,90 € l'unité en détail, prix pro
sous le détail).

### 2.3 Ankorstore (✔ vérifié) — marques françaises
Sanoflore, Weleda, Cosmo Naturel, marques corps — minimum 100 €/marque, franco 300 €,
**0 % commission réassorts** (constaté janv. 2026, travail parallèle).

## 3. Les 50 besoins × 5 produits

*Légende prix : **gras** = constaté le 14/09/2026 (source dans le CSV) · (fiche) = prix
public de la fiche existante · *à vérifier* = produit identifié, prix à confirmer.*

### A. Comprendre sa peau

#### #1 — Type de peau (8 types) — le diagnostic pilote ; produits de démarrage doux

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | CeraVe — Crème lavante hydratante (236 ml) | **10,90 €** | Grande distribution pharmacie/parapharmacie |
| 2 | CeraVe — Crème lavante hydratante éco-recharge (473 ml) | **8,72 €** | Grande distribution pharmacie/parapharmacie |
| 3 | Torriden — Balanceful Gel nettoyant centella (200 ml) | à vérifier | EOLYS Beauté |
| 4 | Garnier — Eau micellaire 3-en-1 peaux sensibles (400 ml) | **4,99 €** | Grande distribution |
| 5 | CeraVe — Moussant nettoyant (peaux mixtes-grasses) (236 ml) | **10,90 €** | Grande distribution pharmacie/parapharmacie |

#### #2 — Sécheresse (peau) ≠ déshydratation (eau) — eau + lipides séparés

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | Isntree — Sérum hydratant acide hyaluronique (14 poids) (50 ml) | **18,90 €** | EOLYS Beauté |
| 2 | CeraVe — Crème hydratante (céramides) (52 ml) | **15,35 €** | Grande distribution pharmacie/parapharmacie |
| 3 | CeraVe — Lotion hydratante visage & corps (400 ml) | **10,95 €** | Grande distribution pharmacie/parapharmacie |
| 4 | Isntree — Hyaluronic Acid Aqua Gel Cream (100 ml) | **18,95 €** | EOLYS Beauté |
| 5 | CeraVe — Sérum acide hyaluronique (1 %) (30 ml) | dès **17,60 €** | Grande distribution pharmacie/parapharmacie |

#### #3 — Niveau d'hydratation (brillante / sèche / déshydratée)

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | Isntree — Sérum HA ultra bas poids moléculaire (50 ml) | **18,90 €** | EOLYS Beauté |
| 2 | Round Lab — Birch Juice Moisturizing Toner (300 ml) | **12,99 €** | Kocosmetic/Bizdistribution |
| 3 | CeraVe — Lotion hydratante (400 ml) | **10,95 €** | Grande distribution pharmacie/parapharmacie |
| 4 | Torriden — Dive-In Sérum acide hyaluronique (50 ml) | **23,00 €** | EOLYS Beauté |
| 5 | CeraVe — Gel-crème matifiant (peaux mixtes) (53 ml) | **13,63 €** | Grande distribution pharmacie/parapharmacie |

#### #4 — Niveau de sensibilité — socle sans parfum, haute tolérance

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | CeraVe — Crème lavante hydratante (sans parfum) (236 ml) | **10,90 €** | Grande distribution pharmacie/parapharmacie |
| 2 | La Roche-Posay — Cicaplast Baume B5+ (100 ml) | **13,39 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 3 | CeraVe — Pommade réparatrice intensive (multi-usages) (50 ml) | **8,67 €** | Grande distribution pharmacie/parapharmacie |
| 4 | Torriden — Balanceful Gel nettoyant centella (200 ml) | à vérifier | EOLYS Beauté |
| 5 | La Roche-Posay — Lipikar Wash (gel lavant corps, sans savon) (400 ml) | **10,50 €** | Grande distribution pharmacie/parapharmacie |

#### #5 — Phototype + ses limites — débouché produit : le SPF

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | Beauty of Joseon — Relief Sun Rice + Probiotics SPF50+ (50 ml) | **12,25 €** | EOLYS Beauté |
| 2 | La Roche-Posay — Anthelios XL teinté gel-crème SPF50+ (50 ml) | dès **9,50 €** | Grande distribution pharmacie/parapharmacie |
| 3 | Eucerin — Sun Pigment Control Gel-Crème teinté SPF50+ (50 ml) | **12,59 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 4 | Round Lab — Birch Juice Moisturizing Sun Cream SPF50+ (50 ml) | **17,59 €** | Kocosmetic/Bizdistribution |
| 5 | Isntree — Hydramooth / Sun gel SPF50 (gammes solaires K) (50 ml) | **14,59 €** | EOLYS Beauté |

#### #6 — Profondeur de ton et sous-ton — débouché : maquillage teinte

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | essence — I Love Flawless Skin (11 teintes dont Dark Porcelain) (30 ml) | **7,50 €** | Grande distribution |
| 2 | Maybelline — Fit Me fond de teint (350 Caramel/352 Cacao/365 Expresso) (30 ml) | **9,39 €** | Grande distribution |
| 3 | L'Oréal Paris — True Match fond de teint (30 ml) | **18,99 €** (fiche) | Grande distribution |
| 4 | L'Oréal Paris — Infallible 24H Fresh Wear (nuances profondes) (30 ml) | **7,50 €** | Grande distribution |
| 5 | NYX — Can't Stop Won't Stop (gamme étendue) (30 ml) | **12,88 €** | Grande distribution |

#### #7 — Force de la barrière cutanée — céramides

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | CeraVe — Crème hydratante (3 céramides) (52 ml) | **15,35 €** | Grande distribution pharmacie/parapharmacie |
| 2 | The INKEY List — Bio-Active Ceramide hydratant (50 ml) | **16,38 €** | Grande distribution pharmacie/parapharmacie |
| 3 | La Roche-Posay — Cicaplast Baume B5+ (100 ml) | **13,39 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 4 | Torriden — Dive-In Crème apaisante HA (100 ml) | à vérifier | EOLYS Beauté |
| 5 | CeraVe — Lotion hydratante (barrière, texture légère) (400 ml) | **10,95 €** | Grande distribution pharmacie/parapharmacie |

#### #8 — Profilage saisonnier (hiver vs été)

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | CeraVe — Huile lavante moussante (hiver, peau très sèche) (473 ml) | **16,67 €** | Grande distribution pharmacie/parapharmacie |
| 2 | CeraVe — Lotion hydratante (été, texture légère) (400 ml) | **10,95 €** | Grande distribution pharmacie/parapharmacie |
| 3 | Weleda — Lait corps nourrissant à l'argousier (200 ml) | **15,00 €** (fiche) | Ankorstore |
| 4 | Beauty of Joseon — Relief Sun SPF50+ (jamais en pause) (50 ml) | **12,25 €** | EOLYS Beauté |
| 5 | CeraVe — Crème lavante hydratante éco-recharge (473 ml) | **8,72 €** | Grande distribution pharmacie/parapharmacie |

### B. Taches & pigmentation — priorité n°1 peau mélaninée

#### #9 — Taches post-boutons (HPI)

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | The Ordinary — Niacinamide 10 % + Zinc 1 % (30 ml) | **5,59 €** | Grande distribution pharmacie/parapharmacie |
| 2 | The Ordinary — Acide azélaïque suspension 10 % (30 ml) | **13,50 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 3 | COSRX — Acne Pimple Master Patch (24 patchs) | **6,89 €** | EOLYS Beauté |
| 4 | The Ordinary — Solution à l'acide salicylique 2 % (30 ml) | **7,49 €** | Grande distribution pharmacie/parapharmacie |
| 5 | The INKEY List — Super Solutions sérum azélaïque 10 % (30 ml) | **18,40 €** (fiche) | Grande distribution pharmacie/parapharmacie |

#### #10 — Taches solaires

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | Beauty of Joseon — Relief Sun SPF50+ PA++++ (50 ml) | **12,25 €** | EOLYS Beauté |
| 2 | La Roche-Posay — Anthelios XL teinté SPF50+ (50 ml) | dès **9,50 €** | Grande distribution pharmacie/parapharmacie |
| 3 | Eucerin — Sun Pigment Control teinté SPF50+ (50 ml) | **12,59 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 4 | Round Lab — Birch Juice Sun Cream SPF50+ (50 ml) | **17,59 €** | Kocosmetic/Bizdistribution |
| 5 | Isdin — Fotoprotector Fusion Water Magic Glow teinté SPF50 (50 ml) | dès **16,49 €** | Grande distribution pharmacie/parapharmacie |

#### #11 — Teint irrégulier

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | The Ordinary — Niacinamide 10 % + Zinc 1 % (30 ml) | **5,59 €** | Grande distribution pharmacie/parapharmacie |
| 2 | The Ordinary — Suspension vitamine C 23 % + HA 2 % (30 ml) | **8,20 €** | Grande distribution pharmacie/parapharmacie |
| 3 | The Ordinary — Solution salicylique 2 % (30 ml) | **7,49 €** | Grande distribution pharmacie/parapharmacie |
| 4 | Beauty of Joseon — Glow Serum Propolis 10 % (30 ml) | **11,93 €** | EOLYS Beauté |
| 5 | Garnier — Sérum vitamine C Bright Complete (30 ml) | **13,99 €** | Grande distribution |

#### #12 — Teint terne, fatigué

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | The Ordinary — Suspension vitamine C 23 % + HA 2 % (30 ml) | **8,20 €** | Grande distribution pharmacie/parapharmacie |
| 2 | The Ordinary — Niacinamide 10 % + Zinc 1 % (30 ml) | **5,59 €** | Grande distribution pharmacie/parapharmacie |
| 3 | The Ordinary — Solution d'ascorbyl glucoside 12 % (30 ml) | **17,00 €** | Grande distribution pharmacie/parapharmacie |
| 4 | Garnier — Sérum vitamine C Bright Complete (30 ml) | **13,99 €** | Grande distribution |
| 5 | Beauty of Joseon — Glow Serum Propolis 10 % (30 ml) | **11,93 €** | EOLYS Beauté |

#### #13 — Taches par frottement et pression (différenciateur KURLA)

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | The Ordinary — Acide lactique 10 % + HA (30 ml) | **14,89 €** | Grande distribution pharmacie/parapharmacie |
| 2 | The Ordinary — Solution salicylique 2 % (30 ml) | **7,49 €** | Grande distribution pharmacie/parapharmacie |
| 3 | CeraVe — Pommade réparatrice intensive (post-friction) (50 ml) | **8,67 €** | Grande distribution pharmacie/parapharmacie |
| 4 | Torriden — Balanceful Disques équilibrants centella (60 pcs) | à vérifier | EOLYS Beauté |
| 5 | Yves Rocher — Gommage corps riche au karité (75 ml) | **5,99 €** | Grande distribution |

#### #14 — Assombrissement immédiat du soleil (IPD) — savoir ; débouché : SPF

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | Beauty of Joseon — Relief Sun SPF50+ (50 ml) | **12,25 €** | EOLYS Beauté |
| 2 | Round Lab — Birch Juice Sun Cream SPF50+ (50 ml) | **17,59 €** | Kocosmetic/Bizdistribution |
| 3 | La Roche-Posay — Anthelios XL teinté SPF50+ (50 ml) | dès **9,50 €** | Grande distribution pharmacie/parapharmacie |
| 4 | Avène — Eau micellaire solaire teintée SPF50+ (ou Crème teintée) (50 ml) | dès **12,25 €** | Grande distribution pharmacie/parapharmacie |
| 5 | Eucerin — Sun Pigment Control teinté SPF50+ (50 ml) | **12,59 €** (fiche) | Grande distribution pharmacie/parapharmacie |

#### #15 — Lumière visible et hyperpigmentation — le produit attendu : SPF teinté à oxydes de fer

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | Beauty of Joseon — Tinted Mineral Dayscreen SPF30 (15 teintes) (40 ml) | **15,00 €** | EOLYS Beauté |
| 2 | Beauty of Joseon — Daily Tinted Fluid Sunscreen SPF30 (50 ml) | **16,39 €** | EOLYS Beauté |
| 3 | Odacité — Mineral Drops écran teinté SPF50 (6 teintes, marque FR) (30 ml) | **52,00 €** | Ankorstore |
| 4 | La Roche-Posay — Anthelios UVair sérum solaire teinté SPF50+ (50 ml) | dès **16,50 €** | Grande distribution pharmacie/parapharmacie |
| 5 | Eucerin — Sun Pigment Control teinté SPF50+ (50 ml) | **12,59 €** (fiche) | Grande distribution pharmacie/parapharmacie |

#### #16 — Taches hormonales (mélasma) — azélaïque/niacinamide + écran teinté

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | The Ordinary — Acide azélaïque suspension 10 % (30 ml) | **13,50 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 2 | The Ordinary — Niacinamide 10 % + Zinc 1 % (30 ml) | **5,59 €** | Grande distribution pharmacie/parapharmacie |
| 3 | Eucerin — Sun Pigment Control teinté SPF50+ (50 ml) | **12,59 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 4 | La Roche-Posay — Anthelios UVair teinté SPF50+ (50 ml) | dès **16,50 €** | Grande distribution pharmacie/parapharmacie |
| 5 | The INKEY List — Sérum azélaïque 10 % (30 ml) | **18,40 €** (fiche) | Grande distribution pharmacie/parapharmacie |

#### #17 — Assombrissement des plis (cou, aisselles) — gestes + exfoliation douce cadencée

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | Sanoflore — Déodorant Coton 24 H sans sels d'aluminium (50 ml) | **5,75 €** | Ankorstore |
| 2 | The Ordinary — Acide lactique 10 % + HA (usage ciblé doux) (30 ml) | **14,89 €** | Grande distribution pharmacie/parapharmacie |
| 3 | Yves Rocher — Gommage corps riche karité (75 ml) | **5,99 €** | Grande distribution |
| 4 | CeraVe — Lotion hydratante (zones de frottement) (400 ml) | **10,95 €** | Grande distribution pharmacie/parapharmacie |
| 5 | Weleda — Déodorant solide 24 H Sensitive (50 g) | **11,50 €** (fiche) | Ankorstore |

#### #18 — Cernes (sombres / fatigués)

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | The INKEY List — Crème yeux au rétinol (15 ml) | **11,21 €** | Grande distribution pharmacie/parapharmacie |
| 2 | The Ordinary — Caffeine Solution 5 % + EGCG (30 ml) | **8,85 €** | Grande distribution pharmacie/parapharmacie |
| 3 | La Roche-Posay — Hyalu B5 Sérum Yeux (repère haut de gamme) (15 ml) | **23,03 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 4 | CeraVe — Crème yeux (céramides) (15 ml) | **11,30 €** | Grande distribution pharmacie/parapharmacie |
| 5 | Beauty of Joseon — Revive Eye Serum Ginseng + Retinal (30 ml) | **12,75 €** | EOLYS Beauté |

### C. Imperfections

#### #19 — Boutons occasionnels

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | The Ordinary — Solution salicylique 2 % (30 ml) | **7,49 €** | Grande distribution pharmacie/parapharmacie |
| 2 | COSRX — Acne Pimple Master Patch (24 patchs) | **6,89 €** | EOLYS Beauté |
| 3 | The Ordinary — Acide azélaïque 10 % (actif ciblé) (30 ml) | **13,50 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 4 | CeraVe — Flacon moussant nettoyant (peaux mixtes) (236 ml) | **10,90 €** | Grande distribution pharmacie/parapharmacie |
| 5 | COSRX — BHA Blackhead Power Liquid (100 ml) | **18,99 €** (fiche) | EOLYS Beauté |

#### #20 — Imperfections récurrentes

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | The Ordinary — Solution salicylique 2 % (30 ml) | **7,49 €** | Grande distribution pharmacie/parapharmacie |
| 2 | COSRX — BHA Blackhead Power Liquid (100 ml) | **18,99 €** (fiche) | EOLYS Beauté |
| 3 | The Ordinary — Acide azélaïque 10 % (30 ml) | **13,50 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 4 | Isntree — Chestnut BHA 2 % Clear Liquid (100 ml) | **21,95 €** (fiche) | EOLYS Beauté |
| 5 | La Roche-Posay — Effaclar Gel Nettoyant Purifiant (200 ml) | **10,67 €** | Grande distribution pharmacie/parapharmacie |

#### #21 — Points noirs (2 % salicylique, zéro extraction)

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | The Ordinary — Solution salicylique 2 % (30 ml) | **7,49 €** | Grande distribution pharmacie/parapharmacie |
| 2 | COSRX — BHA Blackhead Power Liquid (100 ml) | **18,99 €** (fiche) | EOLYS Beauté |
| 3 | Isntree — Chestnut BHA 2 % Clear Liquid (100 ml) | **21,95 €** (fiche) | EOLYS Beauté |
| 4 | CeraVe — Gel-crème matifiant (sébum/pores) (53 ml) | **13,63 €** | Grande distribution pharmacie/parapharmacie |
| 5 | CeraVe — Nettoyant pores (salicylique 0,5 %) (236 ml) | **8,80 €** | Grande distribution pharmacie/parapharmacie |

#### #22 — Picking (s'arracher les boutons) — patch occlusif = protection physique

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | COSRX — Acne Pimple Master Patch (24 patchs) | **6,89 €** | EOLYS Beauté |
| 2 | COSRX — Master Patch Intensive (90 patchs) | **11,39 €** | EOLYS Beauté |
| 3 | Mizon — All In One Acne Pimple Patch (lot) | **5,99 €** | Kocosmetic/Bizdistribution |
| 4 | CeraVe — Pommade réparatrice intensive (occlusif doux) (50 ml) | **8,67 €** | Grande distribution pharmacie/parapharmacie |
| 5 | Vaseline — Original (occlusif basique) (100 ml) | **2,48 €** | Grande distribution |

#### #23 — Peau brillante, sébum en excès

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | The Ordinary — Niacinamide 10 % + Zinc 1 % (30 ml) | **5,59 €** | Grande distribution pharmacie/parapharmacie |
| 2 | The Ordinary — Solution salicylique 2 % (30 ml) | **7,49 €** | Grande distribution pharmacie/parapharmacie |
| 3 | CeraVe — Gel-crème matifiant (peaux mixtes-grasses) (53 ml) | **13,63 €** | Grande distribution pharmacie/parapharmacie |
| 4 | CeraVe — Flacon moussant nettoyant (236 ml) | **10,90 €** | Grande distribution pharmacie/parapharmacie |
| 5 | La Roche-Posay — Effaclar Mat (fluide matifiant) (40 ml) | **12,99 €** | Grande distribution pharmacie/parapharmacie |

### D. Hydratation & confort

#### #24 — Hydrater en profondeur (règle des minutes)

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | Isntree — Sérum hydratant HA (14 poids moléculaires) (50 ml) | **18,90 €** | EOLYS Beauté |
| 2 | CeraVe — Lotion hydratante (400 ml) | **10,95 €** | Grande distribution pharmacie/parapharmacie |
| 3 | CeraVe — Crème lavante hydratante éco-recharge (geste des 3 min) (473 ml) | **8,72 €** | Grande distribution pharmacie/parapharmacie |
| 4 | Torriden — Dive-In Sérum HA (50 ml) | **23,00 €** | EOLYS Beauté |
| 5 | CeraVe — Huile lavante moussante (sur peau humide) (473 ml) | **16,67 €** | Grande distribution pharmacie/parapharmacie |

#### #25 — Réparer une barrière abîmée

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | La Roche-Posay — Cicaplast Baume B5+ (100 ml) | **13,39 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 2 | CeraVe — Pommade réparatrice intensive (50 ml) | **8,67 €** | Grande distribution pharmacie/parapharmacie |
| 3 | CeraVe — Crème hydratante (3 céramides) (52 ml) | **15,35 €** | Grande distribution pharmacie/parapharmacie |
| 4 | Torriden — Dive-In Crème apaisante HA (100 ml) | à vérifier | EOLYS Beauté |
| 5 | CeraVe — Crème lavante hydratante éco-recharge (473 ml) | **8,72 €** | Grande distribution pharmacie/parapharmacie |

#### #26 — Apaiser une peau réactive

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | CeraVe — Crème lavante hydratante (sans parfum) (236 ml) | **10,90 €** | Grande distribution pharmacie/parapharmacie |
| 2 | La Roche-Posay — Cicaplast Baume B5+ (100 ml) | **13,39 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 3 | Torriden — Balanceful Gel centella (200 ml) | à vérifier | EOLYS Beauté |
| 4 | SKIN1004 — Madagascar Centella Ampoule (100 ml) | **21,90 €** | EOLYS Beauté |
| 5 | CeraVe — Pommade réparatrice intensive (50 ml) | **8,67 €** | Grande distribution pharmacie/parapharmacie |

#### #27 — Rougeurs (azélaïque + SPF, jamais sur-exfolier)

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | The Ordinary — Acide azélaïque suspension 10 % (30 ml) | **13,50 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 2 | The INKEY List — Sérum azélaïque 10 % (30 ml) | **18,40 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 3 | CeraVe — Pommade réparatrice intensive (50 ml) | **8,67 €** | Grande distribution pharmacie/parapharmacie |
| 4 | La Roche-Posay — Cicaplast Baume B5+ (100 ml) | **13,39 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 5 | SKIN1004 — Madagascar Centella Ampoule (100 ml) | **21,90 €** | EOLYS Beauté |

#### #28 — Réactions au parfum (« sans parfum » ≠ « sans allergène »)

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | CeraVe — Crème lavante hydratante (sans parfum) (236 ml) | **10,90 €** | Grande distribution pharmacie/parapharmacie |
| 2 | CeraVe — Lotion hydratante (sans parfum) (400 ml) | **10,95 €** | Grande distribution pharmacie/parapharmacie |
| 3 | CeraVe — Pommade réparatrice (sans parfum) (50 ml) | **8,67 €** | Grande distribution pharmacie/parapharmacie |
| 4 | Garnier — Eau micellaire sans parfum (400 ml) | **4,99 €** | Grande distribution |
| 5 | La Roche-Posay — Anthelios Fluide Invisible SPF50+ (sans parfum) (40 ml) | **22,90 €** (fiche) | Grande distribution pharmacie/parapharmacie |

#### #29 — Climat : eau calcaire, vent froid, hiver

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | CeraVe — Huile lavante moussante (eau calcaire, peau sèche) (473 ml) | **16,67 €** | Grande distribution pharmacie/parapharmacie |
| 2 | La Roche-Posay — Lipikar Baume AP+ (hiver) (400 ml) | **17,90 €** | Grande distribution pharmacie/parapharmacie |
| 3 | CeraVe — Crème hydratante (3 céramides) (52 ml) | **15,35 €** | Grande distribution pharmacie/parapharmacie |
| 4 | Weleda — Lait corps nourrissant argousier (200 ml) | **15,00 €** (fiche) | Ankorstore |
| 5 | CeraVe — Crème lavante hydratante éco-recharge (473 ml) | **8,72 €** | Grande distribution pharmacie/parapharmacie |

### E. Protection solaire

#### #30 — SPF 30–50 quotidien à fini invisible — le besoin n°1 peau mélaninée

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | Beauty of Joseon — Relief Sun SPF50+ PA++++ (50 ml) | **12,25 €** | EOLYS Beauté |
| 2 | La Roche-Posay — Anthelios XL teinté SPF50+ (voile minimal) (50 ml) | dès **9,50 €** | Grande distribution pharmacie/parapharmacie |
| 3 | Eucerin — Sun Pigment Control teinté SPF50+ (50 ml) | **12,59 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 4 | Round Lab — Birch Juice Sun Cream SPF50+ (fini lumineux) (50 ml) | **17,59 €** | Kocosmetic/Bizdistribution |
| 5 | La Roche-Posay — Anthelios Fluide Invisible SPF50+ (repère) (40 ml) | **22,90 €** (fiche) | Grande distribution pharmacie/parapharmacie |

#### #31 — SPF en hiver / ciel couvert (UVA en permanence)

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | La Roche-Posay — Anthelios XL teinté SPF50+ (50 ml) | dès **9,50 €** | Grande distribution pharmacie/parapharmacie |
| 2 | Beauty of Joseon — Relief Sun SPF50+ (50 ml) | **12,25 €** | EOLYS Beauté |
| 3 | Eucerin — Sun Pigment Control teinté SPF50+ (50 ml) | **12,59 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 4 | Avène — Crème SPF50+ teintée (50 ml) | dès **12,25 €** | Grande distribution pharmacie/parapharmacie |
| 5 | Isdin — Stick Invisible SPF50 (réapplication) (20 g) | **14,99 €** (fiche) | Grande distribution pharmacie/parapharmacie |

#### #32 — SPF intégré 10–13 ≠ écran — débouché : un vrai SPF

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | Beauty of Joseon — Relief Sun SPF50+ (50 ml) | **12,25 €** | EOLYS Beauté |
| 2 | Round Lab — Birch Juice Sun Cream SPF50+ (50 ml) | **17,59 €** | Kocosmetic/Bizdistribution |
| 3 | IN'OYA — SUN'OYA Fluide Solaire SPF50+ (50 ml) | **18,90 €** (fiche) | Ankorstore |
| 4 | Avène — Fluide solaire teinté SPF50+ (50 ml) | dès **15,00 €** | Grande distribution pharmacie/parapharmacie |
| 5 | La Roche-Posay — Anthelios Fluide Invisible SPF50+ (40 ml) | **22,90 €** (fiche) | Grande distribution pharmacie/parapharmacie |

#### #33 — Quantité et réapplication (2 mg/cm², toutes les 2 h)

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | Isdin — Stick Invisible SPF50 (format réapplication) (20 g) | **14,99 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 2 | La Roche-Posay — Anthelios Stick Lèvres SPF50+ (4,7 g) | **9,90 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 3 | Avène — Solaire Stick Lèvres SPF50+ (3 g) | **6,59 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 4 | SKIN1004 — Silky Fit Sun Stick SPF50+ PA++++ (20 g) | à vérifier | EOLYS Beauté |
| 5 | Carmex — Baume SPF15 (lèvres, réappli) (7,5 g) | **4,29 €** | Grande distribution |

### F. Anti-âge

#### #34 — Rides et ridules (vitamine C matin, rétinol soir si barrière OK)

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | The Ordinary — Suspension vitamine C 23 % + HA 2 % (30 ml) | **8,20 €** | Grande distribution pharmacie/parapharmacie |
| 2 | The INKEY List — Sérum au rétinol (débutant, libération lente) (30 ml) | **12,99 €** | Grande distribution pharmacie/parapharmacie |
| 3 | CeraVe — Lotion hydratante (base quotidienne) (400 ml) | **10,95 €** | Grande distribution pharmacie/parapharmacie |
| 4 | La Roche-Posay — Hyalu B5 Sérum (repère haut de gamme) (30 ml) | **31,99 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 5 | The Ordinary — Caffeine Solution 5 % + EGCG (contour) (30 ml) | **8,85 €** | Grande distribution pharmacie/parapharmacie |

#### #35 — Fermeté, élasticité (peptides)

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | The INKEY List — Bio-Active Ceramide (barrière = soutien fermeté) (50 ml) | **16,38 €** | Grande distribution pharmacie/parapharmacie |
| 2 | CeraVe — Crème hydratante (3 céramides) (52 ml) | **15,35 €** | Grande distribution pharmacie/parapharmacie |
| 3 | The INKEY List — Sérum peptides (30 ml) | **13,95 €** | Grande distribution pharmacie/parapharmacie |
| 4 | Beauty of Joseon — Revive Eye Serum Ginseng + Retinal (30 ml) | **12,75 €** | EOLYS Beauté |
| 5 | CeraVe — Lotion hydratante (400 ml) | **10,95 €** | Grande distribution pharmacie/parapharmacie |

#### #36 — Vieillissement de la peau mélaninée (pigment d'abord, ride ensuite)

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | The Ordinary — Niacinamide 10 % + Zinc 1 % (30 ml) | **5,59 €** | Grande distribution pharmacie/parapharmacie |
| 2 | The Ordinary — Suspension vitamine C 23 % (30 ml) | **8,20 €** | Grande distribution pharmacie/parapharmacie |
| 3 | Beauty of Joseon — Relief Sun SPF50+ (le geste n°1) (50 ml) | **12,25 €** | EOLYS Beauté |
| 4 | Eucerin — Sun Pigment Control teinté SPF50+ (50 ml) | **12,59 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 5 | La Roche-Posay — Anthelios Fluide Invisible SPF50+ (40 ml) | **22,90 €** (fiche) | Grande distribution pharmacie/parapharmacie |

#### #37 — Prévention active (C matin, dérivés vitamine A soir, SPF n°1)

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | The Ordinary — Suspension vitamine C 23 % (30 ml) | **8,20 €** | Grande distribution pharmacie/parapharmacie |
| 2 | The INKEY List — Sérum au rétinol (30 ml) | **12,99 €** | Grande distribution pharmacie/parapharmacie |
| 3 | Beauty of Joseon — Relief Sun SPF50+ (50 ml) | **12,25 €** | EOLYS Beauté |
| 4 | The Ordinary — Solution salicylique 2 % (exfoliation cadencée) (30 ml) | **7,49 €** | Grande distribution pharmacie/parapharmacie |
| 5 | The Ordinary — Solution ascorbyl glucoside 12 % (C stable) (30 ml) | **17,00 €** | Grande distribution pharmacie/parapharmacie |

#### #38 — Cou et décolleté (mêmes produits que le visage, étendus)

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | CeraVe — Lotion hydratante (visage + corps) (400 ml) | **10,95 €** | Grande distribution pharmacie/parapharmacie |
| 2 | CeraVe — Crème lavante hydratante éco-recharge (473 ml) | **8,72 €** | Grande distribution pharmacie/parapharmacie |
| 3 | Beauty of Joseon — Relief Sun SPF50+ (cou y compris) (50 ml) | **12,25 €** | EOLYS Beauté |
| 4 | La Roche-Posay — Anthelios XL teinté SPF50+ (50 ml) | dès **9,50 €** | Grande distribution pharmacie/parapharmacie |
| 5 | Weleda — Lait corps nourrissant argousier (200 ml) | **15,00 €** (fiche) | Ankorstore |

### G. Spécifique peau mélaninée

#### #39 — Poils incarnés et irritation post-rasage

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | The Ordinary — Acide lactique 10 % + HA (30 ml) | **14,89 €** | Grande distribution pharmacie/parapharmacie |
| 2 | The Ordinary — Solution salicylique 2 % (30 ml) | **7,49 €** | Grande distribution pharmacie/parapharmacie |
| 3 | Yves Rocher — Gommage corps riche karité (cadencé) (75 ml) | **5,99 €** | Grande distribution |
| 4 | CeraVe — Pommade réparatrice intensive (post-rasage) (50 ml) | **8,67 €** | Grande distribution pharmacie/parapharmacie |
| 5 | Eucerin — UreaRepair Plus émollient 10 % urée (400 ml) | **16,99 €** (fiche) | Grande distribution pharmacie/parapharmacie |

#### #40 — Peau « grain de poulet » (coudes, bras, fesses)

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | Eucerin — UreaRepair Plus 10 % urée (400 ml) | **16,99 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 2 | The Ordinary — Acide lactique 10 % + HA (−66 % en 12 sem mesuré) (30 ml) | **14,89 €** | Grande distribution pharmacie/parapharmacie |
| 3 | La Roche-Posay — Lipikar Baume AP+ (400 ml) | **17,90 €** | Grande distribution pharmacie/parapharmacie |
| 4 | Yves Rocher — Gommage corps karité (75 ml) | **5,99 €** | Grande distribution |
| 5 | CeraVe — Lavage SA corps (acide salicylique) (473 ml) | **17,50 €** | Grande distribution pharmacie/parapharmacie |

#### #41 — Corps sec et rêche (coudes, genoux, mollets)

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | CeraVe — Lotion hydratante (400 ml) | **10,95 €** | Grande distribution pharmacie/parapharmacie |
| 2 | CeraVe — Crème lavante hydratante éco-recharge (473 ml) | **8,72 €** | Grande distribution pharmacie/parapharmacie |
| 3 | Cosmo Naturel — Lait corps karité bio (500 ml) | **9,67 €** (fiche) | Ankorstore |
| 4 | Weleda — Lait corps nourrissant argousier (200 ml) | **15,00 €** (fiche) | Ankorstore |
| 5 | La Roche-Posay — Lipikar Baume AP+ (400 ml) | **17,90 €** | Grande distribution pharmacie/parapharmacie |

#### #42 — Aisselles : transpiration, frottement, assombrissement

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | Sanoflore — Déodorant Coton 24 H (sans sels d'aluminium) (50 ml) | **5,75 €** | Ankorstore |
| 2 | Weleda — Déodorant solide 24 H Sensitive (50 g) | **11,50 €** (fiche) | Ankorstore |
| 3 | Sanoflore — Déodorant Mentha 48 H (50 ml) | **5,75 €** | Ankorstore |
| 4 | La Roche-Posay — Déodorant Sensitive 48 H (50 ml) | **11,84 €** | Grande distribution pharmacie/parapharmacie |
| 5 | The Ordinary — Acide lactique 10 % (usage ciblé, cadencé) (30 ml) | **14,89 €** | Grande distribution pharmacie/parapharmacie |

#### #43 — Lèvres : sécheresse, assombrissement par les habitudes

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | Carmex — Baume à lèvres Classic (7,5 g) | **2,59 €** | Grande distribution |
| 2 | Carmex — Baume SPF15 (lèvres marquées) (7,5 g) | **4,29 €** | Grande distribution |
| 3 | Avène — Solaire Stick Lèvres SPF50+ (3 g) | **6,59 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 4 | CeraVe — Pommade réparatrice intensive (multi-usages lèvres) (50 ml) | **8,67 €** | Grande distribution pharmacie/parapharmacie |
| 5 | La Roche-Posay — Anthelios Stick Lèvres SPF50+ (4,7 g) | **9,90 €** (fiche) | Grande distribution pharmacie/parapharmacie |

#### #44 — Cuir chevelu (pellicules, irritation, démangeaisons)

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | Klorane — Shampoing antipelliculaire (200 ml) | **5,99 €** (fiche) | Grande distribution |
| 2 | Ducray — Kelual DS shampoing antipelliculaire (100 ml) | **11,89 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 3 | Nizoral — Shampoing kétoconazole 1 % (100 ml) | **12,49 €** | Grande distribution pharmacie/parapharmacie |
| 4 | La Roche-Posay — Kerium DS shampoing antipelliculaire (200 ml) | **14,99 €** | Grande distribution pharmacie/parapharmacie |
| 5 | La Roche-Posay — Keralys DS Gentle (pellicules grasses/sèches) (200 ml) | à vérifier | Grande distribution pharmacie/parapharmacie |

### H. Maquillage

#### #45 — Démaquiller sans frotter (huile, temps de pose)

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | Garnier — Eau micellaire 3-en-1 (400 ml) | **6,99 €** | Grande distribution |
| 2 | CeraVe — Huile lavante moussante (double nettoyage) (473 ml) | **16,67 €** | Grande distribution pharmacie/parapharmacie |
| 3 | CeraVe — Crème lavante hydratante (2ᵉ temps doux) (236 ml) | **10,90 €** | Grande distribution pharmacie/parapharmacie |
| 4 | Bioderma — Créaline Huile Micellaire (repère prix élevé) (150 ml) | **24,15 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 5 | Banila Co — Clean It Zero cleansing balm (100 ml) | **21,90 €** | Kocosmetic/Bizdistribution |

#### #46 — Maquillage non comédogène

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | essence — I Love Flawless Skin (non pore-clogging, mat) (30 ml) | **7,50 €** | Grande distribution |
| 2 | Maybelline — Fit Me fond de teint matifiant (30 ml) | **9,39 €** | Grande distribution |
| 3 | CeraVe — Gel-crème matifiant (base sans excès) (53 ml) | **13,63 €** | Grande distribution pharmacie/parapharmacie |
| 4 | L'Oréal Paris — Infallible 24H (gamme large, teintes profondes) (30 ml) | **7,50 €** | Grande distribution |
| 5 | NYX — Can't Stop Won't Stop foundation (30 ml) | **12,88 €** | Grande distribution |

#### #47 — Trouver sa teinte de fond de teint en teint foncé

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | essence — I Love Flawless Skin (11 teintes : Dark Sand/Dark Porcelain/Deep) (30 ml) | **7,50 €** | Grande distribution |
| 2 | Maybelline — Fit Me (350 Caramel/352 Cacao/365 Expresso) (30 ml) | **9,39 €** | Grande distribution |
| 3 | L'Oréal Paris — True Match (30 ml) | **18,99 €** (fiche) | Grande distribution |
| 4 | Beauty of Joseon — Tinted Mineral Dayscreen SPF30 (15 teintes) (40 ml) | **15,00 €** | EOLYS Beauté |
| 5 | L'Oréal Paris — Infallible 24H Fresh Wear (nuances profondes) (30 ml) | **7,50 €** | Grande distribution |

### I. Routine & actifs

#### #48 — Routine simple 3 gestes (nettoyer / hydrater / protéger)

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | CeraVe — Crème lavante hydratante (nettoyer) (236 ml) | **10,90 €** | Grande distribution pharmacie/parapharmacie |
| 2 | CeraVe — Lotion hydratante (hydrater) (400 ml) | **10,95 €** | Grande distribution pharmacie/parapharmacie |
| 3 | Beauty of Joseon — Relief Sun SPF50+ (protéger) (50 ml) | **12,25 €** | EOLYS Beauté |
| 4 | Garnier — Eau micellaire (alternative nettoyage) (400 ml) | **6,99 €** | Grande distribution |
| 5 | CeraVe — Crème lavante éco-recharge (le trio à ≈32 €) (473 ml) | **8,72 €** | Grande distribution pharmacie/parapharmacie |

#### #49 — Introduire un actif à la fois + combinaisons sûres

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | The Ordinary — Niacinamide 10 % + Zinc 1 % (30 ml) | **5,59 €** | Grande distribution pharmacie/parapharmacie |
| 2 | The Ordinary — Solution salicylique 2 % (30 ml) | **7,49 €** | Grande distribution pharmacie/parapharmacie |
| 3 | The Ordinary — Acide azélaïque 10 % (30 ml) | **13,50 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 4 | The Ordinary — Acide lactique 10 % + HA (30 ml) | **14,89 €** | Grande distribution pharmacie/parapharmacie |
| 5 | The Ordinary — Suspension vitamine C 23 % (30 ml) | **8,20 €** | Grande distribution pharmacie/parapharmacie |

#### #50 — Peau enceinte / allaitement (ce qu'on écarte, ce qui reste)

| # | Produit | Prix | Fournisseur / canal |
|---|---|---|---|
| 1 | The Ordinary — Acide azélaïque 10 % (alternative douce documentée) (30 ml) | **13,50 €** (fiche) | Grande distribution pharmacie/parapharmacie |
| 2 | Beauty of Joseon — Relief Sun SPF50+ (ce qui reste) (50 ml) | **12,25 €** | EOLYS Beauté |
| 3 | CeraVe — Lotion hydratante (ce qui reste, sans parfum) (400 ml) | **10,95 €** | Grande distribution pharmacie/parapharmacie |
| 4 | The INKEY List — Bakuchiol (alternative végétale au rétinol) (30 ml) | **18,95 €** | Grande distribution pharmacie/parapharmacie |
| 5 | La Roche-Posay — Anthelios XL teinté SPF50+ (ce qui reste) (50 ml) | dès **9,50 €** | Grande distribution pharmacie/parapharmacie |

## 4. Ce que le sourcing de fond change par rapport au dossier du 14/09

1. **Chaque besoin a désormais 5 produits nommés, marqués, formatés, avec prix** —
   au lieu de positions abstraites du registre 100 (PEAU-xxx). Le CSV joint
   (`SOURCING_FOND_50_BESOINS_5_PRODUITS_2026-09-14.csv`, 250 lignes) est prêt
   pour le tri / la négociation.
2. **2 fournisseurs K-beauty B2B nouveaux** (Kocosmetic, Get Your K-Beauty) — à
   recouper (RCS) et à ajouter aux emails 1/2 dès que la boîte mail + le mandat
   sont prêts. **0 email envoyé à ce jour** (état inchangé).
3. **Le trou structurel « SPF teinté teintes foncées » (#15/#47) est pourvu** :
   Beauty of Joseon Tinted Mineral Dayscreen SPF30 — **15 teintes**, 40 ml, 20 $
   (site officiel, réf. septembre 2026) ; en marque FR : Odacité Mineral Drops
   (6 teintes, 52 € — premium) ; en pharmacie : LRP UVair teinté dès 16,50 €.
4. **Le trou « patchs occlusifs » (#22) est comblé à prix plancher** : COSRX
   Master Patch 3,63–6,89 € (24 pcs), 9,11–11,39 € (90 pcs).
5. **La routine 3 gestes (#48) est assemblable à ≈34 €** en produits réels :
   CeraVe crème lavante 10,90 € + CeraVe lotion 10,95 € + BOJ Relief Sun 12,25 €.
6. **Les 26 fiches `src-*` en mode test restent la couche « marques établies »** —
   ce dossier n'en remplace aucune : il ajoute la couche « prix accessible »
   (CeraVe, The Ordinary, K-beauty value, grande distribution) sous les mêmes
   4 gardes-fous (① autorisation fournisseur écrite ② INCI vérifiée ③ CPNP + PR UE
   ④ visuel autorisé) — aucun produit ci-dessus n'est référencé ou publiable
   avant les 3 documents bloquants.

## 5. Honnêteté — ce qui n'est PAS encore fait

- **8 lignes sans prix** après la 2ᵉ passe du 15/09 (contre 41 le 14/09) : 6
  positions Torriden en fiche `peau-test-*` existante (prix volontairement non
  listé tant que la fiche n'est pas vendable — couche test, pas ce dossier),
  1 LRP Keralys DS Gentle (aucun prix FR trouvé le 15/09 — 2 recherches),
  1 SKIN1004 Silky Fit Sun Stick (23 $ US uniquement).
- Kocosmetic et Get Your K-Beauty sont **repérés sur leur site**, non recoupés
  (RCS, références clients) — statut « à recouper », pas « vérifié ».
- **Aucun distributeur B2B n'est désigné** pour les grandes marques (CeraVe,
  The Ordinary, Garnier…) — c'est la prochaine étape de RFQ.
- **0 fournisseur contacté, 0 autorisation** : `not_contacted` partout, inchangé.
- Les prix sont des **prix publics constatés les 14-15/09/2026** ; les prix de
  négociation B2B seront (logiquement) inférieurs, mais aucun n'est promis ici.

## 6. Prochaines étapes (ordre tenu)

1. Recouper Kocosmetic + Get Your K-Beauty (RCS, conditions) → statut du registre.
2. Désigner les distributeurs B2B des grandes marques (RFQ ciblée par marque).
3. Confirmer les 8 lignes restantes sans prix (Keralys DS Gentle FR, SKIN1004 stick US, 6 Torriden peau-test — à la validation des fiches test).
4. Dès boîte mail + mandat + SIREN disponibles : emails fournisseur avec ce dossier
   comme annexe (5 références par besoin, prix publics cités = base de négociation).
5. À chaque réponse : 3 documents bloquants (CPNP + PR UE + INCI) → fiche test →
   les 4 gardes-fous du dashboard → publication réelle si 4/4 verts.
