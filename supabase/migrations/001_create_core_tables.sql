-- ============================================================
-- FootManager Online - Migration 001: Core Tables
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- pg_cron is managed by Supabase, skip if unavailable
-- CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT UNIQUE,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'moderator', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COACHES
-- ============================================================
CREATE TABLE public.coaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nationality TEXT NOT NULL,
  photo_url TEXT,
  country TEXT NOT NULL,
  experience_points INTEGER NOT NULL DEFAULT 0,
  reputation INTEGER NOT NULL DEFAULT 50 CHECK (reputation BETWEEN 0 AND 100),
  coaching_style TEXT DEFAULT 'balanced' CHECK (coaching_style IN ('attack', 'balanced', 'defense', 'possession', 'counter')),
  preferred_formation TEXT DEFAULT '4-3-3',
  wins INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  total_transfers INTEGER NOT NULL DEFAULT 0,
  hall_of_fame BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SEASONS
-- ============================================================
CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_number INTEGER NOT NULL UNIQUE,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  current_week INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pre' CHECK (status IN ('pre', 'active', 'post', 'finished')),
  is_transfer_window_open BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LEAGUES / COMPETITIONS STRUCTURE
-- ============================================================
CREATE TABLE public.leagues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  country TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  max_clubs INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STADIUMS
-- ============================================================
CREATE TABLE public.stadiums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 30000,
  current_occupancy_rate DECIMAL(5,2) NOT NULL DEFAULT 75.00,
  pitch_quality INTEGER NOT NULL DEFAULT 50 CHECK (pitch_quality BETWEEN 1 AND 100),
  facilities_level INTEGER NOT NULL DEFAULT 1 CHECK (facilities_level BETWEEN 1 AND 10),
  expansion_cost BIGINT NOT NULL DEFAULT 5000000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CLUBS
-- ============================================================
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  league_id UUID REFERENCES public.leagues(id),
  stadium_id UUID REFERENCES public.stadiums(id),
  badge_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#1a1a2e',
  secondary_color TEXT NOT NULL DEFAULT '#16213e',
  founded_year INTEGER,
  prestige INTEGER NOT NULL DEFAULT 50 CHECK (prestige BETWEEN 1 AND 100),
  fan_loyalty INTEGER NOT NULL DEFAULT 50 CHECK (fan_loyalty BETWEEN 1 AND 100),
  infrastructure INTEGER NOT NULL DEFAULT 50 CHECK (infrastructure BETWEEN 1 AND 100),
  youth_academy INTEGER NOT NULL DEFAULT 50 CHECK (youth_academy BETWEEN 1 AND 100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_ai_controlled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CLUB OWNERS (each club has at most one owner)
-- ============================================================
CREATE TABLE public.club_owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL UNIQUE REFERENCES public.clubs(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
  acquired_at TIMESTAMPTZ,
  selling_price BIGINT,
  is_for_sale BOOLEAN NOT NULL DEFAULT FALSE,
  seasons_managed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PLAYERS (each player exists only once in the server)
-- ============================================================
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT UNIQUE, -- from import source
  name TEXT NOT NULL,
  full_name TEXT,
  nationality TEXT NOT NULL,
  second_nationality TEXT,
  birth_date DATE NOT NULL,
  position TEXT NOT NULL CHECK (position IN ('GK','CB','LB','RB','CDM','CM','CAM','LM','RM','LW','RW','ST','CF','SS')),
  height_cm INTEGER,
  weight_kg INTEGER,
  dominant_foot TEXT DEFAULT 'right' CHECK (dominant_foot IN ('left', 'right', 'both')),
  -- Overall Attributes (0-99)
  overall INTEGER NOT NULL DEFAULT 60 CHECK (overall BETWEEN 1 AND 99),
  potential INTEGER NOT NULL DEFAULT 70 CHECK (potential BETWEEN 1 AND 99),
  -- Technical
  pace INTEGER NOT NULL DEFAULT 60 CHECK (pace BETWEEN 1 AND 99),
  shooting INTEGER NOT NULL DEFAULT 60 CHECK (shooting BETWEEN 1 AND 99),
  passing INTEGER NOT NULL DEFAULT 60 CHECK (passing BETWEEN 1 AND 99),
  dribbling INTEGER NOT NULL DEFAULT 60 CHECK (dribbling BETWEEN 1 AND 99),
  defending INTEGER NOT NULL DEFAULT 60 CHECK (defending BETWEEN 1 AND 99),
  physical INTEGER NOT NULL DEFAULT 60 CHECK (physical BETWEEN 1 AND 99),
  -- Extra attributes
  technique INTEGER NOT NULL DEFAULT 60 CHECK (technique BETWEEN 1 AND 99),
  stamina INTEGER NOT NULL DEFAULT 60 CHECK (stamina BETWEEN 1 AND 99),
  experience INTEGER NOT NULL DEFAULT 0 CHECK (experience BETWEEN 0 AND 100),
  morale INTEGER NOT NULL DEFAULT 70 CHECK (morale BETWEEN 0 AND 100),
  fitness INTEGER NOT NULL DEFAULT 100 CHECK (fitness BETWEEN 0 AND 100),
  -- Career
  market_value BIGINT NOT NULL DEFAULT 1000000,
  weekly_salary INTEGER NOT NULL DEFAULT 5000,
  -- Club
  club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'injured', 'suspended', 'on_loan', 'retired', 'free_agent')),
  is_youth BOOLEAN NOT NULL DEFAULT FALSE,
  is_real_player BOOLEAN NOT NULL DEFAULT FALSE,
  photo_url TEXT,
  -- Meta
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast club squad queries
CREATE INDEX idx_players_club_id ON public.players(club_id);
CREATE INDEX idx_players_status ON public.players(status);
CREATE INDEX idx_players_position ON public.players(position);
CREATE INDEX idx_players_overall ON public.players(overall DESC);

