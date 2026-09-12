-- L2 — historique de réassort : ce que la membre a effectivement réapprovisionné.
-- Un événement de réassort est créé quand la membre ajoute au panier depuis le
-- flux réassort (étagère) ; il documente la boucle signal → action.
-- C'est un fait d'usage privé, jamais un agrégat de vente.

CREATE TABLE IF NOT EXISTS public.restock_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shelf_item_id UUID REFERENCES public.user_products(id) ON DELETE SET NULL,
  product_id TEXT,
  product_name TEXT,
  source TEXT NOT NULL DEFAULT 'shelf',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restock_events_user_created
  ON public.restock_events(user_id, created_at DESC);

ALTER TABLE public.restock_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own restock events" ON public.restock_events;
CREATE POLICY "Users access own restock events" ON public.restock_events
  FOR ALL USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

COMMENT ON TABLE public.restock_events IS 'L2 : réassorts effectués par la membre depuis le flux étagère (signal → ajout panier). Privé, non agrégé.';
COMMENT ON COLUMN public.restock_events.product_id IS 'Produit du catalogue ajouté au panier ; NULL si l’article est un soin externe (libellé libre) non référencé.';
COMMENT ON COLUMN public.restock_events.source IS 'Origine du geste : shelf (étagère), notification, autre point d’entrée.';
