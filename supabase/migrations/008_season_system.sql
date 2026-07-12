-- Add season tracking to leagues
ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS current_season INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS season_status TEXT NOT NULL DEFAULT 'active', -- 'active', 'finished'
  ADD COLUMN IF NOT EXISTS season_champion_id UUID REFERENCES public.clubs(id),
  ADD COLUMN IF NOT EXISTS season_started_at TIMESTAMPTZ DEFAULT NOW();

-- Add season number to league_standings
ALTER TABLE public.league_standings
  ADD COLUMN IF NOT EXISTS season INTEGER NOT NULL DEFAULT 1;
