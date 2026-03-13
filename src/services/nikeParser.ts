/**
 * Mock Nike Parser
 * In production, this would scrape/API call Nike Superkurzy
 */
import type { NikeMatch, NikeMarket, Sport } from '@/types/models';
import { normalizeMarket } from './marketNormalizer';

// Realistic mock Superkurzy data
const MOCK_NIKE_MATCHES: NikeMatch[] = [
  {
    id: 'nike-1', sport: 'football', date: '2026-03-13', time: '18:30',
    homeTeam: 'Slovan Bratislava', awayTeam: 'Spartak Trnava',
    rawTitle: 'Slovan Bratislava - Spartak Trnava', source: 'nike', sourceSection: 'superkurzy',
  },
  {
    id: 'nike-2', sport: 'football', date: '2026-03-13', time: '20:45',
    homeTeam: 'Barcelona', awayTeam: 'Atletico Madrid',
    rawTitle: 'FC Barcelona - Atl. Madrid', source: 'nike', sourceSection: 'superkurzy',
  },
  {
    id: 'nike-3', sport: 'hockey', date: '2026-03-13', time: '18:00',
    homeTeam: 'HC Sparta Praha', awayTeam: 'HC Košice',
    rawTitle: 'HC Sparta Praha - HC Košice', source: 'nike', sourceSection: 'superkurzy',
  },
  {
    id: 'nike-4', sport: 'tennis', date: '2026-03-13', time: '14:00',
    homeTeam: 'Novak Djokovic', awayTeam: 'Carlos Alcaraz',
    rawTitle: 'Djokovic N. - Alcaraz C.', source: 'nike', sourceSection: 'superkurzy',
  },
  {
    id: 'nike-5', sport: 'football', date: '2026-03-14', time: '21:00',
    homeTeam: 'Real Madrid', awayTeam: 'Bayern Munich',
    rawTitle: 'Real Madrid - Bayern Munchen', source: 'nike', sourceSection: 'superkurzy',
  },
];

interface RawMarketDef {
  matchId: string;
  rawMarketName: string;
  selections: { name: string; odd: number }[];
}

