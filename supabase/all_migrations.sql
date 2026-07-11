
supabase\migrations\001_create_core_tables.sql


-- ============================================================
-- FootManager Online - Migration 001: Core Tables
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, is_active) WHERE is_active = TRUE
);

CREATE INDEX idx_contracts_player_id ON public.contracts(player_id);
CREATE INDEX idx_contracts_club_id ON public.contracts(club_id);
CREATE INDEX idx_contracts_end ON public.contracts(contract_end);

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

supabase\migrations\002_create_game_tables.sql


-- ============================================================
-- FootManager Online - Migration 002: Game Tables
-- ============================================================

-- ============================================================
-- COMPETITIONS (Champions League, Brasileirão, etc.)
-- ============================================================
CREATE TABLE public.competitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('league','domestic_cup','super_cup','continental','world')),
  scope TEXT NOT NULL DEFAULT 'national' CHECK (scope IN ('national','continental','global')),
  country TEXT,
  logo_url TEXT,
  prize_winner BIGINT NOT NULL DEFAULT 1000000,
  prize_runner_up BIGINT NOT NULL DEFAULT 500000,
  prize_participation BIGINT NOT NULL DEFAULT 100000,
  prestige INTEGER NOT NULL DEFAULT 50 CHECK (prestige BETWEEN 1 AND 100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COMPETITION SEASONS (each competition per season)
-- ============================================================
CREATE TABLE public.competition_seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pre' CHECK (status IN ('pre','active','finished')),
  winner_club_id UUID REFERENCES public.clubs(id),
  runner_up_club_id UUID REFERENCES public.clubs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(competition_id, season_id)
);

-- ============================================================
-- COMPETITION CLUBS (which clubs are in each competition)
-- ============================================================
CREATE TABLE public.competition_clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_season_id UUID NOT NULL REFERENCES public.competition_seasons(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  group_name TEXT, -- for group stages
  seeded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(competition_season_id, club_id)
);

-- ============================================================
-- MATCHES
-- ============================================================
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_season_id UUID REFERENCES public.competition_seasons(id),
  season_id UUID NOT NULL REFERENCES public.seasons(id),
  home_club_id UUID NOT NULL REFERENCES public.clubs(id),
  away_club_id UUID NOT NULL REFERENCES public.clubs(id),
  round TEXT,
  match_type TEXT NOT NULL DEFAULT 'league' CHECK (match_type IN ('league','cup','friendly','playoff')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  played_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','finished','postponed','cancelled')),
  home_score INTEGER,
  away_score INTEGER,
  home_score_ht INTEGER,
  away_score_ht INTEGER,
  home_lineup JSONB, -- {formation, players: [{player_id, position, is_captain}]}
  away_lineup JSONB,
  home_tactics JSONB, -- {mentality, pressing, defensive_line, style}
  away_tactics JSONB,
  match_report JSONB, -- full simulation data
  attendance INTEGER,
  weather TEXT DEFAULT 'clear' CHECK (weather IN ('clear','cloudy','rain','heavy_rain','wind','snow')),
  referee TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_match CHECK (home_club_id != away_club_id)
);

CREATE INDEX idx_matches_status ON public.matches(status);
CREATE INDEX idx_matches_scheduled ON public.matches(scheduled_at);
CREATE INDEX idx_matches_home ON public.matches(home_club_id);
CREATE INDEX idx_matches_away ON public.matches(away_club_id);

-- ============================================================
-- MATCH EVENTS
-- ============================================================
CREATE TABLE public.match_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  minute INTEGER NOT NULL CHECK (minute >= 0 AND minute <= 120),
  added_time INTEGER NOT NULL DEFAULT 0,
  event_type TEXT NOT NULL CHECK (event_type IN ('goal','own_goal','yellow_card','red_card','yellow_red','substitution','injury','var_review','penalty_miss','penalty_saved','save','chance')),
  player_id UUID REFERENCES public.players(id),
  assist_player_id UUID REFERENCES public.players(id),
  substituted_player_id UUID REFERENCES public.players(id),
  club_id UUID NOT NULL REFERENCES public.clubs(id),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_match_events_match ON public.match_events(match_id, minute);

-- ============================================================
-- COMPETITION STANDINGS
-- ============================================================
CREATE TABLE public.competition_standings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_season_id UUID NOT NULL REFERENCES public.competition_seasons(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  group_name TEXT,
  played INTEGER NOT NULL DEFAULT 0,
  won INTEGER NOT NULL DEFAULT 0,
  drawn INTEGER NOT NULL DEFAULT 0,
  lost INTEGER NOT NULL DEFAULT 0,
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  goal_difference INTEGER GENERATED ALWAYS AS (goals_for - goals_against) STORED,
  points INTEGER NOT NULL DEFAULT 0,
  form TEXT NOT NULL DEFAULT '', -- 'WWDLL'
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(competition_season_id, club_id)
);

CREATE INDEX idx_standings_comp ON public.competition_standings(competition_season_id, points DESC);

-- ============================================================
-- PLAYER STATISTICS (per season per competition)
-- ============================================================
CREATE TABLE public.player_statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id),
  season_id UUID NOT NULL REFERENCES public.seasons(id),
  competition_id UUID REFERENCES public.competitions(id),
  matches INTEGER NOT NULL DEFAULT 0,
  starts INTEGER NOT NULL DEFAULT 0,
  minutes_played INTEGER NOT NULL DEFAULT 0,
  goals INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  yellow_cards INTEGER NOT NULL DEFAULT 0,
  red_cards INTEGER NOT NULL DEFAULT 0,
  clean_sheets INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  penalty_saves INTEGER NOT NULL DEFAULT 0,
  man_of_match INTEGER NOT NULL DEFAULT 0,
  avg_rating DECIMAL(4,2) NOT NULL DEFAULT 6.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, club_id, season_id, competition_id)
);

