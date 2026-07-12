-- Add season tracking to leagues
ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS current_season INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS season_status TEXT NOT NULL DEFAULT 'active', -- 'active', 'finished'
  ADD COLUMN IF NOT EXISTS season_champion_id UUID REFERENCES public.clubs(id),
  ADD COLUMN IF NOT EXISTS season_started_at TIMESTAMPTZ DEFAULT NOW();

-- Create league_standings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.league_standings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  season INTEGER NOT NULL DEFAULT 1,
  played INTEGER NOT NULL DEFAULT 0,
  won INTEGER NOT NULL DEFAULT 0,
  drawn INTEGER NOT NULL DEFAULT 0,
  lost INTEGER NOT NULL DEFAULT 0,
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.league_standings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Standings readable by all" ON public.league_standings FOR SELECT USING (true);
CREATE POLICY "Service role manages standings" ON public.league_standings FOR ALL USING (true) WITH CHECK (true);

