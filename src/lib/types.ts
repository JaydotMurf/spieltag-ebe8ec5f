// Spieltag — Shared Types
// All types used across metrics, validators, and Top 11 engine

export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

export type ValueSignal = 'UNDERVALUED' | 'FAIR' | 'OVERVALUED';

export interface Player {
  id: string;
  name: string;
  position: Position;
  team: string;
  price: number; // in millions, e.g. 21.0
  season_points: number;
  last_5_points: number;
  rolling_yield: number; // computed: last_5_points / price
  api_player_id: string;
}

export interface Squad {
  id: string;
  user_id: string;
  budget_remaining: number;
  matchday: number;
  leverage_def_active: boolean;
  leverage_mid_active: boolean;
  leverage_fwd_active: boolean;
}

export interface SquadPlayer {
  squad_id: string;
  player_id: string;
  is_star: boolean;
  is_in_top11: boolean;
}

export interface MatchdayStats {
  id: string;
  player_id: string;
  matchday: number;
  points: number;
}

export interface PriceHistory {
  id: string;
  player_id: string;
  matchday: number;
  price: number;
}

export interface TransferLogEntry {
  id: string;
  squad_id: string;
  matchday: number;
  player_out_id: string;
  player_in_id: string;
  created_at: string;
}

export interface BenchmarkSnapshot {
  id: string;
  matchday: number;
  position: Position;
  median_yield: number;
  updated_at: string;
}

export interface MatchdayConfig {
  id: string;
  matchday: number;
  deadline: string;
  is_break_period: boolean;
  is_locked: boolean;
  last_ingested_at: string;
}

// --- Engine types ---

export type LeverageSector = 'DEF' | 'MID' | 'FWD';

export interface StarDesignations {
  DEF?: string; // player_id of star DEF
  MID?: string; // player_id of star MID
  FWD?: string; // player_id of star FWD
}

export interface LeverageToggles {
  DEF: boolean;
  MID: boolean;
  FWD: boolean;
}

export interface LeverageStatus {
  sector: LeverageSector;
  playerName: string;
  playerId: string;
  wasted: boolean;
}

export interface FormationDef {
  name: string;
  def: number;
  mid: number;
  fwd: number;
}

export interface SquadByPosition {
  GK: PlayerWithMatchdayPoints[];
  DEF: PlayerWithMatchdayPoints[];
  MID: PlayerWithMatchdayPoints[];
  FWD: PlayerWithMatchdayPoints[];
}

export interface PlayerWithMatchdayPoints extends Player {
  matchday_points: number; // points for the current matchday
}

export interface Top11Result {
  formation: string;
  xi: PlayerWithMatchdayPoints[];
  bench: PlayerWithMatchdayPoints[];
  totalPoints: number;
  leverageStatus: LeverageStatus[];
}

export interface ValidationResult {
  blocked: boolean;
  reason: string;
}

export interface TransferValidationResult extends ValidationResult {
  remaining: number;
}
