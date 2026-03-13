/**
 * Mock Flashscore Match Finder & Odds Parser
 */
import type { FlashscoreMatch, FlashscoreMarket, BookmakerOdds, NikeMatch, Sport, TrendDirection } from '@/types/models';
import { computeMatchConfidence, MATCH_CONFIDENCE_THRESHOLD } from './teamNameNormalizer';
import { normalizeMarket } from './marketNormalizer';

interface MockFSMatchData {
  nikeMirrorId: string;
  sport: Sport;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  url: string;
}

const MOCK_FS_MATCHES: MockFSMatchData[] = [
  { nikeMirrorId: 'nike-1', sport: 'football', date: '2026-03-13', time: '18:30', homeTeam: 'Slovan Bratislava', awayTeam: 'Spartak Trnava', url: 'https://flashscore.com/match/abc1' },
  { nikeMirrorId: 'nike-2', sport: 'football', date: '2026-03-13', time: '20:45', homeTeam: 'FC Barcelona', awayTeam: 'Atl. Madrid', url: 'https://flashscore.com/match/abc2' },
  { nikeMirrorId: 'nike-3', sport: 'hockey', date: '2026-03-13', time: '18:00', homeTeam: 'Sparta Praha', awayTeam: 'HC Kosice', url: 'https://flashscore.com/match/abc3' },
  { nikeMirrorId: 'nike-4', sport: 'tennis', date: '2026-03-13', time: '14:00', homeTeam: 'Djokovic N.', awayTeam: 'Alcaraz C.', url: 'https://flashscore.com/match/abc4' },
  { nikeMirrorId: 'nike-5', sport: 'football', date: '2026-03-14', time: '21:00', homeTeam: 'Real Madrid', awayTeam: 'Bayern Munchen', url: 'https://flashscore.com/match/abc5' },
];

function makeOdds(fortuna: number | null, tipsport: number | null, doxxbet: number | null, tipos: number | null): BookmakerOdds[] {
  const make = (name: 'Fortuna' | 'Tipsport' | 'DOXXbet' | 'Tipos', cur: number | null): BookmakerOdds => {
    const trends: TrendDirection[] = ['up', 'down', 'unchanged'];
    return {
      bookmakerName: name,
      currentOdd: cur,
      openingOdd: cur ? +(cur + (Math.random() * 0.3 - 0.15)).toFixed(2) : null,
      trendDirection: cur ? trends[Math.floor(Math.random() * 3)] : null,
      available: cur !== null,
    };
  };
  return [make('Fortuna', fortuna), make('Tipsport', tipsport), make('DOXXbet', doxxbet), make('Tipos', tipos)];
}

interface MockFSMarketDef {
  nikeMirrorId: string;
  rawMarketName: string;
  selection: string;
  odds: [number | null, number | null, number | null, number | null]; // F, T, D, Ti
}

