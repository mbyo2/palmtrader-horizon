
import { supabase } from "@/integrations/supabase/client";
import { DataCache } from "./dataCache";
import { MarketData } from "./types";

export class MarketDataService {
  private static readonly CACHE_TTL = 300000; // 5 minutes
  private static readonly PRICE_CACHE_TTL = 30000; // 30 seconds

  static async fetchLatestPrice(symbol: string): Promise<{ price: number; change: number } | null> {
    try {
      // Check cache first
      const cachedPrice = DataCache.getPrice(symbol);
      if (cachedPrice !== null) {
        return { price: cachedPrice, change: 0 };
      }

      // Fetch from Finnhub via edge function
      const { data, error } = await supabase.functions.invoke('finnhub-websocket', {
        body: { action: 'get_quote', symbol }
      });

      if (error) throw error;

      if (data && typeof data.c === 'number') {
        const price = data.c;
        const change = data.dp || 0;
        
        // Cache the price
        DataCache.setPrice(symbol, price);
        
        return { price, change };
      }

      return null;
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      return null;
    }
  }

  static async fetchMultipleLatestPrices(symbols: string[]): Promise<Array<{ symbol: string; price: number; change?: number }>> {
    try {
      if (!symbols.length) return [];

      console.log(`Fetching prices for ${symbols.length} symbols:`, symbols);

      // Fetch prices in parallel
      const results = await Promise.allSettled(
        symbols.map(async (symbol) => {
          const data = await this.fetchLatestPrice(symbol);
          if (data) {
            return {
              symbol,
              price: data.price,
              change: data.change
            };
          }
          return null;
        })
      );

      // Filter out failed requests and return successful ones
      return results
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => (result as PromiseFulfilledResult<{ symbol: string; price: number; change?: number }>).value);
    } catch (error) {
      console.error('Error fetching multiple prices:', error);
      return [];
    }
  }

  static async fetchHistoricalData(symbol: string, days: number = 30): Promise<MarketData[]> {
    try {
      const cacheKey = `historical_${symbol}_${days}`;
      const cached = DataCache.get<MarketData[]>(cacheKey);
      if (cached) return cached;

      // Fetch from Alpha Vantage via edge function
      const { data, error } = await supabase.functions.invoke('alpha-vantage', {
        body: { 
          function: 'TIME_SERIES_DAILY',
          symbol,
          outputsize: days > 100 ? 'full' : 'compact'
        }
      });

      if (error) throw error;

      const timeSeries = data['Time Series (Daily)'];
      if (!timeSeries) {
        console.warn(`No historical data found for ${symbol}`);
        return [];
      }

      const marketData: MarketData[] = [];
      const dates = Object.keys(timeSeries)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
        .slice(-days);

      for (const date of dates) {
        const dayData = timeSeries[date];
        marketData.push({
          symbol,
          timestamp: new Date(date).getTime().toString(),
          price: parseFloat(dayData['4. close']),
          close: parseFloat(dayData['4. close']),
          type: 'stock'
        });
      }

      // Cache the result
      DataCache.set(cacheKey, marketData);
      return marketData;
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      
      // Return empty array instead of throwing
      return [];
    }
  }

  static async validateSymbol(symbol: string): Promise<boolean> {
    try {
      const price = await this.fetchLatestPrice(symbol);
      return price !== null;
    } catch (error) {
      console.error(`Error validating symbol ${symbol}:`, error);
      return false;
    }
  }

  static clearCache(symbol?: string): void {
    if (symbol) {
      DataCache.clearSymbol(symbol);
    } else {
      DataCache.clearAll();
    }
  }
}

export type { MarketData };
