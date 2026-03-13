const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { matchUrl } = await req.json();

    if (!matchUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'matchUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure URL points to odds page
    let oddsUrl = matchUrl;
    if (!oddsUrl.includes('/oddsy') && !oddsUrl.includes('/odds')) {
      oddsUrl = oddsUrl.replace(/\/$/, '') + '/oddsy';
    }

    console.log('Scraping Flashscore odds:', oddsUrl);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: oddsUrl,
        formats: ['markdown', 'html'],
        waitFor: 5000,
        onlyMainContent: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl error:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Firecrawl request failed: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const markdown = data.data?.markdown || data.markdown || '';
    const html = data.data?.html || data.html || '';

    if (markdown.includes('Požadovaná stránka nemôže byť zobrazená')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Flashscore page could not be loaded. It may require JavaScript rendering.',
          rawMarkdown: markdown,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Flashscore scrape successful, markdown length:', markdown.length);

    return new Response(
      JSON.stringify({
        success: true,
        markdown,
        html,
        matchUrl: oddsUrl,
        metadata: data.data?.metadata || data.metadata || {},
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping Flashscore:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