-- ============================================================
-- PLAYER GROWTH (season-over-season)
-- ============================================================
CREATE TABLE public.player_growth (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id),
  club_id UUID NOT NULL REFERENCES public.clubs(id),
  overall_start INTEGER NOT NULL,
  overall_end INTEGER NOT NULL,
  potential_start INTEGER NOT NULL,
  potential_end INTEGER NOT NULL,
  minutes_played INTEGER NOT NULL DEFAULT 0,
  goals INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  training_sessions INTEGER NOT NULL DEFAULT 0,
  injuries_count INTEGER NOT NULL DEFAULT 0,
  morale_avg INTEGER NOT NULL DEFAULT 70,
  market_value_start BIGINT NOT NULL DEFAULT 0,
  market_value_end BIGINT NOT NULL DEFAULT 0,
  growth_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, season_id)
);

-- ============================================================
-- PLAYER HISTORY (transfer history)
-- ============================================================
CREATE TABLE public.player_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id),
  season_id UUID REFERENCES public.seasons(id),
  matches INTEGER NOT NULL DEFAULT 0,
  goals INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  clean_sheets INTEGER NOT NULL DEFAULT 0,
  average_rating DECIMAL(4,2) NOT NULL DEFAULT 6.00,
  joined_at TIMESTAMPTZ NOT NULL,
  left_at TIMESTAMPTZ,
  transfer_fee BIGINT DEFAULT 0,
  transfer_type TEXT DEFAULT 'transfer' CHECK (transfer_type IN ('transfer','loan','free','youth_promotion')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- YOUTH PLAYERS (base category)
-- ============================================================
CREATE TABLE public.youth_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nationality TEXT NOT NULL,
  birth_date DATE NOT NULL,
  position TEXT NOT NULL CHECK (position IN ('GK','CB','LB','RB','CDM','CM','CAM','LM','RM','LW','RW','ST','CF','SS')),
  potential_hidden INTEGER NOT NULL CHECK (potential_hidden BETWEEN 40 AND 99), -- real potential
  potential_visible TEXT NOT NULL DEFAULT 'unknown' CHECK (potential_visible IN ('unknown','low','medium','high','world_class','unknown')),
  characteristics TEXT[], -- ['Pacey', 'Technical', 'Strong', etc.]
  personality TEXT NOT NULL DEFAULT 'professional' CHECK (personality IN ('professional','ambitious','temperamental','lazy','leader','introvert')),
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','uncommon','rare','epic','legendary')),
  has_hidden_potential BOOLEAN NOT NULL DEFAULT FALSE,
  overall_estimate INTEGER NOT NULL DEFAULT 50,
  revealed_at TIMESTAMPTZ,
  promoted_at TIMESTAMPTZ,
  promoted_player_id UUID REFERENCES public.players(id),
  generation_seed TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_youth_club ON public.youth_players(club_id);

-- ============================================================
-- TRANSFER MARKET LISTINGS
-- ============================================================
CREATE TABLE public.market (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL UNIQUE REFERENCES public.players(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id),
  listing_price BIGINT NOT NULL,
  minimum_offer BIGINT,
  listing_type TEXT NOT NULL DEFAULT 'fixed' CHECK (listing_type IN ('fixed','negotiable','loan','auction')),
  loan_duration_weeks INTEGER, -- if loan
  listed_by_coach_id UUID REFERENCES public.coaches(id),
  listed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  views INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_market_active ON public.market(is_active, expires_at);
CREATE INDEX idx_market_player ON public.market(player_id);

-- ============================================================
-- TRANSFER OFFERS
-- ============================================================
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  from_club_id UUID NOT NULL REFERENCES public.clubs(id),
  to_club_id UUID NOT NULL REFERENCES public.clubs(id),
  from_coach_id UUID REFERENCES public.coaches(id),
  offered_amount BIGINT NOT NULL,
  installments INTEGER NOT NULL DEFAULT 1,
  installment_amount BIGINT,
  bonus_goals BIGINT DEFAULT 0,
  bonus_assists BIGINT DEFAULT 0,
  future_sale_percentage DECIMAL(5,2) DEFAULT 0, -- % of next sale
  proposed_weekly_salary INTEGER,
  proposed_contract_years DECIMAL(3,1) NOT NULL DEFAULT 2.0,
  counter_offer_amount BIGINT,
  offer_type TEXT NOT NULL DEFAULT 'buy' CHECK (offer_type IN ('buy','loan','swap','free')),
  swap_player_id UUID REFERENCES public.players(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','countered','expired','cancelled')),
  message TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '3 days'),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_offer CHECK (from_club_id != to_club_id)
);

CREATE INDEX idx_offers_player ON public.offers(player_id, status);
CREATE INDEX idx_offers_to_club ON public.offers(to_club_id, status);
CREATE INDEX idx_offers_from_club ON public.offers(from_club_id, status);

-- ============================================================
-- COMPLETED TRANSFERS
-- ============================================================
CREATE TABLE public.transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offer_id UUID REFERENCES public.offers(id),
  player_id UUID NOT NULL REFERENCES public.players(id),
  from_club_id UUID REFERENCES public.clubs(id),
  to_club_id UUID NOT NULL REFERENCES public.clubs(id),
  transfer_fee BIGINT NOT NULL DEFAULT 0,
  weekly_salary INTEGER NOT NULL,
  contract_years DECIMAL(3,1) NOT NULL,
  season_id UUID REFERENCES public.seasons(id),
  transfer_type TEXT NOT NULL DEFAULT 'transfer' CHECK (transfer_type IN ('transfer','loan','free','swap','youth_promotion')),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transfers_player ON public.transfers(player_id);

-- ============================================================
-- AUCTIONS
-- ============================================================
CREATE TABLE public.auctions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL UNIQUE REFERENCES public.players(id) ON DELETE CASCADE,
  seller_club_id UUID NOT NULL REFERENCES public.clubs(id),
  starting_price BIGINT NOT NULL,
  min_bid_increment BIGINT NOT NULL DEFAULT 100000,
  current_price BIGINT NOT NULL,
  highest_bidder_club_id UUID REFERENCES public.clubs(id),
  bid_count INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','active','ended','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUCTION BIDS
-- ============================================================
CREATE TABLE public.auction_bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id),
  coach_id UUID REFERENCES public.coaches(id),
  amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auction_bids_auction ON public.auction_bids(auction_id, created_at DESC);

