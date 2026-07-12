-- ============================================================
-- MORAL, FADIGA, ENVELHECIMENTO E ESTADIO UPGRADES
-- ============================================================

-- 1. MORAL e FADIGA nos jogadores
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS morale INTEGER NOT NULL DEFAULT 70 CHECK (morale >= 0 AND morale <= 100),
  ADD COLUMN IF NOT EXISTS condition_pct INTEGER NOT NULL DEFAULT 100 CHECK (condition_pct >= 0 AND condition_pct <= 100);

-- 2. ESTADIO UPGRADES: tabela de setores e upgrades
CREATE TABLE IF NOT EXISTS public.stadium_sectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stadium_id UUID NOT NULL REFERENCES public.stadiums(id) ON DELETE CASCADE,
  sector_name TEXT NOT NULL,          -- 'Norte', 'Sul', 'Leste', 'Oeste', 'Camarotes'
  capacity INTEGER NOT NULL DEFAULT 1000,
  level INTEGER NOT NULL DEFAULT 1,
  upgrade_cost BIGINT NOT NULL DEFAULT 2000000,
  revenue_per_match INTEGER NOT NULL DEFAULT 50000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default sectors for each stadium
INSERT INTO public.stadium_sectors (stadium_id, sector_name, capacity, level, upgrade_cost, revenue_per_match)
SELECT s.id, sector.name, sector.capacity, 1, sector.upgrade_cost, sector.revenue
FROM public.stadiums s
CROSS JOIN (
  VALUES 
    ('Setor Norte', 2000, 1500000, 40000),
    ('Setor Sul', 2000, 1500000, 40000),
    ('Setor Leste', 1500, 1200000, 30000),
    ('Setor Oeste', 1500, 1200000, 30000),
    ('Camarotes VIP', 200, 5000000, 100000)
) AS sector(name, capacity, upgrade_cost, revenue)
WHERE NOT EXISTS (
  SELECT 1 FROM public.stadium_sectors ss WHERE ss.stadium_id = s.id
);

-- RLS
ALTER TABLE public.stadium_sectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stadium sectors readable" ON public.stadium_sectors FOR SELECT USING (true);
CREATE POLICY "Service role manages sectors" ON public.stadium_sectors FOR ALL USING (true) WITH CHECK (true);

-- 3. SEGUNDA DIVISAO: adicionar division_level nas ligas
ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS division_level INTEGER NOT NULL DEFAULT 1; -- 1 = primeira, 2 = segunda
