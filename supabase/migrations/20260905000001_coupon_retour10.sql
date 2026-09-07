-- Migration : coupon d'incitatif de récupération de panier abandonné
-- Date : 2026-09-05
-- Code RETOUR10 : -10 € (fixed) dès 49 € d'articles, proposé dans les relances
-- de panier abandonné (étapes 2 et 3). Usage plafonné pour borner le coût.
-- Idempotent (ON CONFLICT sur le code).

insert into public.coupons
  (code, description, discount_type, discount_value, currency, minimum_order_amount,
   starts_at, ends_at, max_uses, used_count, active)
values
  ('RETOUR10',
   'Reprenez votre commande : 10 € de réduction sur les articles (dès 49 € d’achat). Offre de relance panier.',
   'fixed', 10, 'EUR', 49,
   now(), null, 500, 0, true)
on conflict (code) do nothing;
