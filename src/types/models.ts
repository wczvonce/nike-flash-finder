// ===== NORMALIZED MARKET TYPES =====
export type NormalizedMarketType =
  | 'match_winner_2way'
  | 'draw_no_bet'
  | 'double_chance'
  | 'over_under'
  | 'handicap'
  | 'both_teams_to_score'
  | 'team_to_score_yes_no'
  | 'yes_no_generic'
  | 'sets_total_over_under'
  | 'games_total_over_under'
  | 'points_total_over_under';

export type Period = 'full_time' | '1st_half' | '2nd_half' | 'set1' | 'set2' | 'set3' | 'match' | 'unknown';
export type TrendDirection = 'up' | 'down' | 'unchanged' | null;
export type ComparisonStatus = 'matched' | 'unmatched_match' | 'unmatched_market' | 'incomplete_data';
export type Sport = 'football' | 'hockey' | 'tennis' | 'basketball' | 'unknown';

// ===== NIKE MODELS =====
export interface NikeMatch {
  id: string;
  sport: Sport;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  rawTitle: string;
  source: 'nike';
  sourceSection: 'superkurzy';
}

export interface NikeMarket {
  id: string;
  matchId: string;
  marketType: NormalizedMarketType | null;
  rawMarketName: string;
  rawSelectionName: string;
  selection: string;
  line: number | null;
  period: Period;
  side: string | null;
  outcomeCount: number;
  nikeCurrentOdd: number;
  isTwoWay: boolean;
  rawPayload: Record<string, unknown>;
}

// ===== FLASHSCORE MODELS =====
export interface FlashscoreMatch {
  id: string;
  sport: Sport;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  rawTitle: string;
  flashscoreUrl: string;
  matchingConfidence: number;
  matchedNikeMatchId: string;
  rawPayload: Record<string, unknown>;
}

export interface BookmakerOdds {
  bookmakerName: 'Fortuna' | 'Tipsport' | 'DOXXbet' | 'Tipos';
  currentOdd: number | null;
  openingOdd: number | null;
  trendDirection: TrendDirection;
  available: boolean;
}

export interface FlashscoreMarket {
  id: string;
  flashscoreMatchId: string;
  marketType: NormalizedMarketType | null;
  rawMarketName: string;
  selection: string;
  line: number | null;
  period: Period;
  side: string | null;
  bookmakerOdds: BookmakerOdds[];
  rawPayload: Record<string, unknown>;
}

// ===== COMPARISON =====
export interface ComparisonRow {
  id: string;
  sport: Sport;
  date: string;
  time: string;
  matchTitle: string;
  homeTeam: string;
  awayTeam: string;
  marketType: NormalizedMarketType | null;
  line: number | null;
  period: Period;
  selection: string;
  side: string | null;
  nikeMarketName: string;
  nikeSelectionName: string;
  nikeCurrentOdd: number;
  fortunaCurrent: number | null;
  fortunaOpening: number | null;
  fortunaTrend: TrendDirection;
  tipsportCurrent: number | null;
  tipsportOpening: number | null;
  tipsportTrend: TrendDirection;
  doxxbetCurrent: number | null;
  doxxbetOpening: number | null;
  doxxbetTrend: TrendDirection;
  tiposCurrent: number | null;
  tiposOpening: number | null;
  tiposTrend: TrendDirection;
  nikeHigherThan: string[];
  nikeIsBestOverall: boolean;
  matchingConfidence: number;
  status: ComparisonStatus;
  notes: string;
  nikeRawPayload: Record<string, unknown>;
  flashscoreRawPayload: Record<string, unknown>;
}

// ===== WORKFLOW STATE =====
export interface WorkflowState {
  nikeMatches: NikeMatch[];
  nikeMarkets: NikeMarket[];
  nikeTwoWayMarkets: NikeMarket[];
  flashscoreMatches: FlashscoreMatch[];
  flashscoreMarkets: FlashscoreMarket[];
  comparisonRows: ComparisonRow[];
  stage: WorkflowStage;
  stageProgress: Record<WorkflowStage, StageStatus>;
}

export type WorkflowStage =
  | 'idle'
  | 'loading_nike'
  | 'extracting_markets'
  | 'matching_flashscore'
  | 'parsing_odds'
  | 'comparing'
  | 'complete';

export type StageStatus = 'pending' | 'running' | 'complete' | 'error';

export interface SummaryStats {
  totalNikeMatches: number;
  totalNikeMarkets: number;
  totalTwoWayMarkets: number;
  totalFlashscoreMatched: number;
  totalFlashscoreMarketsMatched: number;
  totalComparisonRows: number;
  totalNikeHigher: number;
  totalNikeBestOverall: number;
  bySport: Record<string, number>;
  byMarketType: Record<string, number>;
  byBookmakerBeaten: Record<string, number>;
}
