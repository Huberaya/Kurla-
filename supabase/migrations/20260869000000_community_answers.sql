-- ============================================================
-- CHANTIER 11 (bloc C) — ENTRAIDE : RÉPONSES DES MEMBRES
--
-- Les questions produit existaient (20260833) mais ne pouvaient recevoir
-- qu'une réponse officielle (`answer`, `answered_by`). L'entraide entre
-- membres n'avait donc nulle part où s'écrire — et aucune route ne permettait
-- de lire les questions.
--
-- Parti pris, opposé aux mécanismes d'engagement classiques :
--   * pas de table de « likes » : le demandeur marque UNE réponse utile, ce
--     marquage n'est pas un compteur public ;
--   * pas d'abonnements ni de suivi de profil ;
--   * le rôle de l'auteur est stocké tel que déduit par le serveur (membre,
--     professionnel vérifié, équipe KURLA), jamais déclaré par l'auteur.
--
-- Migration additive : aucune colonne existante n'est modifiée.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.product_question_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES public.product_questions(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_role TEXT NOT NULL DEFAULT 'member'
    CHECK (author_role IN ('member', 'professional', 'kurla')),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 10 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_answers_question
  ON public.product_question_answers(question_id, created_at);
CREATE INDEX IF NOT EXISTS idx_question_answers_user
  ON public.product_question_answers(user_id);

-- La réponse que le demandeur a trouvée utile. Un seul marquage, par le
-- demandeur : la contrainte d'unicité vient de la colonne elle-même.
ALTER TABLE public.product_questions
  ADD COLUMN IF NOT EXISTS resolved_answer_id UUID
    REFERENCES public.product_question_answers(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- RLS : lecture publique des réponses (comme les questions répondues),
-- écriture par l'auteur uniquement.
-- ------------------------------------------------------------
ALTER TABLE public.product_question_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view question answers" ON public.product_question_answers;
CREATE POLICY "Public view question answers" ON public.product_question_answers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users answer product questions" ON public.product_question_answers;
CREATE POLICY "Users answer product questions" ON public.product_question_answers
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete their own answers" ON public.product_question_answers;
CREATE POLICY "Users delete their own answers" ON public.product_question_answers
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

-- Seul le demandeur marque la réponse utile ; l'administration peut réinitialiser.
DROP POLICY IF EXISTS "Asker resolves a question" ON public.product_questions;
CREATE POLICY "Asker resolves a question" ON public.product_questions
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

COMMENT ON TABLE public.product_question_answers IS
  'Entraide : réponses des membres aux questions produit. Rôle déduit par le serveur, jamais déclaré.';
COMMENT ON COLUMN public.product_questions.resolved_answer_id IS
  'Réponse signalée utile par le demandeur. Aucun compteur public n''en découle.';
