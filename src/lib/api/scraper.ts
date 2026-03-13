import { supabase } from '@/integrations/supabase/client';

export interface ScrapeResult {
  success: boolean;
  error?: string;
  geoBlocked?: boolean;
  markdown?: string;
  html?: string;
  data?: { markdown?: string; html?: string };
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
