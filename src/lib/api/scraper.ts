import { supabase } from '@/integrations/supabase/client';

export interface ScrapeResult {
  success: boolean;
  error?: string;
  geoBlocked?: boolean;
  markdown?: string;
  html?: string;
  data?: { markdown?: string; html?: string };
  sourceMethod?: string;
  sourceReason?: string;
  attempts?: NikeAttemptResult[];
}

export interface NikeAttemptResult {
  method: string;
  status: 'success' | 'geo_blocked' | 'empty_response' | 'anti_bot' | 'error' | 'no_content';
  reason: string;
}

export interface ScreenshotParseResult {
  success: boolean;
  error?: string;
  matches?: ScreenshotMatch[];
  rawAiResponse?: string;
}

export interface ScreenshotMatch {
  sport: string;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  markets: {
    marketName: string;
    selections: { name: string; odd: number }[];
  }[];
}

export async function scrapeNikeSuperkurzy(): Promise<ScrapeResult> {
  const { data, error } = await supabase.functions.invoke('scrape-nike', {
    body: {},
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return data as ScrapeResult;
}

export async function scrapeFlashscoreOdds(matchUrl: string): Promise<ScrapeResult> {
  const { data, error } = await supabase.functions.invoke('scrape-flashscore', {
    body: { matchUrl },
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return data as ScrapeResult;
}

export async function parseNikeScreenshot(imageBase64: string, mimeType: string): Promise<ScreenshotParseResult> {
  const { data, error } = await supabase.functions.invoke('parse-nike-screenshot', {
    body: { imageBase64, mimeType },
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return data as ScreenshotParseResult;
}
