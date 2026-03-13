const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    const url = 'https://www.nike.sk/superkurzy';
    console.log('Scraping Nike Superkurzy:', url);

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

    // Check if page is geo-blocked
    const markdown = data.data?.markdown || data.markdown || '';
    const html = data.data?.html || data.html || '';

    if (markdown.includes('nie sú v tejto lokalite dostupné') || markdown.includes('Ľutujeme')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Nike.sk is geo-restricted. The site is only accessible from Slovak IP addresses.',
          geoBlocked: true,
          rawMarkdown: markdown,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Nike scrape successful, markdown length:', markdown.length);

    return new Response(
      JSON.stringify({
        success: true,
        markdown,
        html,
        metadata: data.data?.metadata || data.metadata || {},
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping Nike:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
