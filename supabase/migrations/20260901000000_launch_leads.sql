-- Migration : liste de lancement / capture de leads (liste d'attente générale)
-- Date : 2026-09-01
-- Objectif : collecter les emails des visiteurs de la home (capture bêta),
-- distincte de product_waitlist qui est dédiée au réassort d'un produit précis
-- (product_id NOT NULL + FK vers products + contrainte status).
--
-- À exécuter dans Supabase (SQL editor). Idempotent.

create table if not exists public.launch_leads (
  id            uuid primary key default gen_random_uuid(),
  email         text not null check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  profile_type  text not null default 'client' check (profile_type in ('client', 'pro')),
  country       char(2) not null default 'FR',
  source        text not null default 'home_waitlist',
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  status        text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Dédoublonnage : un email par profil n'est compté qu'une fois.
create unique index if not exists launch_leads_email_profile_uidx
  on public.launch_leads (lower(email), profile_type);

create index if not exists launch_leads_created_at_idx
  on public.launch_leads (created_at desc);

alter table public.launch_leads enable row level security;

-- Écriture publique (capture sans compte) via la clé service côté serveur.
drop policy if exists "launch_leads_insert_anon" on public.launch_leads;
create policy "launch_leads_insert_anon"
  on public.launch_leads for insert
  to anon, authenticated, service_role
  with check (true);

-- Lecture réservée au rôle service (back-office), jamais côté client.
drop policy if exists "launch_leads_read_service" on public.launch_leads;
create policy "launch_leads_read_service"
  on public.launch_leads for select
  to service_role
  using (true);

-- updated_at maintenu automatiquement.
create or replace function public.set_launch_leads_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_launch_leads_updated_at on public.launch_leads;
create trigger trg_launch_leads_updated_at
  before update on public.launch_leads
  for each row execute function public.set_launch_leads_updated_at();
