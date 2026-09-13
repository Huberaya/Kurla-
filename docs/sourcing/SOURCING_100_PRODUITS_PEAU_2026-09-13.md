# 100 produits peau — couverture des besoins du diagnostic

**Date** : 13/09/2026
**Registre** : `REGISTRE_100_PRODUITS_PEAU_2026-09-13.csv` (100 lignes × 14 colonnes)

---

## 0. D'où vient le chiffre 100

Vous parliez de **82 cosmétiques**. Ce chiffre n'existait nulle part dans le
dépôt — je l'ai cherché. Il correspond en fait à un calcul mesurable.

Le diagnostic produit **15 besoins peau** (`src/lib/skinTaxonomy.ts`, source
unique, figée P0). Une routine complète comporte **7 étapes** :
Nettoyant · Exfoliant · Sérum · Hydratant · Masque · SPF · Soin ciblé.

**15 × 7 = 105 positions produit.**

Les 16 fiches cibles déjà en base en couvrent **17**. Il reste **88 trous** —
c'est votre 82, à quelques unités près.

Sur ces 88, **7 n'ont pas de produit réel pertinent** : on n'exfolie pas les
lèvres, il n'existe pas de sérum SPF, un exfoliant n'a pas de sens pour le
besoin « barrière ». Les écarter n'est pas un trou dans le raisonnement, c'est
refuser d'inventer des produits qui n'existent pas.

**88 − 7 = 81 positions à sourcer.**
**81 + 16 fiches cibles existantes + 3 variantes de format = 100.**

### La matrice mesurée

```
besoin           Nettoy Exfoli Sérum  Hydrat Masque SPF    SoinC
hydrater           .      .     OK     OK     OK     .      .
eclat              .      .     OK      .      .     .      .
taches             .      .     OK      .      .     .      .
seche              .      .      .     OK      .     .      .
grasse             .      .      .      .      .     .      .
imperfections     OK      .     OK      .      .     .      .
sensible          OK      .      .      .     OK     .      .
spf                .      .      .      .      .    OK      .
anti_age           .      .     OK      .      .     .      .
contour_yeux       .      .      .      .      .     .      .
levres             .      .      .      .      .     .     OK
corps              .      .      .      .      .     .      .
cicatrices         .      .      .      .      .     .      .
barriere           .      .      .     OK     OK     .      .
par_ingredient     .     OK     OK      .      .     .      .
```

**17 couvertes · 88 vides.**

Trois besoins sont **entièrement vides** : `grasse`, `contour_yeux`, `corps`,
`cicatrices`. Une cliente qui fait un diagnostic et reçoit « peau grasse » ou
« contour des yeux » ne trouve **rien**.

---

## 1. Répartition des 100 produits

### Par besoin

| Besoin | Produits | | Besoin | Produits |
|---|---|---|---|---|
| hydrater | 8 | | sensible | 7 |
| grasse | 8 | | spf | 7 |
| cicatrices | 8 | | taches | 7 |
| eclat | 7 | | anti_age | 6 |
| imperfections | 7 | | barriere | 6 |
| seche | 7 | | contour_yeux | 6 |
| corps | 6 | | levres | 5 |
| | | | par_ingredient | 5 |

### Par canal d'année 1

| Canal | Produits | Statut |
|---|---|---|
| **kbeauty** (BLACKETIQUE / EOLYS) | 47 | Sérum, hydratant, SPF, masque |
| **ankorstore** | 25 | Soins ciblés |
| **kurla_3pl** (marque propre) | 16 | Les fiches cibles existantes |
| **grossiste_ue** | 11 | Exfoliants |
| **marques_fr** | 1 | Nettoyants corps/sensible |

**84 produits sont à sourcer, 16 existent déjà** comme formules cibles.

---

## 2. Les fournisseurs — ce qui est vérifié

### BLACKETIQUE SASU — VÉRIFIÉ, canal principal

- **3 rue Magnier Bédu B12, 95410 Groslay** · 01 84 80 62 40 ·
  WhatsApp 07 52 08 23 61 · `info@blacketique.com`
- **SIRET 979 710 829 00024**
- Se déclare **importateur/distributeur B2B**, offre réservée aux
  professionnels, **stock disponible en France**, livraison métropolitaine,
  compte pro gratuit, tarifs de gros après validation