-- ============================================================
-- TRAINING SESSIONS
-- ============================================================
CREATE TABLE public.training_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES public.coaches(id),
  session_date TIMESTAMPTZ NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('physical','technical','tactical','psychological','individual','position_group')),
  focus_position TEXT, -- NULL = all positions
  intensity TEXT NOT NULL DEFAULT 'medium' CHECK (intensity IN ('low','medium','high','maximum')),
  duration_minutes INTEGER NOT NULL DEFAULT 90,
  players_included UUID[], -- player IDs
  fatigue_impact INTEGER NOT NULL DEFAULT 5, -- percentage increase in fatigue
  morale_impact INTEGER NOT NULL DEFAULT 0,
  injury_risk_modifier DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  executed BOOLEAN NOT NULL DEFAULT FALSE,
  results JSONB, -- per player attribute changes
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_training_club ON public.training_sessions(club_id, session_date);

-- ============================================================
-- CLUB OWNERSHIP PROPOSALS
-- ============================================================
CREATE TABLE public.club_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_coach_id UUID NOT NULL REFERENCES public.coaches(id),
  to_coach_id UUID NOT NULL REFERENCES public.coaches(id),
  club_id UUID NOT NULL REFERENCES public.clubs(id),
  offered_amount BIGINT NOT NULL,
  counter_offer_amount BIGINT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','countered','expired')),
  message TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_proposal CHECK (from_coach_id != to_coach_id)
);

-- ============================================================
-- AWARDS
-- ============================================================
CREATE TABLE public.awards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID NOT NULL REFERENCES public.seasons(id),
  award_type TEXT NOT NULL CHECK (award_type IN ('best_coach','top_scorer','best_player','best_goalkeeper','best_young_player','golden_boot','champions_league','domestic_league','domestic_cup','fair_play','best_xi')),
  winner_club_id UUID REFERENCES public.clubs(id),
  winner_player_id UUID REFERENCES public.players(id),
  winner_coach_id UUID REFERENCES public.coaches(id),
  value BIGINT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- HISTORY LOG
-- ============================================================
CREATE TABLE public.history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('club','player','coach','competition','season')),
  entity_id UUID NOT NULL,
  season_id UUID REFERENCES public.seasons(id),
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_history_entity ON public.history(entity_type, entity_id, created_at DESC);

-- ============================================================
-- FANS & TICKETS
-- ============================================================
CREATE TABLE public.fans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL UNIQUE REFERENCES public.clubs(id) ON DELETE CASCADE,
  fanbase_size INTEGER NOT NULL DEFAULT 10000,
  happiness INTEGER NOT NULL DEFAULT 70 CHECK (happiness BETWEEN 0 AND 100),
  season_ticket_holders INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL UNIQUE REFERENCES public.matches(id) ON DELETE CASCADE,
  home_club_id UUID NOT NULL REFERENCES public.clubs(id),
  price_regular INTEGER NOT NULL DEFAULT 30,
  price_premium INTEGER NOT NULL DEFAULT 80,
  sold_regular INTEGER NOT NULL DEFAULT 0,
  sold_premium INTEGER NOT NULL DEFAULT 0,
  revenue BIGINT GENERATED ALWAYS AS ((sold_regular * price_regular + sold_premium * price_premium)::BIGINT) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RANKINGS
-- ============================================================
CREATE TABLE public.rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID NOT NULL REFERENCES public.seasons(id),
  rank_type TEXT NOT NULL CHECK (rank_type IN ('global_clubs','global_coaches','national_clubs','league_clubs','financial','youth')),
  club_id UUID REFERENCES public.clubs(id),
  coach_id UUID REFERENCES public.coaches(id),
  score DECIMAL(12,2) NOT NULL DEFAULT 0,
  position INTEGER NOT NULL,
  change_from_last INTEGER NOT NULL DEFAULT 0,
  scope TEXT, -- country or league name
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rankings_type ON public.rankings(rank_type, season_id, position);

-- ============================================================
-- ACHIEVEMENTS DEFINITIONS
-- ============================================================
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆',
  category TEXT NOT NULL CHECK (category IN ('matches','transfers','finances','players','competitions','social','special')),
  condition_type TEXT NOT NULL,
  condition_value INTEGER NOT NULL DEFAULT 1,
  reward_type TEXT DEFAULT 'badge' CHECK (reward_type IN ('badge','xp','money','title')),
  reward_value INTEGER DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COACH ACHIEVEMENTS
-- ============================================================
CREATE TABLE public.coach_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  progress INTEGER NOT NULL DEFAULT 0,
  UNIQUE(coach_id, achievement_id)
);

-- Seed basic achievements
INSERT INTO public.achievements (code, name, description, icon, category, condition_type, condition_value) VALUES
  ('first_win', 'Primeira Vitória', 'Vença sua primeira partida', '🥇', 'matches', 'wins', 1),
  ('win_10', '10 Vitórias', 'Vença 10 partidas', '🏆', 'matches', 'wins', 10),
  ('win_50', '50 Vitórias', 'Vença 50 partidas', '🌟', 'matches', 'wins', 50),
  ('win_100', '100 Vitórias', 'Vença 100 partidas', '👑', 'matches', 'wins', 100),
  ('first_transfer', 'Primeiro Negócio', 'Complete sua primeira transferência', '🤝', 'transfers', 'transfers', 1),
  ('big_signing', 'Grande Contratação', 'Contrate um jogador por mais de 50M', '💰', 'transfers', 'max_transfer_in', 50000000),
  ('big_sale', 'Grande Venda', 'Venda um jogador por mais de 50M', '💵', 'transfers', 'max_transfer_out', 50000000),
  ('youth_star', 'Revelação', 'Promova um jovem da base ao time principal', '⭐', 'players', 'youth_promotions', 1),
  ('league_title', 'Campeão Nacional', 'Vença um campeonato nacional', '🏅', 'competitions', 'league_titles', 1),
  ('champions_league', 'Rei da Europa', 'Vença a Champions League', '⚽', 'competitions', 'cl_titles', 1),
  ('unbeaten_run', 'Invicto', 'Fique 20 partidas sem perder', '🛡️', 'matches', 'unbeaten_streak', 20),
  ('millionaire', 'Milionário', 'Acumule 100M no caixa', '🤑', 'finances', 'cash_balance', 100000000);

supabase\migrations\003_create_social_tables.sql


-- ============================================================
-- FootManager Online - Migration 003: Social Tables
-- ============================================================

