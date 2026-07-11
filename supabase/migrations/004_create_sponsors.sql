CREATE TABLE IF NOT EXISTS public.club_sponsors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  sponsor_id TEXT NOT NULL,
  sponsor_name TEXT NOT NULL,
  upfront_paid BIGINT NOT NULL DEFAULT 0,
  per_win_bonus INTEGER NOT NULL DEFAULT 0,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.club_sponsors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Club sponsors public read" ON public.club_sponsors FOR SELECT USING (true);
CREATE POLICY "Service role manages sponsors" ON public.club_sponsors FOR ALL USING (true) WITH CHECK (true);
