# Collecte C1 — 3 héros peau FR

## Périmètre

Le fichier `C1_HERO_DOSSIER_COLLECTE.csv` est la matrice de collecte pour :

- `peau-ess-001` — nettoyant ;
- `peau-ess-002` — hydratant/barrière ;
- `peau-ess-003` — SPF.

Les trois lignes sont volontairement `blocked_missing_external_evidence`. Elles ne doivent pas être remplacées par une estimation ou une confirmation orale.

## Ce qui doit être obtenu par SKU

### Fournisseur et conformité

- raison sociale et identité vérifiables ;
- identifiant fournisseur KURLA après résolution dans le référentiel ;
- SKU fournisseur ;
- Personne Responsable UE et preuve datée ;
- CPSR signé ;
- PIF ;
- référence ou preuve CPNP ;
- preuve de fabrication/GMP ISO 22716 ;
- pays autorisés, dont FR ;
- avertissements validés.

### Produit et exploitation

- INCI final et date/provenance ;
- claims et source de validation ;
- lot ou traçabilité de lot ;
- DDM ou PAO ;
- quantité disponible et date du contrôle de stock ;
- packshot fourni par la marque ou licence explicite ;
- statut de validation du visuel.

### SPF uniquement

Pour `peau-ess-003`, le dossier doit aussi préciser :

- SPF/UVA et preuves d’essai applicables ;
- risque whitecast et résultat documenté ;
- phototypes IV, V et VI effectivement testés ;
- conditions de lumière utilisées ;
- sous-tons testés si le produit est teinté.

## Règles de décision

1. Un lien, un nom de fichier ou une case cochée ne suffit pas : le document doit être réellement disponible, daté lorsque nécessaire et rattaché au bon produit.
2. Un fournisseur prospecté n’est pas un fournisseur vérifié.
3. Une formule interne ou une ancienne précommande ne devient pas un SKU disponible.
4. Aucun statut `ready_to_buy` ne doit être attribué manuellement dans le CSV.
5. Après réception, importer les données via le flux fournisseur/admin puis relancer :

```text
GET /api/admin/catalog/skin-readiness
```

6. La promotion ne peut intervenir que si le rapport accepte le SKU et que le héros appartient au périmètre FR.
