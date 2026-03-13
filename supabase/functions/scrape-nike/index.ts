const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface AttemptResult {
  method: string;
  status: 'success' | 'geo_blocked' | 'empty_response' | 'anti_bot' | 'error' | 'no_content';
  reason: string;
  markdown?: string;
  html?: string;
  metadata?: Record<string, unknown>;
}

async function tryFirecrawlScrape(
  apiKey: string,
  url: string,
  method: string,
  extraOptions: Record<string, unknown> = {}
): Promise<AttemptResult> {
  try {
    console.log(`[Nike-${method}] Trying: ${url}`);
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'html'],
        waitFor: 5000,
        onlyMainContent: true,
        ...extraOptions,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.log(`[Nike-${method}] HTTP error: ${response.status}`);
      return { method, status: 'error', reason: `HTTP ${response.status}: ${data.error || 'unknown'}` };
    }

    const markdown = data.data?.markdown || data.markdown || '';
    const html = data.data?.html || data.html || '';
    const metadata = data.data?.metadata || data.metadata || {};
    const statusCode = metadata.statusCode;

    if (statusCode === 451 || markdown.includes('nie sú v tejto lokalite dostupné') || markdown.includes('Ľutujeme')) {
      console.log(`[Nike-${method}] Geo-blocked (451)`);
      return { method, status: 'geo_blocked', reason: `HTTP 451 - geo-restricted to Slovak IPs` };
    }

    if (statusCode === 403 || markdown.includes('Access Denied') || markdown.includes('Forbidden')) {
      console.log(`[Nike-${method}] Anti-bot / Access Denied`);
      return { method, status: 'anti_bot', reason: `HTTP ${statusCode} - access denied / anti-bot` };
    }

    if (!markdown || markdown.length < 50) {
      console.log(`[Nike-${method}] Empty response (${markdown.length} chars)`);
      return { method, status: 'empty_response', reason: `Response too short (${markdown.length} chars)` };
    }

    // Check if content looks like it has match data
    const hasOdds = /\d+\.\d{2}/.test(markdown);
    const hasTeamLike = markdown.length > 200;

    if (!hasOdds && !hasTeamLike) {
      console.log(`[Nike-${method}] No odds/match content found`);
      return { method, status: 'no_content', reason: 'Page loaded but no odds/match data detected', markdown, html, metadata };
    }

    console.log(`[Nike-${method}] SUCCESS! markdown=${markdown.length} chars`);
    return { method, status: 'success', reason: 'Content loaded successfully', markdown, html, metadata };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[Nike-${method}] Exception: ${msg}`);
    return { method, status: 'error', reason: msg };
  }
}

async function tryFirecrawlSearch(apiKey: string, query: string, method: string): Promise<AttemptResult> {
  try {
    console.log(`[Nike-${method}] Searching: "${query}"`);
    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit: 5,
        lang: 'sk',
        country: 'sk',
        scrapeOptions: { formats: ['markdown'] },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { method, status: 'error', reason: `HTTP ${response.status}: ${data.error || 'unknown'}` };
    }

    const results = data.data || [];
    console.log(`[Nike-${method}] Got ${results.length} search results`);

    // Find the best result with odds data
    for (const result of results) {
      const md = result.markdown || '';
      if (md.length > 200 && /\d+\.\d{2}/.test(md) && !md.includes('nie sú v tejto lokalite')) {
        console.log(`[Nike-${method}] Found matching result: ${result.url}`);
        return {
          method,
          status: 'success',
          reason: `Found via search: ${result.url}`,
          markdown: md,
          html: result.html || '',
          metadata: result.metadata || {},
        };
      }
    }

    // Return search results info even if no direct match
    const urls = results.map((r: any) => r.url).join(', ');
    return { method, status: 'no_content', reason: `Search returned ${results.length} results but no odds data. URLs: ${urls}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { method, status: 'error', reason: msg };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'auto'; // 'auto' tries all, or specific test mode

    const attempts: AttemptResult[] = [];

    // Attempt 1: Desktop standard
    const a1 = await tryFirecrawlScrape(apiKey, 'https://www.nike.sk/superkurzy', 'desktop_standard');
    attempts.push(a1);
    if (a1.status === 'success') {
      return respond(true, a1, attempts);
    }

    // Attempt 2: Desktop with SK location
    const a2 = await tryFirecrawlScrape(apiKey, 'https://www.nike.sk/superkurzy', 'desktop_sk_location', {
      location: { country: 'SK', languages: ['sk'] },
    });
    attempts.push(a2);
    if (a2.status === 'success') {
      return respond(true, a2, attempts);
    }

    // Attempt 3: Mobile URL
    const a3 = await tryFirecrawlScrape(apiKey, 'https://m.nike.sk/superkurzy', 'mobile');
    attempts.push(a3);
    if (a3.status === 'success') {
      return respond(true, a3, attempts);
    }

    // Attempt 4: Mobile with SK location
    const a4 = await tryFirecrawlScrape(apiKey, 'https://m.nike.sk/superkurzy', 'mobile_sk_location', {
      location: { country: 'SK', languages: ['sk'] },
    });
    attempts.push(a4);
    if (a4.status === 'success') {
      return respond(true, a4, attempts);
    }

    // Attempt 5: Alternative URLs
    const altUrls = [
      'https://www.nike.sk/ponuka/superkurzy',
      'https://www.nike.sk/sport/superkurzy',
      'https://nike.sk/superkurzy',
    ];
    for (let i = 0; i < altUrls.length; i++) {
      const a = await tryFirecrawlScrape(apiKey, altUrls[i], `alt_url_${i + 1}`, {
        location: { country: 'SK', languages: ['sk'] },
      });
      attempts.push(a);
      if (a.status === 'success') {
        return respond(true, a, attempts);
      }
    }

    // Attempt 6: Firecrawl search for Nike Superkurzy
    const a6 = await tryFirecrawlSearch(apiKey, 'Nike superkurzy aktuálne kurzy dnes site:nike.sk', 'search_nike_site');
    attempts.push(a6);
    if (a6.status === 'success') {
      return respond(true, a6, attempts);
    }

    // Attempt 7: Broader web search for Nike Superkurzy odds
    const a7 = await tryFirecrawlSearch(apiKey, 'Nike superkurzy kurzy dnes futbal hokej', 'search_web_broad');
    attempts.push(a7);
    if (a7.status === 'success') {
      return respond(true, a7, attempts);
    }

    // Attempt 8: Search for cached/mirror/aggregator
    const a8 = await tryFirecrawlSearch(apiKey, '"nike superkurzy" odds today', 'search_aggregator');
    attempts.push(a8);
    if (a8.status === 'success') {
      return respond(true, a8, attempts);
    }

    // All attempts failed
    console.log('[Nike] All attempts failed');
    return new Response(
      JSON.stringify({
        success: false,
        error: 'All Nike ingestion methods failed. Use screenshot upload fallback.',
        geoBlocked: attempts.some(a => a.status === 'geo_blocked'),
        attempts,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in scrape-nike:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function respond(success: boolean, result: AttemptResult, attempts: AttemptResult[]) {
  return new Response(
    JSON.stringify({
      success,
      markdown: result.markdown || '',
      html: result.html || '',
      metadata: result.metadata || {},
      sourceMethod: result.method,
      sourceReason: result.reason,
      attempts,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