-- ============================================================
-- CONTRACTS
-- ============================================================
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  weekly_salary INTEGER NOT NULL DEFAULT 5000,
  contract_start DATE NOT NULL,
  contract_end DATE NOT NULL,
  release_clause BIGINT,
  bonus_goals INTEGER DEFAULT 0,
  bonus_assists INTEGER DEFAULT 0,
  bonus_clean_sheets INTEGER DEFAULT 0,
  is_loan BOOLEAN NOT NULL DEFAULT FALSE,
  loan_return_date DATE,
  parent_club_id UUID REFERENCES public.clubs(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contracts_player_id ON public.contracts(player_id);
CREATE INDEX idx_contracts_club_id ON public.contracts(club_id);
CREATE INDEX idx_contracts_end ON public.contracts(contract_end);
-- Partial unique index: one active contract per player
CREATE UNIQUE INDEX idx_contracts_one_active ON public.contracts(player_id) WHERE is_active = TRUE;

-- ============================================================
-- FINANCES
-- ============================================================
CREATE TABLE public.finances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL UNIQUE REFERENCES public.clubs(id) ON DELETE CASCADE,
  cash_balance BIGINT NOT NULL DEFAULT 50000000,
  transfer_budget BIGINT NOT NULL DEFAULT 20000000,
  weekly_wage_bill INTEGER NOT NULL DEFAULT 0,
  stadium_revenue BIGINT NOT NULL DEFAULT 0,
  sponsorship_income BIGINT NOT NULL DEFAULT 0,
  tv_rights_income BIGINT NOT NULL DEFAULT 0,
  competition_prizes BIGINT NOT NULL DEFAULT 0,
  merchandise_revenue BIGINT NOT NULL DEFAULT 0,
  transfer_income BIGINT NOT NULL DEFAULT 0,
  transfer_expenditure BIGINT NOT NULL DEFAULT 0,
  debt BIGINT NOT NULL DEFAULT 0,
  credit_rating TEXT NOT NULL DEFAULT 'B' CHECK (credit_rating IN ('AAA','AA','A','BBB','BB','B','CCC','D')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FINANCIAL TRANSACTIONS (audit log)
-- ============================================================
CREATE TABLE public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  category TEXT NOT NULL CHECK (category IN ('transfer','salary','prize','sponsorship','ticket','tv_rights','youth','merchandise','stadium','medical','training','debt','other')),
  amount BIGINT NOT NULL,
  description TEXT NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  balance_after BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_financial_transactions_club ON public.financial_transactions(club_id, created_at DESC);

-- ============================================================
-- SPONSORS
-- ============================================================
CREATE TABLE public.sponsors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  sponsor_name TEXT NOT NULL,
  sponsor_type TEXT NOT NULL CHECK (sponsor_type IN ('shirt','training_kit','stadium_naming','equipment','regional')),
  annual_value BIGINT NOT NULL,
  contract_start DATE NOT NULL,
  contract_end DATE NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STAFF
-- ============================================================
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('assistant_coach','goalkeeper_coach','fitness_coach','physio','chief_scout','youth_coach','analyst','sports_director')),
  quality INTEGER NOT NULL DEFAULT 50 CHECK (quality BETWEEN 1 AND 100),
  weekly_salary INTEGER NOT NULL DEFAULT 2000,
  contract_until DATE,
  nationality TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SCOUTS
-- ============================================================
CREATE TABLE public.scouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id),
  name TEXT NOT NULL,
  assigned_country TEXT,
  assigned_league_id UUID REFERENCES public.leagues(id),
  discovery_rate INTEGER NOT NULL DEFAULT 50 CHECK (discovery_rate BETWEEN 1 AND 100),
  discovery_quality INTEGER NOT NULL DEFAULT 50 CHECK (discovery_quality BETWEEN 1 AND 100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  active_since TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MEDICAL DEPARTMENT
-- ============================================================
CREATE TABLE public.medical_department (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  injury_type TEXT NOT NULL CHECK (injury_type IN ('muscular','ligament','fracture','concussion','fatigue','suspension')),
  severity TEXT NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor','moderate','major','critical')),
  injured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_return TIMESTAMPTZ NOT NULL,
  actual_return TIMESTAMPTZ,
  treatment_cost INTEGER NOT NULL DEFAULT 0,
  treatment_notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medical_player ON public.medical_department(player_id, is_active);
CREATE INDEX idx_medical_club ON public.medical_department(club_id, is_active);

-- ============================================================
-- TRIGGERS: updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_coaches_updated_at BEFORE UPDATE ON public.coaches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_clubs_updated_at BEFORE UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_players_updated_at BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_club_owners_updated_at BEFORE UPDATE ON public.club_owners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_stadiums_updated_at BEFORE UPDATE ON public.stadiums
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_finances_updated_at BEFORE UPDATE ON public.finances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- FUNCTION: Create user record on auth signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, avatar_url)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
