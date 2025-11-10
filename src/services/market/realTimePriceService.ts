import { supabase } from "@/integrations/supabase/client";

interface PriceQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
}

// Cache for price quotes with 30 second TTL
const priceCache = new Map<string, { data: PriceQuote; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

export async function fetchRealTimeQuote(symbol: string): Promise<PriceQuote | null> {
  try {
    // Check cache first
    const cached = priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    // Fetch from edge function
    const { data, error } = await supabase.functions.invoke('finnhub-websocket', {
      body: { action: 'get_quote', symbol }
    });

    if (error) throw error;
    if (!data) return null;

    const quote: PriceQuote = {
      symbol: data.symbol,
      price: data.price,
      change: data.change || 0,
      changePercent: data.changePercent || 0,
      high: data.high,
      low: data.low,
      open: data.open,
      previousClose: data.previousClose,
      timestamp: data.timestamp || Date.now()
    };

    // Update cache
    priceCache.set(symbol, { data: quote, timestamp: Date.now() });

    return quote;
  } catch (error) {
    console.warn(`Error fetching real-time quote for ${symbol}:`, error);
    return null;
  }
}

export async function fetchMultipleQuotes(symbols: string[]): Promise<Map<string, PriceQuote>> {
  const results = new Map<string, PriceQuote>();
  
  // Fetch in parallel with delay to avoid rate limits
  const promises = symbols.map((symbol, index) => 
    new Promise<void>(resolve => {
      setTimeout(async () => {
        const quote = await fetchRealTimeQuote(symbol);
        if (quote) {
          results.set(symbol, quote);
        }
        resolve();
      }, index * 100); // 100ms delay between requests
    })
  );

  await Promise.all(promises);
  return results;
}

export function clearPriceCache() {
  priceCache.clear();
}
