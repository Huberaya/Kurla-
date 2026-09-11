-- C1 — normalise the three skin hero targets until external SKU dossiers exist.
-- These rows are formulation targets, not accepted products. The update is
-- deliberately narrow and idempotent: it only affects skin rows whose
-- provenance still explicitly identifies an internal formulation.
-- No supplier, price, stock, claim or compliance evidence is invented here.

UPDATE public.products
SET
  catalog_status = 'draft',
  is_active = false,
  in_stock = false,
  stock_quantity = 0,
  stock_validation_status = 'not_provided',
  supplier_id = NULL,
  supplier_sku = NULL
WHERE lower(coalesce(category, '')) = 'peau'
  AND lower(coalesce(source_supplier, '')) LIKE '%formulation interne%';
