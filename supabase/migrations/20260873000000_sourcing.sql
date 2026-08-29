-- ============================================================
-- CHANTIER 16C — SOURCING RÉEL, PAR VAGUE
-- ============================================================
-- Le chantier 16 a identifié 8 trous de gamme. Sans endroit où ranger une
-- demande de prix, ses réponses et la comparaison, un sourcing se vit dans une
-- boîte mail : les devis se perdent, et « on a choisi ce façonnier » devient
-- une phrase sans preuve.
--
-- Trois tables, et une discipline : la plateforme n'invente ni un prix, ni un
-- délai, ni une réponse. Tout champ commercial vient d'une saisie humaine
-- datée. Ce qui est contrôlé en base, c'est la cohérence — pas la vraisemblance.
-- ============================================================

-- ------------------------------------------------------------
-- Ce que nous cherchons à sourcer (un trou de gamme à combler).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sourcing_items (
  id text PRIMARY KEY,
  wave text NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  -- Pourquoi ce besoin existe. Une chaîne libre assumée : le motif vient de
  -- l'analyse du catalogue, pas d'un référentiel fermé.
  rationale text NOT NULL,
  specification text,
  -- Documents exigés du fournisseur pour cette référence. C'est la liste qui
  -- bloque la sélection : sans eux, le fournisseur ne peut pas être retenu.
  required_documents text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'to_source'
    CHECK (status IN ('to_source', 'in_rfq', 'awarded', 'abandoned')),
  awarded_supplier_id text REFERENCES public.suppliers(id) ON DELETE SET NULL,
  awarded_response_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.sourcing_items.required_documents IS
  'Types de documents (voir supplier_documents.document_type) exigés avant de pouvoir retenir un fournisseur. Contrôlé par le code, pas par une habitude.';

-- ------------------------------------------------------------
-- Une demande de prix adressée à un fournisseur identifié.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rfqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sourcing_item_id text NOT NULL REFERENCES public.sourcing_items(id) ON DELETE CASCADE,
  supplier_id text REFERENCES public.suppliers(id) ON DELETE SET NULL,
  -- Le contenu réellement envoyé. Stocké tel quel : si la demande change,
  -- l'historique ne doit pas changer avec elle.
  content text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'answered', 'closed', 'declined')),
  channel text,
  sent_on date,
  closed_on date,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Une demande « envoyée » sans date d'envoi est une affirmation sans fait.
  CONSTRAINT rfq_sent_needs_date CHECK (status <> 'sent' OR sent_on IS NOT NULL),
  -- Un fournisseur inconnu ne peut pas recevoir une demande : la traçabilité
  -- exige de savoir à qui l'on a écrit.
  CONSTRAINT rfq_sent_needs_supplier CHECK (status <> 'sent' OR supplier_id IS NOT NULL)
);

-- ------------------------------------------------------------
-- Une réponse reçue. Rien n'est déduit : tout vient de la saisie.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rfq_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  received_on date NOT NULL,
  -- Prix, MOQ et délai sont NULLables **volontairement** : une réponse peut ne
  -- pas chiffrer. Un zéro par défaut serait une donnée inventée.
  unit_price_cents integer CHECK (unit_price_cents IS NULL OR unit_price_cents > 0),
  currency text,
  moq_units integer CHECK (moq_units IS NULL OR moq_units > 0),
  lead_time_days integer CHECK (lead_time_days IS NULL OR lead_time_days > 0),
  documents_offered text[] NOT NULL DEFAULT '{}',
  quote_reference text,
  notes text,
  recorded_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Une réponse sans date de réception ne peut pas être comparée honnêtement :
  -- un devis de 2024 et un devis de 2026 ne se comparent pas.
  CONSTRAINT rfq_response_needs_date CHECK (received_on IS NOT NULL),
  -- Une réponse sans prix et sans note n'apporte rien à la comparaison.
  CONSTRAINT rfq_response_needs_substance
    CHECK (unit_price_cents IS NOT NULL OR (notes IS NOT NULL AND length(notes) > 0))
);

CREATE INDEX IF NOT EXISTS idx_sourcing_items_wave ON public.sourcing_items(wave);
CREATE INDEX IF NOT EXISTS idx_sourcing_items_status ON public.sourcing_items(status);
CREATE INDEX IF NOT EXISTS idx_rfqs_item ON public.rfqs(sourcing_item_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_supplier ON public.rfqs(supplier_id);
CREATE INDEX IF NOT EXISTS idx_rfq_responses_rfq ON public.rfq_responses(rfq_id);

-- ------------------------------------------------------------
-- RLS : administration seulement, via public.is_admin().
-- La lecture publique d'un devis fournisseur serait une fuite commerciale.
-- ------------------------------------------------------------
ALTER TABLE public.sourcing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin reads sourcing items" ON public.sourcing_items;
CREATE POLICY "Admin reads sourcing items" ON public.sourcing_items
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admin writes sourcing items" ON public.sourcing_items;
CREATE POLICY "Admin writes sourcing items" ON public.sourcing_items
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin updates sourcing items" ON public.sourcing_items;
CREATE POLICY "Admin updates sourcing items" ON public.sourcing_items
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin reads rfqs" ON public.rfqs;
CREATE POLICY "Admin reads rfqs" ON public.rfqs
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admin writes rfqs" ON public.rfqs;
CREATE POLICY "Admin writes rfqs" ON public.rfqs
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin updates rfqs" ON public.rfqs;
CREATE POLICY "Admin updates rfqs" ON public.rfqs
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin reads rfq responses" ON public.rfq_responses;
CREATE POLICY "Admin reads rfq responses" ON public.rfq_responses
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admin writes rfq responses" ON public.rfq_responses;
CREATE POLICY "Admin writes rfq responses" ON public.rfq_responses
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin updates rfq responses" ON public.rfq_responses;
CREATE POLICY "Admin updates rfq responses" ON public.rfq_responses
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
