/**
 * Odds Comparison Engine
 * Matches Nike markets to Flashscore markets and computes comparison rows
 */
import type {
  NikeMatch, NikeMarket, FlashscoreMatch, FlashscoreMarket,
  ComparisonRow, BookmakerOdds
} from '@/types/models';
import { marketsAreEquivalent } from './marketNormalizer';

function getBookmaker(odds: BookmakerOdds[], name: string): BookmakerOdds | undefined {
  return odds.find(o => o.bookmakerName === name);
}

export function runComparison(
  nikeMatches: NikeMatch[],
  nikeTwoWayMarkets: NikeMarket[],
  fsMatches: FlashscoreMatch[],
  fsMarkets: FlashscoreMarket[]
): ComparisonRow[] {
  const rows: ComparisonRow[] = [];
  let counter = 0;

  for (const nikeMarket of nikeTwoWayMarkets) {
    const nikeMatch = nikeMatches.find(m => m.id === nikeMarket.matchId);
    if (!nikeMatch) continue;

    const fsMatch = fsMatches.find(f => f.matchedNikeMatchId === nikeMatch.id);
    if (!fsMatch) {
      counter++;
      rows.push(createUnmatchedRow(counter, nikeMatch, nikeMarket, 'unmatched_match'));
      continue;
    }

    // Find equivalent flashscore market
    const matchedFsMarket = fsMarkets.find(fm =>
      fm.flashscoreMatchId === fsMatch.id &&
      marketsAreEquivalent(
        { marketType: nikeMarket.marketType, line: nikeMarket.line, period: nikeMarket.period, selection: nikeMarket.selection, side: nikeMarket.side },
        { marketType: fm.marketType, line: fm.line, period: fm.period, selection: fm.selection, side: fm.side }
      )
    );

    if (!matchedFsMarket) {
      counter++;
      rows.push(createUnmatchedRow(counter, nikeMatch, nikeMarket, 'unmatched_market'));
      continue;
    }

    counter++;
    const fortuna = getBookmaker(matchedFsMarket.bookmakerOdds, 'Fortuna');
    const tipsport = getBookmaker(matchedFsMarket.bookmakerOdds, 'Tipsport');
    const doxxbet = getBookmaker(matchedFsMarket.bookmakerOdds, 'DOXXbet');
    const tipos = getBookmaker(matchedFsMarket.bookmakerOdds, 'Tipos');

    const nikeOdd = nikeMarket.nikeCurrentOdd;
    const nikeHigherThan: string[] = [];

    if (fortuna?.currentOdd && nikeOdd > fortuna.currentOdd) nikeHigherThan.push('Fortuna');
    if (tipsport?.currentOdd && nikeOdd > tipsport.currentOdd) nikeHigherThan.push('Tipsport');
    if (doxxbet?.currentOdd && nikeOdd > doxxbet.currentOdd) nikeHigherThan.push('DOXXbet');
    if (tipos?.currentOdd && nikeOdd > tipos.currentOdd) nikeHigherThan.push('Tipos');

    const availableOdds = [fortuna, tipsport, doxxbet, tipos].filter(b => b?.currentOdd != null);
    const nikeIsBestOverall = availableOdds.length > 0 && availableOdds.every(b => nikeOdd > b!.currentOdd!);

    rows.push({
      id: `cmp-${counter}`,
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
      fortunaCurrent: fortuna?.currentOdd ?? null,
      fortunaOpening: fortuna?.openingOdd ?? null,
      fortunaTrend: fortuna?.trendDirection ?? null,
      tipsportCurrent: tipsport?.currentOdd ?? null,
      tipsportOpening: tipsport?.openingOdd ?? null,
      tipsportTrend: tipsport?.trendDirection ?? null,
      doxxbetCurrent: doxxbet?.currentOdd ?? null,
      doxxbetOpening: doxxbet?.openingOdd ?? null,
      doxxbetTrend: doxxbet?.trendDirection ?? null,
      tiposCurrent: tipos?.currentOdd ?? null,
      tiposOpening: tipos?.openingOdd ?? null,
      tiposTrend: tipos?.trendDirection ?? null,
      nikeHigherThan,
      nikeIsBestOverall,
      matchingConfidence: fsMatch.matchingConfidence,
      status: 'matched',
      notes: '',
      nikeRawPayload: nikeMarket.rawPayload,
      flashscoreRawPayload: matchedFsMarket.rawPayload,
    });
  }

  return rows;
}

function createUnmatchedRow(counter: number, match: NikeMatch, market: NikeMarket, status: 'unmatched_match' | 'unmatched_market'): ComparisonRow {
  return {
    id: `cmp-${counter}`,
    sport: match.sport,
    date: match.date,
    time: match.time,
    matchTitle: `${match.homeTeam} - ${match.awayTeam}`,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    marketType: market.marketType,
    line: market.line,
    period: market.period,
    selection: market.selection,
    side: market.side,
    nikeMarketName: market.rawMarketName,
    nikeSelectionName: market.rawSelectionName,
    nikeCurrentOdd: market.nikeCurrentOdd,
    fortunaCurrent: null, fortunaOpening: null, fortunaTrend: null,
    tipsportCurrent: null, tipsportOpening: null, tipsportTrend: null,
    doxxbetCurrent: null, doxxbetOpening: null, doxxbetTrend: null,
    tiposCurrent: null, tiposOpening: null, tiposTrend: null,
    nikeHigherThan: [],
    nikeIsBestOverall: false,
    matchingConfidence: 0,
    status,
    notes: status === 'unmatched_match' ? 'No Flashscore match found' : 'No equivalent Flashscore market found',
    nikeRawPayload: market.rawPayload,
    flashscoreRawPayload: {},
  };
}
