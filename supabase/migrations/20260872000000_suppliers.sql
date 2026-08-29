-- ============================================================
-- CHANTIER 16A — RÉFÉRENTIEL FOURNISSEURS
-- ============================================================
-- Constat avant d'écrire : il n'existait aucune table `suppliers`. Le
-- fournisseur n'était qu'une chaîne libre — `products.source_supplier`, vide
-- sur les 16 produits — que la route d'import enregistrait telle quelle. Deux
-- imports nommant « Laboratoire X » et « laboratoire x » auraient fait deux
-- provenances distinctes, sans qu'aucun contrôle ne le signale.
--
-- Deux principes gouvernent ce schéma :
--
--  1. Le nom du fournisseur est **normalisé** et unique. C'est ce qui permet à
--     deux écritures du même nom de retomber sur la même entité.
--  2. Un document de conformité **n'existe pas sans preuve**. La contrainte
--     `supplier_document_needs_proof` l'impose en base : pas d'URL de fichier
--     ni de date d'émission, pas de ligne. Une case cochée n'est pas un CPSR.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.suppliers (
  id text PRIMARY KEY,
  legal_name text NOT NULL,
  -- Forme pliée du nom (casse, diacritiques, ponctuation, forme juridique).
  -- C'est la clé d'unicité réelle : « LABORATOIRE X SAS » et « Laboratoire X »
  -- doivent donner la même valeur ici.
  legal_name_normalized text NOT NULL UNIQUE,
  trade_name text,
  supplier_type text NOT NULL DEFAULT 'unknown' CHECK (supplier_type IN (
    'contract_manufacturer', 'textile', 'tool', 'raw_material',
    'packaging', 'laboratory', 'unknown'
  )),
  country text,
  website text,
  contact_name text,
  contact_email text,
  moq_units integer CHECK (moq_units IS NULL OR moq_units > 0),
  lead_time_days integer CHECK (lead_time_days IS NULL OR lead_time_days >= 0),
  certifications text[] NOT NULL DEFAULT '{}',
  -- Vérifié veut dire : identité et capacité contrôlées par une personne, avec
  -- les documents rattachés. Pas de vérification humaine, pas de `verified`.
  verification_status text NOT NULL DEFAULT 'not_provided' CHECK (verification_status IN (
    'verified', 'pending', 'not_provided'
  )),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplier_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id text NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  -- Facultatif : un CPSR porte sur un produit précis, un certificat OEKO-TEX
  -- peut porter sur le fournisseur entier.
  product_id text REFERENCES public.products(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN (
    'responsible_person',        -- déclaration de Personne Responsable (UE)
    'pif',                       -- dossier d'information produit
    'cpsr',                      -- rapport de sécurité cosmétique
    'cpnp_notification',         -- notification au portail européen
    'spf_iso_24444',             -- mesure SPF in vivo
    'uva_iso_24443',             -- UVA-PF, exigence UVA-PF >= 1/3 du SPF
    'oeko_tex',                  -- textile en contact peau prolongé
    'eudr_statement',            -- diligence raisonnée déforestation
    'microplastic_free',         -- cosmétiques rincés, loi AGEC
    'gmp_iso_22716',             -- bonnes pratiques de fabrication
    'certificate_of_analysis',
    'other'
  )),
  reference text,
  issued_on date,
  expires_on date,
  file_url text,
  note text,
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Le cœur du dispositif : un document sans fichier et sans date n'est pas un
  -- document, c'est une intention. La contrainte est en base pour qu'aucun
  -- chemin applicatif ne puisse la contourner.
  CONSTRAINT supplier_document_needs_proof CHECK (file_url IS NOT NULL AND issued_on IS NOT NULL),
  CONSTRAINT supplier_document_dates_coherent CHECK (expires_on IS NULL OR issued_on IS NULL OR expires_on >= issued_on)
);

CREATE INDEX IF NOT EXISTS idx_supplier_documents_supplier
  ON public.supplier_documents(supplier_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_supplier_documents_product
  ON public.supplier_documents(product_id) WHERE product_id IS NOT NULL;

-- Lien produit -> fournisseur. `source_supplier` (chaîne libre) est conservé :
-- c'est ce que la marque a déclaré. `supplier_id` est ce que nous avons résolu.
-- Les deux peuvent différer, et cette différence est une information.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS supplier_id text REFERENCES public.suppliers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_supplier
  ON public.products(supplier_id) WHERE supplier_id IS NOT NULL;

-- ------------------------------------------------------------
-- RLS : les fournisseurs sont une donnée interne. Rien n'est public.
-- L'écriture passe par le serveur (clé de service) : un client ne peut donc pas
-- s'inventer un fournisseur ni marquer un document comme reçu.
-- ------------------------------------------------------------
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin reads suppliers" ON public.suppliers;
CREATE POLICY "Admin reads suppliers" ON public.suppliers
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admin writes suppliers" ON public.suppliers;
CREATE POLICY "Admin writes suppliers" ON public.suppliers
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin updates suppliers" ON public.suppliers;
CREATE POLICY "Admin updates suppliers" ON public.suppliers
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin reads supplier documents" ON public.supplier_documents;
CREATE POLICY "Admin reads supplier documents" ON public.supplier_documents
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admin writes supplier documents" ON public.supplier_documents;
CREATE POLICY "Admin writes supplier documents" ON public.supplier_documents
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin updates supplier documents" ON public.supplier_documents;
CREATE POLICY "Admin updates supplier documents" ON public.supplier_documents
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

COMMENT ON TABLE public.suppliers IS
  'Référentiel fournisseurs. Le nom est normalisé et unique : deux écritures du même fournisseur doivent retomber sur la même ligne.';
COMMENT ON COLUMN public.suppliers.legal_name_normalized IS
  'Clé de résolution. Cassé, diacritiques, ponctuation et forme juridique neutralisés.';
COMMENT ON COLUMN public.suppliers.verification_status IS
  'verified exige une vérification humaine et des documents rattachés. Un fournisseur créé par un import naît not_provided.';
COMMENT ON TABLE public.supplier_documents IS
  'Preuves de conformité rattachées à un fournisseur (et éventuellement à un produit). Une ligne sans fichier ni date est refusée par contrainte.';
COMMENT ON COLUMN public.products.supplier_id IS
  'Fournisseur résolu par la plateforme. Peut différer de source_supplier, qui reste la déclaration de la marque.';
