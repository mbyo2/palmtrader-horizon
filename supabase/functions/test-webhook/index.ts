import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-finnhub-secret',
}

serve(async (req) => {
  // Log every request
  console.log('Received test webhook request')
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  
  // Log all headers
  const headers = Object.fromEntries(req.headers.entries())
  console.log('Headers:', JSON.stringify(headers, null, 2))

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // For POST requests, try to parse and log the body
    if (req.method === 'POST') {
      const body = await req.json()
      console.log('Received body:', JSON.stringify(body, null, 2))
    }

    // Always return 200 OK for the test endpoint
    return new Response(
      JSON.stringify({ status: 'success', message: 'Webhook test received' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in test webhook:', error)
    // Still return 200 to acknowledge receipt
    return new Response(
      JSON.stringify({ status: 'error', message: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  }
})