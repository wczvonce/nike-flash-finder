/**
 * Market Normalizer
 * Classifies raw market names into normalized types with line/period/selection
 */
import type { NormalizedMarketType, Period } from '@/types/models';

export interface NormalizedMarketInfo {
  marketType: NormalizedMarketType | null;
  line: number | null;
  period: Period;
  selection: string;
  side: string | null;
}

const PERIOD_PATTERNS: [RegExp, Period][] = [
  [/1st half|first half|1\. polcas/i, '1st_half'],
  [/2nd half|second half|2\. polcas/i, '2nd_half'],
  [/set 1|1st set/i, 'set1'],
  [/set 2|2nd set/i, 'set2'],
  [/set 3|3rd set/i, 'set3'],
];

function detectPeriod(raw: string): Period {
  for (const [pat, period] of PERIOD_PATTERNS) {
    if (pat.test(raw)) return period;
  }
  // Tennis/hockey match winner → 'match' period
  return 'full_time';
}

function extractLine(raw: string): number | null {
  const m = raw.match(/([+-]?\d+\.?\d*)/);
  return m ? parseFloat(m[1]) : null;
}

export function normalizeMarket(rawMarketName: string, rawSelection: string, sport: string): NormalizedMarketInfo {
  const lower = rawMarketName.toLowerCase();
  const selLower = rawSelection.toLowerCase();
  const period = detectPeriod(rawMarketName);

  // Match winner 2-way (tennis, esports, etc.)
  if (/winner|vitaz|vyhra/i.test(lower) && !/draw/i.test(lower)) {
    return { marketType: 'match_winner_2way', line: null, period, selection: selLower, side: null };
  }

  // Draw no bet
  if (/draw no bet|dnb|remiza nie/i.test(lower)) {
    return { marketType: 'draw_no_bet', line: null, period, selection: selLower, side: null };
  }

  // Double chance
  if (/double chance|dvojity tip/i.test(lower)) {
    return { marketType: 'double_chance', line: null, period, selection: selLower, side: null };
  }

  // Over/Under
  if (/over|under|viac|menej|total/i.test(lower)) {
    const line = extractLine(rawMarketName);
    const sel = /over|viac/i.test(selLower) ? 'over' : 'under';

    // Detect specific total types
    if (/set/i.test(lower)) return { marketType: 'sets_total_over_under', line, period, selection: sel, side: null };
    if (/game/i.test(lower)) return { marketType: 'games_total_over_under', line, period, selection: sel, side: null };
    if (/point|bod/i.test(lower)) return { marketType: 'points_total_over_under', line, period, selection: sel, side: null };

    return { marketType: 'over_under', line, period, selection: sel, side: null };
  }

  // Handicap
  if (/handicap|hendikep/i.test(lower)) {
    const line = extractLine(rawMarketName) ?? extractLine(rawSelection);
    const side = /home|domac|1/i.test(selLower) ? 'home' : 'away';
    return { marketType: 'handicap', line, period, selection: selLower, side };
  }

  // BTTS
  if (/both teams? to score|oba timy|btts/i.test(lower)) {
    const sel = /yes|ano|áno/i.test(selLower) ? 'yes' : 'no';
    return { marketType: 'both_teams_to_score', line: null, period, selection: sel, side: null };
  }

  // Team to score
  if (/team to score|tim skóruje/i.test(lower)) {
    const sel = /yes|ano|áno/i.test(selLower) ? 'yes' : 'no';
    return { marketType: 'team_to_score_yes_no', line: null, period, selection: sel, side: null };
  }

  // Generic yes/no
  if (/(yes|no|áno|nie)\s*$/i.test(selLower)) {
    const sel = /yes|ano|áno/i.test(selLower) ? 'yes' : 'no';
    return { marketType: 'yes_no_generic', line: null, period, selection: sel, side: null };
  }

  return { marketType: null, line: null, period, selection: selLower, side: null };
}

/**
 * Check if two markets are strictly equivalent per business rules
 */
export function marketsAreEquivalent(
  a: { marketType: NormalizedMarketType | null; line: number | null; period: Period; selection: string; side: string | null },
  b: { marketType: NormalizedMarketType | null; line: number | null; period: Period; selection: string; side: string | null }
): boolean {
  if (!a.marketType || !b.marketType) return false;
  if (a.marketType !== b.marketType) return false;
  if (a.period !== b.period) return false;
  if (a.line !== b.line) return false;
  if (a.selection !== b.selection) return false;
  if (a.side !== b.side) return false;
  return true;
}
