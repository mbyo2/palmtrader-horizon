
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";

// Set up CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle CORS preflight requests
const handleCors = (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
};

serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Get Alpha Vantage API key from environment
    const apiKey = Deno.env.get('ALPHAVANTAGE_API_KEY');
    if (!apiKey) {
      console.error("Alpha Vantage API key not found");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Parse request body
    const { symbol, market = 'stock', dataType = 'TIME_SERIES_DAILY' } = await req.json();
    
    if (!symbol) {
      return new Response(
        JSON.stringify({ error: "Symbol is required" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Processing ${market} data for ${symbol} using ${dataType}`);

    // Connect to Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Construct Alpha Vantage API URL
    let url = `https://www.alphavantage.co/query?function=${dataType}&symbol=${symbol}&apikey=${apiKey}`;
    
    if (dataType === 'TIME_SERIES_DAILY') {
      url += '&outputsize=compact';
    }

    console.log(`Fetching data from Alpha Vantage: ${url}`);

    // Make the API request
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Check for API errors or rate limiting
    if (data['Error Message']) {
      throw new Error(`Alpha Vantage API error: ${data['Error Message']}`);
    }
    
    if (data['Note']) {
      console.warn(`Alpha Vantage API note: ${data['Note']}`);
      // Continue processing if it's a rate limit warning but we still got data
    }

    // Process TIME_SERIES_DAILY data
    if (dataType === 'TIME_SERIES_DAILY') {
      const timeSeriesKey = 'Time Series (Daily)';
      
      if (!data[timeSeriesKey]) {
        console.error("No time series data returned", data);
        return new Response(
          JSON.stringify({ error: "No data available for this symbol", data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const timeSeries = data[timeSeriesKey];
      const marketData = [];

      // Process each data point
      for (const [date, values] of Object.entries(timeSeries)) {
        marketData.push({
          symbol: symbol.toUpperCase(),
          timestamp: new Date(date).toISOString(),
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume']),
          price: parseFloat(values['4. close']),
          type: market
        });
      }

      // Sort by date, oldest first
      marketData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Insert data into the database
      if (marketData.length > 0) {
        console.log(`Inserting ${marketData.length} records for ${symbol}`);
        
        // First delete existing data for this symbol
        const { error: deleteError } = await supabase
          .from('market_data')
          .delete()
          .eq('symbol', symbol.toUpperCase());
          
        if (deleteError) {
          console.error("Error deleting existing data:", deleteError);
        }
        
        // Then insert new data
        const { error: insertError } = await supabase
          .from('market_data')
          .insert(marketData);
          
        if (insertError) {
          console.error("Error inserting market data:", insertError);
          throw new Error(`Database error: ${insertError.message}`);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Successfully processed ${marketData.length} records for ${symbol}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Unsupported data type" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
  } catch (error) {
    console.error("Alpha Vantage function error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
