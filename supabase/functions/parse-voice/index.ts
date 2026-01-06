import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Direct Gemini API key (your own)
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const SYSTEM_PROMPT = `You are a voice command parser for a finance app. Parse the user's voice command to extract:
1. Transaction type (expense or income)
2. Category (from the list below)
3. Amount (numeric value)
4. Description (optional, use category name if not provided)

Categories for expenses:
- food, restaurants, coffee, transport, taxi, fuel, bills, shopping, health, education, entertainment, other

Categories for income:
- salary, freelance, bonus, other_income

Parse commands like:
- "taxi 20000" → expense, taxi, 20000
- "coffee 15000" → expense, coffee, 15000
- "lunch 35000" → expense, restaurants, 35000
- "salary 5000000" → income, salary, 5000000
- "shopping 100000" → expense, shopping, 100000
- "transport home 8000" → expense, transport, 8000, "home"

Return JSON format:
{
  "type": "expense" | "income",
  "categoryId": "category_id",
  "amount": number,
  "description": "optional description or category name"
}

If you can't parse the command, return:
{ "error": "Could not understand command" }`;

// Call Gemini API directly
async function callGemini(userPrompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${SYSTEM_PROMPT}\n\n---\n\n${userPrompt}` }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 200,
        }
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error:", response.status, errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, lang } = await req.json();
    
    if (!text) {
      return new Response(
        JSON.stringify({ error: "No text provided" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Parsing voice command: "${text}" (lang: ${lang})`);

    const content = await callGemini(`Parse this voice command (language: ${lang || 'en'}): "${text}"`);

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No response from AI" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON from response
    let parsed;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, content];
      parsed = JSON.parse((jsonMatch[1] || content).trim());
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Could not parse command" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Parsed command:", JSON.stringify(parsed));

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in parse-voice function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
