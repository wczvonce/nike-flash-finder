/**
 * Flashscore Match Finder & Odds Parser
 * Live scraping from Flashscore via Firecrawl edge functions
 */
import type { FlashscoreMatch, FlashscoreMarket, BookmakerOdds, NikeMatch, Sport, TrendDirection } from '@/types/models';
import { computeMatchConfidence, MATCH_CONFIDENCE_THRESHOLD } from './teamNameNormalizer';
import { normalizeMarket } from './marketNormalizer';
import { scrapeFlashscoreOdds } from '@/lib/api/scraper';

/**
 * Search Flashscore for matching events.
 * Since we can't easily search Flashscore programmatically,
 * we construct likely URLs from team names and try to scrape them.
 */
export async function findFlashscoreMatches(nikeMatches: NikeMatch[]): Promise<{ matches: FlashscoreMatch[]; error?: string }> {
  console.log(`[FS] Finding Flashscore matches for ${nikeMatches.length} Nike matches...`);
  const results: FlashscoreMatch[] = [];
  const errors: string[] = [];

  for (const nike of nikeMatches) {
    // Construct a Flashscore search URL based on team names
    const homeSlug = slugify(nike.homeTeam);
    const awaySlug = slugify(nike.awayTeam);

    // Flashscore URLs typically follow: /zapas/SLUG/oddsy
    // We'll try common URL patterns
    const possibleUrls = [
      `https://www.flashscore.sk/zapas/${homeSlug}-${awaySlug}/`,
      `https://www.flashscore.com/match/${homeSlug}-${awaySlug}/`,
    ];

    let matched = false;
    for (const url of possibleUrls) {
      try {
        console.log(`[FS] Trying URL: ${url}`);
        const result = await scrapeFlashscoreOdds(url);

        if (result.success && result.markdown && result.markdown.length > 100) {
          const confidence = 85; // URL-based match — high confidence if page loaded

          results.push({
            id: `fs-${nike.id}`,
            sport: nike.sport,
            date: nike.date,
            time: nike.time,
            homeTeam: nike.homeTeam,
            awayTeam: nike.awayTeam,
            rawTitle: `${nike.homeTeam} - ${nike.awayTeam}`,
            flashscoreUrl: url,
            matchingConfidence: confidence,
            matchedNikeMatchId: nike.id,
            rawPayload: {
              source: 'flashscore_live',
              markdown: result.markdown,
              html: result.html || result.data?.html || '',
            },
          });
          matched = true;
          break;
        } else {
          console.log(`[FS] URL failed or empty:`, result.error);
        }
      } catch (err) {
        console.error(`[FS] Error scraping ${url}:`, err);
      }
    }

    if (!matched) {
      errors.push(`Could not find Flashscore match for: ${nike.homeTeam} - ${nike.awayTeam}`);
    }
  }

  return {
    matches: results,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  };
}

/**
 * Parse odds from scraped Flashscore markdown/HTML for each matched event
 */
export async function parseFlashscoreOdds(fsMatches: FlashscoreMatch[]): Promise<FlashscoreMarket[]> {
  console.log(`[FS] Parsing odds for ${fsMatches.length} Flashscore matches...`);
  const markets: FlashscoreMarket[] = [];
  let counter = 0;

  for (const fsMatch of fsMatches) {
    const markdown = (fsMatch.rawPayload as any)?.markdown || '';
    const html = (fsMatch.rawPayload as any)?.html || '';

    if (!markdown && !html) {
      console.log(`[FS] No content for ${fsMatch.rawTitle}, skipping odds parsing`);
      continue;
    }

    // Parse odds from the markdown
    const parsedMarkets = parseOddsFromContent(markdown, fsMatch);
    for (const pm of parsedMarkets) {
      counter++;
      markets.push({ ...pm, id: `fs-mkt-${counter}` });
    }
  }

  console.log(`[FS] Total parsed markets: ${markets.length}`);
  return markets;
}

/**
 * Parse bookmaker odds from Flashscore page content.
 * Flashscore odds pages show odds in tables with bookmaker rows.
 * Market tabs: "Dvojita sanca", "Vitaz", etc.
 * Period tabs: "Zakladny cas", "1. polcas", etc.
 */
