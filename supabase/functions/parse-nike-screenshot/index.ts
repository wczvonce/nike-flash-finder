const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'imageBase64 is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsing Nike screenshot with AI, image size:', imageBase64.length);

    const prompt = `You are analyzing a screenshot from the Nike.sk betting website's "Superkurzy" (super odds) page.

Extract ALL visible matches and their odds. Return a JSON array of matches.

Each match should have this structure:
{
  "sport": "football" | "hockey" | "tennis" | "basketball" | "unknown",
  "date": "YYYY-MM-DD" (if visible, otherwise today's date),
  "time": "HH:MM" (if visible, otherwise "00:00"),
  "homeTeam": "Team Name",
  "awayTeam": "Team Name",
  "markets": [
    {
      "marketName": "market name as shown (e.g. 'Dvojitá šanca', 'Víťaz', 'Draw No Bet', 'Viac/Menej')",
      "selections": [
        { "name": "selection label (e.g. '1X', 'X2', '12', 'Viac 2.5', 'Menej 2.5')", "odd": 1.25 }
      ]
    }
  ]
}

IMPORTANT:
- Extract ALL matches visible in the screenshot
- Extract ALL markets and odds for each match
- Keep exact team names as shown
- Keep exact selection names as shown
- Odds should be numbers (e.g. 1.25, not "1.25")
- If you see "superkurzy" labels or boosted odds, include them
- Return ONLY the JSON array, no other text`;

    const response = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType || 'image/png'};base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI API error:', response.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: `AI parsing failed: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    console.log('AI response length:', content.length);

    // Extract JSON from response (might be wrapped in ```json ... ```)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('Failed to parse AI JSON:', jsonStr.substring(0, 500));
      return new Response(
        JSON.stringify({
          success: false,
          error: 'AI returned invalid JSON. Please try with a clearer screenshot.',
          rawAiResponse: content,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsed', Array.isArray(parsed) ? parsed.length : 0, 'matches from screenshot');

    return new Response(
      JSON.stringify({
        success: true,
        matches: Array.isArray(parsed) ? parsed : [],
        rawAiResponse: content,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in parse-nike-screenshot:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
