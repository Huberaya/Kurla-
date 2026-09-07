-- Migration : relance des paniers / paiements abandonnés
-- Date : 2026-09-05
-- Trace les emails de récupération envoyés pour les commandes restées en
-- attente de paiement (pending_payment / payment_pending_webhook), afin de :
--   1) ne jamais relancer deux fois la même étape pour une commande (dédoublonnage) ;
--   2) borner le nombre de relances par commande (séquence 3 emails max).
-- Idempotente : IF NOT EXISTS partout. Le code applicatif fonctionne aussi
-- sans cette table (il vérifie son existence et se contente de journaliser).

create table if not exists public.abandoned_cart_emails (
  id uuid primary key default gen_random_uuid(),
  order_id text not null,
  customer_email text not null,
  stage integer not null,                 -- 1 = rappel doux, 2 = relance, 3 = ultime
  status text not null default 'sent',   -- sent | logged | failed | skipped
  provider text,
  error_message text,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  -- Une seule entrée par (commande, étape) : clé de dédoublonnage naturelle.
  constraint abandoned_cart_emails_order_stage_uq unique (order_id, stage)
);

create index if not exists abandoned_cart_emails_order_idx
  on public.abandoned_cart_emails (order_id);

create index if not exists abandoned_cart_emails_sent_at_idx
  on public.abandoned_cart_emails (sent_at);

comment on table public.abandoned_cart_emails is
  'Journal des emails de relance de panier/paiement abandonné (1 ligne par commande et par étape de la séquence 1-2-3).';
