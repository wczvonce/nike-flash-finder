import { supabase } from '@/integrations/supabase/client';

export interface ScrapeResult<T = any> {
  success: boolean;
  error?: string;
  data?: T;
  geoBlocked?: boolean;
}

export async function scrapeNikeSuperkurzy(): Promise<ScrapeResult<{ markdown: string; html: string }>> {
  const { data, error } = await supabase.functions.invoke('scrape-nike', {
    body: {},
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return data;
}

export async function scrapeFlashscoreOdds(matchUrl: string): Promise<ScrapeResult<{ markdown: string; html: string }>> {
  const { data, error } = await supabase.functions.invoke('scrape-flashscore', {
    body: { matchUrl },
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return data;
}
