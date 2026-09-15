-- CHANTIER C3 (15/09/2026) — LIAISON CANDIDAT SOURCING ↔ FICHE CATALOGUE.
-- « La liaison n'est pas une vue mais une clé » (étude pipeline, §3.4) :
-- une fiche créée depuis un candidat porte son identifiant d'origine, et le
-- candidat porte l'identifiant de la fiche draft générée. Les deux colonnes
-- sont nulles par défaut : aucune donnée existante n'est modifiée.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source_candidate_id text;

ALTER TABLE public.sourcing_product_candidates ADD COLUMN IF NOT EXISTS draft_product_id text;
