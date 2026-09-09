-- ============================================================
-- SOURCING SEGMENTÉ PAR PAYS — 2026-09-10
-- L'Europe et l'Afrique ne sont pas des blocs : chaque pays-fournisseur
-- est scoré /40 (10 critères pondérés) et un modèle d'entrée est décidé.
-- Vague 1 = FR (34) + NL (30) + BG/FR façonnage (32/31). UK (28) vague 2 via importateur UE. US (18) refus direct sans RP.
-- Aucune ouverture sans 8 gates fichier+date (supplier_documents).
-- ============================================================

-- Prospect NL détaillé : Afro Wholesale (B&F Company, NL) — déjà dans EMAILS_A_ENVOYER_PHASES.md support@afrowholesale.eu
INSERT INTO public.sourcing_prospects (id, name, route, contact_type, specialty, source_url, contact_email, channel)
VALUES
  ('c22','Afro Wholesale (B&F Company, NL)','A','distributor','Grossiste capillaires + accessoires satin (bonnets, peignes) — multimarques US/UK','afrowholesale.eu','support@afrowholesale.eu','email')
ON CONFLICT (id) DO UPDATE SET
  contact_email = EXCLUDED.contact_email,
  specialty = EXCLUDED.specialty,
  source_url = EXCLUDED.source_url;

INSERT INTO public.sourcing_prospects (id, name, route, contact_type, specialty, source_url, contact_email, channel)
VALUES
  ('c23','AfricanFabs B.V. (NL)','A','distributor','Bonnets/taies satin, wax — prix gros grandes quantités','africanfabs.com','info@africanfabs.com','email')
ON CONFLICT (id) DO UPDATE SET
  contact_email = EXCLUDED.contact_email,
  specialty = EXCLUDED.specialty,
  source_url = EXCLUDED.source_url;

-- Prospect Ghana matière karité (coopérative) — piste B matière
INSERT INTO public.sourcing_prospects (id, name, route, contact_type, specialty, source_url)
VALUES
  ('c24','Coopérative karité Ghana / Afrique Ouest (matière)','B','contract_manufacturer','Karité brut traçable EUDR — matière héros marque propre','eudr + sourcing Ghana')
ON CONFLICT (id) DO NOTHING;

-- Vue matérialisée simple : scores par pays (lecture admin). Pas de RLS : lecture via service key seulement.
CREATE TABLE IF NOT EXISTS public.sourcing_country_strategy (
  country_code text PRIMARY KEY,
  label text NOT NULL,
  track text NOT NULL CHECK (track IN ('A_resale','B_make')),
  score integer NOT NULL CHECK (score >=0 AND score <=40),
  wave integer NOT NULL CHECK (wave IN (1,2,3)),
  model text NOT NULL,
  moq_target text,
  lead_time_fr text,
  margin_target text,
  prospects text[] NOT NULL DEFAULT '{}',
  requires_rp boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.sourcing_country_strategy (country_code, label, track, score, wave, model, moq_target, lead_time_fr, margin_target, prospects, requires_rp)
VALUES
  ('FR','France — revente directe marques texturées','A_resale',34,1,'Revente directe marque — stock léger 12 pcs/réf','≤12 pcs/réf','2–5 j','≥34% (cible 45%)','{c01,c02,c03,c04,c05,c06,c07,c12,c15}', true),
  ('NL','Pays-Bas — grossistes multimarques','A_resale',30,1,'Distributeur gros — stock centralisé Benelux','≤12 pcs/réf paliers','48–72 h','≥34%','{c22,c23,c15}', true),
  ('GB','Royaume-Uni — boucles','A_resale',28,2,'Distributeur UE agréé / importateur FR — pas d’import direct sans RP','≤12 via importateur','≤7 j','≥34% après douane','{c08,c09,c10,c11}', true),
  ('DE','Allemagne — demi-gros','A_resale',26,2,'Demi-gros via distributeur DE','≤24','3–6 j','≥34%','{}', true),
  ('GH','Ghana / Afrique Ouest — matière karité','B_make',26,1,'Partenariat coopérative — matière pour marque propre','100 kg matière','4–6 sem','45–55% si coût ≤4,50€','{c24}', false),
  ('US','États-Unis — SPF mélanine','A_resale',18,3,'Import vérifié seulement si RP UE — sinon via Dina FR','refus sans RP','>10 j + douane','≥34% après douane (rare)','{c13,c14}', true),
  ('BG','Bulgarie — façonnage Noesis','B_make',32,1,'Façonnage UE petit MOQ 500 — PIF+CPSR+CPNP fournis','500/1000/5000','échantillon 3 sem prod 8 sem','cible héros 13–18€','{c18}', true),
  ('FR_make','France — façonnage','B_make',31,1,'Made in France — traçabilité karité EUDR','500/1000/5000','échantillon 3–4 sem prod 8–12 sem','cible 11–16€ / 13–18€','{c16,c17,c19,c20,c21}', true)
ON CONFLICT (country_code) DO UPDATE SET
  label = EXCLUDED.label,
  track = EXCLUDED.track,
  score = EXCLUDED.score,
  wave = EXCLUDED.wave,
  model = EXCLUDED.model,
  moq_target = EXCLUDED.moq_target,
  lead_time_fr = EXCLUDED.lead_time_fr,
  margin_target = EXCLUDED.margin_target,
  prospects = EXCLUDED.prospects,
  requires_rp = EXCLUDED.requires_rp,
  updated_at = now();

ALTER TABLE public.sourcing_country_strategy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin reads sourcing strategy" ON public.sourcing_country_strategy;
CREATE POLICY "Admin reads sourcing strategy" ON public.sourcing_country_strategy FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Admin writes sourcing strategy" ON public.sourcing_country_strategy;
CREATE POLICY "Admin writes sourcing strategy" ON public.sourcing_country_strategy FOR INSERT WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admin updates sourcing strategy" ON public.sourcing_country_strategy;
CREATE POLICY "Admin updates sourcing strategy" ON public.sourcing_country_strategy FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

COMMENT ON TABLE public.sourcing_country_strategy IS 'Stratégie sourcing segmentée par pays (2026-09-10) : score /40, vague, modèle d’entrée. Vague 1 = FR+NL+BG/FR façonnage. Source : docs/sourcing/STRATEGIE_SOURCING_SEGMENTEE_PAYS_2026-09-10.md et src/lib/sourcingCountryScore.ts';
