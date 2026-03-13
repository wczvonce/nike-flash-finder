/**
 * Flashscore Match Finder & Odds Parser
 * Mock Flashscore data mirroring current Nike Superkurzy matches
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

const FS_MATCHES: MockFSMatchData[] = [
  { nikeMirrorId: 'nike-1', sport: 'football', date: '2026-03-13', time: '20:30', homeTeam: 'Borussia Monchengladbach', awayTeam: 'FC St. Pauli', url: 'https://flashscore.com/match/mgladbach-stpauli' },
  { nikeMirrorId: 'nike-2', sport: 'football', date: '2026-03-14', time: '18:30', homeTeam: 'Chelsea FC', awayTeam: 'Newcastle United', url: 'https://flashscore.com/match/chelsea-newcastle' },
  { nikeMirrorId: 'nike-3', sport: 'hockey', date: '2026-03-13', time: '18:00', homeTeam: 'Rytiri Kladno', awayTeam: 'HC Sparta Praha', url: 'https://flashscore.com/match/kladno-sparta' },
  { nikeMirrorId: 'nike-4', sport: 'hockey', date: '2026-03-14', time: '16:30', homeTeam: 'HK Dukla Michalovce', awayTeam: 'HK Spisska Nova Ves', url: 'https://flashscore.com/match/michalovce-spisska' },
  { nikeMirrorId: 'nike-5', sport: 'tennis', date: '2026-03-14', time: '02:00', homeTeam: 'Rybakina E.', awayTeam: 'Svitolina E.', url: 'https://flashscore.com/match/rybakina-svitolina' },
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

// Tipsport odds set so Nike is sometimes higher for meaningful comparison
const FS_MARKETS: MockFSMarketDef[] = [
  // M gladbach vs St. Pauli — Double Chance
  { nikeMirrorId: 'nike-1', rawMarketName: 'Double Chance', selection: '1X', odds: [1.22, 1.20, 1.23, 1.21] },
  { nikeMirrorId: 'nike-1', rawMarketName: 'Double Chance', selection: 'X2', odds: [1.88, 1.85, 1.90, 1.87] },
  // Chelsea vs Newcastle — Double Chance
  { nikeMirrorId: 'nike-2', rawMarketName: 'Double Chance', selection: '1X', odds: [1.25, 1.22, 1.26, 1.24] },
  { nikeMirrorId: 'nike-2', rawMarketName: 'Double Chance', selection: 'X2', odds: [2.00, 1.95, 2.02, 1.98] },
  // Kladno vs HC Sparta Praha — Double Chance
  { nikeMirrorId: 'nike-3', rawMarketName: 'Double Chance', selection: '1X', odds: [1.68, 1.65, 1.70, 1.67] },
  { nikeMirrorId: 'nike-3', rawMarketName: 'Double Chance', selection: 'X2', odds: [1.38, 1.40, 1.36, 1.39] },
  // Michalovce vs Spišská N. Ves — Double Chance
  { nikeMirrorId: 'nike-4', rawMarketName: 'Double Chance', selection: '1X', odds: [1.40, 1.38, 1.42, 1.39] },
  { nikeMirrorId: 'nike-4', rawMarketName: 'Double Chance', selection: 'X2', odds: [1.55, 1.52, 1.57, 1.54] },
  // Rybakina vs Svitolina — Winner
  { nikeMirrorId: 'nike-5', rawMarketName: 'Winner', selection: 'Rybakina E.', odds: [1.40, 1.38, 1.41, 1.39] },
  { nikeMirrorId: 'nike-5', rawMarketName: 'Winner', selection: 'Svitolina E.', odds: [2.90, 2.85, 2.92, 2.88] },
];

export async function findFlashscoreMatches(nikeMatches: NikeMatch[]): Promise<FlashscoreMatch[]> {
  await new Promise(r => setTimeout(r, 400));
  const results: FlashscoreMatch[] = [];

  for (const nike of nikeMatches) {
    for (const fs of FS_MATCHES) {
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
  await new Promise(r => setTimeout(r, 400));
  const markets: FlashscoreMarket[] = [];
  let counter = 0;

  for (const fsMatch of fsMatches) {
    const mirrorId = fsMatch.matchedNikeMatchId;
    const defs = FS_MARKETS.filter(d => d.nikeMirrorId === mirrorId);

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
