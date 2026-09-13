-- Sourcing sans stock : canaux d'année 1 + suivi d'autorisation fournisseur
--
-- CONSTAT MESURÉ LE 13/09/2026 (SQL direct, projet qzwgsarfdegqtfdnqiql)
--
-- 1. `suppliers.supplier_type` n'acceptait que :
--      contract_manufacturer, textile, tool, raw_material, packaging,
--      laboratory, brand, distributor, unknown
--    Les trois modèles d'année 1 (dropship, affiliation, 3PL) étaient donc
--    IMPOSSIBLES À DÉCLARER. Aucun fournisseur de matériel en dropship ne
--    pouvait être enregistré correctement.
--
-- 2. Aucun champ de `products` ne suivait l'autorisation du fournisseur.
--    Mesuré : `information_schema` ne renvoie aucune colonne en
--    %authoriz%, %contact%, %fulfil%, %channel%.
--    Le pilotage demandé (« ce produit est sur le site, est-ce qu'on a
--    contacté le fournisseur, est-ce qu'on a son autorisation ») n'existait
--    pas au niveau du produit.
--
-- 3. La table `sourcing_prospects` portait déjà `dropshipping`,
--    `inci_provided`, `eu_compliance`, `visuals_granted`, `decision` — mais
--    au niveau du PROSPECT, pas du produit, et ses 25 lignes étaient toutes
--    à `to_contact` avec ces champs à NULL. Cette migration ne double pas ce
--    suivi : elle ajoute ce qui manque, c'est-à-dire l'état PAR PRODUIT.
--
-- PRINCIPE RETENU
--
-- L'inconnu devient explicite et traçable, jamais une donnée inventée, et
-- n'empêche pas la publication. Même principe que la provenance du pays
-- d'origine (20260924000000) : un produit dont l'autorisation n'est pas
-- encore obtenue reste publiable, mais son état est lisible et alertable.
-- C'est l'arbitrage métier du 13/09/2026 : publier d'abord, dépublier si le
-- fournisseur refuse.

-- ── 1. Les trois canaux d'année 1 deviennent déclarables ──────────────────
ALTER TABLE public.suppliers DROP CONSTRAINT IF EXISTS suppliers_supplier_type_check;
ALTER TABLE public.suppliers ADD CONSTRAINT suppliers_supplier_type_check
  CHECK (supplier_type IN (
    'contract_manufacturer',
    'textile',
    'tool',
    'raw_material',
    'packaging',
    'laboratory',
    'brand',
    'distributor',
    -- canaux sans stock, année 1
    'dropship',
    'affiliation',
    'third_party_logistics',
    'unknown'
  ));

-- ── 2. Le canal par lequel un produit est vendu ───────────────────────────
-- Un même catalogue mélange quatre réalités logistiques très différentes.
-- Sans ce champ, on ne peut pas savoir si un produit part de chez nous, de
-- chez un tiers, ou s'il n'est qu'un lien affilié.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS fulfillment_channel TEXT NOT NULL DEFAULT 'not_set';

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_fulfillment_channel_check;
ALTER TABLE public.products ADD CONSTRAINT products_fulfillment_channel_check
  CHECK (fulfillment_channel IN (
    'not_set',
    'dropship',
    'affiliation',
    'third_party_logistics',
    'own_stock'
  ));

-- ── 3. Le suivi d'autorisation, par produit ───────────────────────────────
-- Trois états, et un seul bloque : `refused`. C'est le mécanisme demandé :
-- « si le fournisseur refuse, on dépublie le produit ».
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_authorization_status TEXT NOT NULL DEFAULT 'not_contacted';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_contacted_on TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_authorization_note TEXT;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_supplier_authorization_status_check;
ALTER TABLE public.products ADD CONSTRAINT products_supplier_authorization_status_check
  CHECK (supplier_authorization_status IN (
    'not_contacted',
    'contacted',
    'authorized',
    'refused',
    'not_applicable'
  ));

-- Une autorisation datée exige une date. Sans cette contrainte, on pourrait
-- écrire « authorized » sans jamais dire quand — exactement le défaut que la
-- contrainte `supplier_document_needs_proof` empêche déjà sur
-- supplier_documents.
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_authorization_date_coherence;
ALTER TABLE public.products ADD CONSTRAINT products_authorization_date_coherence
  CHECK (
    supplier_authorization_status NOT IN ('authorized', 'refused')
    OR supplier_contacted_on IS NOT NULL
  );

-- ── 4. Pas de canal sans fournisseur identifié ────────────────────────────
-- Un produit en dropship ou en 3PL part de chez un tiers : sans fournisseur
-- identifié, on ne sait pas d'où il vient. L'affiliation est exclue de cette
-- règle : un lien affilié pointe vers un marchand, pas vers un fournisseur
-- qui nous livre.
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_channel_requires_supplier;
ALTER TABLE public.products ADD CONSTRAINT products_channel_requires_supplier
  CHECK (
    fulfillment_channel NOT IN ('dropship', 'third_party_logistics')
    OR supplier_id IS NOT NULL
  );
