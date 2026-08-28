-- CHANTIER 9 (bloc A4) — AI Act, article 50(4) appliqué au CMS.
--
-- Le règlement (UE) 2024/1689 art. 50(4) impose de signaler un texte généré par
-- IA publié pour informer le public, sauf relecture humaine et validation
-- éditoriale avec une personne responsable nommément identifiée. Ces trois
-- colonnes rendent la règle stockable — donc vérifiable et auditable — au lieu
-- de la laisser dans un commentaire de code.
--
-- Migration additive : aucune colonne existante n'est modifiée, aucun contenu
-- n'est supprimé. Les contenus déjà publiés sortent en `generated_by = 'human'`
-- (valeur par défaut) tant qu'ils n'ont pas été requalifiés par la rédaction.

alter table if exists public.content_articles
  add column if not exists generated_by text not null default 'human',
  add column if not exists ai_disclosure boolean not null default false,
  add column if not exists editorial_review jsonb not null default '{}'::jsonb;

-- Valeurs admises : humain, généré par IA, ou assisté par IA.
alter table public.content_articles
  drop constraint if exists content_articles_generated_by_check;
alter table public.content_articles
  add constraint content_articles_generated_by_check
  check (generated_by in ('human', 'ai', 'ai_assisted'));

-- Une exemption éditoriale ne vaut que si elle nomme une personne : la
-- contrainte interdit un objet « revue » qui prétendrait à l'exemption sans
-- responsable identifié ni date de relecture.
alter table public.content_articles
  drop constraint if exists content_articles_editorial_review_check;
alter table public.content_articles
  add constraint content_articles_editorial_review_check
  check (
    editorial_review = '{}'::jsonb
    or (
      editorial_review - 'reviewedBy' - 'reviewedAt' - 'responsibilityAccepted' - 'note' = '{}'::jsonb
      and jsonb_typeof(editorial_review -> 'reviewedBy') = 'string'
      and btrim(editorial_review ->> 'reviewedBy') <> ''
      and jsonb_typeof(editorial_review -> 'reviewedAt') = 'string'
      and btrim(editorial_review ->> 'reviewedAt') <> ''
    )
  );

comment on column public.content_articles.generated_by is
  'AI Act art. 50(4) : origine du texte. human | ai | ai_assisted.';
comment on column public.content_articles.ai_disclosure is
  'AI Act art. 50(4) : signalement public du texte généré par IA.';
comment on column public.content_articles.editorial_review is
  'AI Act art. 50(4) : relecture humaine assumée — { reviewedBy, reviewedAt, responsibilityAccepted, note }.';
