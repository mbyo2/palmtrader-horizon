import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log('Edge Function loaded and running')

serve(async (req) => {
  console.log('=== INCOMING REQUEST ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  
  // Log raw request details
  console.log('Headers:')
  for (const [key, value] of req.headers.entries()) {
    console.log(`${key}: ${value}`)
  }

  // For POST requests, log the raw body
  if (req.method === 'POST') {
    try {
      const clonedReq = req.clone()
      const rawBody = await clonedReq.text()
      console.log('Raw body:', rawBody)
      
      // Try to parse as JSON if possible
      try {
        const jsonBody = JSON.parse(rawBody)
        console.log('Parsed JSON body:', jsonBody)
      } catch (e) {
        console.log('Body is not JSON:', e.message)
      }
    } catch (e) {
      console.log('Error reading body:', e.message)
    }
  }

  // Always return success
  return new Response(
    JSON.stringify({ status: 'success', message: 'Test webhook received' }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*'
      },
      status: 200
    }
  )
})