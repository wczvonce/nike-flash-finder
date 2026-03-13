/**
 * Nike vs Tipsport Comparison Engine
 * Only outputs rows where Nike current odd > Tipsport current odd
 */
import type {
  NikeMatch, NikeMarket, FlashscoreMatch, FlashscoreMarket,
  ComparisonRow, BookmakerOdds
} from '@/types/models';
import { marketsAreEquivalent } from './marketNormalizer';

function getTipsport(odds: BookmakerOdds[]): BookmakerOdds | undefined {
  return odds.find(o => o.bookmakerName === 'Tipsport');
}

export function runComparison(
  nikeMatches: NikeMatch[],
  nikeTwoWayMarkets: NikeMarket[],
  fsMatches: FlashscoreMatch[],
  fsMarkets: FlashscoreMarket[]
): ComparisonRow[] {
  const rawRows: Omit<ComparisonRow, 'rank'>[] = [];

  for (const nikeMarket of nikeTwoWayMarkets) {
    const nikeMatch = nikeMatches.find(m => m.id === nikeMarket.matchId);
    if (!nikeMatch) continue;

    const fsMatch = fsMatches.find(f => f.matchedNikeMatchId === nikeMatch.id);
    if (!fsMatch) continue;

    const matchedFsMarket = fsMarkets.find(fm =>
      fm.flashscoreMatchId === fsMatch.id &&
      marketsAreEquivalent(
        { marketType: nikeMarket.marketType, line: nikeMarket.line, period: nikeMarket.period, selection: nikeMarket.selection, side: nikeMarket.side },
        { marketType: fm.marketType, line: fm.line, period: fm.period, selection: fm.selection, side: fm.side }
      )
    );

    if (!matchedFsMarket) continue;

    const tipsport = getTipsport(matchedFsMarket.bookmakerOdds);
    if (!tipsport?.currentOdd) continue;

    const nikeOdd = nikeMarket.nikeCurrentOdd;
    const tipsportOdd = tipsport.currentOdd;

    // Only include if Nike is strictly higher
    if (nikeOdd <= tipsportOdd) continue;

    const absoluteDiff = Math.round((nikeOdd - tipsportOdd) * 100) / 100;
    const percentDiff = Math.round(((nikeOdd - tipsportOdd) / tipsportOdd) * 10000) / 100;
    const probabilityEdge = Math.round(((1 / tipsportOdd) - (1 / nikeOdd)) * 10000) / 100;

    rawRows.push({
      id: '',
      sport: nikeMatch.sport,
      date: nikeMatch.date,
      time: nikeMatch.time,
      matchTitle: `${nikeMatch.homeTeam} - ${nikeMatch.awayTeam}`,
      homeTeam: nikeMatch.homeTeam,
      awayTeam: nikeMatch.awayTeam,
      marketType: nikeMarket.marketType,
      line: nikeMarket.line,
      period: nikeMarket.period,
      selection: nikeMarket.selection,
      side: nikeMarket.side,
      nikeMarketName: nikeMarket.rawMarketName,
      nikeSelectionName: nikeMarket.rawSelectionName,
      nikeCurrentOdd: nikeOdd,
      tipsportCurrent: tipsportOdd,
      tipsportOpening: tipsport.openingOdd,
      tipsportTrend: tipsport.trendDirection,
      tipsportRawMarketName: matchedFsMarket.rawMarketName,
      absoluteDiff,
      percentDiff,
      probabilityEdge,
      matchingConfidence: fsMatch.matchingConfidence,
      status: 'matched',
      notes: '',
      nikeRawPayload: nikeMarket.rawPayload,
      flashscoreRawPayload: matchedFsMarket.rawPayload,
    });
  }

  // Sort: %diff desc, absDiff desc, date/time asc
  rawRows.sort((a, b) => {
    if (b.percentDiff !== a.percentDiff) return b.percentDiff - a.percentDiff;
    if (b.absoluteDiff !== a.absoluteDiff) return b.absoluteDiff - a.absoluteDiff;
    const dateA = `${a.date} ${a.time}`;
    const dateB = `${b.date} ${b.time}`;
    return dateA.localeCompare(dateB);
  });

  return rawRows.map((row, i) => ({
    ...row,
    id: `cmp-${i + 1}`,
    rank: i + 1,
  }));
}
