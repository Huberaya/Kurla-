-- Attribution d'acquisition des commandes (UTM / canal / référent).
-- Capture first-touch + last-touch côté client (src/lib/attribution.ts),
-- envoyée au checkout et stockée ici pour mesurer quel canal est rentable.
-- JSONB pour accepter l'objet { last, first } sans figer le schéma à ce stade.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS attribution JSONB;

COMMENT ON COLUMN public.orders.attribution IS
  'Origine d''acquisition : { last: {...utm, channel, referrer, capturedAt}, first: {...} }. Nullable pour les commandes antérieures.';

-- Index sur le canal du dernier contact (last-touch) pour l''agrégation BCC.
-- Expression simple et tolérante : ne dépend pas d''un type défini.
CREATE INDEX IF NOT EXISTS orders_attribution_channel_idx
  ON public.orders ((attribution -> 'last' ->> 'channel'));
