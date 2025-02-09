
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MarketData {
  symbol: string;
  timestamp: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  type: string;
}

serve(async (req) => {
  console.log('Alpha Vantage function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const requestData = await req.json();
    console.log('Request data:', requestData);
    
    const { symbol, dataType = 'TIME_SERIES_DAILY', market = 'stock' } = requestData;
    const apiKey = Deno.env.get('ALPHAVANTAGE_API_KEY');
    
    console.log('Processing request for:', { symbol, dataType, market });
    
    if (!apiKey) {
      console.error('Alpha Vantage API key not configured');
      throw new Error('Alpha Vantage API key not configured')
    }

    // Determine the correct API endpoint based on market type
    let endpoint = `https://www.alphavantage.co/query?apikey=${apiKey}&symbol=${symbol}`;
    
    switch (market) {
      case 'crypto':
        endpoint = `${endpoint}&function=DIGITAL_CURRENCY_DAILY&market=USD`;
        break;
      case 'forex':
        endpoint = `${endpoint}&function=FX_DAILY&from_symbol=${symbol}&to_symbol=USD`;
        break;
      default: // stocks
        endpoint = `${endpoint}&function=${dataType}`;
    }

    console.log('Fetching data from Alpha Vantage:', endpoint.replace(apiKey, '[REDACTED]'));
    
    const response = await fetch(endpoint);
    const data = await response.json();
    console.log('Alpha Vantage response:', JSON.stringify(data));

    // Check for API errors
    if (data['Error Message']) {
      console.error('Alpha Vantage error:', data['Error Message']);
      throw new Error(data['Error Message']);
    }

    if (data['Note']) {
      console.warn('Alpha Vantage API limit warning:', data['Note']);
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse and store the data
    let marketData: MarketData[] = [];

    if (market === 'crypto' && data['Time Series (Digital Currency Daily)']) {
      const timeSeriesData = data['Time Series (Digital Currency Daily)'];
      marketData = Object.entries(timeSeriesData).map(([date, values]: [string, any]) => ({
        symbol,
        timestamp: date,
        price: parseFloat(values['4a. close (USD)']),
        open: parseFloat(values['1a. open (USD)']),
        high: parseFloat(values['2a. high (USD)']),
        low: parseFloat(values['3a. low (USD)']),
        close: parseFloat(values['4a. close (USD)']),
        volume: parseFloat(values['5. volume']),
        type: 'crypto'
      }));
    } else if (market === 'forex' && data['Time Series FX (Daily)']) {
      const timeSeriesData = data['Time Series FX (Daily)'];
      marketData = Object.entries(timeSeriesData).map(([date, values]: [string, any]) => ({
        symbol,
        timestamp: date,
        price: parseFloat(values['4. close']),
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        type: 'forex'
      }));
    } else if (data['Time Series (Daily)']) {
      const timeSeriesData = data['Time Series (Daily)'];
      marketData = Object.entries(timeSeriesData).map(([date, values]: [string, any]) => ({
        symbol,
        timestamp: date,
        price: parseFloat(values['4. close']),
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseFloat(values['5. volume']),
        type: 'stock'
      }));
    }

    console.log(`Parsed ${marketData.length} data points`);

    if (marketData.length > 0) {
      // Store the data in Supabase
      const { error: insertError } = await supabaseClient
        .from('market_data')
        .upsert(marketData, {
          onConflict: 'symbol,timestamp',
          ignoreDuplicates: false
        })

      if (insertError) {
        console.error('Error inserting data:', insertError)
        throw insertError
      }

      console.log(`Successfully stored ${marketData.length} records in database`);

      return new Response(
        JSON.stringify({ success: true, count: marketData.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.error('No valid data found in Alpha Vantage response');
    throw new Error('No valid data found in Alpha Vantage response')
  } catch (error) {
    console.error('Error in alpha-vantage function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

