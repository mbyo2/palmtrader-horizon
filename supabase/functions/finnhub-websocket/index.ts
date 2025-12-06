
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory cache with TTL (30 seconds for quotes)
const priceCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds
const RATE_LIMIT_DELAY = 1200; // 1.2 seconds between API calls (50/min max)

let lastApiCall = 0;

function getCachedPrice(symbol: string) {
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedPrice(symbol: string, data: any) {
  priceCache.set(symbol, { data, timestamp: Date.now() });
}

// Demo prices for fallback when rate limited
const demoPrices: Record<string, { price: number; change: number; changePercent: number }> = {
  'AAPL': { price: 178.50, change: 2.35, changePercent: 1.33 },
  'GOOGL': { price: 141.25, change: -0.85, changePercent: -0.60 },
  'MSFT': { price: 378.90, change: 4.20, changePercent: 1.12 },
  'AMZN': { price: 178.25, change: 1.50, changePercent: 0.85 },
  'META': { price: 505.75, change: 8.25, changePercent: 1.66 },
  'NVDA': { price: 875.50, change: -12.30, changePercent: -1.39 },
  'TSLA': { price: 245.80, change: 3.45, changePercent: 1.42 },
};

function getDemoPrice(symbol: string) {
  const demo = demoPrices[symbol] || {
    price: 100 + Math.random() * 200,
    change: (Math.random() - 0.5) * 10,
    changePercent: (Math.random() - 0.5) * 5,
  };
  
  // Add small random variation
  const variation = 1 + (Math.random() - 0.5) * 0.01;
  const price = demo.price * variation;
  
  return {
    symbol,
    price: parseFloat(price.toFixed(2)),
    change: demo.change,
    changePercent: demo.changePercent,
    high: parseFloat((price * 1.02).toFixed(2)),
    low: parseFloat((price * 0.98).toFixed(2)),
    open: parseFloat((price * 0.995).toFixed(2)),
    previousClose: parseFloat((price - demo.change).toFixed(2)),
    timestamp: Date.now(),
    isDemo: true,
  };
}

async function fetchWithRateLimit(url: string): Promise<{ data: any; rateLimited: boolean }> {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;
  
  if (timeSinceLastCall < RATE_LIMIT_DELAY) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastCall));
  }
  
  lastApiCall = Date.now();
  
  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.status === 429) {
      console.log('Finnhub rate limit hit, using demo data');
      return { data: null, rateLimited: true };
    }
    
    if (!response.ok) {
      console.log(`Finnhub API returned ${response.status}, using demo data`);
      return { data: null, rateLimited: true };
    }
    
    const data = await response.json();
    return { data, rateLimited: false };
  } catch (error) {
    console.log('Finnhub fetch error, using demo data:', error.message);
    return { data: null, rateLimited: true };
  }
}

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

    // Get real-time quote with caching
    if (action === 'get_quote' && symbol) {
      // Check cache first
      const cached = getCachedPrice(symbol);
      if (cached) {
        console.log(`Returning cached quote for ${symbol}`);
        return new Response(
          JSON.stringify(cached),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Fetching fresh quote for ${symbol}`);
      const { data, rateLimited } = await fetchWithRateLimit(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`
      );
      
      if (rateLimited || !data || data.c === 0) {
        console.log(`Using demo price for ${symbol}`);
        const demoData = getDemoPrice(symbol);
        return new Response(
          JSON.stringify(demoData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const result = {
        symbol,
        price: data.c || 0,
        change: data.d,
        changePercent: data.dp,
        high: data.h || 0,
        low: data.l || 0,
        open: data.o || 0,
        previousClose: data.pc || 0,
        timestamp: data.t ? data.t * 1000 : Date.now(),
        isDemo: false,
      };
      
      setCachedPrice(symbol, result);
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get candlestick data for charts
    if (action === 'get_candles' && symbol) {
      const res = resolution || '1';
      const fromTs = from || Math.floor(Date.now() / 1000) - 86400;
      const toTs = to || Math.floor(Date.now() / 1000);
      
      console.log(`Fetching candles for ${symbol} (${res})`);
      
      const { data, rateLimited } = await fetchWithRateLimit(
        `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${res}&from=${fromTs}&to=${toTs}&token=${apiKey}`
      );
      
      if (rateLimited || !data) {
        return new Response(
          JSON.stringify({ candles: [], status: 'rate_limited' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
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
      
      const { data, rateLimited } = await fetchWithRateLimit(
        `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`
      );
      
      if (rateLimited || !data) {
        return new Response(
          JSON.stringify([]),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
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
