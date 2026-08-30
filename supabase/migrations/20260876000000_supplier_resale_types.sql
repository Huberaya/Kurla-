-- ============================================================
-- CHANTIER CATALOGUE RÉEL — Route revente (hybride)
-- ============================================================
-- Le référentiel fournisseurs ne connaissait que la voie marque propre :
-- contract_manufacturer, textile, tool, raw_material, packaging, laboratory.
-- La route hybride retenue ajoute la revente de marques existantes :
--   - 'brand'        : la marque dont nous revendons les produits (elle
--                      reste la Personne Responsable et porte PIF/CPSR/CPNP) ;
--   - 'distributor'  : distributeur/grossiste par lequel nous approvisionnons
--                      ces marques (ex. importateur multi-marques).
-- On élargit le CHECK sans toucher aux lignes existantes.
-- ============================================================

ALTER TABLE public.suppliers
  DROP CONSTRAINT IF EXISTS suppliers_supplier_type_check;

ALTER TABLE public.suppliers
  ADD CONSTRAINT suppliers_supplier_type_check CHECK (supplier_type IN (
    'contract_manufacturer', -- façonnier marque propre
    'textile',
    'tool',
    'raw_material',
    'packaging',
    'laboratory',
    'brand',                 -- marque tierce revendue (revente)
    'distributor',           -- grossiste / importateur multimarque
    'unknown'
  ));

-- Commentaire explicatif sur le modèle de la revente.
COMMENT ON COLUMN public.suppliers.supplier_type IS
  'Voie marque propre : contract_manufacturer/textile/tool/raw_material/packaging/laboratory. '
  'Voie revente (hybride) : brand (marque tierce, reste RP et porte PIF/CPSR/CPNP) ou '
  'distributor (grossiste/importateur par lequel nous approvisionnons).';