function parseOddsFromContent(markdown: string, fsMatch: FlashscoreMatch): Omit<FlashscoreMarket, 'id'>[] {
  const markets: Omit<FlashscoreMarket, 'id'>[] = [];
  const lines = markdown.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  let currentMarketName = '';
  let currentPeriod = 'full_time';
  const bookmakerNames = ['Fortuna', 'Tipsport', 'DOXXbet', 'Tipos', 'Nike', 'Bet365'];

  // Track which market/section we're in
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect market tab names
    if (/dvojit[áa] [sš]anca|double chance/i.test(line)) {
      currentMarketName = 'Double Chance';
    } else if (/v[íi]ťaz|winner/i.test(line) && !/draw/i.test(line)) {
      currentMarketName = 'Winner';
    } else if (/draw no bet|rem[íi]za nie/i.test(line)) {
      currentMarketName = 'Draw No Bet';
    } else if (/over.?under|viac.?menej/i.test(line)) {
      currentMarketName = 'Over/Under';
    }

    // Detect period
    if (/z[áa]kladn[ýy] [čc]as|full.?time/i.test(line)) {
      currentPeriod = 'full_time';
    } else if (/1\.\s*pol[čc]as|1st.?half/i.test(line)) {
      currentPeriod = '1st_half';
    }

    // Detect bookmaker odds rows
    // Format typically: "BookmakerName | 1.24 | 1.36 | 1.93" or similar
    for (const bkName of bookmakerNames) {
      if (line.toLowerCase().includes(bkName.toLowerCase())) {
        const oddsInLine = line.match(/(\d+\.\d{2})/g);
        if (oddsInLine && oddsInLine.length >= 2 && currentMarketName) {
          const odds = oddsInLine.map(o => parseFloat(o));

          // Map columns based on market type
          if (currentMarketName === 'Double Chance' && odds.length >= 3) {
            // Columns: 1X, 12, X2
            addMarketOdd(markets, fsMatch, currentMarketName, '1x', bkName, odds[0], currentPeriod, line);
            addMarketOdd(markets, fsMatch, currentMarketName, '12', bkName, odds[1], currentPeriod, line);
            addMarketOdd(markets, fsMatch, currentMarketName, 'x2', bkName, odds[2], currentPeriod, line);
          } else if (currentMarketName === 'Winner' && odds.length >= 2) {
            // Columns: Home, Away (for 2-way)
            addMarketOdd(markets, fsMatch, currentMarketName, fsMatch.homeTeam.toLowerCase(), bkName, odds[0], currentPeriod, line);
            addMarketOdd(markets, fsMatch, currentMarketName, fsMatch.awayTeam.toLowerCase(), bkName, odds[1], currentPeriod, line);
          } else if (currentMarketName === 'Double Chance' && odds.length === 2) {
            // Only 2 visible — likely 1X and X2
            addMarketOdd(markets, fsMatch, currentMarketName, '1x', bkName, odds[0], currentPeriod, line);
            addMarketOdd(markets, fsMatch, currentMarketName, 'x2', bkName, odds[1], currentPeriod, line);
          }
        }
      }
    }
  }

  // Consolidate: group by market+selection, collect all bookmaker odds into one FlashscoreMarket
  return consolidateMarkets(markets, fsMatch);
}

interface TempOdd {
  flashscoreMatchId: string;
  marketName: string;
  selection: string;
  bookmaker: string;
  odd: number;
  period: string;
  rawLine: string;
}

const tempOdds: TempOdd[] = [];

function addMarketOdd(
  _markets: Omit<FlashscoreMarket, 'id'>[],
  fsMatch: FlashscoreMatch,
  marketName: string,
  selection: string,
  bookmaker: string,
  odd: number,
  period: string,
  rawLine: string
) {
  tempOdds.push({
    flashscoreMatchId: fsMatch.id,
    marketName,
    selection,
    bookmaker,
    odd,
    period,
    rawLine,
  });

  console.log(`[FS-PARSE] ${fsMatch.rawTitle} | ${marketName} | ${selection} | ${bookmaker} = ${odd} | period=${period}`);
}

function consolidateMarkets(
  _placeholder: Omit<FlashscoreMarket, 'id'>[],
  fsMatch: FlashscoreMatch
): Omit<FlashscoreMarket, 'id'>[] {
  const matchOdds = tempOdds.filter(o => o.flashscoreMatchId === fsMatch.id);
  const grouped: Record<string, TempOdd[]> = {};

  for (const o of matchOdds) {
    const key = `${o.marketName}|${o.selection}|${o.period}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(o);
  }

  const results: Omit<FlashscoreMarket, 'id'>[] = [];

  for (const [key, odds] of Object.entries(grouped)) {
    const [marketName, selection, period] = key.split('|');
    const norm = normalizeMarket(marketName, selection, fsMatch.sport);

    const bookmakerOdds: BookmakerOdds[] = (['Fortuna', 'Tipsport', 'DOXXbet', 'Tipos'] as const).map(name => {
      const found = odds.find(o => o.bookmaker === name);
      return {
        bookmakerName: name,
        currentOdd: found?.odd ?? null,
        openingOdd: null,
        trendDirection: null as TrendDirection,
        available: !!found,
      };
    });

    const tipsport = bookmakerOdds.find(o => o.bookmakerName === 'Tipsport');
    console.log(`[FS-CONSOLIDATED] ${fsMatch.rawTitle} | ${marketName} | ${selection} | Tipsport=${tipsport?.currentOdd ?? 'N/A'}`);

    results.push({
      flashscoreMatchId: fsMatch.id,
      marketType: norm.marketType,
      rawMarketName: marketName,
      selection: norm.selection,
      line: norm.line,
      period: norm.period as any,
      side: norm.side,
      bookmakerOdds,
      rawPayload: {
        rawMarketName: marketName,
        rawSelection: selection,
        parsedOdds: odds.map(o => ({ bookmaker: o.bookmaker, odd: o.odd, rawLine: o.rawLine })),
      },
    });
  }

  // Clear processed odds
  const remaining = tempOdds.filter(o => o.flashscoreMatchId !== fsMatch.id);
  tempOdds.length = 0;
  tempOdds.push(...remaining);

  return results;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
