-- ============================================================
-- CHANTIER CATALOGUE RÉEL — Prospects de sourcing & références à intégrer
-- ============================================================
-- Donne à l'administration un équivalent structuré du classeur de suivi
-- (relances et références) : qui contacter (marques revente / distributeurs /
-- façonniers), l'état des relances, et les produits candidats à intégrer.
--
-- Ce ne sont PAS des fournisseurs vérifiés (table `suppliers`) : un prospect
-- devient fournisseur seulement une fois les documents de conformité reçus.
-- Données internes, RLS admin uniquement. Aucun chiffre inventé : les tarifs,
-- MOQ et dates sont NULL jusqu'à réception d'une réponse réelle.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sourcing_prospects (
  id text PRIMARY KEY,
  name text NOT NULL,
  route text NOT NULL CHECK (route IN ('A', 'B')),
  contact_type text NOT NULL CHECK (contact_type IN (
    'brand_fr', 'brand_eu', 'skin_solar', 'distributor', 'contract_manufacturer'
  )),
  specialty text,
  source_url text,
  contact_email text,
  contact_name text,
  channel text,
  status text NOT NULL DEFAULT 'to_contact' CHECK (status IN (
    'to_contact', 'emailed', 'followed_up', 'replied', 'in_negotiation',
    'samples_sent', 'agreed', 'declined', 'no_response'
  )),
  first_contacted_on date,
  follow_up_on date,
  follow_up_status text CHECK (follow_up_status IS NULL OR follow_up_status IN (
    'to_follow', 'followed', 'replied', 'no_response'
  )),
  wholesale_pricing text CHECK (wholesale_pricing IS NULL OR wholesale_pricing IN ('pending','yes','no','na')),
  moq text,
  lead_time_fr text,
  dropshipping text CHECK (dropshipping IS NULL OR dropshipping IN ('pending','yes','no','na')),
  inci_provided text CHECK (inci_provided IS NULL OR inci_provided IN ('pending','yes','no','na')),
  eu_compliance text CHECK (eu_compliance IS NULL OR eu_compliance IN ('pending','yes','no','na')),
  visuals_granted text CHECK (visuals_granted IS NULL OR visuals_granted IN ('pending','yes','no','na')),
  samples_received text CHECK (samples_received IS NULL OR samples_received IN ('pending','yes','no','na')),
  decision text CHECK (decision IS NULL OR decision IN ('pending','accepted','waiting','rejected')),
  decided_on date,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sourcing_product_candidates (
  id text PRIMARY KEY,
  prospect_id text REFERENCES public.sourcing_prospects(id) ON DELETE CASCADE,
  brand text NOT NULL,
  product text NOT NULL,
  routine_step text,
  category text,
  sourced_via text,
  inci_received boolean NOT NULL DEFAULT false,
  ingredients_mapped integer NOT NULL DEFAULT 0,
  purchase_price_cents integer CHECK (purchase_price_cents IS NULL OR purchase_price_cents >= 0),
  public_price_cents integer CHECK (public_price_cents IS NULL OR public_price_cents >= 0),
  margin_pct numeric(5,2) CHECK (margin_pct IS NULL OR (margin_pct >= 0 AND margin_pct <= 100)),
  first_order_qty integer CHECK (first_order_qty IS NULL OR first_order_qty >= 0),
  sample_validated boolean NOT NULL DEFAULT false,
  visuals_received boolean NOT NULL DEFAULT false,
  governance_status text NOT NULL DEFAULT 'blocked' CHECK (governance_status IN (
    'blocked', 'waiting_inci', 'in_progress', 'ready', 'published'
  )),
  published_on date,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sourcing_prospects_status ON public.sourcing_prospects(status);
CREATE INDEX IF NOT EXISTS idx_sourcing_prospects_type ON public.sourcing_prospects(contact_type);
CREATE INDEX IF NOT EXISTS idx_candidates_prospect ON public.sourcing_product_candidates(prospect_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON public.sourcing_product_candidates(governance_status);

-- RLS : interne, administration seulement.
ALTER TABLE public.sourcing_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sourcing_product_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin reads prospects" ON public.sourcing_prospects;
CREATE POLICY "Admin reads prospects" ON public.sourcing_prospects
  FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Admin writes prospects" ON public.sourcing_prospects;
CREATE POLICY "Admin writes prospects" ON public.sourcing_prospects
  FOR INSERT WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admin updates prospects" ON public.sourcing_prospects;
CREATE POLICY "Admin updates prospects" ON public.sourcing_prospects
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admin deletes prospects" ON public.sourcing_prospects;
CREATE POLICY "Admin deletes prospects" ON public.sourcing_prospects
  FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "Admin reads candidates" ON public.sourcing_product_candidates;
CREATE POLICY "Admin reads candidates" ON public.sourcing_product_candidates
  FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Admin writes candidates" ON public.sourcing_product_candidates;
CREATE POLICY "Admin writes candidates" ON public.sourcing_product_candidates
  FOR INSERT WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admin updates candidates" ON public.sourcing_product_candidates;
CREATE POLICY "Admin updates candidates" ON public.sourcing_product_candidates
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admin deletes candidates" ON public.sourcing_product_candidates;
CREATE POLICY "Admin deletes candidates" ON public.sourcing_product_candidates
  FOR DELETE USING (public.is_admin());

-- ------------------------------------------------------------
-- Amorçage : les 21 cibles et 15 références candidats (plan hybride).
-- ON CONFLICT DO NOTHING : une édition humaine n'est jamais écrasée.
-- ------------------------------------------------------------
INSERT INTO public.sourcing_prospects
  (id, name, route, contact_type, specialty, source_url)
VALUES
  ('c01','Nappy Queen','A','brand_fr','Après-shampoing karité/jojoba, masque ricin, gamme enfant','nappyboucles.fr/115-nappy-queen'),
  ('c02','Activilong (Actiforce/Actikids)','A','brand_fr','Leave-in, crème soufflée, huiles karité/macadamia, enfant','nappyboucles.fr/98-activilong'),
  ('c03','Les Secrets de Loly','A','brand_fr','Soins nourrissants, packs boucles/crépus','nappyboucles.fr (top 10 FR)'),
  ('c04','Soarn','A','brand_fr','Shampoing Boost''r revitalisant, soins ciblés','nappyboucles.fr (top 10 FR)'),
  ('c05','Kalia Nature','A','brand_fr','Marque naturelle cheveux texturés','nappyboucles.fr (top 10 FR)'),
  ('c06','Carolina B','A','brand_fr','Packs enfant/adulte douceur et démêlage','nappyboucles.fr (top 10 FR)'),
  ('c07','Musoya','A','brand_fr','Marque afro/crépus/locks ET distributeur (Paris, Europe)','europages.fr (Musoya)'),
  ('c08','Bouclème','A','brand_eu','Gels/crèmes boucles à crépus, 100% CG, vegan','kurlify.com/en/brands/boucleme'),
  ('c09','Flora & Curl','A','brand_eu','Mousses et gels juicy clumps','curlmaven.ie'),
  ('c10','Curlsmith','A','brand_eu','Fixation, gels sans protéine, large distribution UE','hanzcurls.com'),
  ('c11','Only Curls London','A','brand_eu','Gamme bouclée complète','hanzcurls.com'),
  ('c12','IN''OYA — SUN''OYA','A','skin_solar','Fluide SPF50 sans trace blanche peaux noires (remplace p6)','inoya-laboratoire.com/fr/sun-oya'),
  ('c13','Eadem','A','skin_solar','Sérum anti-taches Milk Marvel, gamme mélanine (Black-owned)','référence p14'),
  ('c14','Black Girl Sunscreen','A','skin_solar','SPF30 sans trace blanche (import UE à vérifier)','référence p15'),
  ('c15','Dina Afro Shop','A','distributor','Gros multimarques : As I Am, Aunt Jackie''s, Cantu, Shea Moisture, Camille Rose…','dinafroshop.com'),
  ('c16','Carmel Cosmetics Labs','B','contract_manufacturer','Spécialiste marque blanche cheveux crépus/afro','europages.fr (Carmel Cosmetics Labs)'),
  ('c17','Hair Liss / Liss Creation','B','contract_manufacturer','Laboratoire capillaire marque blanche (Choisy-le-Roi), Europe','doc CHANTIER_16 §C.1'),
  ('c18','Noesis','B','contract_manufacturer','MOQ dès 500, fournit PIF+CPSR+CPNP (Bulgarie, UE)','noesiscosmetics.com'),
  ('c19','CAPIBEAUTY','B','contract_manufacturer','Produits cheveux bouclés/frisés/crépus, marque blanche','europages.fr (CAPIBEAUTY)'),
  ('c20','Lessonia','B','contract_manufacturer','Full-service ISO 22716, Made in France (Finistère)','doc CHANTIER_16 §C.1'),
  ('c21','ABC Texture','B','contract_manufacturer','R&D et sous-traitance, ISO 22716','doc CHANTIER_16 §C.1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sourcing_product_candidates
  (id, prospect_id, brand, product, routine_step, category)
VALUES
  ('r01','c01','Nappy Queen','Après-shampoing rincé au karité & jojoba','Après-shampoing','hair'),
  ('r02','c01','Nappy Queen','Shampoing doux enfants','Shampoing','kids'),
  ('r03','c01','Nappy Queen','Masque réparateur au ricin','Masque','hair'),
  ('r04','c01','Nappy Queen','Shampoing doux (adulte)','Shampoing','hair'),
  ('r05','c02','Activilong','Crème hydratante Leave-In Actiforce','Leave-in','hair'),
  ('r06','c02','Activilong','Crème soufflée Actiforce (98% naturelle)','Coiffage','hair'),
  ('r07','c02','Activilong','Huile de karité 100% pure','Huile','hair'),
  ('r08','c02','Activilong','Gamme Actikids (enfant)','Enfant','kids'),
  ('r09','c03','Les Secrets de Loly','Pack soin nourrissant','Routine/Kit','hair'),
  ('r10','c12','IN''OYA','Fluide solaire SPF50 SUN''OYA (0 trace blanche)','Solaire','solar'),
  ('r11','c08','Bouclème','Curl Defining Gel','Fixation','hair'),
  ('r12','c08','Bouclème','Crème hydratante boucles','Leave-in','hair'),
  ('r13','c09','Flora & Curl','Mousse coiffante boucles/crépus','Fixation','hair'),
  ('r14','c10','Curlsmith','Shine Gel sans protéine','Fixation','hair'),
  ('r15','c15','Multimarques (via Dina Afro Shop)','As I Am / Aunt Jackie''s / Cantu / Shea Moisture / Camille Rose','Divers','hair')
ON CONFLICT (id) DO NOTHING;
