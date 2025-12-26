import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a receipt scanner AI. Analyze the receipt image and extract the following information in JSON format:

{
  "total": number (the final total amount in the local currency, just the number),
  "vendor": string (the store/business name),
  "date": string (date in YYYY-MM-DD format, use today's date if not visible),
  "category": string (one of: food, restaurants, coffee, transport, taxi, fuel, bills, shopping, health, education, entertainment, other),
  "items": [
    { "name": string, "price": number }
  ],
  "currency": string (detected currency code like UZS, USD, RUB, etc.)
}

Important rules:
1. Extract the TOTAL/GRAND TOTAL amount, not subtotals
2. If multiple prices exist, use the final/largest amount
3. For category, analyze the vendor name and items to determine the best fit:
   - Supermarkets/grocery stores → "food"
   - Restaurants/cafes → "restaurants" 
   - Coffee shops → "coffee"
   - Gas stations → "fuel"
   - Pharmacies → "health"
   - Clothing/electronics stores → "shopping"
   - Taxis/Uber/Yandex → "taxi"
4. Always return valid JSON
5. If you cannot read the receipt clearly, return: {"error": "Could not read receipt", "total": 0}`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, mimeType, userId } = await req.json();
    
    if (!image) {
      console.error("No image provided in request");
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing receipt scan for user: ${userId}`);
    console.log(`Image type: ${mimeType}, size: ${image.length} chars`);

    // Prepare the image URL for the AI
    const imageUrl = image.startsWith('data:') 
      ? image 
      : `data:${mimeType || 'image/jpeg'};base64,${image}`;

    // Call the AI gateway with vision capabilities
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please analyze this receipt and extract the transaction details."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI gateway error: ${response.status} - ${errorText}`);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add more credits." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to process receipt" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log("AI response received:", JSON.stringify(data).slice(0, 500));

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "No response from AI" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON from the AI response
    let parsedReceipt;
    try {
      // Try to extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, content];
      const jsonString = jsonMatch[1] || content;
      parsedReceipt = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", content);
      // Try to extract just numeric amount from the response
      const amountMatch = content.match(/(\d+[\d\s,.]*)/);
      parsedReceipt = {
        total: amountMatch ? parseFloat(amountMatch[1].replace(/\s/g, '').replace(',', '.')) : 0,
        vendor: "Unknown",
        category: "other",
        error: "Partial extraction"
      };
    }

    console.log("Parsed receipt:", JSON.stringify(parsedReceipt));

    return new Response(
      JSON.stringify({
        total: parsedReceipt.total || 0,
        amount: parsedReceipt.total || 0,
        vendor: parsedReceipt.vendor || "Unknown",
        description: parsedReceipt.vendor || parsedReceipt.items?.[0]?.name || "Receipt",
        category: parsedReceipt.category || "other",
        date: parsedReceipt.date || new Date().toISOString().slice(0, 10),
        items: parsedReceipt.items || [],
        currency: parsedReceipt.currency || "UZS",
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in scan-receipt function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
