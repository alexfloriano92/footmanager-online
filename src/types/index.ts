// ============================================================
// FootManager Online - TypeScript Types
// ============================================================

export type UserRole = 'player' | 'moderator' | 'admin';
export type PlayerStatus = 'active' | 'injured' | 'suspended' | 'on_loan' | 'retired' | 'free_agent';
export type PlayerPosition = 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LM' | 'RM' | 'LW' | 'RW' | 'ST' | 'CF' | 'SS';
export type DominantFoot = 'left' | 'right' | 'both';
export type CoachingStyle = 'attack' | 'balanced' | 'defense' | 'possession' | 'counter';
export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';
export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired' | 'cancelled';
export type TransferType = 'transfer' | 'loan' | 'free' | 'swap' | 'youth_promotion';
export type InjuryType = 'muscular' | 'ligament' | 'fracture' | 'concussion' | 'fatigue' | 'suspension';
export type InjurySeverity = 'minor' | 'moderate' | 'major' | 'critical';
export type SeasonStatus = 'pre' | 'active' | 'post' | 'finished';
export type CompetitionType = 'league' | 'domestic_cup' | 'super_cup' | 'continental' | 'world';
export type TrainingType = 'physical' | 'technical' | 'tactical' | 'psychological' | 'individual' | 'position_group';
export type TrainingIntensity = 'low' | 'medium' | 'high' | 'maximum';
export type NotificationType = 'match_result' | 'transfer_offer' | 'transfer_accepted' | 'transfer_rejected' | 'injury' | 'contract_expiring' | 'market_bid' | 'auction_outbid' | 'achievement' | 'system' | 'season_end' | 'competition_result' | 'message';
export type PlayerRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type AchievementCategory = 'matches' | 'transfers' | 'finances' | 'players' | 'competitions' | 'social' | 'special';

// ============================================================
// DATABASE ENTITIES
// ============================================================

export interface User {
  id: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
}

export interface Coach {
  id: string;
  user_id: string;
  name: string;
  nationality: string;
  photo_url: string | null;
  country: string;
  experience_points: number;
  reputation: number;
  coaching_style: CoachingStyle;
  preferred_formation: string;
  wins: number;
  draws: number;
  losses: number;
  total_transfers: number;
  hall_of_fame: boolean;
  created_at: string;
  updated_at: string;
  // Joins
  user?: User;
  club?: Club;
}

export interface League {
  id: string;
  name: string;
  short_name: string;
  country: string;
  level: number;
  logo_url: string | null;
  is_active: boolean;
  max_clubs: number;
  created_at: string;
}

export interface Stadium {
  id: string;
  name: string;
  city: string;
  capacity: number;
  current_occupancy_rate: number;
  pitch_quality: number;
  facilities_level: number;
  expansion_cost: number;
  created_at: string;
  updated_at: string;
}

export interface Club {
  id: string;
  name: string;
  short_name: string;
  slug: string;
  country: string;
  city: string;
  league_id: string | null;
  stadium_id: string | null;
  badge_url: string | null;
  primary_color: string;
  secondary_color: string;
  founded_year: number | null;
  prestige: number;
  fan_loyalty: number;
  infrastructure: number;
  youth_academy: number;
  is_active: boolean;
  is_ai_controlled: boolean;
  created_at: string;
  updated_at: string;
  // Joins
  league?: League;
  stadium?: Stadium;
  owner?: ClubOwner;
  finances?: Finance;
}

export interface ClubOwner {
  id: string;
  club_id: string;
  coach_id: string | null;
  acquired_at: string | null;
  selling_price: number | null;
  is_for_sale: boolean;
  seasons_managed: number;
  created_at: string;
  updated_at: string;
  // Joins
  coach?: Coach;
  club?: Club;
}

export interface PlayerAttributes {
  overall: number;
  potential: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  technique: number;
  stamina: number;
}

export interface Player extends PlayerAttributes {
  id: string;
  external_id: string | null;
  name: string;
  full_name: string | null;
  nationality: string;
  second_nationality: string | null;
  birth_date: string;
  position: PlayerPosition;
  height_cm: number | null;
  weight_kg: number | null;
  dominant_foot: DominantFoot;
  experience: number;
  morale: number;
  fitness: number;
  market_value: number;
  weekly_salary: number;
  club_id: string | null;
  status: PlayerStatus;
  is_youth: boolean;
  is_real_player: boolean;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  club?: Club;
  contract?: Contract;
  statistics?: PlayerStatistics[];
}

