-- ============================================================
-- MATCH EVENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.match_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'goal', 'yellow_card', 'red_card'
  minute INTEGER NOT NULL,
  club_id UUID NOT NULL,
  player_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Match events readable by all" ON public.match_events FOR SELECT USING (true);
CREATE POLICY "Service role inserts events" ON public.match_events FOR ALL USING (true) WITH CHECK (true);