const MOCK_RAW_MARKETS: RawMarketDef[] = [
  // Slovan vs Spartak
  { matchId: 'nike-1', rawMarketName: 'Výsledok zápasu (1X2)', selections: [
    { name: '1', odd: 1.55 }, { name: 'X', odd: 3.80 }, { name: '2', odd: 5.50 }
  ]},
  { matchId: 'nike-1', rawMarketName: 'Oba tímy skórujú', selections: [
    { name: 'Áno', odd: 2.10 }, { name: 'Nie', odd: 1.70 }
  ]},
  { matchId: 'nike-1', rawMarketName: 'Celkový počet gólov Over/Under 2.5', selections: [
    { name: 'Over 2.5', odd: 2.25 }, { name: 'Under 2.5', odd: 1.62 }
  ]},
  { matchId: 'nike-1', rawMarketName: 'Double Chance', selections: [
    { name: '1X', odd: 1.15 }, { name: 'X2', odd: 2.40 }
  ]},
  { matchId: 'nike-1', rawMarketName: 'Handicap -1.5', selections: [
    { name: 'Home -1.5', odd: 3.30 }, { name: 'Away +1.5', odd: 1.30 }
  ]},
  // Barcelona vs Atletico
  { matchId: 'nike-2', rawMarketName: 'Výsledok zápasu (1X2)', selections: [
    { name: '1', odd: 1.85 }, { name: 'X', odd: 3.50 }, { name: '2', odd: 4.20 }
  ]},
  { matchId: 'nike-2', rawMarketName: 'Over/Under 2.5', selections: [
    { name: 'Over 2.5', odd: 1.95 }, { name: 'Under 2.5', odd: 1.88 }
  ]},
  { matchId: 'nike-2', rawMarketName: 'BTTS', selections: [
    { name: 'Yes', odd: 1.85 }, { name: 'No', odd: 1.95 }
  ]},
  { matchId: 'nike-2', rawMarketName: 'Over/Under 3.5', selections: [
    { name: 'Over 3.5', odd: 2.80 }, { name: 'Under 3.5', odd: 1.42 }
  ]},
  { matchId: 'nike-2', rawMarketName: 'Draw No Bet', selections: [
    { name: 'Barcelona', odd: 1.50 }, { name: 'Atletico Madrid', odd: 2.55 }
  ]},
  // Sparta Praha vs Košice (hockey - 2-way winner)
  { matchId: 'nike-3', rawMarketName: 'Víťaz zápasu', selections: [
    { name: 'Sparta Praha', odd: 1.40 }, { name: 'Košice', odd: 2.90 }
  ]},
  { matchId: 'nike-3', rawMarketName: 'Over/Under 5.5', selections: [
    { name: 'Over 5.5', odd: 2.05 }, { name: 'Under 5.5', odd: 1.75 }
  ]},
  { matchId: 'nike-3', rawMarketName: 'Handicap -1.5', selections: [
    { name: 'Sparta Praha -1.5', odd: 2.65 }, { name: 'Košice +1.5', odd: 1.45 }
  ]},
  // Tennis - Djokovic vs Alcaraz
  { matchId: 'nike-4', rawMarketName: 'Winner', selections: [
    { name: 'Djokovic', odd: 2.30 }, { name: 'Alcaraz', odd: 1.62 }
  ]},
  { matchId: 'nike-4', rawMarketName: 'Total Sets Over/Under 2.5', selections: [
    { name: 'Over 2.5', odd: 1.70 }, { name: 'Under 2.5', odd: 2.10 }
  ]},
  { matchId: 'nike-4', rawMarketName: 'Total Games Over/Under 22.5', selections: [
    { name: 'Over 22.5', odd: 1.88 }, { name: 'Under 22.5', odd: 1.92 }
  ]},
  // Real Madrid vs Bayern
  { matchId: 'nike-5', rawMarketName: 'Výsledok (1X2)', selections: [
    { name: '1', odd: 2.20 }, { name: 'X', odd: 3.40 }, { name: '2', odd: 3.10 }
  ]},
  { matchId: 'nike-5', rawMarketName: 'Over/Under 2.5', selections: [
    { name: 'Over 2.5', odd: 1.72 }, { name: 'Under 2.5', odd: 2.12 }
  ]},
  { matchId: 'nike-5', rawMarketName: 'BTTS', selections: [
    { name: 'Yes', odd: 1.75 }, { name: 'No', odd: 2.05 }
  ]},
  { matchId: 'nike-5', rawMarketName: 'Draw No Bet', selections: [
    { name: 'Real Madrid', odd: 1.55 }, { name: 'Bayern Munich', odd: 2.35 }
  ]},
];

export async function loadNikeSuperkurzy(): Promise<NikeMatch[]> {
  // Simulate async load
  await new Promise(r => setTimeout(r, 800));
  return MOCK_NIKE_MATCHES;
}

export function extractNikeMarkets(matches: NikeMatch[]): NikeMarket[] {
  const markets: NikeMarket[] = [];
  let counter = 0;

  for (const def of MOCK_RAW_MARKETS) {
    const match = matches.find(m => m.id === def.matchId);
    if (!match) continue;

    for (const sel of def.selections) {
      counter++;
      const norm = normalizeMarket(def.rawMarketName, sel.name, match.sport);
      markets.push({
        id: `nike-mkt-${counter}`,
        matchId: def.matchId,
        marketType: norm.marketType,
        rawMarketName: def.rawMarketName,
        rawSelectionName: sel.name,
        selection: norm.selection,
        line: norm.line,
        period: norm.period,
        side: norm.side,
        outcomeCount: def.selections.length,
        nikeCurrentOdd: sel.odd,
        isTwoWay: def.selections.length === 2,
        rawPayload: { rawMarketName: def.rawMarketName, rawSelection: sel.name, odd: sel.odd },
      });
    }
  }

  return markets;
}

export function filterTwoWayMarkets(markets: NikeMarket[]): NikeMarket[] {
  return markets.filter(m => m.isTwoWay && m.marketType !== null);
}