export interface Contract {
  id: string;
  player_id: string;
  club_id: string;
  weekly_salary: number;
  contract_start: string;
  contract_end: string;
  release_clause: number | null;
  bonus_goals: number;
  bonus_assists: number;
  bonus_clean_sheets: number;
  is_loan: boolean;
  loan_return_date: string | null;
  parent_club_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Finance {
  id: string;
  club_id: string;
  cash_balance: number;
  transfer_budget: number;
  weekly_wage_bill: number;
  stadium_revenue: number;
  sponsorship_income: number;
  tv_rights_income: number;
  competition_prizes: number;
  merchandise_revenue: number;
  transfer_income: number;
  transfer_expenditure: number;
  debt: number;
  credit_rating: string;
  updated_at: string;
}

export interface Season {
  id: string;
  season_number: number;
  start_date: string;
  end_date: string;
  current_week: number;
  status: SeasonStatus;
  is_transfer_window_open: boolean;
  created_at: string;
}

export interface Competition {
  id: string;
  name: string;
  short_name: string;
  type: CompetitionType;
  scope: string;
  country: string | null;
  logo_url: string | null;
  prize_winner: number;
  prize_runner_up: number;
  prize_participation: number;
  prestige: number;
  is_active: boolean;
  created_at: string;
}

export interface Match {
  id: string;
  competition_season_id: string | null;
  season_id: string;
  home_club_id: string;
  away_club_id: string;
  round: string | null;
  match_type: string;
  scheduled_at: string;
  played_at: string | null;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  home_score_ht: number | null;
  away_score_ht: number | null;
  home_lineup: MatchLineup | null;
  away_lineup: MatchLineup | null;
  home_tactics: MatchTactics | null;
  away_tactics: MatchTactics | null;
  match_report: MatchReport | null;
  attendance: number | null;
  weather: string;
  created_at: string;
  // Joins
  home_club?: Club;
  away_club?: Club;
  events?: MatchEvent[];
}

export interface MatchLineup {
  formation: string;
  captain_id: string;
  penalty_taker_id: string;
  free_kick_taker_id: string;
  corner_taker_id: string;
  players: MatchLineupPlayer[];
  substitutes: string[]; // player IDs
  substitution_order: SubstitutionOrder[];
}

export interface MatchLineupPlayer {
  player_id: string;
  position: PlayerPosition;
  x: number; // 0-100 field position
  y: number; // 0-100 field position
}

export interface SubstitutionOrder {
  out_player_id: string;
  in_player_id: string;
  trigger_condition: 'minute' | 'losing' | 'drawing' | 'winning';
  trigger_value: number;
}

export interface MatchTactics {
  mentality: 'ultra_attack' | 'attack' | 'balanced' | 'defense' | 'ultra_defense';
  pressing: 'high' | 'medium' | 'low';
  defensive_line: 'high' | 'standard' | 'low';
  style: 'possession' | 'counter' | 'direct' | 'pressing';
  marking: 'zonal' | 'man_to_man' | 'mixed';
}

export interface MatchReport {
  possession: [number, number]; // home, away percentage
  shots: [number, number];
  shots_on_target: [number, number];
  corners: [number, number];
  fouls: [number, number];
  offsides: [number, number];
  narrative: MatchNarrativeEntry[];
  ratings: Record<string, number>; // player_id -> rating (1-10)
  mvp_player_id: string | null;
}

export interface MatchNarrativeEntry {
  minute: number;
  added_time?: number;
  type: 'goal' | 'card' | 'substitution' | 'injury' | 'chance' | 'narrative';
  text: string;
  player_id?: string;
  club_id?: string;
}

export interface MatchEvent {
  id: string;
  match_id: string;
  minute: number;
  added_time: number;
  event_type: string;
  player_id: string | null;
  assist_player_id: string | null;
  substituted_player_id: string | null;
  club_id: string;
  description: string | null;
  created_at: string;
}

export interface Offer {
  id: string;
  player_id: string;
  from_club_id: string;
  to_club_id: string;
  from_coach_id: string | null;
  offered_amount: number;
  installments: number;
  installment_amount: number | null;
  bonus_goals: number;
  bonus_assists: number;
  future_sale_percentage: number;
  proposed_weekly_salary: number | null;
  proposed_contract_years: number;
  counter_offer_amount: number | null;
  offer_type: string;
  swap_player_id: string | null;
  status: OfferStatus;
  message: string | null;
  expires_at: string;
  responded_at: string | null;
  created_at: string;
  // Joins
  player?: Player;
  from_club?: Club;
  to_club?: Club;
}

export interface MarketListing {
  id: string;
  player_id: string;
  club_id: string;
  listing_price: number;
  minimum_offer: number | null;
  listing_type: string;
  loan_duration_weeks: number | null;
  listed_by_coach_id: string | null;
  listed_at: string;
  expires_at: string;
  views: number;
  is_active: boolean;
  // Joins
  player?: Player;
  club?: Club;
}

export interface PlayerStatistics {
  id: string;
  player_id: string;
  club_id: string;
  season_id: string;
  competition_id: string | null;
  matches: number;
  starts: number;
  minutes_played: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  clean_sheets: number;
  saves: number;
  penalty_saves: number;
  man_of_match: number;
  avg_rating: number;
}

export interface CompetitionStandings {
  id: string;
  competition_season_id: string;
  club_id: string;
  group_name: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  form: string;
  updated_at: string;
  // Joins
  club?: Club;
}

export interface YouthPlayer {
  id: string;
  club_id: string;
  name: string;
  nationality: string;
  birth_date: string;
  position: PlayerPosition;
  potential_hidden: number;
  potential_visible: string;
  characteristics: string[];
  personality: string;
  rarity: PlayerRarity;
  has_hidden_potential: boolean;
  overall_estimate: number;
  revealed_at: string | null;
  promoted_at: string | null;
  promoted_player_id: string | null;
  created_at: string;
}

export interface TrainingSession {
  id: string;
  club_id: string;
  coach_id: string | null;
  session_date: string;
  session_type: TrainingType;
  focus_position: string | null;
  intensity: TrainingIntensity;
  duration_minutes: number;
  players_included: string[];
  fatigue_impact: number;
  morale_impact: number;
  injury_risk_modifier: number;
  executed: boolean;
  results: TrainingResults | null;
  created_at: string;
}

export interface TrainingResults {
  affected_players: {
    player_id: string;
    attribute_improved: string;
    improvement_amount: number;
    fatigue_increase: number;
    morale_change: number;
  }[];
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  condition_type: string;
  condition_value: number;
  reward_type: string | null;
  reward_value: number | null;
  is_hidden: boolean;
}

export interface CoachAchievement {
  id: string;
  coach_id: string;
  achievement_id: string;
  unlocked_at: string;
  progress: number;
  // Joins
  achievement?: Achievement;
}

export interface Ranking {
  id: string;
  season_id: string;
  rank_type: string;
  club_id: string | null;
  coach_id: string | null;
  score: number;
  position: number;
  change_from_last: number;
  scope: string | null;
  updated_at: string;
  // Joins
  club?: Club;
  coach?: Coach;
}

export interface Staff {
  id: string;
  club_id: string;
  name: string;
  role: string;
  quality: number;
  weekly_salary: number;
  contract_until: string | null;
  nationality: string | null;
  is_active: boolean;
  created_at: string;
}

export interface InjuryRecord {
  id: string;
  club_id: string;
  player_id: string;
  injury_type: InjuryType;
  severity: InjurySeverity;
  injured_at: string;
  expected_return: string;
  actual_return: string | null;
  treatment_cost: number;
  treatment_notes: string | null;
  is_active: boolean;
  created_at: string;
  // Joins
  player?: Player;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  coach_id: string;
  content: string;
  is_deleted: boolean;
  created_at: string;
  // Joins
  coach?: Coach;
}

export interface ChatRoom {
  id: string;
  name: string;
  type: string;
  scope: string | null;
  icon: string;
  is_active: boolean;
  created_at: string;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================
// GAME ENGINE TYPES
// ============================================================

export interface SimulationInput {
  match_id: string;
  home_club: Club;
  away_club: Club;
  home_lineup: MatchLineup;
  away_lineup: MatchLineup;
  home_tactics: MatchTactics;
  away_tactics: MatchTactics;
  home_players: Record<string, Player>;
  away_players: Record<string, Player>;
  weather: string;
  home_stadium_quality: number;
}

export interface SimulationOutput {
  home_score: number;
  away_score: number;
  home_score_ht: number;
  away_score_ht: number;
  events: Omit<MatchEvent, 'id' | 'match_id' | 'created_at'>[];
  report: MatchReport;
}

// ============================================================
// FORM TYPES
// ============================================================

export interface CreateCoachForm {
  name: string;
  nationality: string;
  country: string;
  photo_url?: string;
  coaching_style: CoachingStyle;
  preferred_formation: string;
}

export interface TransferOfferForm {
  player_id: string;
  offered_amount: number;
  installments: number;
  proposed_weekly_salary: number;
  proposed_contract_years: number;
  bonus_goals?: number;
  bonus_assists?: number;
  future_sale_percentage?: number;
  offer_type: 'buy' | 'loan';
  loan_duration_weeks?: number;
  message?: string;
}

export interface MatchLineupForm {
  formation: string;
  captain_id: string;
  penalty_taker_id: string;
  free_kick_taker_id: string;
  corner_taker_id: string;
  starters: { player_id: string; position: PlayerPosition }[];
  substitutes: string[];
  tactics: MatchTactics;
}
