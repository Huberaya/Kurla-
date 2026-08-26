-- ============================================================
-- KURLA BEAUTY - ASSISTANT IA PRODUCT
-- Consent-aware conversations, sources, feedback and human review.
-- ============================================================

ALTER TABLE public.advice_sessions ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'fr';
ALTER TABLE public.advice_sessions ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'FR';
ALTER TABLE public.advice_sessions ADD COLUMN IF NOT EXISTS memory_consent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.advice_sessions ADD COLUMN IF NOT EXISTS objective TEXT;
ALTER TABLE public.advice_sessions ADD COLUMN IF NOT EXISTS last_uncertainty TEXT;

ALTER TABLE public.advice_messages ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.advice_messages ADD COLUMN IF NOT EXISTS source_ids TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.advice_sessions(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.advice_messages(id) ON DELETE CASCADE,
  rating TEXT NOT NULL CHECK (rating IN ('helpful', 'incorrect', 'unsafe')),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_human_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.advice_sessions(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.advice_messages(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved')),
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewer_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advice_sessions_user_updated
  ON public.advice_sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_created
  ON public.ai_feedback(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_human_reviews_status_created
  ON public.ai_human_reviews(status, created_at ASC);

ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_human_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own AI feedback" ON public.ai_feedback;
CREATE POLICY "Users manage own AI feedback"
  ON public.ai_feedback
  FOR ALL USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users view own human reviews" ON public.ai_human_reviews;
CREATE POLICY "Users view own human reviews"
  ON public.ai_human_reviews
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users create human reviews" ON public.ai_human_reviews;
CREATE POLICY "Users create human reviews"
  ON public.ai_human_reviews
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage human reviews" ON public.ai_human_reviews;
CREATE POLICY "Admins manage human reviews"
  ON public.ai_human_reviews
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Conversation rows are only persisted for authenticated users who consent.
-- Remove the original broad policies first: PostgreSQL combines permissive
-- policies with OR, so leaving them would allow non-consented writes.
DROP POLICY IF EXISTS "Users access own AI advice sessions" ON public.advice_sessions;
DROP POLICY IF EXISTS "Users view own AI advice sessions" ON public.advice_sessions;
CREATE POLICY "Users view own AI advice sessions" ON public.advice_sessions
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Users create consented AI advice sessions" ON public.advice_sessions
  FOR INSERT WITH CHECK ((user_id = auth.uid() AND memory_consent = TRUE) OR public.is_admin());
CREATE POLICY "Users update own AI advice sessions" ON public.advice_sessions
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK ((user_id = auth.uid() AND memory_consent = TRUE) OR public.is_admin());
CREATE POLICY "Users delete own AI advice sessions" ON public.advice_sessions
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users access own AI messages" ON public.advice_messages;
DROP POLICY IF EXISTS "Users view own AI advice messages" ON public.advice_messages;
CREATE POLICY "Users view own AI advice messages" ON public.advice_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.advice_sessions s
      WHERE s.id = advice_messages.session_id AND (s.user_id = auth.uid() OR public.is_admin())
    )
  );
CREATE POLICY "Users create AI advice messages" ON public.advice_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.advice_sessions s
      WHERE s.id = advice_messages.session_id AND (s.user_id = auth.uid() AND s.memory_consent = TRUE OR public.is_admin())
    )
  );
