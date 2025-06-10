import { supabase } from "@/integrations/supabase/client";
import { MarketData } from "./types";
import { DataCache } from "./dataCache";

// Cache TTLs for different data types
const PRICE_CACHE_TTL = 30000; // 30 seconds for price data to allow real-time updates
const HISTORICAL_CACHE_TTL = 300000; // 5 minutes for historical data

export const DataFetcher = {
  /**
   * Fetch the latest price for a symbol using real API
   * @param symbol Stock symbol
   * @returns Latest price data
   */
  async fetchLatestPrice(symbol: string): Promise<{ symbol: string; price: number; change?: number; volume?: number }> {
    try {
      // Check cache first (shorter TTL for real-time data)
      const cachedPrice = DataCache.getPrice(symbol, PRICE_CACHE_TTL);
      if (cachedPrice !== null) {
        return {
          symbol,
          price: cachedPrice,
          change: 0,
          volume: 0
        };
      }
      
      console.log(`Fetching real-time price for ${symbol} from Finnhub API`);
      
      // Fetch from Finnhub API via edge function
      const { data, error } = await supabase.functions.invoke('finnhub-websocket', {
        body: { action: 'get_quote', symbol }
      });

      if (error) {
        console.error(`Error fetching price for ${symbol}:`, error);
        throw error;
      }

      if (data && typeof data.c === 'number' && data.c > 0) {
        const result = {
          symbol,
          price: data.c,
          change: data.dp || 0,
          volume: data.v || 0
        };
        
        // Cache the real price data
        DataCache.setPrice(symbol, data.c);
        
        console.log(`Real price fetched for ${symbol}: $${data.c}`);
        return result;
      }
      
      throw new Error(`Invalid price data received for ${symbol}`);
    } catch (error) {
      console.error(`Error fetching latest price for ${symbol}:`, error);
      
      // Return cached data if available, otherwise throw error
      const cachedPrice = DataCache.getPrice(symbol, PRICE_CACHE_TTL * 10); // Extended cache check
      if (cachedPrice !== null) {
        console.log(`Using cached price for ${symbol}: $${cachedPrice}`);
        return {
          symbol,
          price: cachedPrice,
          change: 0,
          volume: 0
        };
      }
      
      throw error;
    }
  },
  
  /**
   * Fetch historical data for a symbol using Alpha Vantage
   * @param symbol Stock symbol
   * @param days Number of days of historical data
   * @returns Array of historical data points
   */
  async fetchHistoricalData(symbol: string, days: number = 30): Promise<MarketData[]> {
    try {
      const cacheKey = `${symbol}-history-${days}`;
      
      // Check cache first
      const cachedData = DataCache.get<MarketData[]>(cacheKey, HISTORICAL_CACHE_TTL);
      if (cachedData && cachedData.length > 0) {
        console.log(`Using cached historical data for ${symbol}`);
        return cachedData;
      }
      
      console.log(`Fetching ${days} days of historical data for ${symbol} from Alpha Vantage`);
      
      // Fetch from Alpha Vantage API via edge function
      const { data, error } = await supabase.functions.invoke('alpha-vantage', {
        body: { 
          function: 'TIME_SERIES_DAILY',
          symbol,
          outputsize: days > 100 ? 'full' : 'compact'
        }
      });

      if (error) {
        console.error(`Error fetching historical data for ${symbol}:`, error);
        throw error;
      }

      const timeSeries = data['Time Series (Daily)'];
      if (!timeSeries) {
        console.warn(`No historical data found for ${symbol} in API response`);
        throw new Error(`No historical data available for ${symbol}`);
      }

      const marketData: MarketData[] = [];
      const dates = Object.keys(timeSeries)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
        .slice(-days);

      for (const date of dates) {
        const dayData = timeSeries[date];
        const openPrice = parseFloat(dayData['1. open']);
        const closePrice = parseFloat(dayData['4. close']);
        
        marketData.push({
          symbol,
          timestamp: new Date(date).getTime().toString(),
          price: closePrice,
          open: openPrice,
          high: parseFloat(dayData['2. high']),
          low: parseFloat(dayData['3. low']),
          close: closePrice,
          change: closePrice - openPrice,
          changePercent: ((closePrice - openPrice) / openPrice) * 100,
          volume: parseInt(dayData['5. volume']) || 0,
          type: 'stock'
        });
      }
      
      // Cache the real data
      DataCache.set(cacheKey, marketData, HISTORICAL_CACHE_TTL);
      
      console.log(`Real historical data fetched for ${symbol}: ${marketData.length} data points`);
      return marketData;
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      throw error;
    }
  },
  
  /**
   * Fetch latest prices for multiple symbols at once
   * @param symbols Array of stock symbols
   * @returns Array of price data
   */
  async fetchMultipleLatestPrices(symbols: string[]): Promise<Array<{ symbol: string; price: number; change?: number; volume?: number }>> {
    if (!symbols.length) return [];
    
    console.log(`Fetching real-time prices for ${symbols.length} symbols`);
    
    // Fetch prices in parallel using real API
    const results = await Promise.allSettled(
      symbols.map(symbol => this.fetchLatestPrice(symbol))
    );

    return results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<{ symbol: string; price: number; change?: number; volume?: number }>).value);
  }
};