-- ============================================================
-- MESSAGES (private)
-- ============================================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  to_coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'personal' CHECK (message_type IN ('personal','transfer_offer','club_proposal','system','notification')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  thread_id UUID, -- for grouping conversations
  related_offer_id UUID REFERENCES public.offers(id),
  related_proposal_id UUID REFERENCES public.club_proposals(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_message CHECK (from_coach_id != to_coach_id)
);

CREATE INDEX idx_messages_to ON public.messages(to_coach_id, is_read, created_at DESC);
CREATE INDEX idx_messages_from ON public.messages(from_coach_id, created_at DESC);
CREATE INDEX idx_messages_thread ON public.messages(thread_id, created_at);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('match_result','transfer_offer','transfer_accepted','transfer_rejected','injury','contract_expiring','market_bid','auction_outbid','achievement','system','season_end','competition_result','message')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);

-- ============================================================
-- FRIENDSHIPS
-- ============================================================
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id_a UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  coach_id_b UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','blocked')),
  requested_by UUID NOT NULL REFERENCES public.coaches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_friendship CHECK (coach_id_a != coach_id_b),
  UNIQUE(coach_id_a, coach_id_b)
);

-- ============================================================
-- CHAT ROOMS
-- ============================================================
CREATE TABLE public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'global' CHECK (type IN ('global','national','league','private')),
  scope TEXT, -- country or league name for scoped rooms
  icon TEXT DEFAULT '💬',
  max_members INTEGER DEFAULT 1000,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default chat rooms
