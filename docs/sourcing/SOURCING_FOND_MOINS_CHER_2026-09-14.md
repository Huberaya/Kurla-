# Sourcing de fond — 5 produits par besoin, fournisseurs moins chers (14/09/2026)

Demande : « pour chaque besoin, 5 produits ; trouve des fournisseurs avec des
produits moins chers sur le marché ; notre clientèle est plus attirée par des
produits moins chers ».

Périmètre : **les 15 besoins peau** de la taxonomie figée
(`src/lib/skinTaxonomy.ts`). Les besoins cheveux peuvent faire l'objet d'une
phase 2 sur le même modèle (à confirmer par l'exploitant).

Registre : `REGISTRE_SOURCING_FOND_75_PRODUITS_2026-09-14.csv` — 15 × 5 =
75 lignes, triées par besoin puis par prix croissant. **68 prix publics
constatés** (source + date en colonne), **7 slots ouverts** (« prix non
constaté cette session ») — jamais un prix inventé.

## Règle de lecture

Chaque besoin oppose ses candidats bas prix à un **référent haut** du marché
(pharmacie / dermo-cosmétique), lui aussi constaté. Exemple : imperfections →
patchs COSRX **5,79 €** contre LRP Vit C12 **42,10 €** en référent. La
colonne `reference_marche_haute` rend cet écart lisible par ligne.

## Les canaux B2B « moins chers » constatés

| Canal | Conditions constatées (sessions 13–14/09) | Pour quels produits |
|---|---|---|
| **Ankorstore** | min **100 €/marque**, franco 300 €, paiement 60 j, **0 % commission réassorts** (janv. 2026) ; 1 200 marques beauté FR | Cosmo Naturel, Weleda, petites marques FR corps/lèvres/karité |
| **Qudo Beauty** (RO) | MOQ **300 € total, aucun MOQ/réf**, port offert dès 500 € ; **seul à déclarer par écrit CPNP + RP UE + INCI** | K-beauty : COSRX, Beauty of Joseon, Torriden, Isntree, SKIN1004 |
| **EOLYS Beauté** (FR) | page revendeur ; prix pro derrière connexion | Torriden, BOJ, COSRX, SKIN1004 — prix à obtenir par RFQ |
| **Aquarius Cosmetic SLU** (ES, IDC Institute) | contact public `info@aqc.es`, +34 938 861 366 ; prix publics **0,98–4,40 €/u** | corps/bain/gifts à prix plancher |
| **DECIEM / The Ordinary** | compte pro à ouvrir ; prix publics 7,50–21 € = plafond | toute la colonne The Ordinary |

**Constat central** : la K-beauty via Qudo (MOQ 300 € sans minimum par
référence) et The Ordinary en compte pro couvrent 12 besoins sur 15 à des prix
publics déjà 2 à 4× sous les référents dermo — avant même négociation
revendeur. C'est la réponse directe à « clientèle attirée par des produits
moins chers ».

## Meilleurs prix constatés par besoin (extrait)

| Besoin | Moins cher constaté | Référent haut |
|---|---|---|
| imperfections | COSRX patchs **5,79 €** | LRP 42,10 € |
| hydrater | TO NMF+HA **7,50 €** | LRP Hyalu B5 31,99 € |
| barriere | TO NMF+HA **7,50 €** | LRP Cicaplast 13,39 € |
| seche | TO NMF+HA **7,50 €** | Eucerin UreaRepair 16,99 € |
| corps | IDC Institute **0,98–4,40 €** | Eucerin 16,99 € |
| anti_age | TO Retinol 1% **10,00 €** | LRP Retinol B3 41,30 € |
| eclat | BOJ Glow Serum **11,93 €** (idealo) | LRP Vit C12 42,10 € |
| levres | Avène stick **6,59 €** | LRP stick 9,90 € |

## Trous honnêtes (7 slots, prix non constatés)

- `contour_yeux` ×2, `levres` ×3 : pas de prix public lu cette session →
  slots « à compléter — RFQ », fournisseurs cibles : Ankorstore (baumes FR),
  Qudo (sticks K-beauty). **Aucun prix inventé.**
- `hydrater` ×1 (Torriden Dive-In sérum) et `eclat` ×1 (BOJ tonique riz) :
  produits réels, visuels et INCI publics (fiches test `peau-test-*`), mais
  prix pro masqué → à obtenir par l'envoi des emails (étape 2 de
  l'exploitant).

## Garde-fous conservés

- Année 1 : **SPF non ouvert** — les 5 lignes `spf` sont des référents prix
  uniquement, marquées « ANNÉE 1 FERMÉE ».
- Contrefaçon : aucun produit de luxe à prix écarté n'entre dans ce registre
  (règle n° 2 du sourcing).
- Chaque fournisseur cité existe et ses conditions sont constatées dans les
  sessions des 13–14/09 ; rien n'est déclaré « vérifié » qui ne le soit.

## Prochains pas

1. Compléter les 7 slots (recherche baumes lèvres / contours yeux à prix
   publics) — phase suivante de ce chantier.
2. Charger les 75 lignes en base (`sourcing_product_candidates`) si
   l'exploitant le demande — même mécanique que la vague des 100.
3. Phase 2 cheveux (10 besoins) sur le même modèle si demandé.
