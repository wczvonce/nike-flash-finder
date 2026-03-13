/**
 * Nike Parser — Live scraping from Nike.sk Superkurzy
 * Multi-method approach: tries desktop, mobile, location, search
 * Falls back to screenshot OCR if all methods fail
 */
import type { NikeMatch, NikeMarket, Sport } from '@/types/models';
import type { NikeAttemptResult } from '@/lib/api/scraper';
import { normalizeMarket } from './marketNormalizer';
import { scrapeNikeSuperkurzy } from '@/lib/api/scraper';

interface RawMarketDef {
  matchId: string;
  rawMarketName: string;
  selections: { name: string; odd: number }[];
}

// Module-level storage for raw markets (used between loadNikeSuperkurzy and extractNikeMarkets)
let _nikeRawMarkets: RawMarketDef[] = [];

function parseNikeMarkdown(markdown: string): { matches: NikeMatch[]; rawMarkets: RawMarketDef[] } {
  const matches: NikeMatch[] = [];
  const rawMarkets: RawMarketDef[] = [];
  let matchCounter = 0;

  const lines = markdown.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  let currentSport: Sport = 'unknown';
  let currentDate = '';
  let currentTime = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/futbal|football|soccer/i.test(line) && line.length < 50) { currentSport = 'football'; continue; }
    if (/hokej|hockey/i.test(line) && line.length < 50) { currentSport = 'hockey'; continue; }
    if (/tenis|tennis/i.test(line) && line.length < 50) { currentSport = 'tennis'; continue; }
    if (/basketbal|basketball/i.test(line) && line.length < 50) { currentSport = 'basketball'; continue; }

    const dateMatch = line.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})?/);
    if (dateMatch) {
      const day = dateMatch[1].padStart(2, '0');
      const month = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3] || new Date().getFullYear().toString();
      currentDate = `${year}-${month}-${day}`;
    }

    const timeMatch = line.match(/(\d{1,2}:\d{2})/);
    if (timeMatch && line.length < 20) { currentTime = timeMatch[1]; }

    const matchLineMatch = line.match(/^(.+?)\s*[-–]\s*(.+?)$/);
    if (matchLineMatch && !line.includes('|') && line.length > 5 && line.length < 100) {
      const home = matchLineMatch[1].trim();
      const away = matchLineMatch[2].trim();
      if (home.length < 2 || away.length < 2) continue;
      if (/^\d+$/.test(home) || /^\d+$/.test(away)) continue;

      matchCounter++;
      const matchId = `nike-live-${matchCounter}`;

      matches.push({
        id: matchId, sport: currentSport,
        date: currentDate || new Date().toISOString().slice(0, 10),
        time: currentTime || '00:00',
        homeTeam: home, awayTeam: away, rawTitle: line,
        source: 'nike', sourceSection: 'superkurzy',
      });

      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const oddsLine = lines[j];
        const oddsMatches = oddsLine.match(/(\d+\.\d{2})/g);
        if (oddsMatches && oddsMatches.length >= 2) {
          let marketName = 'Unknown';
          if (/double chance|dvojit/i.test(oddsLine)) marketName = 'Double Chance';
          else if (/winner|vitaz|víťaz/i.test(oddsLine)) marketName = 'Winner';
          else if (/draw no bet|dnb/i.test(oddsLine)) marketName = 'Draw No Bet';
          else if (/over|under|viac|menej/i.test(oddsLine)) marketName = 'Over/Under';

          const selOddPattern = /([A-Za-z0-9XÉé.]+)\s+(\d+\.\d{2})/g;
          let selMatch;
          const selections: { name: string; odd: number }[] = [];
          while ((selMatch = selOddPattern.exec(oddsLine)) !== null) {
            selections.push({ name: selMatch[1], odd: parseFloat(selMatch[2]) });
          }
          if (selections.length >= 2) {
            rawMarkets.push({ matchId, rawMarketName: marketName, selections });
          }
        }
        if (/^.+\s*[-–]\s*.+$/.test(oddsLine) && !oddsLine.match(/\d+\.\d{2}/)) break;
      }
    }
  }

  return { matches, rawMarkets };
}

export interface NikeLoadResult {
  matches: NikeMatch[];
  error?: string;
  attempts?: NikeAttemptResult[];
  sourceMethod?: string;
}

export async function loadNikeSuperkurzy(): Promise<NikeLoadResult> {
  console.log('[NIKE] Starting multi-method Nike Superkurzy scrape...');

  try {
    const result = await scrapeNikeSuperkurzy();

    if (!result.success) {
      console.error('[NIKE] All methods failed:', result.error);
      return {
        matches: [],
        error: result.geoBlocked
          ? 'Nike.sk je geo-obmedzené — dostupné len zo slovenských IP adries.'
          : `Live source not connected: ${result.error}`,
        attempts: result.attempts || [],
        sourceMethod: undefined,
      };
    }

    const markdown = result.markdown || '';
    if (!markdown || markdown.length < 50) {
      return {
        matches: [],
        error: 'Nike.sk returned empty content.',
        attempts: result.attempts || [],
        sourceMethod: result.sourceMethod,
      };
    }

    console.log('[NIKE] Received markdown via:', result.sourceMethod, 'length:', markdown.length);
    const { matches, rawMarkets } = parseNikeMarkdown(markdown);
    console.log(`[NIKE] Parsed ${matches.length} matches, ${rawMarkets.length} market groups`);

    _nikeRawMarkets = rawMarkets;

    if (matches.length === 0) {
      return {
        matches: [],
        error: 'Nike Superkurzy page was loaded but no matches could be parsed.',
        attempts: result.attempts || [],
        sourceMethod: result.sourceMethod,
      };
    }

    return { matches, attempts: result.attempts || [], sourceMethod: result.sourceMethod };
  } catch (err) {
    console.error('[NIKE] Error:', err);
    return {
      matches: [],
      error: `Live source not connected: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

export function extractNikeMarkets(matches: NikeMatch[]): NikeMarket[] {
  const markets: NikeMarket[] = [];
  let counter = 0;

  for (const def of _nikeRawMarkets) {
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
