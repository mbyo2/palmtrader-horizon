
export const handler = async (request: Request) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) throw new Error('Supabase URL not configured');

  const response = await fetch(`${supabaseUrl}/functions/v1/alpha-vantage`, {
    method: 'POST',
    headers: request.headers,
    body: request.body,
  });

  return response;
};
