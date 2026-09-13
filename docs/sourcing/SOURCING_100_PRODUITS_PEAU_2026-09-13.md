# 100 produits peau — couvrir les 15 besoins du diagnostic

**Date** : 13/09/2026
**Registre** : `REGISTRE_100_PRODUITS_PEAU_2026-09-13.csv` — 100 lignes × 16 colonnes
**Générateur** : `scripts/genere-100-produits-peau.py` (rejouable, auto-validé)

---

## 1. Le constat qui justifie ce dossier

Mesuré en base le 13/09/2026 (SQL direct, projet `qzwgsarfdegqtfdnqiql`) :

- **15 besoins peau** déclarés dans `src/lib/skinTaxonomy.ts` (`SKIN_NEEDS`)
- **0 produit publié** ne porte **aucun** de ces 15 besoins
- Les 63 fiches publiées portent **7 besoins, tous cheveux**

> **Une cliente qui fait un diagnostic peau ne trouve aucun produit.**

C'est le trou principal du catalogue, mesuré avec la vraie logique de
filtrage de la boutique (`BoutiquePage` filtre sur `concerns`, qui vient de
`products.concerns` + `productNeedsCorrection`).

## 2. Le motif repris de l'existant, pas inventé

Les 20 fiches peau déjà en base utilisent un triplet précis :

| Champ | Rôle | Exemple réel en base |
|---|---|---|
| `subcategory` | la **famille** | Nettoyage, Hydratation, Masques, Traitement, Exfoliation, Protection Solaire |
| `routine_step` | l'**étape** | Nettoyant doux, Sérum vitamine C, Masque apaisant |
| `concerns` | les **besoins** | mêmes identifiants que `SKIN_NEEDS` |

Les 100 produits respectent exactement ce triplet. **Aucune nouvelle
sous-catégorie n'a été inventée** — `CATALOG_CATEGORIES` en compte déjà 16
pour la peau.

## 3. Les 100 produits

| Famille | Produits |
|---|---|
| Traitement (sérums et soins ciblés) | 22 |
| Hydratation | 16 |
| Accessoires & matériel | 16 |
| Nettoyage | 12 |
| Masques | 10 |
| Corps | 8 |
| Exfoliation | 7 |
| Soin yeux | 5 |
| Lèvres | 4 |
| **Total** | **100** |

**Canaux année 1** : 82 en **affiliation** (cosmétiques) · 18 en **dropship**
(matériel, aucun CPNP requis).

**Départements** : peau 79 · accessoires 16 · hommes 4 · enfants 1.

## 4. Couverture des 15 besoins

| Besoin | Produits | | Besoin | Produits |
|---|---|---|---|---|
| Hydrater | 61 | | Rides / fermeté | 8 |
| Peau du corps | 24 | | Contour des yeux | 8 |
| Peau sensible | 22 | | Cicatrices post-acné | 8 |
| Peau sèche | 21 | | Lèvres sèches | 7 |
| Barrière cutanée | 20 | | **SPF sans trace blanche** | **0** |
| Par ingrédient | 19 | | | |
| Éclat & teint terne | 18 | | | |
| Peau grasse | 16 | | | |
| Imperfections | 15 | | | |
| Taches / HPI | 13 | | | |

**14 besoins sur 15 couverts.** Un produit peut répondre à plusieurs besoins :
le total dépasse 100.

## 5. ⚠️ Le besoin `spf` est volontairement vide — décision à prendre

**Aucun produit SPF n'est proposé.** Ce n'est pas un oubli : la protection
solaire n'est pas ouverte en année 1 (ISO 24444 et 24443 à produire,
allégations SPF strictement encadrées).

**Conséquence mesurable** : un diagnostic qui sort « SPF sans trace blanche »
n'aboutira à **aucun produit**. C'est une impasse visible pour la cliente.

**Deux issues, à trancher :**
1. **Ouvrir le SPF** — coûteux en conformité, mais c'est un besoin réel et
   fréquent sur peau mélaninée (la trace blanche est le premier frein).
2. **Retirer `spf` du diagnostic** tant qu'aucun produit n'existe.

Laisser les deux en l'état serait le pire choix : le site promettrait un
besoin qu'il ne peut pas servir.

## 6. Ce qui n'a PAS été fait, volontairement

- **Aucune marque nommée** pour ces 100 créneaux. Les colonnes
  `marque_verifiee` et `fournisseur_verifie` sont **vides par conception** :
  je n'ai vérifié aucune marque pour ces créneaux précis, et les remplir
  serait inventer.
- **Aucun prix d'achat.** La colonne `fourchette_positionnement` est une
  **fourchette de positionnement public**, pas un prix obtenu. Aucun MOQ
  affirmé.
- **Aucun produit SPF**, voir §5.
- **Aucune coloration, aucun défrisage** — exclus par arbitrage antérieur.
- **Aucun ingrédient interdit** : les mentions « hydroquinone » et « mercure »
  du registre figurent dans des **notes d'interdiction**, pas dans des
  compositions. Vérifié ligne par ligne.

## 7. Prochaine étape

Ce registre est la **liste de courses**, pas le catalogue. Pour chaque ligne
il faut :

1. trouver une **marque ou un fournisseur vérifié** qui la porte réellement ;
2. obtenir **INCI + notification CPNP + personne responsable UE** pour les 82
   cosmétiques ;
3. renseigner `marque_verifiee` et `fournisseur_verifie` ;
4. créer la fiche avec `fulfillment_channel` = `affiliation` ou `dropship`, et
   `supplier_authorization_status` à jour.

Les 18 accessoires en dropship sont les plus rapides : **pas de CPNP**, et
souvent pas de marque. C'est par là que la couverture peut commencer à se
voir en boutique.

⚠️ **Aucun fournisseur n'a été contacté.** Pas de boîte mail, pas de mandat :
le critère 16C reste non remplissable ici.
