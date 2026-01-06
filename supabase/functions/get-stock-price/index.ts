import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALPHA_VANTAGE_API_KEY = Deno.env.get('ALPHA_VANTAGE_API_KEY');

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle non-POST requests gracefully
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ 
      error: 'Method not allowed. Use POST with JSON body.',
      usage: { method: 'POST', body: { symbol: 'AAPL or BTC', type: 'stock|crypto' } }
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Parse JSON body with error handling
    let body: { symbol?: string; type?: string };
    try {
      const text = await req.text();
      if (!text || text.trim() === '') {
        return new Response(JSON.stringify({ error: 'Empty request body. Please provide JSON data.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      body = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { symbol, type } = body;
    
    if (!symbol) {
      return new Response(JSON.stringify({ error: 'Symbol is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let url: string;
    if (type === 'crypto') {
      // For crypto, use digital currency endpoint
      url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${symbol}&to_currency=USD&apikey=${ALPHA_VANTAGE_API_KEY}`;
    } else {
      // For stocks/ETFs, use global quote
      url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    let price: number | null = null;
    let change: number = 0;
    let changePercent: number = 0;

    if (type === 'crypto' && data['Realtime Currency Exchange Rate']) {
      price = parseFloat(data['Realtime Currency Exchange Rate']['5. Exchange Rate']);
    } else if (data['Global Quote']) {
      const quote = data['Global Quote'];
      price = parseFloat(quote['05. price']);
      change = parseFloat(quote['09. change']);
      changePercent = parseFloat(quote['10. change percent']?.replace('%', ''));
    }

    if (price === null) {
      // Check for API limit message
      if (data['Note'] || data['Information']) {
        throw new Error('API rate limit reached. Please try again later.');
      }
      throw new Error('Could not fetch price for symbol: ' + symbol);
    }

    return new Response(JSON.stringify({ 
      symbol, 
      price, 
      change, 
      changePercent,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching stock price:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