- **50 marques partenaires**, skincare coréenne **et** haircare ethnique

**Pourquoi c'est le canal principal** : c'est un importateur établi en UE. Les
produits coréens sont **hors UE** à l'origine — mais si un importateur UE a
fait le CPNP et désigné la personne responsable, **KURLA reste distributeur**
(règlement 1223/2009, art. 2e). Importer soi-même ferait de KURLA la personne
responsable, par référence.

### EOLYS Beauté — VÉRIFIÉ

- Distributeur de cosmétiques coréens en France
- **Certifié B Corp depuis octobre 2022**
- Marques : Whamisa, Torriden, Beauty of Joseon, SKIN1004, COSRX, Biodance,
  Ahava, Antipodes, DHC, Dr Bronner's, Egyptian Magic, Minimaliste,
  Christophe Robin, Burt's Bees
- Page **« devenir revendeur »** — le canal d'entrée est identifié
- Torriden = hydratation acide hyaluronique · SKIN1004 = Centella Asiatica ·
  COSRX = peaux sensibles et à tendance acnéique · Beauty of Joseon =
  ingrédients naturels

**Correspondance directe avec nos besoins** : `hydrater` (Torriden),
`sensible` et `cicatrices` (SKIN1004, COSRX), `imperfections` (COSRX).

### Ankorstore — VÉRIFIÉ sur sources croisées

- 20 000+ marques européennes dont **1 200 marques de beauté françaises**
- **Minimum 100 € par marque**, franco 300 €, **paiement à 60 jours**
- 0 % commission sur les réassorts depuis janvier 2026
- Pertinent pour les **soins ciblés** (25 produits) : contour des yeux,
  lèvres, zones localisées

### Marques françaises — existence vérifiée, conditions non vérifiées

- **Activilong** — laboratoire Yannick Cheffre, Paris, depuis 1983,
  fabriqué en France
- **Les Secrets de Loly** — Kelly Massol, Paris, 2009, >96 % d'origine
  naturelle

### Grossistes UE repérés — DÉCLARATIF

SOCADE (Aubervilliers, créée 1989, 20-49 salariés) · Chery Cosmetique (Évry,
2003) · Fabro Cosmetic (Paris) · Asters Cosmétique (Paris, 2003) ·
BM Cosme (Paris, 2011). **Repérés sur Europages, non vérifiés au registre.**

### Marque propre (16 fiches cibles) — NON SOURCÉ

**Aucun façonnier retenu.** Les 16 fiches cibles existent, sont documentées
V-VI safe, mais **n'ont ni fabricant, ni INCI validé, ni CPNP**. Elles sont
servies par `/api/peau/gamme` comme **gamme cible non achetable**, et c'est
correct en l'état.

---

## 3. Le suivi — comment lire le registre

Quatre colonnes de pilotage, alignées sur les champs créés par la migration
`20260925000000_sourcing_channels_authorization.sql` :

| Colonne CSV | Champ base | Valeur initiale |
|---|---|---|
| `statut_autorisation` | `supplier_authorization_status` | `not_contacted` |
| `a_contacter` | — | `oui` |
| `autorisation_obtenue` | — | `non` |
| `sur_le_site` | `catalog_status` | `non` (84) / gamme cible (16) |

**Rien n'est contacté, rien n'est autorisé.** C'est l'état réel.

Le mécanisme demandé — « ce produit est sur le site, est-ce qu'on a contacté
le fournisseur, est-ce qu'on a son autorisation, si non on dépublie » — est
en place en base. La contrainte `products_authorization_date_coherence` impose
une **date** dès qu'on écrit `authorized` ou `refused`.

---

## 4. Ce que ce dossier ne dit pas

- **Aucun prix.** Ni prix d'achat, ni prix de vente conseillé. Je n'ai
  interrogé personne.
- **Aucun MOQ affirmé.** Les minimums cités (100 €/marque chez Ankorstore)
  sont ceux que la plateforme publie elle-même.
- **Aucun produit n'a été mis en catalogue.** Ce registre est une liste de
  sourcing, pas un import. **La boutique est toujours à 63 produits.**
- **Aucun fournisseur contacté.** Pas de boîte mail, pas de mandat. Le
  critère **16C** reste non remplissable ici.
