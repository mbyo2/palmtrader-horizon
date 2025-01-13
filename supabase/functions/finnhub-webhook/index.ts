import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-finnhub-secret',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify Finnhub webhook secret
    const finnhubSecret = req.headers.get('x-finnhub-secret');
    const expectedSecret = Deno.env.get('FINNHUB_WEBHOOK_SECRET');

    if (!finnhubSecret || finnhubSecret !== expectedSecret) {
      console.error('Invalid webhook secret');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook secret' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    console.log('Received webhook data:', body)

    // Finnhub sends data in the format { data: [{ s: symbol, p: price, t: timestamp, v: volume }] }
    const marketData = body.data.map((item: any) => ({
      symbol: item.s,
      price: item.p,
      timestamp: item.t,
      type: 'trade'
    }))

    // Store the market data in Supabase
    const { data, error } = await supabase
      .from('market_data')
      .insert(marketData)

    if (error) {
      console.error('Error inserting market data:', error)
      throw error
    }

    console.log('Successfully processed webhook data:', data)

    return new Response(
      JSON.stringify({ message: 'Webhook processed successfully', data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})