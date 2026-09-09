# Scoring pays — ne pas traiter Europe/Afrique en bloc

**Méthode :** chaque pays scoré 0–100 sur 5 critères chiffrés. On ouvre **sur preuves** (score >65 + fournisseur identifié + log <5j), pas sur ambition.

## 7 pays pilotes (3 UE + 4 Afrique)

| Pays | Code | Pop. cible | Log UE/Afrique | Paiement | Réglementation cosmétique | Langue | Score /100 | Modèle d'entrée | Condition d'ouverture |
|------|------|------------|----------------|----------|---------------------------|--------|------------|-----------------|----------------------|
| **France** | FR | 3,2M femmes textured/métissées | 24–48h partenaire UE (0 stock Paris) | Stripe FR OK, TVA 20% | UE CosIng, 0 friction | FR | **82** | D2C précommande + partenaire log UE (dropship outils 24–48h, soins 3–5j) | ✅ Ouvert (pilote, déjà Stripe TEST) |
| **Belgique** | BE | 380k | 48–72h via FR, 4,90€ | Stripe BE, TVA 21% | UE, identique FR | FR/NL | **76** | D2C FR → BE (même stock partenaire) | Ouvrir si FR taux réponse fournisseur >30% à J+7 |
| **Suisse** | CH | 180k | 72–96h, douane +7,7% TVA | Stripe CH, dédouane | CH proche UE mais douane | FR/DE | **58** | D2C avec douane incluse (prix +12%) | Attendre BE >50 commandes/mois |
| **Sénégal** | SN | 2,1M (Dakar) | 5–7j via hub Dakar, 8€ | Wave/Orange Money + Stripe INT | Import cosmétique, étiquetage FR | FR/WO | **71** | Précommande hub Dakar (stock tampon 50 kits) + Wave | Ouvrir si 1 fournisseur Afrique MOQ <100 trouvé |
| **Côte d'Ivoire** | CI | 1,8M (Abidjan) | 5–7j via Abidjan, 8€ | Wave/MTN + Stripe | Import, français | FR | **68** | Idem SN, hub Abidjan | Ouvrir si SN >30 kits/mois |
| **Cameroun** | CM | 1,4M (Douala/Yaoundé) | 7–10j, douane volatile | MTN/Orange | Import, plus friction | FR | **52** | Test via hub CI, pas de stock local | Attendre CI >50 kits/mois |
| **Maroc** | MA | 900k | 4–5j via ES/FR, 6€ | CMI + Stripe | Import, proche UE | FR/AR | **64** | D2C ES→MA (stock UE) | Ouvrir si FR log 3–5j tenu à 95% à J+30 |

## Règles

- **Ne pas ouvrir un pays si score <65** OU si 0 fournisseur avec MOQ <100 + whitecast test V-VI
- **Modèle d'entrée par pays, pas par continent**
- **KPI ouverture :** taux réponse fournisseur >30% à J+7, échantillon whitecast V-VI validé, 1ère commande 50 kits livrée <5j (UE) / <7j (Afrique)

## Notre segment initial (décision chiffrée)

**Nous allons commencer par FR (pilote) → BE (J+30 si FR OK) → SN (J+60 si fournisseur Afrique trouvé).** CH/CI/CM/MA en veille, scorés mais non ouverts.

**Budget test :** 3 échantillons × 3 kits × 40€ H.T. = 360€ + ports 60€ = **420€** pour valider whitecast V-VI avant 1ère prod 50×3 kits (150 kits, ~4 500€ H.T.).

## Preuves à réunir avant d'ouvrir SN

- 1 fournisseur Dakar/Abidjan avec ISO 22716, MOQ 50, délai 5–7j, prix <30€ Équilibrée
- 1 hub log Dakar (ex: coursier + stockage 1m²) coût <150€/mois
- 20 réponses questionnaire HPI/SPF sur Insta KURLA SN (ciblage)

> Si une condition manque, on ne déplace pas la date d'ouverture — on garde FR/BE seul.
