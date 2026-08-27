# Catalogue commercial KURLA

Le catalogue commercial est alimenté par Supabase et administré depuis `/admin` (rôle `admin` ou `superadmin`). `MOCK_PRODUCTS` reste une fixture locale : le serveur démarre avec un catalogue vide lorsqu’aucune base Supabase n’est configurée et la route client `/api/products` ne lit jamais le mock.

## Import CSV

Le bouton **Import CSV** accepte une taille maximale de 2 Mo, avec virgule, point-virgule ou tabulation comme séparateur. Les tableaux texte utilisent `|` :

```csv
name;slug;brand;price;vat_rate;stock_quantity;country_availability;categories;audiences;composition;warnings
Nom réel;nom-reel;Marque réelle;19.90;20;12;FR|BE;cheveux_boucles|cuir_chevelu;femmes|tous_publics;Aloe vera|Glycérine;Éviter le contact avec les yeux
```

Les colonnes utiles comprennent aussi `promotion_price`, `promotion_starts_at`, `promotion_ends_at`, `original_price`, `price_includes_vat`, `image_url`, `images` (tableau JSON), `inci`, `certifications` (tableau JSON), `supplier`, `supplier_sku`, `is_active`, `in_stock`, `variants` (tableau JSON), `description`, `hair_types`, `skin_types` et `concerns`.

## Flux fournisseur

Le bouton **Import fournisseur** attend un nom de fournisseur et un tableau JSON. Les références `supplierSku` permettent de retrouver et mettre à jour une fiche du même fournisseur :

```json
[
  {
    "supplierSku": "REF-001",
    "name": "Nom fourni par le partenaire",
    "brand": "Marque fournie",
    "price": 19.9,
    "vatRate": 20,
    "stockQuantity": 12,
    "countryAvailability": ["FR"],
    "catalogCategoryTags": ["peau_sensible"],
    "targetAudiences": ["tous_publics"],
    "variants": [
      { "name": "Format 250 ml", "formatLabel": "250 ml", "price": 19.9, "stockQuantity": 12 }
    ]
  }
]
```

## Publication et fiabilité

- Tout import crée une fiche `draft` et un journal `catalog_imports` avec le détail des lignes acceptées ou rejetées.
- Une donnée absente reste vide et sa validation reste `not_provided` ; aucune certification, image, disponibilité, composition, promotion ou promesse n’est complétée automatiquement.
- La publication nécessite les validations ingrédients, allégations, images, stock, certifications, traductions et marque, ainsi qu’une provenance d’image `brand_provided` ou `licensed`.
- Le serveur et la fonction PostgreSQL vérifient également la présence d’une composition (ingrédients ou INCI), d’une marque, d’une image HTTP(S) et d’au moins un pays de disponibilité. Le simple passage du statut à `published` ne contourne pas cette barrière.
- Les images importées restent `pending` et `unverified` par défaut. L’administrateur doit sélectionner une provenance documentée et confirmer séparément le contrôle Images.
- Les champs de stock, TVA, fournisseur et validation ne sont pas inclus dans la projection publique. Les commandes recalculent leur prix côté serveur, promotion comprise, et contrôlent le pays réel de livraison.

La migration correspondante est `supabase/migrations/20260837000000_catalog_management.sql`.
