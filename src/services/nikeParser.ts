/**
 * Nike Parser — Live scraping from Nike.sk Superkurzy
 * Falls back to "live source not connected" status if scraping fails
 */
import type { NikeMatch, NikeMarket, Sport } from '@/types/models';
import { normalizeMarket } from './marketNormalizer';
import { scrapeNikeSuperkurzy } from '@/lib/api/scraper';

/**
 * Parse Nike Superkurzy markdown into structured matches and markets.
 * Expected markdown structure from Nike superkurzy page contains match rows like:
 * "Sport | Date Time | Team1 - Team2 | Market: Selection Odd Selection Odd"
 */
function parseNikeMarkdown(markdown: string): { matches: NikeMatch[]; rawMarkets: RawMarketDef[] } {
  const matches: NikeMatch[] = [];
  const rawMarkets: RawMarketDef[] = [];
  let matchCounter = 0;

  // Split into lines and process
  const lines = markdown.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Look for match patterns — Nike superkurzy typically shows:
  // Date, teams, and odds in structured format
  // We'll parse various possible formats

  let currentSport: Sport = 'unknown';
  let currentDate = '';
  let currentTime = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect sport headers
    if (/futbal|football|soccer/i.test(line) && line.length < 50) {
      currentSport = 'football';
      continue;
    }
    if (/hokej|hockey/i.test(line) && line.length < 50) {
      currentSport = 'hockey';
      continue;
    }
    if (/tenis|tennis/i.test(line) && line.length < 50) {
      currentSport = 'tennis';
      continue;
    }
    if (/basketbal|basketball/i.test(line) && line.length < 50) {
      currentSport = 'basketball';
      continue;
    }

    // Detect date patterns like "13.03." or "13.03.2026" or "2026-03-13"
    const dateMatch = line.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})?/);
    if (dateMatch) {
      const day = dateMatch[1].padStart(2, '0');
      const month = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3] || new Date().getFullYear().toString();
      currentDate = `${year}-${month}-${day}`;
    }

    // Detect time patterns like "20:30"
    const timeMatch = line.match(/(\d{1,2}:\d{2})/);
    if (timeMatch && line.length < 20) {
      currentTime = timeMatch[1];
    }

    // Detect match lines: "Team1 - Team2" or "Team1 vs Team2"
    const matchLineMatch = line.match(/^(.+?)\s*[-–]\s*(.+?)$/);
    if (matchLineMatch && !line.includes('|') && line.length > 5 && line.length < 100) {
      const home = matchLineMatch[1].trim();
      const away = matchLineMatch[2].trim();

      // Skip if it looks like a header or nav item
      if (home.length < 2 || away.length < 2) continue;
      if (/^\d+$/.test(home) || /^\d+$/.test(away)) continue;

      matchCounter++;
      const matchId = `nike-live-${matchCounter}`;

      matches.push({
        id: matchId,
        sport: currentSport,
        date: currentDate || new Date().toISOString().slice(0, 10),
        time: currentTime || '00:00',
        homeTeam: home,
        awayTeam: away,
        rawTitle: line,
        source: 'nike',
        sourceSection: 'superkurzy',
      });

      // Look ahead for odds in next few lines
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const oddsLine = lines[j];

        // Look for odds patterns like "1X 1.25" or "X2 2.04" or market names with odds
        const oddsMatches = oddsLine.match(/(\d+\.\d{2})/g);
        if (oddsMatches && oddsMatches.length >= 2) {
          // Try to detect market name
          let marketName = 'Unknown';
          if (/double chance|dvojit/i.test(oddsLine)) marketName = 'Double Chance';
          else if (/winner|vitaz|víťaz/i.test(oddsLine)) marketName = 'Winner';
          else if (/draw no bet|dnb/i.test(oddsLine)) marketName = 'Draw No Bet';
          else if (/over|under|viac|menej/i.test(oddsLine)) marketName = 'Over/Under';

          // Extract selection-odd pairs
          const selOddPattern = /([A-Za-z0-9XÉé.]+)\s+(\d+\.\d{2})/g;
          let selMatch;
          const selections: { name: string; odd: number }[] = [];

          while ((selMatch = selOddPattern.exec(oddsLine)) !== null) {
            selections.push({ name: selMatch[1], odd: parseFloat(selMatch[2]) });
          }

          if (selections.length >= 2) {
            rawMarkets.push({
              matchId,
              rawMarketName: marketName,
              selections,
            });
          }
        }

        // Stop looking if we hit another match line
        if (/^.+\s*[-–]\s*.+$/.test(oddsLine) && !oddsLine.match(/\d+\.\d{2}/)) break;
      }
    }
  }

  return { matches, rawMarkets };
}

interface RawMarketDef {
  matchId: string;
  rawMarketName: string;
  selections: { name: string; odd: number }[];
}

export async function loadNikeSuperkurzy(): Promise<{ matches: NikeMatch[]; error?: string }> {
  console.log('[NIKE] Starting live scrape of Nike Superkurzy...');

  try {
    const result = await scrapeNikeSuperkurzy();

    if (!result.success) {
      console.error('[NIKE] Scrape failed:', result.error);
      return {
        matches: [],
        error: result.geoBlocked
          ? 'Nike.sk je geo-obmedzené — dostupné len zo slovenských IP adries. Live source not connected.'
          : `Live source not connected: ${result.error}`,
      };
    }

    const markdown = result.markdown || result.data?.markdown || '';
    if (!markdown || markdown.length < 50) {
      return {
        matches: [],
        error: 'Nike.sk returned empty content. Live source not connected.',
      };
    }

    console.log('[NIKE] Received markdown, length:', markdown.length);
    const { matches, rawMarkets } = parseNikeMarkdown(markdown);
    console.log(`[NIKE] Parsed ${matches.length} matches, ${rawMarkets.length} market groups`);

    // Store raw markets globally for extraction step
    (globalThis as any).__nikeRawMarkets = rawMarkets;

    if (matches.length === 0) {
      return {
        matches: [],
        error: 'Nike Superkurzy page was loaded but no matches could be parsed. The page structure may have changed.',
      };
    }

    return { matches };
  } catch (err) {
    console.error('[NIKE] Error:', err);
    return {
      matches: [],
      error: `Live source not connected: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

export function extractNikeMarkets(matches: NikeMatch[]): NikeMarket[] {
  const rawMarkets: RawMarketDef[] = (globalThis as any).__nikeRawMarkets || [];
  const markets: NikeMarket[] = [];
  let counter = 0;

  for (const def of rawMarkets) {
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
