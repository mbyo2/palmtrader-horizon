
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Add detailed logging
  console.log('Received request to finnhub-websocket function');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Retrieving Finnhub API key from environment');
    const apiKey = Deno.env.get('FINNHUB_API_KEY');
    
    if (!apiKey) {
      console.error('Finnhub API key not found in environment variables');
      return new Response(
        JSON.stringify({ 
          error: 'Finnhub API key not configured',
          details: 'Please ensure FINNHUB_API_KEY is set in Edge Function secrets'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Successfully retrieved API key, returning to client');
    
    // Return the API key to the client
    return new Response(
      JSON.stringify({ apiKey, status: 'success' }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in finnhub-websocket function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
