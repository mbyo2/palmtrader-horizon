
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
      console.error('FINNHUB_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Finnhub API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action, symbol, resolution, from, to } = body;
    
    // Return API key for WebSocket connection
    if (action === 'get_api_key') {
      return new Response(
        JSON.stringify({ apiKey, status: 'success' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get real-time quote
    if (action === 'get_quote' && symbol) {
      console.log(`Fetching quote for ${symbol}`);
      
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
        { headers: { 'Accept': 'application/json' } }
      );

      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.status}`);
      }

      const data = await response.json();
      
      return new Response(
        JSON.stringify({
          symbol,
          price: data.c || 0,
          change: data.d,
          changePercent: data.dp,
          high: data.h || 0,
          low: data.l || 0,
          open: data.o || 0,
          previousClose: data.pc || 0,
          timestamp: data.t ? data.t * 1000 : Date.now()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get candlestick data for charts
    if (action === 'get_candles' && symbol) {
      const res = resolution || '1';
      const fromTs = from || Math.floor(Date.now() / 1000) - 86400;
      const toTs = to || Math.floor(Date.now() / 1000);
      
      console.log(`Fetching candles for ${symbol} (${res})`);
      
      const response = await fetch(
        `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${res}&from=${fromTs}&to=${toTs}&token=${apiKey}`,
        { headers: { 'Accept': 'application/json' } }
      );

      if (!response.ok) {
        throw new Error(`Finnhub candle API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform to OHLC array format
      if (data.s === 'ok' && data.c) {
        const candles = data.c.map((close: number, i: number) => ({
          time: data.t[i] * 1000,
          open: data.o[i],
          high: data.h[i],
          low: data.l[i],
          close: close,
          volume: data.v[i]
        }));
        
        return new Response(
          JSON.stringify({ candles, status: 'ok' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ candles: [], status: data.s || 'no_data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get market news
    if (action === 'get_news') {
      console.log('Fetching market news');
      
      const response = await fetch(
        `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`,
        { headers: { 'Accept': 'application/json' } }
      );

      if (!response.ok) {
        throw new Error(`Finnhub news API error: ${response.status}`);
      }

      const data = await response.json();
      
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Finnhub API error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
