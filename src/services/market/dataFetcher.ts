
import { supabase } from "@/integrations/supabase/client";
import { MarketData } from "./types";
import { DataCache } from "./dataCache";
import { BatchProcessor } from "./batchProcessor";
import { MockDataHelper } from "./mockDataHelper";

// Cache TTLs for different data types
const PRICE_CACHE_TTL = 10000; // 10 seconds for price data
const HISTORICAL_CACHE_TTL = 60000; // 1 minute for historical data

export const DataFetcher = {
  /**
   * Fetch the latest price for a symbol
   * @param symbol Stock symbol
   * @returns Latest price data
   */
  async fetchLatestPrice(symbol: string): Promise<{ symbol: string; price: number; change?: number; volume?: number }> {
    try {
      // Check cache first
      const cachedPrice = DataCache.getPrice(symbol, PRICE_CACHE_TTL);
      if (cachedPrice !== null) {
        return {
          symbol,
          price: cachedPrice,
          change: 0,
          volume: 0
        };
      }
      
      // Use batch processing for database queries
      const result = await BatchProcessor.addToBatch<{ symbol: string; price: number; change?: number; volume?: number }>(symbol);
      
      // Update cache with the result
      if (result && result.price) {
        DataCache.setPrice(symbol, result.price);
      }
      
      return result;
    } catch (error) {
      console.error(`Error fetching latest price for ${symbol}:`, error);
      // Fallback to mock data
      return MockDataHelper.generateMockDataPoint(symbol);
    }
  },
  
  /**
   * Fetch historical data for a symbol
   * @param symbol Stock symbol
   * @param days Number of days of historical data
   * @returns Array of historical data points
   */
  async fetchHistoricalData(symbol: string, days: number = 30): Promise<MarketData[]> {
    try {
      const cacheKey = `${symbol}-history-${days}`;
      
      // Check cache first
      const cachedData = DataCache.get<MarketData[]>(cacheKey, HISTORICAL_CACHE_TTL);
      if (cachedData) {
        return cachedData;
      }
      
      console.log(`Fetching ${days} days of historical data for ${symbol}`);
      
      // Fetch from database
      const { data, error } = await supabase
        .from('market_data')
        .select('*')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: true })
        .limit(days);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Convert to MarketData format
        const marketData: MarketData[] = data.map(item => ({
          symbol: item.symbol,
          timestamp: String(item.timestamp),
          price: item.price,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close || item.price,
          volume: 0,
          type: (item.type as 'stock' | 'crypto' | 'forex') || 'stock'
        }));
        
        // Cache the result
        DataCache.set(cacheKey, marketData);
        
        return marketData;
      }
      
      // Fallback to mock data
      const mockData = MockDataHelper.generateMockData(symbol, days);
      
      // Cache the mock data
      DataCache.set(cacheKey, mockData);
      
      return mockData;
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      // Fallback to mock data
      return MockDataHelper.generateMockData(symbol, days);
    }
  },
  
  /**
   * Fetch latest prices for multiple symbols at once
   * @param symbols Array of stock symbols
   * @returns Array of price data
   */
  async fetchMultipleLatestPrices(symbols: string[]): Promise<Array<{ symbol: string; price: number; change?: number; volume?: number }>> {
    try {
      if (!symbols.length) return [];
      
      const result: Array<{ symbol: string; price: number; change?: number; volume?: number }> = [];
      const symbolsToFetch = [];
      
      // Check cache first for each symbol
      for (const symbol of symbols) {
        const cachedPrice = DataCache.getPrice(symbol, PRICE_CACHE_TTL);
        if (cachedPrice !== null) {
          result.push({
            symbol,
            price: cachedPrice,
            change: 0,
            volume: 0
          });
        } else {
          symbolsToFetch.push(symbol);
        }
      }
      
      if (symbolsToFetch.length === 0) {
        return result;
      }
      
      // Fetch data for symbols not in cache
      const { data, error } = await supabase
        .from('market_data')
        .select('*')
        .in('symbol', symbolsToFetch)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      const latestBySymbol = new Map();
      
      if (data) {
        data.forEach(item => {
          if (!latestBySymbol.has(item.symbol)) {
            latestBySymbol.set(item.symbol, item);
            
            // Update cache
            DataCache.setPrice(item.symbol, item.price);
          }
        });
      }
      
      // Add fetched data to result
      symbolsToFetch.forEach(symbol => {
        const data = latestBySymbol.get(symbol) || MockDataHelper.generateMockDataPoint(symbol);
        result.push({
          symbol: data.symbol,
          price: data.price,
          change: 0,
          volume: 0
        });
      });
      
      return result;
    } catch (error) {
      console.error("Error fetching multiple prices:", error);
      return symbols.map(symbol => MockDataHelper.generateMockDataPoint(symbol));
    }
  }
};