// Odds designed so Nike is sometimes higher, sometimes not
const MOCK_FS_MARKETS: MockFSMarketDef[] = [
  // Slovan vs Spartak
  { nikeMirrorId: 'nike-1', rawMarketName: 'Both Teams To Score', selection: 'Yes', odds: [1.95, 2.00, 1.90, 2.05] },
  { nikeMirrorId: 'nike-1', rawMarketName: 'Both Teams To Score', selection: 'No', odds: [1.80, 1.75, 1.85, 1.72] },
  { nikeMirrorId: 'nike-1', rawMarketName: 'Over/Under 2.5', selection: 'Over 2.5', odds: [2.10, 2.15, 2.05, 2.20] },
  { nikeMirrorId: 'nike-1', rawMarketName: 'Over/Under 2.5', selection: 'Under 2.5', odds: [1.70, 1.68, 1.72, 1.65] },
  { nikeMirrorId: 'nike-1', rawMarketName: 'Double Chance', selection: '1X', odds: [1.18, 1.15, 1.20, 1.16] },
  { nikeMirrorId: 'nike-1', rawMarketName: 'Double Chance', selection: 'X2', odds: [2.50, 2.45, 2.55, 2.42] },
  { nikeMirrorId: 'nike-1', rawMarketName: 'Handicap -1.5', selection: 'Home -1.5', odds: [3.10, 3.25, 3.00, 3.15] },
  { nikeMirrorId: 'nike-1', rawMarketName: 'Handicap -1.5', selection: 'Away +1.5', odds: [1.35, 1.32, 1.38, 1.33] },
  // Barcelona vs Atletico
  { nikeMirrorId: 'nike-2', rawMarketName: 'Over/Under 2.5', selection: 'Over 2.5', odds: [1.90, 1.92, 1.88, 1.95] },
  { nikeMirrorId: 'nike-2', rawMarketName: 'Over/Under 2.5', selection: 'Under 2.5', odds: [1.92, 1.90, 1.95, 1.88] },
  { nikeMirrorId: 'nike-2', rawMarketName: 'BTTS', selection: 'Yes', odds: [1.80, 1.82, 1.78, 1.83] },
  { nikeMirrorId: 'nike-2', rawMarketName: 'BTTS', selection: 'No', odds: [2.00, 1.98, 2.02, 1.97] },
  { nikeMirrorId: 'nike-2', rawMarketName: 'Over/Under 3.5', selection: 'Over 3.5', odds: [2.70, 2.75, 2.65, 2.80] },
  { nikeMirrorId: 'nike-2', rawMarketName: 'Over/Under 3.5', selection: 'Under 3.5', odds: [1.45, 1.43, 1.47, 1.42] },
  { nikeMirrorId: 'nike-2', rawMarketName: 'Draw No Bet', selection: 'Barcelona', odds: [1.55, 1.52, 1.58, 1.53] },
  { nikeMirrorId: 'nike-2', rawMarketName: 'Draw No Bet', selection: 'Atletico Madrid', odds: [2.45, 2.50, 2.40, 2.48] },
  // Sparta Praha vs Košice
  { nikeMirrorId: 'nike-3', rawMarketName: 'Winner', selection: 'Sparta Praha', odds: [1.38, 1.42, 1.35, 1.40] },
  { nikeMirrorId: 'nike-3', rawMarketName: 'Winner', selection: 'Kosice', odds: [2.80, 2.85, 2.75, 2.82] },
  { nikeMirrorId: 'nike-3', rawMarketName: 'Over/Under 5.5', selection: 'Over 5.5', odds: [2.00, 1.98, 2.02, 1.95] },
  { nikeMirrorId: 'nike-3', rawMarketName: 'Over/Under 5.5', selection: 'Under 5.5', odds: [1.80, 1.82, 1.78, 1.85] },
  { nikeMirrorId: 'nike-3', rawMarketName: 'Handicap -1.5', selection: 'Sparta Praha -1.5', odds: [2.55, 2.60, 2.50, 2.58] },
  { nikeMirrorId: 'nike-3', rawMarketName: 'Handicap -1.5', selection: 'Kosice +1.5', odds: [1.48, 1.45, 1.50, 1.47] },
  // Tennis
  { nikeMirrorId: 'nike-4', rawMarketName: 'Winner', selection: 'Djokovic', odds: [2.20, 2.25, 2.15, 2.22] },
  { nikeMirrorId: 'nike-4', rawMarketName: 'Winner', selection: 'Alcaraz', odds: [1.65, 1.62, 1.68, 1.63] },
  { nikeMirrorId: 'nike-4', rawMarketName: 'Total Sets Over/Under 2.5', selection: 'Over 2.5', odds: [1.72, 1.68, 1.75, 1.70] },
  { nikeMirrorId: 'nike-4', rawMarketName: 'Total Sets Over/Under 2.5', selection: 'Under 2.5', odds: [2.08, 2.12, 2.05, 2.10] },
  { nikeMirrorId: 'nike-4', rawMarketName: 'Total Games Over/Under 22.5', selection: 'Over 22.5', odds: [1.85, 1.88, 1.82, 1.86] },
  { nikeMirrorId: 'nike-4', rawMarketName: 'Total Games Over/Under 22.5', selection: 'Under 22.5', odds: [1.95, 1.92, 1.98, 1.94] },
  // Real Madrid vs Bayern
  { nikeMirrorId: 'nike-5', rawMarketName: 'Over/Under 2.5', selection: 'Over 2.5', odds: [1.68, 1.70, 1.65, 1.72] },
  { nikeMirrorId: 'nike-5', rawMarketName: 'Over/Under 2.5', selection: 'Under 2.5', odds: [2.15, 2.12, 2.18, 2.10] },
  { nikeMirrorId: 'nike-5', rawMarketName: 'BTTS', selection: 'Yes', odds: [1.72, 1.70, 1.74, 1.68] },
  { nikeMirrorId: 'nike-5', rawMarketName: 'BTTS', selection: 'No', odds: [2.08, 2.10, 2.06, 2.12] },
  { nikeMirrorId: 'nike-5', rawMarketName: 'Draw No Bet', selection: 'Real Madrid', odds: [1.58, 1.55, 1.60, 1.56] },
  { nikeMirrorId: 'nike-5', rawMarketName: 'Draw No Bet', selection: 'Bayern Munich', odds: [2.30, 2.35, 2.28, 2.32] },
];