INSERT INTO public.chat_rooms (name, type, scope, icon) VALUES
  ('Chat Global', 'global', NULL, '🌍'),
  ('Mercado Global', 'global', NULL, '💹'),
  ('Brasil', 'national', 'BR', '🇧🇷'),
  ('Premier League', 'league', 'England - Premier League', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'),
  ('La Liga', 'league', 'Spain - La Liga', '🇪🇸'),
  ('Serie A', 'league', 'Italy - Serie A', '🇮🇹'),
  ('Bundesliga', 'league', 'Germany - Bundesliga', '🇩🇪');

-- ============================================================
-- CHAT MESSAGES
-- ============================================================
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (LENGTH(content) BETWEEN 1 AND 500),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_room ON public.chat_messages(room_id, created_at DESC);

-- ============================================================
-- AUDIT LOG (security)
-- ============================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_action ON public.audit_logs(action, created_at DESC);

-- ============================================================
-- ADMIN ACTIONS
-- ============================================================
CREATE TABLE public.admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES public.users(id),
  action_type TEXT NOT NULL CHECK (action_type IN ('punish_coach','reset_season','edit_player','edit_club','ban_user','unban_user','force_transfer','edit_finances','import_data','other')),
  target_type TEXT,
  target_id UUID,
  reason TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DATA IMPORTS (for admin CSV/JSON imports)
-- ============================================================
CREATE TABLE public.data_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES public.users(id),
  import_type TEXT NOT NULL CHECK (import_type IN ('clubs','players','leagues','competitions','squads','full')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  total_records INTEGER NOT NULL DEFAULT 0,
  processed_records INTEGER NOT NULL DEFAULT 0,
  failed_records INTEGER NOT NULL DEFAULT 0,
  errors JSONB DEFAULT '[]',
  source_file TEXT,
  source_url TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

supabase\migrations\004_create_rls_policies.sql


-- ============================================================
-- FootManager Online - Migration 004: Row Level Security
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_department ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_growth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youth_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get current user's coach ID
CREATE OR REPLACE FUNCTION public.get_my_coach_id()
RETURNS UUID AS $$
  SELECT id FROM public.coaches WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get current user's club ID
CREATE OR REPLACE FUNCTION public.get_my_club_id()
RETURNS UUID AS $$
  SELECT co.club_id 
  FROM public.club_owners co
  INNER JOIN public.coaches c ON c.id = co.coach_id
  WHERE c.user_id = auth.uid()
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT role = 'admin' FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- USERS POLICIES
-- ============================================================
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT USING (id = auth.uid() OR is_admin());

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE USING (id = auth.uid()) WITH CHECK (
    id = auth.uid() AND role = (SELECT role FROM public.users WHERE id = auth.uid())
  );

-- ============================================================
-- COACHES POLICIES
-- ============================================================
CREATE POLICY "Coaches are viewable by all authenticated users"
  ON public.coaches FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Coaches can only be created by their owner"
  ON public.coaches FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Coaches can only be updated by their owner"
  ON public.coaches FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- CLUBS POLICIES
-- ============================================================
CREATE POLICY "Clubs are viewable by all authenticated users"
  ON public.clubs FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Only admins can create/delete clubs"
  ON public.clubs FOR ALL USING (is_admin());

-- ============================================================
-- CLUB OWNERS POLICIES
-- ============================================================
CREATE POLICY "Club ownership viewable by all"
  ON public.club_owners FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Only admins can manage club ownership"
  ON public.club_owners FOR ALL USING (is_admin());

-- ============================================================
-- PLAYERS POLICIES
-- ============================================================
CREATE POLICY "Players viewable by all authenticated users"
  ON public.players FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Admins can manage players"
  ON public.players FOR ALL USING (is_admin());

-- ============================================================
-- CONTRACTS POLICIES
-- ============================================================
CREATE POLICY "Contracts viewable by all"
  ON public.contracts FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Club owners can manage their player contracts"
  ON public.contracts FOR ALL TO authenticated USING (
    club_id = get_my_club_id() OR is_admin()
  );

-- ============================================================
-- FINANCES POLICIES
-- ============================================================
CREATE POLICY "Club owners can view their own finances"
  ON public.finances FOR SELECT TO authenticated USING (
    club_id = get_my_club_id() OR is_admin()
  );

CREATE POLICY "Admins can manage all finances"
  ON public.finances FOR ALL USING (is_admin());

-- ============================================================
-- FINANCIAL TRANSACTIONS POLICIES
-- ============================================================
CREATE POLICY "Club owners can view their own transactions"
  ON public.financial_transactions FOR SELECT TO authenticated USING (
    club_id = get_my_club_id() OR is_admin()
  );

-- ============================================================
-- STAFF POLICIES
-- ============================================================
CREATE POLICY "Staff viewable by all"
  ON public.staff FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Club owners can manage their staff"
  ON public.staff FOR ALL TO authenticated USING (
    club_id = get_my_club_id() OR is_admin()
  );

-- ============================================================
-- SCOUTS POLICIES
-- ============================================================
CREATE POLICY "Club owners can manage their scouts"
  ON public.scouts FOR ALL TO authenticated USING (
    club_id = get_my_club_id() OR is_admin()
  );

-- ============================================================
-- MEDICAL POLICIES
-- ============================================================
CREATE POLICY "Club owners can view their medical records"
  ON public.medical_department FOR SELECT TO authenticated USING (
    club_id = get_my_club_id() OR is_admin()
  );

CREATE POLICY "Club owners can manage their medical records"
  ON public.medical_department FOR ALL TO authenticated USING (
    club_id = get_my_club_id() OR is_admin()
  );

-- ============================================================
-- MATCHES POLICIES
-- ============================================================
CREATE POLICY "Matches viewable by all"
  ON public.matches FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Admins can manage matches"
  ON public.matches FOR ALL USING (is_admin());

-- ============================================================
-- MATCH EVENTS POLICIES
-- ============================================================
CREATE POLICY "Match events viewable by all"
  ON public.match_events FOR SELECT TO authenticated USING (TRUE);

-- ============================================================
-- COMPETITION STANDINGS POLICIES
-- ============================================================
CREATE POLICY "Standings viewable by all"
  ON public.competition_standings FOR SELECT TO authenticated USING (TRUE);

-- ============================================================
-- PLAYER STATISTICS POLICIES
-- ============================================================
CREATE POLICY "Player statistics viewable by all"
  ON public.player_statistics FOR SELECT TO authenticated USING (TRUE);

-- ============================================================
-- YOUTH PLAYERS POLICIES
-- ============================================================
CREATE POLICY "Club owners can see their youth players"
  ON public.youth_players FOR SELECT TO authenticated USING (
    club_id = get_my_club_id() OR is_admin()
  );

CREATE POLICY "Club owners can manage their youth players"
  ON public.youth_players FOR ALL TO authenticated USING (
    club_id = get_my_club_id() OR is_admin()
  );

-- ============================================================
-- MARKET POLICIES
-- ============================================================
CREATE POLICY "Market listings viewable by all"
  ON public.market FOR SELECT TO authenticated USING (is_active = TRUE);

CREATE POLICY "Club owners can create market listings"
  ON public.market FOR INSERT TO authenticated WITH CHECK (
    club_id = get_my_club_id()
  );

CREATE POLICY "Club owners can manage their own listings"
  ON public.market FOR UPDATE TO authenticated USING (
    club_id = get_my_club_id() OR is_admin()
  );

-- ============================================================
-- OFFERS POLICIES
-- ============================================================
CREATE POLICY "Clubs can see offers they are part of"
  ON public.offers FOR SELECT TO authenticated USING (
    from_club_id = get_my_club_id() OR
    to_club_id = get_my_club_id() OR
    is_admin()
  );

CREATE POLICY "Club owners can make offers"
  ON public.offers FOR INSERT TO authenticated WITH CHECK (
    from_club_id = get_my_club_id()
  );

CREATE POLICY "Clubs can update offers they are part of"
  ON public.offers FOR UPDATE TO authenticated USING (
    from_club_id = get_my_club_id() OR
    to_club_id = get_my_club_id() OR
    is_admin()
  );

-- ============================================================
-- AUCTIONS POLICIES
-- ============================================================
CREATE POLICY "Auctions viewable by all"
  ON public.auctions FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Club owners can create auctions for their players"
  ON public.auctions FOR INSERT TO authenticated WITH CHECK (
    seller_club_id = get_my_club_id()
  );

CREATE POLICY "Auction bids viewable by all"
  ON public.auction_bids FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can place bids"
  ON public.auction_bids FOR INSERT TO authenticated WITH CHECK (
    club_id = get_my_club_id()
  );

-- ============================================================
-- TRAINING POLICIES
-- ============================================================
CREATE POLICY "Club owners can manage their training"
  ON public.training_sessions FOR ALL TO authenticated USING (
    club_id = get_my_club_id() OR is_admin()
  );

-- ============================================================
-- CLUB PROPOSALS POLICIES
-- ============================================================
CREATE POLICY "Coaches can see proposals they are part of"
  ON public.club_proposals FOR SELECT TO authenticated USING (
    from_coach_id = get_my_coach_id() OR
    to_coach_id = get_my_coach_id() OR
    is_admin()
  );

CREATE POLICY "Authenticated coaches can create proposals"
  ON public.club_proposals FOR INSERT TO authenticated WITH CHECK (
    from_coach_id = get_my_coach_id()
  );

CREATE POLICY "Coaches can update proposals they are part of"
  ON public.club_proposals FOR UPDATE TO authenticated USING (
    from_coach_id = get_my_coach_id() OR
    to_coach_id = get_my_coach_id() OR
    is_admin()
  );

-- ============================================================
-- MESSAGES POLICIES
-- ============================================================
CREATE POLICY "Users can see their own messages"
  ON public.messages FOR SELECT TO authenticated USING (
    from_coach_id = get_my_coach_id() OR
    to_coach_id = get_my_coach_id() OR
    is_admin()
  );

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT TO authenticated WITH CHECK (
    from_coach_id = get_my_coach_id()
  );

CREATE POLICY "Recipients can mark messages as read"
  ON public.messages FOR UPDATE TO authenticated USING (
    to_coach_id = get_my_coach_id()
  ) WITH CHECK (
    to_coach_id = get_my_coach_id() AND is_read = TRUE
  );

-- ============================================================
-- NOTIFICATIONS POLICIES
-- ============================================================
CREATE POLICY "Users can see their own notifications"
  ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can mark notifications as read"
  ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- CHAT MESSAGES POLICIES
-- ============================================================
CREATE POLICY "Chat messages viewable by authenticated users"
  ON public.chat_messages FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can send chat messages"
  ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (
    coach_id = get_my_coach_id()
  );

-- ============================================================
-- ACHIEVEMENTS POLICIES
-- ============================================================
CREATE POLICY "Coach achievements viewable by all"
  ON public.coach_achievements FOR SELECT TO authenticated USING (TRUE);

-- ============================================================
-- RANKINGS POLICIES
-- ============================================================
CREATE POLICY "Rankings viewable by all"
  ON public.rankings FOR SELECT TO authenticated USING (TRUE);

supabase\migrations\005_create_functions.sql


-- ============================================================
-- FootManager Online - Migration 005: Database Functions
-- ============================================================

-- ============================================================
-- FUNCTION: Complete a transfer atomically
-- ============================================================
CREATE OR REPLACE FUNCTION public.complete_transfer(
  p_offer_id UUID,
  p_player_id UUID,
  p_from_club_id UUID,
  p_to_club_id UUID,
  p_transfer_fee BIGINT,
  p_weekly_salary INTEGER,
  p_contract_years DECIMAL,
  p_transfer_type TEXT DEFAULT 'transfer'
) RETURNS JSONB AS $$
DECLARE
  v_transfer_id UUID;
  v_from_balance BIGINT;
  v_to_balance BIGINT;
BEGIN
  -- Check from_club has enough money
  IF p_transfer_fee > 0 AND p_from_club_id IS NOT NULL THEN
    SELECT cash_balance INTO v_from_balance FROM public.finances WHERE club_id = p_to_club_id;
    IF v_from_balance < p_transfer_fee THEN
      RAISE EXCEPTION 'Insufficient funds: club has % but transfer costs %', v_from_balance, p_transfer_fee;
    END IF;
  END IF;

  -- 1. Terminate old contract
  UPDATE public.contracts SET is_active = FALSE
  WHERE player_id = p_player_id AND is_active = TRUE;

  -- 2. Update player's club
  UPDATE public.players SET
    club_id = p_to_club_id,
    status = 'active',
    updated_at = NOW()
  WHERE id = p_player_id;

  -- 3. Create new contract
  INSERT INTO public.contracts (player_id, club_id, weekly_salary, contract_start, contract_end)
  VALUES (
    p_player_id,
    p_to_club_id,
    p_weekly_salary,
    CURRENT_DATE,
    CURRENT_DATE + (p_contract_years * 365)::INTEGER
  );

  -- 4. Deduct from buying club's finances
  IF p_transfer_fee > 0 AND p_from_club_id IS NOT NULL THEN
    UPDATE public.finances SET
      cash_balance = cash_balance - p_transfer_fee,
      transfer_budget = GREATEST(0, transfer_budget - p_transfer_fee),
      transfer_expenditure = transfer_expenditure + p_transfer_fee,
      updated_at = NOW()
    WHERE club_id = p_to_club_id;

    INSERT INTO public.financial_transactions
      (club_id, type, category, amount, description, reference_id, reference_type, balance_after)
    SELECT
      p_to_club_id, 'expense', 'transfer', p_transfer_fee,
      'Transferência recebida: jogador adquirido',
      p_offer_id, 'offer',
      cash_balance
    FROM public.finances WHERE club_id = p_to_club_id;

    -- 5. Add to selling club's finances
    IF p_from_club_id IS NOT NULL THEN
      UPDATE public.finances SET
        cash_balance = cash_balance + p_transfer_fee,
        transfer_income = transfer_income + p_transfer_fee,
        updated_at = NOW()
      WHERE club_id = p_from_club_id;

      INSERT INTO public.financial_transactions
        (club_id, type, category, amount, description, reference_id, reference_type, balance_after)
      SELECT
        p_from_club_id, 'income', 'transfer', p_transfer_fee,
        'Venda de jogador',
        p_offer_id, 'offer',
        cash_balance
      FROM public.finances WHERE club_id = p_from_club_id;
    END IF;
  END IF;

  -- 6. Record transfer
  INSERT INTO public.transfers
    (offer_id, player_id, from_club_id, to_club_id, transfer_fee, weekly_salary, contract_years, transfer_type)
  VALUES
    (p_offer_id, p_player_id, p_from_club_id, p_to_club_id, p_transfer_fee, p_weekly_salary, p_contract_years, p_transfer_type)
  RETURNING id INTO v_transfer_id;

  -- 7. Update offer status
  IF p_offer_id IS NOT NULL THEN
    UPDATE public.offers SET status = 'accepted', responded_at = NOW() WHERE id = p_offer_id;
  END IF;

  -- 8. Remove market listing if exists
  UPDATE public.market SET is_active = FALSE WHERE player_id = p_player_id;

  -- 9. Update player history
  UPDATE public.player_history SET left_at = NOW()
  WHERE player_id = p_player_id AND left_at IS NULL AND club_id = p_from_club_id;

  INSERT INTO public.player_history (player_id, club_id, joined_at, transfer_fee, transfer_type)
  VALUES (p_player_id, p_to_club_id, NOW(), p_transfer_fee, p_transfer_type);

  RETURN jsonb_build_object('success', TRUE, 'transfer_id', v_transfer_id);

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Transfer failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Process weekly wages for a club
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_weekly_wages(p_club_id UUID)
RETURNS BIGINT AS $$
DECLARE
  v_total_wages BIGINT := 0;
  v_staff_wages BIGINT := 0;
  v_balance BIGINT;
BEGIN
  -- Calculate player wages
  SELECT COALESCE(SUM(c.weekly_salary), 0) INTO v_total_wages
  FROM public.contracts c
  WHERE c.club_id = p_club_id AND c.is_active = TRUE;

  -- Calculate staff wages
  SELECT COALESCE(SUM(s.weekly_salary), 0) INTO v_staff_wages
  FROM public.staff s
  WHERE s.club_id = p_club_id AND s.is_active = TRUE;

  v_total_wages := v_total_wages + v_staff_wages;

  -- Deduct from club finances
  UPDATE public.finances SET
    cash_balance = cash_balance - v_total_wages,
    weekly_wage_bill = v_total_wages,
    updated_at = NOW()
  WHERE club_id = p_club_id
  RETURNING cash_balance INTO v_balance;

  -- Log transaction
  INSERT INTO public.financial_transactions
    (club_id, type, category, amount, description, balance_after)
  VALUES
    (p_club_id, 'expense', 'salary', v_total_wages, 'Folha salarial semanal', v_balance);

  RETURN v_total_wages;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Update competition standings after a match
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_standings_after_match()
RETURNS TRIGGER AS $$
DECLARE
  v_home_pts INTEGER := 0;
  v_away_pts INTEGER := 0;
BEGIN
  IF NEW.status = 'finished' AND NEW.competition_season_id IS NOT NULL THEN
    -- Determine points
    IF NEW.home_score > NEW.away_score THEN
      v_home_pts := 3; v_away_pts := 0;
    ELSIF NEW.home_score = NEW.away_score THEN
      v_home_pts := 1; v_away_pts := 1;
    ELSE
      v_home_pts := 0; v_away_pts := 3;
    END IF;

    -- Upsert home team standings
    INSERT INTO public.competition_standings
      (competition_season_id, club_id, played, won, drawn, lost, goals_for, goals_against, points)
    VALUES (
      NEW.competition_season_id, NEW.home_club_id, 1,
      CASE WHEN NEW.home_score > NEW.away_score THEN 1 ELSE 0 END,
      CASE WHEN NEW.home_score = NEW.away_score THEN 1 ELSE 0 END,
      CASE WHEN NEW.home_score < NEW.away_score THEN 1 ELSE 0 END,
      NEW.home_score, NEW.away_score, v_home_pts
    )
    ON CONFLICT (competition_season_id, club_id) DO UPDATE SET
      played = competition_standings.played + 1,
      won = competition_standings.won + CASE WHEN NEW.home_score > NEW.away_score THEN 1 ELSE 0 END,
      drawn = competition_standings.drawn + CASE WHEN NEW.home_score = NEW.away_score THEN 1 ELSE 0 END,
      lost = competition_standings.lost + CASE WHEN NEW.home_score < NEW.away_score THEN 1 ELSE 0 END,
      goals_for = competition_standings.goals_for + NEW.home_score,
      goals_against = competition_standings.goals_against + NEW.away_score,
      points = competition_standings.points + v_home_pts,
      updated_at = NOW();

    -- Upsert away team standings
    INSERT INTO public.competition_standings
      (competition_season_id, club_id, played, won, drawn, lost, goals_for, goals_against, points)
    VALUES (
      NEW.competition_season_id, NEW.away_club_id, 1,
      CASE WHEN NEW.away_score > NEW.home_score THEN 1 ELSE 0 END,
      CASE WHEN NEW.away_score = NEW.home_score THEN 1 ELSE 0 END,
      CASE WHEN NEW.away_score < NEW.home_score THEN 1 ELSE 0 END,
      NEW.away_score, NEW.home_score, v_away_pts
    )
    ON CONFLICT (competition_season_id, club_id) DO UPDATE SET
      played = competition_standings.played + 1,
      won = competition_standings.won + CASE WHEN NEW.away_score > NEW.home_score THEN 1 ELSE 0 END,
      drawn = competition_standings.drawn + CASE WHEN NEW.away_score = NEW.home_score THEN 1 ELSE 0 END,
      lost = competition_standings.lost + CASE WHEN NEW.away_score < NEW.home_score THEN 1 ELSE 0 END,
      goals_for = competition_standings.goals_for + NEW.away_score,
      goals_against = competition_standings.goals_against + NEW.home_score,
      points = competition_standings.points + v_away_pts,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_standings
  AFTER UPDATE ON public.matches
  FOR EACH ROW
  WHEN (OLD.status != 'finished' AND NEW.status = 'finished')
  EXECUTE FUNCTION public.update_standings_after_match();

-- ============================================================
-- FUNCTION: Generate notifications on key events
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_offer()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_player_name TEXT;
  v_from_club_name TEXT;
BEGIN
  -- Get user_id from to_club's coach
  SELECT u.id INTO v_user_id
  FROM public.users u
  INNER JOIN public.coaches c ON c.user_id = u.id
  INNER JOIN public.club_owners co ON co.coach_id = c.id
  WHERE co.club_id = NEW.to_club_id;

  SELECT name INTO v_player_name FROM public.players WHERE id = NEW.player_id;
  SELECT name INTO v_from_club_name FROM public.clubs WHERE id = NEW.from_club_id;

  IF v_user_id IS NOT NULL AND TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, type, title, body, data, action_url)
    VALUES (
      v_user_id,
      'transfer_offer',
      'Nova Proposta de Transferência',
      format('%s quer contratar %s por €%s', v_from_club_name, v_player_name, NEW.offered_amount),
      jsonb_build_object('offer_id', NEW.id, 'player_id', NEW.player_id),
      '/market/offers'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_on_offer
  AFTER INSERT ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_offer();

-- ============================================================
-- FUNCTION: Claim a club (assign coach to club)
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_club(p_club_id UUID, p_coach_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_current_owner UUID;
  v_coach_current_club UUID;
BEGIN
  -- Check coach doesn't already own a club
  SELECT co.club_id INTO v_coach_current_club
  FROM public.club_owners co WHERE co.coach_id = p_coach_id;
  
  IF v_coach_current_club IS NOT NULL THEN
    RAISE EXCEPTION 'Coach already owns a club';
  END IF;

  -- Check club is not owned by a human (only AI)
  SELECT co.coach_id INTO v_current_owner
  FROM public.club_owners co WHERE co.club_id = p_club_id;

  IF v_current_owner IS NOT NULL THEN
    -- Check if the current owner is human (has user_id)
    IF EXISTS (SELECT 1 FROM public.coaches WHERE id = v_current_owner AND user_id IS NOT NULL) THEN
      RAISE EXCEPTION 'Club is already owned by another coach';
    END IF;
  END IF;

  -- Assign club to coach
  INSERT INTO public.club_owners (club_id, coach_id, acquired_at)
  VALUES (p_club_id, p_coach_id, NOW())
  ON CONFLICT (club_id) DO UPDATE SET
    coach_id = p_coach_id,
    acquired_at = NOW(),
    seasons_managed = 0,
    is_for_sale = FALSE,
    selling_price = NULL;

  -- Update club AI flag
  UPDATE public.clubs SET is_ai_controlled = FALSE WHERE id = p_club_id;

  -- Log history
  INSERT INTO public.history (entity_type, entity_id, event_type, event_data)
  VALUES ('club', p_club_id, 'new_owner', jsonb_build_object('coach_id', p_coach_id));

  RETURN jsonb_build_object('success', TRUE, 'club_id', p_club_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Calculate player market value
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_market_value(p_overall INTEGER, p_age INTEGER, p_potential INTEGER)
RETURNS BIGINT AS $$
DECLARE
  v_base BIGINT;
  v_age_factor DECIMAL;
  v_potential_factor DECIMAL;
BEGIN
  -- Base value from overall
  v_base := CASE
    WHEN p_overall >= 90 THEN 80000000
    WHEN p_overall >= 85 THEN 40000000
    WHEN p_overall >= 80 THEN 20000000
    WHEN p_overall >= 75 THEN 10000000
    WHEN p_overall >= 70 THEN 5000000
    WHEN p_overall >= 65 THEN 2000000
    WHEN p_overall >= 60 THEN 1000000
    ELSE 500000
  END;

  -- Age factor (peak at 26-28)
  v_age_factor := CASE
    WHEN p_age BETWEEN 23 AND 27 THEN 1.0
    WHEN p_age BETWEEN 20 AND 22 THEN 0.85
    WHEN p_age BETWEEN 28 AND 30 THEN 0.9
    WHEN p_age BETWEEN 18 AND 19 THEN 0.7
    WHEN p_age BETWEEN 31 AND 33 THEN 0.7
    WHEN p_age BETWEEN 34 AND 35 THEN 0.5
    ELSE 0.3
  END;

  -- Potential bonus for young players
  v_potential_factor := CASE
    WHEN p_potential - p_overall >= 15 AND p_age < 24 THEN 1.4
    WHEN p_potential - p_overall >= 10 AND p_age < 26 THEN 1.2
    WHEN p_potential - p_overall >= 5 THEN 1.1
    ELSE 1.0
  END;

  RETURN (v_base * v_age_factor * v_potential_factor)::BIGINT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

supabase\migrations\006_create_triggers.sql


-- ============================================================
-- FootManager Online - Migration 006: Triggers
-- ============================================================

-- ============================================================
-- TRIGGER: Validate max clubs in a league
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_league_capacity()
RETURNS TRIGGER AS $$
DECLARE
  v_current_count INTEGER;
  v_max_count INTEGER;
BEGIN
  IF NEW.league_id IS NOT NULL THEN
    SELECT max_clubs INTO v_max_count FROM public.leagues WHERE id = NEW.league_id;
    SELECT COUNT(*) INTO v_current_count FROM public.clubs WHERE league_id = NEW.league_id AND id != NEW.id;
    
    IF v_current_count >= v_max_count THEN
      RAISE EXCEPTION 'League is full (max % clubs)', v_max_count;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_league_capacity
  BEFORE INSERT OR UPDATE OF league_id ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.check_league_capacity();

-- ============================================================
-- TRIGGER: Initialize club finances on creation
-- ============================================================
CREATE OR REPLACE FUNCTION public.init_club_finances()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.finances (club_id, cash_balance, transfer_budget)
  VALUES (NEW.id, 100000000, 25000000);
  
  INSERT INTO public.fans (club_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_init_club_finances
  AFTER INSERT ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.init_club_finances();

-- ============================================================
-- TRIGGER: Update club owner on proposal accept
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_club_proposal()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Transfer ownership
    PERFORM public.claim_club(NEW.club_id, NEW.from_coach_id);
    
    -- Generate system message to old owner if human
    IF NEW.to_coach_id IS NOT NULL THEN
      INSERT INTO public.messages (from_coach_id, to_coach_id, subject, body, message_type)
      VALUES (
        NEW.from_coach_id, 
        NEW.to_coach_id, 
        'Clube Vendido', 
        'Sua proposta pelo clube foi aceita.', 
        'system'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_process_club_proposal
  AFTER UPDATE OF status ON public.club_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.process_club_proposal();

-- ============================================================
-- TRIGGER: Calculate match tickets revenue
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_match_tickets()
RETURNS TRIGGER AS $$
DECLARE
  v_capacity INTEGER;
  v_prestige INTEGER;
  v_loyalty INTEGER;
  v_attendance INTEGER;
BEGIN
  -- Only create ticket entry if it's a scheduled competitive match
  IF NEW.match_type IN ('league', 'cup', 'continental') THEN
    -- Get stadium details
    SELECT s.capacity, c.prestige, c.fan_loyalty
    INTO v_capacity, v_prestige, v_loyalty
    FROM public.clubs c
    LEFT JOIN public.stadiums s ON s.id = c.stadium_id
    WHERE c.id = NEW.home_club_id;
    
    -- Rough attendance calculation based on prestige and loyalty
    v_attendance := LEAST(v_capacity, v_capacity * ((v_prestige + v_loyalty) / 200.0));
    
    INSERT INTO public.tickets (match_id, home_club_id, sold_regular, sold_premium)
    VALUES (NEW.id, NEW.home_club_id, (v_attendance * 0.9)::INTEGER, (v_attendance * 0.1)::INTEGER);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_match_tickets
  AFTER INSERT ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_match_tickets();

-- ============================================================
-- TRIGGER: Pay out ticket revenue when match finishes
-- ============================================================
CREATE OR REPLACE FUNCTION public.payout_ticket_revenue()
RETURNS TRIGGER AS $$
DECLARE
  v_revenue BIGINT;
BEGIN
  IF OLD.status != 'finished' AND NEW.status = 'finished' THEN
    SELECT revenue INTO v_revenue FROM public.tickets WHERE match_id = NEW.id;
    
    IF v_revenue > 0 THEN
      UPDATE public.finances SET 
        cash_balance = cash_balance + v_revenue,
        stadium_revenue = stadium_revenue + v_revenue
      WHERE club_id = NEW.home_club_id;
      
      INSERT INTO public.financial_transactions (club_id, type, category, amount, description, reference_id, reference_type, balance_after)
      SELECT NEW.home_club_id, 'income', 'ticket', v_revenue, 'Receita de bilheteria', NEW.id, 'match', cash_balance
      FROM public.finances WHERE club_id = NEW.home_club_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payout_ticket_revenue
  AFTER UPDATE OF status ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.payout_ticket_revenue();
