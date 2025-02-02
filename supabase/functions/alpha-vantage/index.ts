import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TechnicalIndicator {
  symbol: string;
  indicator_type: string;
  value: number;
  period?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { symbol, indicator } = await req.json()
    const apiKey = Deno.env.get('ALPHAVANTAGE_API_KEY')
    
    if (!apiKey) {
      throw new Error('Alpha Vantage API key not configured')
    }

    // Fetch technical indicator data from Alpha Vantage
    const response = await fetch(
      `https://www.alphavantage.co/query?function=${indicator}&symbol=${symbol}&interval=daily&time_period=14&apikey=${apiKey}`
    )
    
    const data = await response.json()
    console.log('Alpha Vantage response:', data)

    if (data['Technical Analysis']) {
      const latestDate = Object.keys(data['Technical Analysis'])[0]
      const indicatorValue = parseFloat(Object.values(data['Technical Analysis'])[0][indicator])

      // Store the indicator in our database
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const technicalIndicator: TechnicalIndicator = {
        symbol,
        indicator_type: indicator,
        value: indicatorValue,
        period: 14, // Default period
      }

      const { error: insertError } = await supabaseClient
        .from('technical_indicators')
        .insert(technicalIndicator)

      if (insertError) {
        throw insertError
      }

      return new Response(
        JSON.stringify({ indicator: technicalIndicator }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid response from Alpha Vantage')
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})