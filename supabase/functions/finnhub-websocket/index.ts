
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('FINNHUB_API_KEY');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Finnhub API key not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { action, symbol } = await req.json();
    
    if (action === 'get_quote') {
      console.log(`Fetching quote for ${symbol}`);
      
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform Finnhub format to our format
      const transformedData = {
        symbol,
        price: data.c, // current price
        change: data.d, // change
        changePercent: data.dp, // change percent
        high: data.h,
        low: data.l,
        open: data.o,
        previousClose: data.pc,
        timestamp: data.t * 1000 // Convert to milliseconds
      };
      
      return new Response(
        JSON.stringify(transformedData),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    if (action === 'get_news') {
      console.log('Fetching market news');
      
      const response = await fetch(
        `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      return new Response(
        JSON.stringify(data),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // For WebSocket connection, return the API key
    if (action === 'get_api_key') {
      return new Response(
        JSON.stringify({ apiKey, status: 'success' }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Finnhub API error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
