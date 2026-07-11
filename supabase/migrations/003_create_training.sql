-- ============================================================
-- TRAINING SYSTEM
-- ============================================================

CREATE TABLE public.training_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  focus_attribute TEXT NOT NULL CHECK (focus_attribute IN ('pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical')),
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'canceled')),
  xp_gained INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial index for active training sessions
CREATE INDEX idx_training_active ON public.training_sessions(player_id, status) WHERE status = 'active';

ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view training sessions" 
  ON public.training_sessions FOR SELECT 
  USING (true);

CREATE POLICY "Service role can manage training" 
  ON public.training_sessions FOR ALL 
  USING (true)
  WITH CHECK (true);
