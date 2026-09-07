# KURLA — PLAN D'EXÉCUTION (référence équipe)

> **Statut :** ce document est la copie humaine de la source de vérité qui vit dans le code
> (`src/lib/launchCatalog.ts`, `src/lib/businessStrategy.ts`) et s'affiche en temps réel dans le
> **Business Control Center** admin (`/admin` → Business Control Center). Les chiffres de vente
> réels et les jalons auto sont mesurés sur la base ; les coûts d'achat sont des **cibles de négoce**
> jusqu'à réception des grilles fournisseurs (jamais présentés comme des devis).
>
> **Règle d'écriture :** pas de « nous pourrions ». Chaque ligne est une décision. Ce qui est mesuré
> vient de la base ; ce qui ne l'est pas encore est une hypothèse assumée et étiquetée.

---

## 1. Modèle économique final

KURLA est une **plateforme de confiance + commerce**, pas une simple boutique. 5 sources de revenu, dans cet ordre de lancement :

| # | Source de revenu | Ce qu'on vend | Prix | Coût | Marge | Réachat | Canal | Lancement |
|---|---|---|---|---|---|---|---|---|
| 1 | **Produits capillaires** (revente puis marque propre) | 54 SKU soins + outils | 4,90–99,90 € | voir §6 | ~34 % HT soins / 48–60 % outils | 6–8 sem (fort sur le cœur de routine) | Boutique en ligne | **JOUR 1** |
| 2 | **Kits routine** | 10 coffrets précomposés | 39,90–149,90 € | voir §7 | 22–42 % | cadeau + réachat composants | Reco diagnostic → boutique | **JOUR 1** |
| 3 | **Abonnement KURLA+** (confort, pas l'honnêteté) | Suivi routine, alertes réappro −10 %, historique | 7,90 €/mois ou 79 €/an | ~0,60 € | ~92 % | mensuel | Vendu APRÈS la 1re valeur | Phase 2 (post-lancement) |
| 4 | **KURLA Pro** (salons) | Diagnostic en fauteuil, fiches clientes, RDV | 49 €/mois ou 490 €/an | ~4 € | ~92 % | mensuel B2B | Vente directe salon | Phase 4 (M9+) |
| 5 | **KURLA Intelligence** (B2B données) | Texture Gap Report, API scoring ingrédients | rapport 4 900 €/an · API 1 900 €/mois | ~120 € | ~90 % | annuel | Vente directe marques/labos | Phase 5–6 |

**Ordre de lancement assumé :** ① produits + kits (encaissement immédiat) → ② KURLA+ (rétention) → ③ Pro (B2B) → ④ Intelligence (valorisation données, **agrégats k-anonymes uniquement**).
**Marketplace tiers :** pas au lancement (revente en direct d'abord, pour maîtriser conformité et marge) ; ouverte phase 5.
**Gratuité à jamais :** diagnostic, profil, transparence ingrédient, explication des conseils. L'abonnement vend du confort, jamais l'accès à l'honnêteté.

---

## 2. Cible principale

**Cible prioritaire n°1 : la femme aux cheveux crépus/afro (type 4) en zone urbaine française, 25–40 ans, prête à payer pour « que ça marche enfin ».**

C'est le segment le plus douloureux (hydratation qui ne tient pas, avis contradictoires, promesses non tenues), le plus mal servi par la grande distribution, et celui où le diagnostic + la transparence ingrédient font la différence la plus forte. Tout le lancement (kits K03/K06, contenu TikTok, message) est orienté vers cette cible ; les autres sont servies sans être le focus budgétaire.

---

## 3. Personas (classés par priorité)

| Priorité | Persona | Âge / zone | Cheveux | Budget | Plateformes | Douleur principale | Pourquoi elle paie |
|---|---|---|---|---|---|---|---|
| **1** | **Aminata — « J'ai tout essayé »** | 26–35, IdF/Lyon | 4C/afro | Moyen+ | TikTok, IG, YouTube | Produits qui n'hydratent pas, promesses non tenues | Le kit qui règle le problème + le suivi qui empêche de régresser |
| **2** | **Camille — « Maman vigilante »** | 31–42, urbain | 3A/3B | Moyen, raisonnée | IG, Google, Pinterest | Greenwashing, substances, santé enfants | La tranquillité : un kit vérifié + alertes |
| **3** | **Inès — « Curieuse, budget serré »** | 20–27, grandes villes | 3C/4A | Serré | TikTok, Snap, IG | Ne sait pas par où commencer | Le petit kit d'entrée, puis réachat via promo/parrainage |
| **4** | **Fatou — « Coiffeuse pro »** | 30–50, salons | Pro tous types | Investissement | IG, WhatsApp, bouche-à-oreille | Conseil à refaire par cliente | KURLA Pro : gain de temps + crédibilité (phase 4) |

---

## 4. Positionnement

- **Accroche :** « Le coiffeur-conseil honnête pour les cheveux texturés. »
- **Promesse :** « On te dit la vérité sur chaque ingrédient et on te trouve LA routine qui marche — sans greenwashing. »
- **Proposition de valeur :** un diagnostic gratuit personnalisé + une transparence ingrédient totale, qui débouchent sur les bons produits achetés au même endroit.
- **Message principal :** « Arrête de deviner. KURLA lit tes cheveux, décrypte les étiquettes et te donne ta routine. »
- **Différenciation :** **aucun** acteur ne combine (1) diagnostic cheveu texturé personnalisé, (2) base ingrédients traçable jusqu'aux restrictions réglementaires, (3) achat de la routine recommandée. Sephora = généraliste sans conseil ciblé ; Amazon = ni confiance ni conseil ; TikTok/IG = du bruit sans preuve ; boutique spécialisée = chère et fermée la nuit.
- **Raison de croire :** graphe d'ingrédients traçable (données réglementaires), diagnostic qui cite ses sources, et la confiance érigée en règle (les fonctions qui protègent ne sont jamais payantes).

**Lignes rouges non négociables :**
1. Diagnostic / profil / transparence ingrédient **gratuits à jamais**.
2. Jamais de revente de données personnelles ; B2B = agrégats k-anonymes.
3. Aucun chiffre inventé (contact, prix, MOQ, délai, revenu) : le réel vient de la base, le reste est une hypothèse étiquetée.
4. On ne paie pour scaler (pub) qu'une fois la conversion organique prouvée (**ROAS > 2,5**).
5. Précommandes partout, jamais « en stock » tant que le lot n'est pas réceptionné ; Stripe en TEST tant que le sourcing n'est pas calé.

---

## 5. Catalogue exact du lancement

**Décision : 54 SKU au lancement, pas 100.**
- **26 soins capillaires** (revente de marques reconnues + private label KURLA) : shampoing 4, co-wash 1, après-shampoing 1, masques 3, leave-in 5, huiles/beurre 6, coiffants 6.
- **28 outils/accessoires** (marque KURLA, marge 48–60 %) : démêlage, protection nuit/satin, heatless, scalp care, appareils.

**Pourquoi 54 :** assez large pour couvrir une routine complète sur tous les types (3A→4C) et alimenter 10 kits + 5 routines ; assez étroit pour limiter le stock mort (les kits servent de prédiction de la demande). On élargira en data-driven après les 1ères ventes.
**Répartition stratégique :** le cœur de routine (soins, réachat fréquent) fidélise ; les **outils** font la marge ; les **appareils** (steamer, brosse vapeur) sont les vitrines premium qui différencient.

> Les 54 lignes détaillées (nom, catégorie, marque cible, cheveux, prix, coût visé, marge, marge €, réachat) sont dans le tableau §6 et pilotables/filtrables dans le BCC (onglet Plan de lancement).

---

## 6. Liste exacte des produits (54)

Légende : **Vente** = prix public TTC · **Coût** = objectif d'achat HT (cible de négoce) · **Marge** = brute estimée (recalculée sur coût réel visé) · **Réachat** = fréquence de rachat.

| SKU | Produit | Catégorie | Marque cible | Cheveux | Vente | Coût | Marge | Marge € | Réachat |
|---|---|---|---|---|---|---|---|---|---|
| p01 | Shampoing crème hydratant sans sulfate (250 ml) | Shampoing | Aunt Jackie's / Cantu | 3A-4C | 12,90 | 7,10 | 34% | 5,80 | fort |
| p02 | Shampoing purifiant clarifiant (250 ml) | Shampoing | Kinky-Curly / As I Am | 3A-4C | 13,90 | 7,60 | 34% | 6,30 | moyen |
| p03 | Co-wash nettoyant crème (450 ml) | Co-wash | As I Am Coconut Cowash | 3C-4C | 14,90 | 8,20 | 34% | 6,70 | fort |
| p04 | Après-shampoing démêlant hydratant (400 ml) | Après-sh. | Cantu / Aunt Jackie's | 3A-4C | 11,90 | 6,50 | 34% | 5,40 | fort |
| p05 | Masque profond nutrition karité (340 g) | Masque | Shea Moisture Raw Shea | 3C-4C | 16,90 | 9,30 | 34% | 7,60 | moyen |
| p06 | Masque protéiné reconstructeur (340 g) | Masque | Aphogee / Shea Moisture | 3A-4C | 17,90 | 9,80 | 34% | 8,10 | moyen |
| p07 | Leave-in crème hydratante légère (250 ml) | Leave-in | Kinky-Curly / Aunt Jackie's | 3A-3C | 13,90 | 7,60 | 34% | 6,30 | fort |
| p08 | Leave-in riche « cream » pour crépus (250 ml) | Leave-in | Camille Rose / Mielle | 4A-4C | 15,90 | 8,70 | 34% | 7,20 | fort |
| p09 | **Beurre de karité brut 100 % (200 g)** | Huile/Beurre | **Marque propre KURLA** | 3C-4C | 9,90 | 4,50 | **45%** | 5,40 | moyen |
| p10 | Huile de ricin noire jamaïcaine (118 ml) | Huile/Beurre | Sunny Isle / Tropic Isle | 3A-4C | 12,90 | 7,10 | 34% | 5,80 | moyen |
| p11 | Sérum huiles nourricières multi-usages (100 ml) | Huile/Beurre | Mielle / Camille Rose | 3A-4C | 14,90 | 8,20 | 34% | 6,70 | fort |
| p12 | Crème de définition twist-out/braid-out (227 g) | Gel/Coiffant | Camille Rose / Mielle | 3C-4C | 15,90 | 8,70 | 34% | 7,20 | fort |
| p13 | Gel de lin définition sans croûtage (240 ml) | Gel/Coiffant | Kinky-Curly / Aunt Jackie's | 3A-4A | 16,90 | 9,30 | 34% | 7,60 | fort |
| p14 | Gel de tenue forte edge & twist (227 g) | Gel/Coiffant | Eco Styler / Mielle | 3C-4C | 8,90 | 4,90 | 34% | 4,00 | fort |
| p15 | Mousse coiffante légère définition (200 ml) | Gel/Coiffant | As I Am / Design Essentials | 3A-4A | 11,90 | 6,50 | 34% | 5,40 | moyen |
| p16 | Peigne démêloir dents larges (anti-casse) | Accessoire | KURLA | 3A-4C | 6,90 | 2,50 | 57% | 4,40 | moyen |
| p17 | Bonnet satin nuit + taie d'oreiller (set) | Accessoire | KURLA | 3A-4C | 12,90 | 4,80 | 55% | 8,10 | moyen |
| p18 | Flacon vaporisateur brume continue (300 ml) | Accessoire | KURLA | 3C-4C | 7,90 | 2,90 | 56% | 5,00 | moyen |
| p19 | Brosse démêlante 7 rangs type Denman | Accessoire | KURLA | 3A-4C | 12,90 | 4,60 | 57% | 8,30 | moyen |
| p20 | Brosse démêlante flexible picots (humide/sec) | Accessoire | KURLA | 3A-4C | 11,90 | 4,20 | 58% | 7,70 | moyen |
| p21 | Brosse à edges + peigne de précision | Accessoire | KURLA | 3A-4C | 5,90 | 2,00 | 59% | 3,90 | moyen |
| p22 | Bigoudis satin heatless (lot de 6) | Accessoire | KURLA | 3A-4C | 14,90 | 5,50 | 56% | 9,40 | moyen |
| p23 | Pinces de sectionnement crocodile (lot de 6) | Accessoire | KURLA | 3A-4C | 6,90 | 2,30 | 60% | 4,60 | moyen |
| p24 | Foulard headwrap satin premium | Accessoire | KURLA | 3A-4C | 13,90 | 5,20 | 55% | 8,70 | moyen |
| p25 | Bonnet de douche réutilisable doublé satin | Accessoire | KURLA | 3A-4C | 9,90 | 3,60 | 56% | 6,30 | moyen |
| p26 | Flacon applicateur embout précis (200 ml) | Accessoire | KURLA | 3A-4C | 6,90 | 2,40 | 58% | 4,50 | moyen |
| p27 | Filet de protection tresses & vanilles (nuit) | Accessoire | KURLA | 3C-4C | 5,90 | 2,00 | 59% | 3,90 | moyen |
| p28 | Sérum pousse & fortification racines (50 ml) | Huile/Beurre | Private label KURLA | 3A-4C | 15,90 | 5,90 | 55% | 10,00 | moyen |
| p29 | Gel de lin tenue forte sans flocons (250 ml) | Gel/Coiffant | Private label KURLA | 3A-4C | 13,90 | 7,60 | 34% | 6,30 | fort |
| p30 | Mousse twist & lock tenue souple (200 ml) | Gel/Coiffant | Private label KURLA | 3B-4C | 12,90 | 7,10 | 34% | 5,80 | fort |
| p31 | Huile de ricin noire jamaïcaine pure (100 ml) | Huile/Beurre | Private label KURLA | 3C-4C | 14,90 | 5,50 | 56% | 9,40 | fort |
| p32 | Spray refresh quotidien hydratation (200 ml) | Leave-in | Private label KURLA | 3B-4C | 10,90 | 6,00 | 34% | 4,90 | fort |
| p33 | Gommage cuir chevelu purifiant (150 ml) | Shampoing | Private label KURLA | 3A-4C | 14,90 | 8,20 | 34% | 6,70 | moyen |
| p34 | Crème de jour hydratante coiffage (250 ml) | Leave-in | Private label KURLA | 4A-4C | 14,90 | 8,20 | 34% | 6,70 | fort |
| p35 | Peigne afro métal (fro pick) — volume | Accessoire | KURLA | 3C-4C | 4,90 | 1,70 | 58% | 3,20 | moyen |
| p36 | Brosse massage cuir chevelu silicone | Accessoire | KURLA | 3A-4C | 7,90 | 2,70 | 59% | 5,20 | moyen |
| p37 | Serviette microfibre boucles (plopping) | Accessoire | KURLA | 3A-4C | 12,90 | 4,60 | 57% | 8,30 | moyen |
| p38 | Peigne à queue de rat métal (raies/tresses) | Accessoire | KURLA | 3A-4C | 5,90 | 2,00 | 59% | 3,90 | moyen |
| p39 | Flexi rods mousse (lot de 7, sans chaleur) | Accessoire | KURLA | 3A-4C | 11,90 | 4,20 | 58% | 7,70 | moyen |
| p40 | Perm rods / bigoudis froids (lot, coils) | Accessoire | KURLA | 3B-4C | 10,90 | 3,90 | 57% | 7,00 | moyen |
| p41 | Éponge twist / curl sponge (cheveux courts) | Accessoire | KURLA | 4A-4C | 8,90 | 3,10 | 58% | 5,80 | moyen |
| p42 | Outil interlocking / aiguille d'entretien locs | Accessoire | KURLA | 4A-4C | 9,90 | 3,50 | 58% | 6,40 | moyen |
| p43 | Diffuseur universel sèche-cheveux | Accessoire | KURLA | 3A-4C | 14,90 | 5,50 | 56% | 9,40 | moyen |
| p44 | Bonnet chauffant soin profond (thermal) | Accessoire | KURLA | 3A-4C | 19,90 | 7,50 | 55% | 12,40 | moyen |
| p45 | Chouchous satin & spirales sans casse (lot 5) | Accessoire | KURLA | 3A-4C | 6,90 | 2,40 | 58% | 4,50 | moyen |
| p46 | Durag satin (waves, protection nuit) | Accessoire | KURLA | 3A-4C | 8,90 | 3,20 | 57% | 5,70 | moyen |
| p47 | **Steamer portable cheveux (rechargeable)** | Appareil | Device KURLA | 3A-4C | **99,90** | 42,00 | 50% | 57,90 | moyen |
| p48 | Brosse vapeur nano-mist électrique (USB-C) | Appareil | Device KURLA | 3A-4C | 34,90 | 15,00 | 48% | 19,90 | moyen |
| p49 | Masseur cuir chevelu électrique 3-en-1 | Appareil | Device KURLA | 3A-4C | 24,90 | 10,50 | 49% | 14,40 | moyen |
| p50 | Kit African threading (fil coton + peigne) | Accessoire | KURLA | 4A-4C | 11,90 | 4,00 | 60% | 7,90 | moyen |
| p51 | Spray thermo-protecteur chaleur (200 ml) | Leave-in | Private label KURLA | 3A-4C | 12,90 | 7,10 | 34% | 5,80 | fort |
| p52 | Soin reconstructeur de liens / bond builder (100 ml) | Masque | Private label KURLA | 3A-4C | 19,90 | 10,90 | 34% | 9,00 | moyen |
| p53 | Eau de romarin tonique pousse & scalp (150 ml) | Huile/Beurre | Private label KURLA | 3A-4C | 13,90 | 5,50 | 53% | 8,40 | fort |
| p54 | Rinçage vinaigre de cidre & aloe (scalp toner, 250 ml) | Shampoing | Private label KURLA | 3A-4C | 12,90 | 7,10 | 34% | 5,80 | moyen |

> Note marge : les soins en revente affichent ~34 % de marge brute **HT** avec les coûts cibles actuels (l'historique « 45 % » incluait la TVA à tort). Objectif de remonter à **45 % HT** après négoce des grilles tarifaires. Les outils/appareils sont déjà à 48–60 %.

---

## 7. Liste exacte des kits (10)

Décision : **10 kits** (2 ENTRY, 5 CORE, 3 PREMIUM). Le kit réduit la décision client et fait monter le panier moyen ; remise ~5–10 % vs prix détail. Marge € = prix kit − coût d'achat visé des contenus.

| Kit | Tier | Cheveux | Contenu (SKU) | Séparé | **Prix kit** | Éco client | Coût visé | **Marge KURLA** |
|---|---|---|---|---|---|---|---|---|
| **K01 Premiers pas bouclés** | ENTRY | 3A-3B | p01 p04 p07 p13 | 55,60 | **49,90** | 5,70 | 38,82 | 11,08 (22%) |
| **K02 Hydratation & définition** ★ | CORE | 3C-4A | p01 p04 p08 p13 p11 | 72,50 | **64,90** | 7,60 | 50,62 | 14,28 (22%) |
| **K03 Nutrition profonde crépue** ★ | CORE | 4B-4C | p03 p05 p08 p09 p12 | 73,50 | **69,90** | 3,60 | 51,05 | 18,85 (27%) |
| **K04 Réparation & pousse** | PREMIUM | 3A-4C | p06 p05 p10 p11 p07 | 76,50 | **74,90** | 1,60 | 54,48 | 20,42 (27%) |
| **K05 Coiffures protectrices** | CORE | 3C-4C | p08 p12 p14 p17 | 53,60 | **49,90** | 3,70 | 35,42 | 14,48 (29%) |
| **K06 Routine complète 4C** ★ | PREMIUM | 4A-4C | p03 p05 p08 p09 p12 p14 p17 | 95,30 | **89,90** | 5,40 | 64,08 | 25,82 (29%) |
| **K07 Outils wash day essentiels** | ENTRY | 3A-4C | p16 p19 p20 p21 p23 p18 p17 | 65,30 | **49,90** | 15,40 | 31,62 | 18,28 (37%) |
| **K08 Entretien locs & cheveux courts** | CORE | 4A-4C | p42 p41 p38 p46 p27 p14 | 48,40 | **44,90** | 3,50 | 26,18 | 18,72 (42%) |
| **K09 Boucles sans chaleur (heatless)** | CORE | 3A-4C | p39 p40 p22 p45 p35 p21 | 55,40 | **39,90** | 15,50 | 26,35 | 13,55 (34%) |
| **K10 Soin profond premium (vapeur & scalp)** ★ | PREMIUM | 3C-4C | p44 p47 p36 p37 p52 | 160,50 | **149,90** | 10,60 | 92,68 | 57,22 (38%) |

**Pourquoi ces kits :**
- **K02 & K03 = stars de la reco** (meilleur compromis marge/volume, répondent aux cibles Inès puis Aminata). Mis en tête des recommandations post-diagnostic.
- **K03 & K06** répondent au besoin le plus douloureux (4C) → forte valeur perçue, panier premium.
- **K07/K08/K09** sont à base d'**outils** (marge 34–42 %), très partageables en UGC, parfaits en cadeau et en montée de panier.
- **K10** est la vitrine « waouh » (steamer) : ticket élevé, différencie radicalement.
- **K08** occupe une niche peu servie en ligne EU (locs + hommes).

---

## 8. Liste exacte des routines (5)

Chaque routine est un parcours guidé ; chaque étape pointe un produit du catalogue. Total = prix des produits au détail.

| Routine | Profil / objectif | Étapes (produit) | Total détail | Alternative éco | Alternative premium |
|---|---|---|---|---|---|
| **R01 Cheveux secs / déshydratés** | 3C-4C, rêches · hydrater + sceller | Laver p01 → Démêler p04 → Soin hebdo p05 → Leave-in p08 → Sceller p09 | **67,50 €** | p04 en usage quotidien au lieu de p05 (−8 €) | + p11 sérum (+14,90 €) |
| **R02 Définition boucles 3A/3B/3C** | Boucles mal définies · boucles dessinées sans croûtage | Laver p01 → Leave-in p07 → Gel de lin p13 → Brillance p11 | **58,60 €** | p15 mousse au lieu du gel (−5 €) | Kit K02 complet (64,90 €) |
| **R03 Crépus 4C (nutrition)** | 4B-4C très secs · nourrir/hydrater/protéger | Co-wash p03 → Masque p05 → Leave-in riche p08 → Karité p09 → Coiffage p12 | **73,50 €** | Kit K03 (69,90 €, tout inclus) | Kit K06 routine complète (89,90 €) |
| **R04 Réparation / pousse** | Cassants, fourches, chute · reconstruire/stimuler | Clarifier p02 (1x/2 sem) → Masque protéiné p06 → Ricin racines p10 → Leave-in p07 | **58,60 €** | p05 au lieu de p06 (−1 €) en entretien | Kit K04 (74,90 €) |
| **R05 Refresh / entretien coiffure** | Tous types, entre 2 lavages · raviver au quotidien | Vaporiser p18 → Ré-hydrater p08 → Tenir p14 → Protéger nuit p17 | **45,60 €** | p07 leave-in léger pour 3A-3C | + p11 sérum brillance (+14,90 €) |

---

## 9. Outils KURLA disponibles au lancement

**5 outils au JOUR 1, tous gratuits** (ce sont les aimants à leads et le moteur de confiance) :

| Outil | Problème résolu | Fonctionnement | Valeur business | Gratuit ? | KPI | Moment du parcours |
|---|---|---|---|---|---|---|
| **Diagnostic cheveux IA** | Ne sait pas son type / par où commencer | 5 questions → type + besoins + routine | Aimant à leads + moteur de reco | **Gratuit** | Diagnostics complétés, diag→reco | 1re visite (haut de funnel) |
| **Transparence ingrédients** | Peur des substances, greenwashing | Fiche ingrédient : fonction, restrictions, sources | Différenciation n°1 + SEO | **Gratuit** | Pages ingrédient vues | Avant achat (réassurance) |
| **Générateur de routine** | Sélection paralysante | Recommande routine + kit concret | Dirige vers les kits (AOV) | **Gratuit** | Taux reco→panier | Après le diagnostic |
| **Recherche intelligente** | Trouver le bon produit/ingrédient | Recherche sémantique cheveu + ingrédient | Rétention + SEO | **Gratuit** | Recherches, taux de clic | Tout le parcours |
| **Beauty Advisor (chat IA)** | Questions précises sans humain 24/7 | Chat conseillé qui cite ses sources | Confiance + conversion assistée | **Gratuit** | Conversions assistées, satisfaction | Hésitation / comparaison |

**Différés (phases suivantes) :** suivi résultats & alertes réappro (Phase 2, **KURLA+**), comparateur produits (Phase 2, gratuit), analyse photo (Phase 3), diagnostic en fauteuil pro + recherche de pros (Phase 4).

---

## 10. Prix & 11. Marges — stratégie ENTRY → CORE → PREMIUM

**Grille tarifaire :**
- **ENTRY (< 15 €) :** gels, add-ons, petits outils (p14 8,90 €, p35 4,90 €, p21/p27/p38 5,90 €) → déclenchent l'ajout panier impulsif.
- **CORE (15–70 €) :** la majorité des soins (10,90–19,90 €) et les kits centraux **K01/K02/K03/K05/K07/K08/K09 (39,90–69,90 €)** → là où se fait le volume.
- **PREMIUM (70–150 €) :** kits K04/K06 (74,90/89,90 €) et appareils/steamer **K10 149,90 €, p47 99,90 €** → ticket élevé et image de marque.

**Marges par famille :** soins revente ~34 % HT (objectif 45 % après négoce) · karité marque propre 45 % · private label (p28/p31/p53) 53–56 % · **outils 48–60 %** · appareils 48–50 % · abonnements ~92 %.
**Marge € par kit :** de 11,08 € (K01) à **57,22 € (K10)** ; les kits à base d'outils (K07/K08/K10) ont les meilleurs taux (37–42 %).

**Comment on monte le panier moyen (AOV, cible 42 €) :**
1. **Kit préselectionné** dans la reco diagnostic (K02/K03 en tête).
2. **Add-ons low-cost** proposés au panier (p14 gel 8,90 €, p35 fro pick 4,90 €, p21 edges 5,90 €).
3. Seuil **livraison offerte dès 49 €** (pousse à compléter le panier).
4. Upsell premium K04/K06/K10 sur les profils « prêtes à investir ».

---

## 12. Stratégie d'approvisionnement

- **Décision hybride :** revente de marques reconnues (rapide, crédibilité immédiate) **+ 1 héros marque propre** (beurre de karité p09, marge 45 %, sourcing Afrique de l'Ouest) dès que le volume justifie le private label élargi.
- **Marques cibles :** Aunt Jackie's, Cantu, Shea Moisture, As I Am, Mielle, Kinky-Curly, Camille Rose, Aphogee/Sunny Isle.
- **Distributeurs/grossistes identifiés (à contacter) :** AfricanFabs (`info@africanfabs.com`, +31 617227322) · Afro Wholesale (`support@afrowholesale.eu`, +31 685 198 455).
- **Premier lot : ~4–6 k€ HT**, focalisé sur les **kits** (le kit = prédiction de la demande → risque de stock minimisé). Quantités : 2–3 unités/réf accessoire, 6–10/réf cœur de kit.
- **MOQ/tarifs :** à confirmer auprès des distributeurs (aucun chiffre inventé en attendant).
- **Stockage :** fulfillment maison au départ (maîtrise coût/qualité) ; passage à un logisticien 3PL dès **~150 commandes/mois**.
- **Livraison :** suivie FR ; **offerte dès 49 €** ; points relais + domicile.
- **Retours :** **30 jours satisfait-ou-remboursé** sur les 100 premières commandes (outil de confiance + retour d'expérience).
- **Conformité UE (bloquante) :** chaque SKU exige fiche ingrédient complète, vérification **Règl. (CE) 1223/2009 + annexes**, étiquetage FR, personne responsable UE. **Aucun produit publié avant vérification (conformité = fichier + date).**

---

## 13. Stratégie marketing & 14. Acquisition — canaux classés par priorité

| Rang | Canal | Rôle | Décision concrète | Budget/mois | KPI | Objectif |
|---|---|---|---|---|---|---|
| 1 | **TikTok organique + UGC** | Découverte → diagnostic | **5–7 vidéos/semaine** (démos diag, avant/après, décryptage étiquette, routine par type) | 150 € | Vues → clics → visites diag | 100–300 visites/jour à 90 j |
| 2 | **SEO contenu** (ingrédients + routines) | Intention d'achat → conversion | **3–4 publications/semaine** (pages ingrédient, guides par type, FAQ) | 0 € | URLs indexées, clics organiques | >100k URLs (phase 3), trafic organique majoritaire à 12 mois |
| 3 | **Instagram** | Confiance → fidélité | **4–5 posts/semaine + stories** (reels recyclés, carrousels éducatifs, témoignages) | 50 € | Engagement, DM, clics | Communauté engagée, fort taux de sauvegarde |
| 4 | **Créateurs micro (2k–50k)** | Découverte crédible → achat | **4–8 collabs/mois**, barter puis affilié 10–15 % | 600 € | Ventes par code, CAC affilié | 20–40 commandes/mois via codes à M3 |
| 5 | **Parrainage** | Fidélité → croissance | **10 € pour toi / 10 € pour ta filleule**, toujours actif | 200 € | Taux de parrainage | 15–25 % des nouveaux clients parrainés à M6 |
| 6 | **Publicité payante** (TikTok/IG Ads) | Scaling **après validation** | On ne paie qu'une fois l'organique rentable (**ROAS > 2,5**) ; retargeting panier | 1 000 € | CAC, ROAS, CPA | Accélérer un funnel déjà rentable |

**Offre de lancement qui convertit :** kit **−15 % + livraison offerte dès 49 € + 1 mois KURLA+ offert**.
**Message :** « Arrête d'acheter au hasard : 5 questions, ta routine, des produits qui marchent. »
**Cibles budget :** Inès/Aminata sur TikTok+créateurs ; Camille sur Instagram+SEO.

---

## 15. Plan de contenu

- **TikTok (5–7/sem) :** ① démo du diagnostic en écran filmé, ② avant/après par type de cheveu, ③ « décryptage d'étiquette » (ingrédient star / ingrédient à éviter), ④ routine étape par étape (wash day, refresh, twist-out), ⑤ UGC clientes, ⑥ réponse aux commentaires/DM en vidéo.
- **SEO (3–4/sem) :** pages ingrédient (karité, ricin, gel de lin, romarin…), guides « routine 4C / 3C / cheveux secs », comparatifs, FAQ ciblée long-tail (« leave-in pour crépus », « sans sulfate »…).
- **Instagram (4–5/sem) :** reels recyclés de TikTok, carrousels éducatifs ingrédients, témoignages/avis, stories coulisses et stock.
- **Banque de départ :** **10 vidéos de démonstration** tournées avant lancement (semaine 4) pour alimenter les 1ères semaines sans rupture.

---

## 16. Plan des 90 premiers jours (semaine par semaine)

| Sem. | Focus | Actions concrètes | Budget | KPI / attendu |
|---|---|---|---|---|
| **S1** | Débloquer l'encaissement & nettoyer | Activer Stripe live + webhook · retirer produits Démo · renseigner prix de revient réels | 0 € | Paiement encaissable, catalogue propre · **1 commande test payée réelle** |
| **S2** | Catalogue & kits | Publier 12–20 produits réels · constituer 3 kits par type · relancer sourcing (prix/MOQ) | 1 500 € | ≥12 produits, 3 kits · routine complète couverte |
| **S3** | Tracking & diagnostic | Analytics + événements (diag/reco/panier/achat) · diagnostic ramené à 5 questions · hook en home | 0 € | Entonnoir mesuré de bout en bout |
| **S4** | Pré-lancement | Comptes TikTok/IG recadrés · 10 vidéos en banque · page collecte emails + offre lancement | 200 € | **100–200 emails** inscrits |
| **S5** | Lancement TikTok | 5–7 vid/sem · 3 posts SEO/sem · lancer offre (kit −15 % + diag) | 300 € | Vues, visites · **30–60 commandes** |
| **S6** | Créateurs | Contacter 20 micro-créateurs · 4–8 barter/codes affiliés · suivi des ventes par code | 600 € | **10–20 commandes** via créateurs |
| **S7** | Conversion | A/B page reco/kit · emails panier abandonné · rassurer paiement/livraison | 0 € | Achat ≥ 35 % des paniers |
| **S8** | Preuve sociale | Collecter avis + UGC · publier avant/après · répondre à tous les DM | 100 € | **20+ avis, 10+ UGC** |
| **S9** | Rétention | Emails réachat/fin de produit · parrainage 10/10 € · proposer KURLA+ après la valeur | 200 € | 1ers réachats, **10–15 abonnés Plus** |
| **S10** | Paid test | Tester 3 créas UGC en paid (petit budget) · retargeting · couper le non-rentable | 800 € | **1 créa rentable (ROAS > 2)** |
| **S11** | SEO & routines | Étoffer pages ingrédient/routines · maillage interne boutique↔ingrédient · optimiser les pages qui convertissent | 0 € | Trafic organique en hausse |
| **S12** | Bilan & décision scale | Analyser CAC/LTV par canal · doubler le canal rentable · préparer réassort M4 | 300 € | **CAC < LTV/3**, moteur rentable identifié |

**Budget marketing total 90 jours ≈ 4 000 €.**

---

## 17. Funnel de vente (taux cibles)

| Étape | Taux cible | Causes de fuite | Correction |
|---|---|---|---|
| Visite (diag/contenu) | 100 % | Trafic non qualifié, accueil flou | Hook diagnostic au-dessus de la ligne de flottaison |
| **Inscription / lancement diagnostic** | **18–25 %** des visiteurs | Formulaire long, peur de s'inscrire | Diagnostic SANS inscription d'abord ; email demandé à la remise du résultat |
| Profil complété jusqu'au résultat | 70 % des lancés | Trop de questions, abandon | 5 questions max, progression visible, résultat immédiat |
| Recommandation affichée | 95 % des profils | Manque de produits correspondants | Toujours renvoyer ≥1 kit + ≥1 produit éligible |
| **Ajout panier** | **12–18 %** des reco | Prix, manque de confiance, trop de choix | Kit préselectionné, preuve ingrédient, avis, paiement rassurant |
| **Achat** | **35–45 %** des paniers | Paiement échouant, frais de port surprises | Stripe live, frais de port explicites tôt, rappel panier |
| Réachat à 90 j | 30 % des acheteurs | Oubli, pas de relance, rupture | Alerte fin de produit, réappro −10 %, email routine |

**Conversion visit→achat cible : 1,3 % (scénario central).**

---

## 18. Stratégie de fidélisation

1. **Alertes fin de produit & réappro −10 %** (KURLA+) : email/notif au moment où le produit doit être terminé (cycle 6–8 sem) → réachat automatisé.
2. **Parrainage 10 €/10 €** : déclenché après une expérience positive (livraison + 1er résultat).
3. **Séquence emails** : panier abandonné (3 emails), post-achat (conseils routine), réachat, demande d'avis/UGC.
4. **Suivi de résultats & historique** (KURLA+) : journal, photos, rappels → progression visible qui retient.
5. **KURLA+ vendu APRÈS la première valeur**, jamais sur la confiance ; cible 5 % des clients.
Cibles : réachat 90 j 18 % (M3) → 30 % (M12) ; churn Plus < 8 % ; LTV 70 € (M6) → 110 € (M12).

---

## 19. Modèle financier

### Scénarios mensuels sur 1 000 visiteurs (base M3)
| Scénario | Conversion | Commandes | AOV | CA produits | Marge brute | Coût acquisition | + MRR | **Résultat net** |
|---|---|---|---|---|---|---|---|---|
| PRUDENT | 0,8 % | 8 | 40 € | 320 € | 144 € | 144 € | 30 € | **−670 €** |
| **CENTRAL (référence)** | **1,3 %** | **13** | **42 €** | **546 €** | **246 €** | **182 €** | **60 €** | **−576 €** |
| AMBITIEUX | 2,2 % | 22 | 46 € | 1 012 € | 455 € | 264 € | 90 € | **−419 €** |

> **Lecture honnête : à 1 000 visiteurs/mois, les 3 scénarios sont déficitaires.** Le point d'équilibre est une question de **volume** : il faut ~**3 000–5 000 visiteurs/mois** (cumul TikTok + SEO) pour passer au positif. D'où la priorité absolue au trafic et à l'AOV (kits). Scénario de pilotage = **CENTRAL**.

### Projection pluriannuelle (hypothèses explicites)
| Horizon | Clients cumul. | Commandes/mois | AOV | CA produits | MRR | Revenu total | Marge brute | Marketing | Résultat net |
|---|---|---|---|---|---|---|---|---|---|
| M3 (lancement) | 250 | 90 | 42 € | 3 780 € | 119 € | 3 900 € | 1 800 € | 700 € | **−1 200 €** |
| M6 (validation) | 700 | 210 | 44 € | 9 240 € | 474 € | 9 700 € | 4 560 € | 3 200 € | **−700 €** |
| M12 (croissance) | 2 400 | 620 | 46 € | 28 500 € | 2 630 € | 31 100 € | 15 060 € | 8 500 € | **+1 860 €** |
| M24 (scale) | 9 500 | 2 300 | 48 € | 110 000 € | 17 600 € | 127 600 € | 64 500 € | 26 000 € | **+11 000 €** |

**Seuil de rentabilité :** mensuel au **~M14** · trésorerie cumulative positive au **~M20**.
**Hypothèses clés :** AOV 42 € → 48 € · marge produits ~34 % HT actuelle → 45 % après négoce · réachat 18 %→30 % · KURLA+ 7 € HT/mois, 5 % des clients · Pro à M9 · CAC organique 8–15 € puis mix paid ~22 € à M6 · fondateur non rémunéré jusqu'à M12 · stock + contenu = investissement one-off.

---

## 20. KPI (cible + échéance + seuil d'alerte)

| KPI | Catégorie | Cible M3 | Cible M12 | Seuil d'alerte | Échéance |
|---|---|---|---|---|---|
| Visiteurs uniques/mois | Acquisition | 8 000 | 60 000 | **< 2 000** | M3/M12 |
| CAC (coût d'acquisition) | Acquisition | ≤15 € | ≤22 € | **> 35 €** | M3/M12 |
| Coût par inscription diagnostic | Acquisition | 1,5 € | 2 € | > 5 € | M3 |
| Diagnostics complétés/mois | Activation | 1 400 | 10 000 | **< 300** | M3/M12 |
| Visite → diagnostic lancé | Activation | 20 % | 25 % | < 10 % | M3 |
| Visite → achat (conversion) | Conversion | 1,2 % | 2,2 % | **< 0,5 %** | M3/M12 |
| Commandes payées/mois | Conversion | 90 | 620 | **< 30** | M3/M12 |
| Panier moyen (AOV) | Conversion | 42 € | 46 € | < 30 € | M3/M12 |
| Abandon de panier | Conversion | 60 % | 55 % | > 75 % | M6 |
| CA produits/mois | Finance | 3 780 € | 28 500 € | < 1 500 € | M3/M12 |
| MRR (KURLA+ / Pro) | Finance | 120 € | 2 600 € | — | M3/M12 |
| Marge brute produits | Finance | 45 % | 45 % | **< 35 %** | M3 |
| Réachat à 90 jours | Rétention | 18 % | 30 % | < 10 % | M6/M12 |
| Churn KURLA+ (mensuel) | Rétention | 8 % | 6 % | > 12 % | M6 |
| LTV client (12 mois) | Rétention | 70 € | 110 € | < 45 € | M6/M12 |
| Abonnés KURLA+ | Rétention | 15 | 240 | — | M3/M12 |
| Salons KURLA Pro | Rétention | 0 | 15 | — | M12 |
| Ingrédients du graphe | Produit | 1 000 | 2 000 | < 300 | M3/phase 3 |
| Produits publiés | Produit | 20 | 80 | < 12 | M3 |
| Paiement en production | Finance | **1 (fait)** | 1 | 0 | S1 |

---

## 21. Roadmap exécutable

| Phase | Fenêtre | Objectif | KPI de sortie | Deadline | Condition de réussite |
|---|---|---|---|---|---|
| **1 · LANCEMENT** | S1–S4 | Produit encaissable et recommandable | 1ère commande payée réelle + entonnoir mesuré | Fin S4 | Stripe live, 12–20 produits + 3 kits, tracking posé |
| **2 · VALIDATION** | S5–S12 (M3) | Prouver que le funnel convertit et qu'un canal est rentable | 90 cmd/mois, conv. >1,2 %, CAC <15 € | Fin S12 | Moteur d'acquisition rentable identifié, 1ers réachats |
| **3 · CROISSANCE** | M4–M9 | Doubler le canal rentable, lancer le paid qui scale, épaisser SEO | CA 28 k€/mois, 2 400 clients, MRR 2,6 k€ | M12 | ROAS > 2,5, SEO ≥2 000 ingrédients, pilote Pro |
| **4 · RENTABILITÉ** | M10–M16 | Atteindre puis sécuriser le résultat net positif | Résultat net mensuel ≥ 0, CAC < LTV/3 | M14 | Marge par produit pilotée, 15 salons Pro, churn < 6 % |
| **5 · SCALE** | M17–M30 | Étendre catalogue, marque propre, équipe, automatiser | CA 127 k€/mois, 9 500 clients, 2+ ETP | M24 | 3–5 héros marque propre, marketplace ouverte, 1ers contrats B2B |
| **6 · INTERNATIONAL** | M30+ | Répliquer en Europe puis marchés diaspora | 2–3 pays actifs, B2B > 10 % du revenu | M30+ | 2e pays lancé (BE/UK/DE), contenu localisé |

---

## 22. Structure du Business Control Center (dashboard admin)

Accessible dans `/admin` (rôle admin). Le BCC mélange **plan décidé** (statique) et **réel mesuré** (base), jamais confondus.

- **Vue d'ensemble**
  - *Tableau de bord commercial* : CA, commandes, AOV, top produits, MRR.
  - ***Business Control Center*** (la source de ce document) :
    - **À faire maintenant** — actions prioritaires déduites de l'état réel (Stripe, coûts manquants, démo restants…).
    - **Ventes réelles** — agrégation des lignes de commande : **top produits, top kits, unités, CA, AOV réel, part des kits vs objectifs**, marge réelle si coût saisi. *(Nouveau.)*
    - **Plan de lancement** — synthèse chiffrée (54 SKU, 10 kits, 5 routines, outils J1), **tableau des 54 SKU filtrable/recherchable**, 10 kits (prix/marge/économie), 5 routines, outils, scénarios financiers, sourcing, 20 actions.
    - Positionnement · Cibles (personas) · Acquisition (canaux) · Funnel · Plan 90 jours · Roadmap (jalons auto cochés sur données réelles) · KPI (réel vs objectif, seuils d'alerte) · Finance (projection + seuil de rentabilité).
- **Ventes & clients :** Commandes · Retours/remboursements · Support client · Certifications Pro.
- **Catalogue & stock :** Pilotage catalogue · Catalogue produits · Lots & traçabilité.
- **Approvisionnement :** Demande précommandes · Fournisseurs & sourcing.
- **Gestion & contenu :** Opérations quotidiennes.

> **À instrumenter (prochaine étape technique) :** l'**attribution canal (UTM)** au checkout n'est pas encore capturée → le BCC saura dire quel *produit* se vend mais pas encore par quel *canal*. À poser avant le 1er euro de paid (correspond à l'action S3/a07).

---

## 23. Les 20 premières actions à exécuter

| # | Sem. | Action | Resp. | Dépendance | KPI de sortie |
|---|---|---|---|---|---|
| a01 | 1 | **Activer Stripe live + webhook** | tech | clés Stripe (externe) | 1 commande payée réelle |
| a02 | 1 | Dépublier les produits Démo | tech | validation admin | 0 produit Démo public |
| a03 | 1 | Shortlist 6 marques + **envoyer 20 demandes de gros** (tarifs/MOQ) | ops | interne | 20 demandes envoyées |
| a04 | 2 | Saisir les SKU en brouillons catalogue (fiche ingrédient + conformité UE) | ops/tech | grille tarifaire reçue | 18 SKU brouillon vérifiés |
| a05 | 2 | Construire les kits + routines comme offres achetables | tech | a04 | 6+ kits achetables |
| a06 | 2 | **Commander le 1er lot (~4–6 k€)** après 3 devis comparés | ops | devis reçus | stock réceptionné |
| a07 | 3 | **Installer analytics + événements funnel (+ attribution UTM)** | tech | interne | entonnoir + canaux mesurés |
| a08 | 3 | Raccourcir le diagnostic à 5 questions + hook en home | tech | interne | diagRate > 18 % |
| a09 | 3 | Mettre les kits K02/K03 en tête des recommandations | tech | a05 | part des kits dans les ventes |
| a10 | 4 | Produire 10 vidéos de démonstration (banque de contenu) | marketing | interne | 10 vidéos prêtes |
| a11 | 4 | Ouvrir la liste de lancement (landing + email) avec offre −15 % | marketing/tech | interne | 100–200 emails |
| a12 | 4 | Recruter 10 beta-testeuses (réseau) pour les 10 premières commandes | marketing | a06 | 10 commandes + avis |
| a13 | 5 | Lancer TikTok 5–7 vid/sem (démos diag + routines) | marketing | a10 | vues → visites |
| a14 | 5 | Lancer l'offre de lancement (kit −15 % + livraison offerte 49 €) | marketing | a05 | 30–60 commandes |
| a15 | 6 | Contacter 20 micro-créateurs, signer 4–8 barters/affiliés | marketing | a10 | ventes par code |
| a16 | 7 | Emails panier abandonné + relances (séquence 3 emails) | marketing/tech | a07 | reprise panier > 10 % |
| a17 | 8 | Collecter avis + UGC, publier avant/après, répondre aux DM | marketing | commandes | 20 avis, 10 UGC |
| a18 | 9 | Activer parrainage 10/10 € + proposer KURLA+ post-achat | tech/marketing | a07 | 1ers filleuls, 10–15 Plus |
| a19 | 10 | Tester 3 créas UGC en paid, couper les non-rentables | marketing | a15 | ROAS > 2 sur 1 créa |
| a20 | 12 | Bilan CAC/LTV par canal, doubler le canal rentable, réassort | fondateur | data | CAC < LTV/3 |

**Actions non-code bloquantes qui dépendent de la fondatrice (le code ne peut pas les faire) :**
① **Stripe live** (passer de TEST en production) · ② **Immatriculation SIRET** (obligatoire pour vendre/encaisser) · ③ **Envoyer les 20 demandes de gros** et obtenir les grilles tarifaires/MOQ · ④ **Commander le 1er lot 4–6 k€**. Tant que ①–④ ne sont pas faits, les coûts/marges restent des cibles et les produits restent en précommande.

---

*Document généré depuis les données du projet (`launchCatalog.ts`, `businessStrategy.ts`). Pour les chiffres en temps réel (ventes, jalons, KPI), voir le Business Control Center dans `/admin`. Les visuels et la boutique réels sont sur l'application déployée (Vercel).*
