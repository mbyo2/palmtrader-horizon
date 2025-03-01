
export const handler = async (request: Request) => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://hvrcchjbqumlknaboczh.supabase.co";
    if (!supabaseUrl) throw new Error('Supabase URL not configured');

    console.log(`Forwarding request to Supabase function at ${supabaseUrl}/functions/v1/alpha-vantage`);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/alpha-vantage`, {
      method: 'POST',
      headers: request.headers,
      body: request.body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase function error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Supabase function error: ${response.status} ${errorText}` }),
        { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return response;
  } catch (error) {
    console.error('Error in alpha-vantage API route:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