export async function findFlashscoreMatches(nikeMatches: NikeMatch[]): Promise<FlashscoreMatch[]> {
  await new Promise(r => setTimeout(r, 600));
  const results: FlashscoreMatch[] = [];

  for (const nike of nikeMatches) {
    for (const fs of MOCK_FS_MATCHES) {
      if (fs.nikeMirrorId !== nike.id) continue;
      const confidence = computeMatchConfidence(
        nike.homeTeam, nike.awayTeam, fs.homeTeam, fs.awayTeam,
        nike.sport, fs.sport, nike.date, fs.date, nike.time, fs.time
      );
      if (confidence >= MATCH_CONFIDENCE_THRESHOLD) {
        results.push({
          id: `fs-${fs.nikeMirrorId}`,
          sport: fs.sport,
          date: fs.date,
          time: fs.time,
          homeTeam: fs.homeTeam,
          awayTeam: fs.awayTeam,
          rawTitle: `${fs.homeTeam} - ${fs.awayTeam}`,
          flashscoreUrl: fs.url,
          matchingConfidence: confidence,
          matchedNikeMatchId: nike.id,
          rawPayload: { source: 'flashscore_mock' },
        });
      }
    }
  }

  return results;
}

export async function parseFlashscoreOdds(fsMatches: FlashscoreMatch[]): Promise<FlashscoreMarket[]> {
  await new Promise(r => setTimeout(r, 700));
  const markets: FlashscoreMarket[] = [];
  let counter = 0;

  for (const fsMatch of fsMatches) {
    const mirrorId = fsMatch.matchedNikeMatchId;
    const defs = MOCK_FS_MARKETS.filter(d => d.nikeMirrorId === mirrorId);

    for (const def of defs) {
      counter++;
      const norm = normalizeMarket(def.rawMarketName, def.selection, fsMatch.sport);
      markets.push({
        id: `fs-mkt-${counter}`,
        flashscoreMatchId: fsMatch.id,
        marketType: norm.marketType,
        rawMarketName: def.rawMarketName,
        selection: norm.selection,
        line: norm.line,
        period: norm.period,
        side: norm.side,
        bookmakerOdds: makeOdds(...def.odds),
        rawPayload: { rawMarketName: def.rawMarketName, rawSelection: def.selection },
      });
    }
  }

  return markets;
}
