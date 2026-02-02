
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate realistic mock historical data when rate limited
function generateMockHistoricalData(symbol: string, days: number = 100) {
  const basePrice = getBasePrice(symbol);
  let price = basePrice;
  const timeSeries: Record<string, any> = {};
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    const dateStr = date.toISOString().split('T')[0];
    
    // Add realistic daily variation
    const dailyChange = (Math.random() - 0.48) * 0.03;
    price = price * (1 + dailyChange);
    
    const open = price * (1 + (Math.random() - 0.5) * 0.01);
    const high = Math.max(open, price) * (1 + Math.random() * 0.02);
    const low = Math.min(open, price) * (1 - Math.random() * 0.02);
    const volume = Math.floor(1000000 + Math.random() * 10000000);
    
    timeSeries[dateStr] = {
      '1. open': open.toFixed(4),
      '2. high': high.toFixed(4),
      '3. low': low.toFixed(4),
      '4. close': price.toFixed(4),
      '5. volume': volume.toString()
    };
  }
  
  return {
    'Meta Data': {
      '1. Information': 'Demo Daily Time Series',
      '2. Symbol': symbol,
      '3. Last Refreshed': new Date().toISOString().split('T')[0],
      '4. Output Size': 'Compact',
      '5. Time Zone': 'US/Eastern'
    },
    'Time Series (Daily)': timeSeries,
    '_isDemo': true
  };
}

function getBasePrice(symbol: string): number {
  const prices: Record<string, number> = {
    'AAPL': 178.50, 'GOOGL': 141.25, 'MSFT': 378.90, 'AMZN': 178.25,
    'META': 505.75, 'NVDA': 875.50, 'TSLA': 245.80, 'BRK.B': 412.30,
    'JPM': 195.45, 'V': 275.80, 'JNJ': 156.20, 'WMT': 165.50,
    'PG': 162.75, 'XOM': 105.30, 'HD': 385.60, 'BAC': 35.80,
    'DIS': 112.45, 'NFLX': 628.90, 'AMD': 178.25, 'CRM': 285.40
  };
  return prices[symbol] || 100 + Math.random() * 200;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ALPHAVANTAGE_API_KEY');
    
    if (!apiKey) {
      console.log('Alpha Vantage API key not configured, using demo data');
      const { symbol } = await req.json();
      return new Response(
        JSON.stringify(generateMockHistoricalData(symbol || 'AAPL')),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { function: func, symbol, outputsize, interval } = await req.json();
    
    const baseUrl = 'https://www.alphavantage.co/query';
    const params = new URLSearchParams({
      function: func,
      symbol: symbol,
      apikey: apiKey,
      ...(outputsize && { outputsize }),
      ...(interval && { interval }),
    });

    console.log(`Fetching from Alpha Vantage: ${func} for ${symbol}`);
    
    const response = await fetch(`${baseUrl}?${params}`);
    
    if (!response.ok) {
      console.log(`Alpha Vantage API error: ${response.status}, using demo data`);
      return new Response(
        JSON.stringify(generateMockHistoricalData(symbol)),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const data = await response.json();
    
    // Check for API limit or error messages - return mock data instead of error
    if (data['Error Message']) {
      console.log('Alpha Vantage error:', data['Error Message']);
      return new Response(
        JSON.stringify(generateMockHistoricalData(symbol)),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    if (data['Note'] || data['Information']?.includes('rate limit')) {
      console.log('Alpha Vantage rate limit reached, using demo data');
      return new Response(
        JSON.stringify(generateMockHistoricalData(symbol)),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    return new Response(
      JSON.stringify(data),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Alpha Vantage API error:', error);
    // Return mock data on any error
    try {
      const { symbol } = await req.json().catch(() => ({ symbol: 'AAPL' }));
      return new Response(
        JSON.stringify(generateMockHistoricalData(symbol || 'AAPL')),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } catch {
      return new Response(
        JSON.stringify(generateMockHistoricalData('AAPL')),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  }
});