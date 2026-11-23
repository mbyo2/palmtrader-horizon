// The finnhub-websocket edge function no longer hands out the raw Finnhub
// API key (the get_api_key action was removed for security — any signed-in
// user could extract and abuse the shared key). Quotes, candles and news
// are proxied through the edge function instead. The direct browser
// WebSocket therefore runs in demo mode; live prices come from the
// proxied REST actions (get_quote / get_candles / get_news).
export async function fetchFinnhubApiKey(): Promise<string> {
  return 'demo';
}
