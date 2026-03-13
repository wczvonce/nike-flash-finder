/**
 * Nike Parser — Real Superkurzy data (current as of 2026-03-13)
 */
import type { NikeMatch, NikeMarket, Sport } from '@/types/models';
import { normalizeMarket } from './marketNormalizer';

const NIKE_MATCHES: NikeMatch[] = [
  {
    id: 'nike-1', sport: 'football', date: '2026-03-13', time: '20:30',
    homeTeam: 'M gladbach', awayTeam: 'St. Pauli',
    rawTitle: 'M gladbach - St. Pauli', source: 'nike', sourceSection: 'superkurzy',
  },
  {
    id: 'nike-2', sport: 'football', date: '2026-03-14', time: '18:30',
    homeTeam: 'Chelsea', awayTeam: 'Newcastle Utd.',
    rawTitle: 'Chelsea - Newcastle Utd.', source: 'nike', sourceSection: 'superkurzy',
  },
  {
    id: 'nike-3', sport: 'hockey', date: '2026-03-13', time: '18:00',
    homeTeam: 'Kladno', awayTeam: 'HC Sparta Praha',
    rawTitle: 'Kladno - HC Sparta Praha', source: 'nike', sourceSection: 'superkurzy',
  },
  {
    id: 'nike-4', sport: 'hockey', date: '2026-03-14', time: '16:30',
    homeTeam: 'Michalovce', awayTeam: 'Spišská N. Ves',
    rawTitle: 'Michalovce - Spišská N. Ves', source: 'nike', sourceSection: 'superkurzy',
  },
  {
    id: 'nike-5', sport: 'tennis', date: '2026-03-14', time: '02:00',
    homeTeam: 'Rybakina E.', awayTeam: 'Svitolina E.',
    rawTitle: 'Rybakina E. - Svitolina E.', source: 'nike', sourceSection: 'superkurzy',
  },
];

interface RawMarketDef {
  matchId: string;
  rawMarketName: string;
  selections: { name: string; odd: number }[];
}

const NIKE_RAW_MARKETS: RawMarketDef[] = [
  // M gladbach vs St. Pauli — from screenshot
  { matchId: 'nike-1', rawMarketName: 'Double Chance', selections: [
    { name: '1X', odd: 1.25 }, { name: 'X2', odd: 1.93 }
  ]},
  // Chelsea vs Newcastle Utd.
  { matchId: 'nike-2', rawMarketName: 'Double Chance', selections: [
    { name: '1X', odd: 1.27 }, { name: 'X2', odd: 2.04 }
  ]},
  // Kladno vs HC Sparta Praha
  { matchId: 'nike-3', rawMarketName: 'Double Chance', selections: [
    { name: '1X', odd: 1.72 }, { name: 'X2', odd: 1.41 }
  ]},
  // Michalovce vs Spišská N. Ves
  { matchId: 'nike-4', rawMarketName: 'Double Chance', selections: [
    { name: '1X', odd: 1.42 }, { name: 'X2', odd: 1.58 }
  ]},
  // Rybakina vs Svitolina — 2-way winner
  { matchId: 'nike-5', rawMarketName: 'Winner', selections: [
    { name: 'Rybakina E.', odd: 1.42 }, { name: 'Svitolina E.', odd: 3.00 }
  ]},
];

export async function loadNikeSuperkurzy(): Promise<NikeMatch[]> {
  await new Promise(r => setTimeout(r, 400));
  return NIKE_MATCHES;
}

export function extractNikeMarkets(matches: NikeMatch[]): NikeMarket[] {
  const markets: NikeMarket[] = [];
  let counter = 0;

  for (const def of NIKE_RAW_MARKETS) {
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