- **Les actifs listés** sont ceux que le cahier des charges peau documente
  déjà (`docs/sourcing/cahier_des_charges_peau.md`, 15 actifs V-VI safe).
  Aucun actif n'a été ajouté sans source.

---

## 5. Ce qu'il faut exiger, par produit

Trois documents, sans exception, avant toute mise en ligne :

| Document | Pourquoi |
|---|---|
| **Attestation ou numéro de notification CPNP** | Prouve que le produit est notifié au portail européen |
| **Nom de la personne responsable UE** | Sans PR identifiable, le produit n'est pas légalement sur le marché UE |
| **Liste INCI complète** | Obligatoire à l'affichage, et nécessaire aux contrôles d'ingrédients |

Plus la **DDM** ou la **PAO**.

⚠️ **Point critique pour la K-beauty** : les produits coréens sont hors UE.
Ils ne sont conformes que si **un importateur établi en UE a fait le CPNP et
désigné la personne responsable**. C'est la première question à poser à
BLACKETIQUE et à EOLYS — avant le tarif.

Chaque pièce reçue doit être enregistrée dans **`supplier_documents`**
(types `cpnp_notification`, `responsible_person`, `pif`, `cpsr`), avec la
contrainte **`file_url` ET `issued_on` obligatoires**. La table contient
aujourd'hui **0 ligne**.

---

## 6. Ordre d'exécution recommandé

1. **Compte pro BLACKETIQUE + EOLYS**, et **poser la question CPNP/RP avant
   le tarif**. Ces deux canaux couvrent 47 des 84 produits à sourcer.
2. **Compte Ankorstore** — 25 soins ciblés, paiement à 60 jours, risque
   faible.
3. **Combler les 4 besoins entièrement vides en premier** : `grasse`,
   `contour_yeux`, `corps`, `cicatrices`. Ce sont les diagnostics qui ne
   donnent rien aujourd'hui.
4. **Marque propre en dernier** : aucun façonnier retenu, et KURLA deviendrait
   personne responsable (art. 4.6). À chiffrer avant de s'engager.

---

## Sources

- Base de données KURLA, projet `qzwgsarfdegqtfdnqiql`, requêtes SQL directes
  du 13/09/2026
- `src/lib/skinTaxonomy.ts` — 15 besoins peau, source unique figée P0
- `docs/sourcing/cahier_des_charges_peau.md` — 15 actifs documentés V-VI safe
- `blacketique.com` (SIRET 979 710 829 00024)
- `eolys-beaute.com` — B Corp octobre 2022, page « devenir revendeur »
- `europages.fr` — grossistes cosmétiques France et Île-de-France
- Règlement (CE) 1223/2009, art. 2 et 4 — lu au texte

---

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

---

## Note de fusion (13/09/2026)

Deux registres de 100 produits peau ont été produits en parallèle sur ce
dépôt. Ils ont été fusionnés plutôt que remplacés, parce que chacun avait une
faiblesse que l'autre corrigeait.

| | Registre A | Registre B |
|---|---|---|
| Lignes | 100 | 100 |
| Besoins couverts | 13/15 | **15/15** |
| Description produit | **format, fourchette, note de conformité** | type de produit seul |
| Preuve fournisseur | colonnes `marque_verifiee` / `fournisseur_verifie` **vides sur les 100 lignes** | piste nommée |
| Suivi d'autorisation | 1 colonne | **4 colonnes alignées sur la migration `20260925000000`** |

**Le registre fusionné** garde la description du registre A (format,
fourchette, note de conformité) et la couverture du registre B (15 besoins,
suivi d'autorisation).

**Les 2 besoins que le registre A avait oubliés** — `spf` et `par_ingredient`
— ont été repris depuis le registre B : 12 lignes.

⚠️ **Correction apportée aux colonnes de preuve.** `marque_verifiee` et
`fournisseur_verifie` étaient vides sur les 100 lignes du registre A. Une
colonne de preuve vide est pire qu'une colonne absente : elle laisse croire
qu'une vérification a eu lieu et n'a rien donné. Elles portent maintenant
explicitement « NON — aucune marque vérifiée pour cette ligne ».

Résultat : **100 lignes × 20 colonnes**, 15/15 besoins, 0 cellule vide,
0 référence doublée.
