import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-finnhub-secret',
}

serve(async (req) => {
  console.log('Received webhook request')
  console.log('Method:', req.method)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request')
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Log all headers for debugging
    const headersObj = Object.fromEntries(req.headers.entries())
    console.log('All headers:', JSON.stringify(headersObj, null, 2))
    
    // Get Finnhub secret from headers (case-insensitive)
    const finnhubSecret = Object.entries(headersObj)
      .find(([key]) => key.toLowerCase() === 'x-finnhub-secret')?.[1]
    
    console.log('Extracted Finnhub secret:', finnhubSecret)

    // Verify secret and process data
    if (req.method === 'POST' && finnhubSecret === 'cu35pg9r01qure9bubog') {
      const body = await req.json()
      console.log('Webhook payload:', JSON.stringify(body, null, 2))

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // Transform Finnhub data format to our schema
      const marketData = body.data.map((item: any) => ({
        symbol: item.s,
        price: item.p,
        timestamp: item.t,
        type: 'trade'
      }))

      console.log('Processed market data:', JSON.stringify(marketData, null, 2))

      // Store in Supabase
      const { error } = await supabase
        .from('market_data')
        .insert(marketData)

      if (error) {
        console.error('Supabase insert error:', error)
        // Still return 200 to acknowledge receipt
        return new Response(
          JSON.stringify({ message: 'Received but failed to store', error: error.message }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }

      return new Response(
        JSON.stringify({ message: 'Success' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Invalid secret or method
    console.error('Invalid request:', {
      method: req.method,
      hasSecret: !!finnhubSecret,
      secretMatch: finnhubSecret === 'cu35pg9r01qure9bubog'
    })

    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401 
      }
    )

  } catch (error) {
    console.error('Processing error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Still return 200 to acknowledge receipt
      }
    )
  }
})