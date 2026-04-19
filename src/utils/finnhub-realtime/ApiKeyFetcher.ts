import { supabase } from '@/integrations/supabase/client';

export async function fetchFinnhubApiKey(): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('finnhub-websocket', {
      body: { action: 'get_api_key' },
    });

    if (!error && data?.apiKey) {
      return data.apiKey;
    }
    console.warn('Could not retrieve Finnhub API key, using demo mode');
  } catch (err) {
    console.warn('Error fetching API key:', err);
  }
  return 'demo';
}
