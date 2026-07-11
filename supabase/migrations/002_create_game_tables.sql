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
