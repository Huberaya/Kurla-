# Cahier des charges peau KURLA — V-VI safe (à envoyer aux fournisseurs)

**Contexte :** pôle peau 15 besoins + 15 fiches peau documentées V-VI safe (phototypes IV–VI, HPI). Gamme en **précommande 3–5j** (lundi/jeudi 18h), pas de stock Paris. Stripe TEST.

## 15 actifs documentés (source unique `src/lib/skinIngredients15.ts`)

| # | Actif (INCI normalisé) | Famille | Preuve | V-VI safe | UE max | Rôle HPI/barrière/SPF | Kits |
|---|------------------------|---------|--------|-----------|--------|------------------------|------|
| 1 | **Niacinamide** `Niacinamide` | unifiant | B | oui | — | HPI : limite transfert mélanosome, 5% sweet spot | KPEAU-02 |
| 2 | **Acide azélaïque 10%** `Azelaic Acid` | unifiant | B | oui | — | HPI alternative niacinamide, soir 3×/sem | KPEAU-03 |
| 3 | **Vitamine C SAP 10%** `Sodium Ascorbyl Phosphate` | antioxydant | B | oui | — | Éclat matin, pas même matin que niacinamide fort au début | KPEAU-03 |
| 4 | **Rétinol 0,3%** `Retinol` | anti-âge | A | oui (soir + SPF) | 0,3% | Jamais même soir que AHA/BHA, 2×/sem puis progressif | hebdo |
| 5 | **Acide glycolique 5%** `Glycolic Acid` | AHA | A | oui | — | Exfoliant 1×/sem, pas même soir que rétinol | hebdo |
| 6 | **Acide lactique** `Lactic Acid` | AHA | B | oui | — | Doux, alternative glycolique si sensible | hebdo |
| 7 | **Acide salicylique 2%** `Salicylic Acid` | BHA | A | oui | 2% | Pores, jamais même soir que rétinol | hebdo |
| 8 | **Céramides NP** `Ceramide NP` + **Squalane** `Squalane` | barrière | B | oui | — | Mortier céramides + cholestérol, HPI revient si barrière KO | KPEAU-01/02 |
| 9 | **Acide hyaluronique** `Sodium Hyaluronate` | humectant | B | oui | — | Gel HA sur peau humide | KPEAU-02 |
| 10 | **Glycérine** `Glycerin` | humectant | A | oui | — | Base nettoyant sans sulfates | KPEAU-01 |
| 11 | **Panthénol** `Panthenol` | apaisant | B | oui | — | Apaisant, sans parfum si sensible | — |
| 12 | **Allantoïne** `Allantoin` | apaisant | B | oui | — | Sensible, sans parfum | — |
| 13 | **Centella asiatica** `Centella Asiatica Extract` | apaisant | B | oui | — | Cica, barrière | — |
| 14 | **Tocophérol** `Tocopherol` | antioxydant | B | oui | — | Vit E, conservateur doux | — |
| 15 | **Filtres SPF hybrides/organiques invisibles** | SPF | A | oui | SPF 50 | **Sans trace blanche** (white cast faible), 2 doigts, hybride/organique > minéral pur | KPEAU-01 |

**Gardes fournies dans chaque fiche :** uniformiser≠éclaircir, rétinol×AHA même soir bloqué, SPF naturel 13 ≠ protection, HPI = marques post-bouton (pas carnation).

## Spécifications par kit (vente, pas achat)

| Kit | Contenu | Exigences V-VI safe | Sans parfum | Texture | Livraison |
|-----|---------|---------------------|-------------|---------|-----------|
| **Essentielle 49,70€** | Nettoyant glycérine sans sulfates 150ml + Crème céramides/squalane 50ml + SPF 50 invisible fluide 40ml hybride | SPF invisible testé phototype V-VI (risque whitecast faible) | **Oui** exigé (sensible) | Gel léger (mixte) / crème riche option | 4,90€ |
| **Équilibrée 62€** | Essentielle + Sérum niacinamide 5% 30ml + Gel HA 30ml | Niacinamide 5% (pas 10%), HA sur peau humide | **Oui** | Aqueux | gratuite |
| **Experte 84,90€** | Équilibrée + Exfoliant AHA 5% 100ml + Baume lèvres céramides 15ml | AHA 5% doux, max 2% BHA, rétinol non inclus dans kits (hebdo optionnel) | Oui | — | gratuite |

## Contraintes logistiques

- **Précommande 3–5j** : petite production lun/jeu 18h, 0 stock Paris, expédition UE depuis partenaire
- **MOQ cible :** 50–100 unités / référence pour 1er run (pas 500)
- **Échantillon :** 1 kit complet par kit avant commande, test whitecast sur phototype V-VI en lumière du jour
- **Conformité :** fichier + date (CosIng), INCI normalisé, allergènes déclarés, `containsFragrance` booléen, `routineStep` (matin 6/soir 8/hebdo 3)
- **Prix cible achat :** Essentielle <22€, Équilibrée <30€, Experte <40€ H.T. pour tenir marge −5/−13/−15% + port

## Pièces jointes à envoyer

1. Extrait `skinIngredients15.ts` (15 fiches)
2. Photos kits peauKits.ts + routine matin 6/soir 8/hebdo 3
3. Grille boutique 15 besoins + filtres phototype V-VI

**Contact retour attendu sous 7j :** MOQ, prix H.T. par kit, délai échantillon, délai prod 50/100, certificats (ISO 22716, CosIng), whitecast test V-VI.
