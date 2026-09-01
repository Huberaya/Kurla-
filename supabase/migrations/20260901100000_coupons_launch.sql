-- Migration : codes promo — incrémentation atomique + code de lancement
-- Date : 2026-09-01
-- La table `coupons` existe déjà (création/supervision admin). On ajoute :
--   1) une RPC atomique d'incrémentation du compteur d'usage ;
--   2) le code de bienvenue -15% promis sur la home (« -15% sur ta 1ère routine »).
-- Idempotent.

-- 1) Incrémentation atomique (utilisée après un paiement confirmé).
create or replace function public.increment_coupon_usage(p_code text)
returns void
language sql
as $$
  update public.coupons
     set used_count = used_count + 1,
         updated_at = now()
   where code = upper(p_code)
     and active = true
     and (max_uses is null or used_count < max_uses);
$$;

-- 2) Code de lancement BIENVENUE15 : -15% sur les articles, sans minimum,
--    actif jusqu'à la fin de l'année de lancement.
insert into public.coupons
  (code, description, discount_type, discount_value, currency, minimum_order_amount,
   starts_at, ends_at, max_uses, used_count, active)
values
  ('BIENVENUE15',
   'Bienvenue KURLA : -15% sur ta première commande (articles, hors livraison).',
   'percentage', 15, 'EUR', 0,
   now(),
   (date_trunc('year', now()) + interval '1 year' - interval '1 day'),
   5000, 0, true)
on conflict (code) do update
  set description = excluded.description,
      discount_type = excluded.discount_type,
      discount_value = excluded.discount_value,
      active = true,
      updated_at = now();
