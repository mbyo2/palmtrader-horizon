
import { supabase } from "@/integrations/supabase/client";
import { MarketData } from "./types";
import { MockDataHelper } from "./mockDataHelper";

// Cache for market data to reduce database queries
const dataCache = new Map<string, { data: MarketData[]; timestamp: number }>();
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache lifetime

export class MarketDataService {
  static async fetchLatestPrice(symbol: string): Promise<{ symbol: string; price: number; change?: number; volume?: number }> {
    try {
      console.log(`Fetching latest price for ${symbol}`);
      
      // Check cache first
      const now = Date.now();
      const cachedData = priceCache.get(symbol);
      if (cachedData && now - cachedData.timestamp < CACHE_TTL) {
        return {
          symbol,
          price: cachedData.price,
          change: 0, // We don't have change data in cache
          volume: 0
        };
      }
      
      // Fetch from database
      const { data, error } = await supabase
        .from('market_data')
        .select('*')
        .eq('symbol', symbol)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      // If we have data, cache and return it
      if (data && data.length > 0) {
        const result = {
          symbol: data[0].symbol,
          price: data[0].price,
          change: 0, // We don't have change data yet
          volume: data[0].volume || 0 // Add fallback for volume
        };
        
        // Cache the result
        priceCache.set(symbol, { 
          price: result.price, 
          timestamp: now 
        });
        
        return result;
      }
      
      // If no data in database, use demo data
      const mockData = MockDataHelper.generateMockDataPoint(symbol);
      const result = {
        symbol: mockData.symbol,
        price: mockData.price,
        change: 0,
        volume: mockData.volume || 0
      };
      
      // Cache the mock result
      priceCache.set(symbol, { 
        price: result.price, 
        timestamp: now 
      });
      
      return result;
    } catch (error) {
      console.error("Error fetching stock price:", error);
      
      // Fallback to demo data
      const mockData = MockDataHelper.generateMockDataPoint(symbol);
      return {
        symbol: mockData.symbol,
        price: mockData.price,
        change: 0,
        volume: mockData.volume || 0
      };
    }
  }
  
  static async fetchHistoricalData(symbol: string, days: number = 30): Promise<MarketData[]> {
    try {
      const cacheKey = `${symbol}-${days}`;
      const now = Date.now();
      
      // Check cache first
      const cachedData = dataCache.get(cacheKey);
      if (cachedData && now - cachedData.timestamp < CACHE_TTL) {
        return cachedData.data;
      }
      
      console.log(`Fetching historical data for ${symbol} for ${days} days`);
      
      // Fetch from database
      const { data, error } = await supabase
        .from('market_data')
        .select('*')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: true })
        .limit(days);
      
      if (error) throw error;
      
      // If we have enough data, cache and return it
      if (data && data.length > 0) {
        // Convert the data to match the MarketData interface
        const formattedData: MarketData[] = data.map(item => ({
          symbol: item.symbol,
          timestamp: item.timestamp.toString(),
          price: item.price,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close || item.price,
          volume: item.volume || 0, // Add fallback for volume
          type: (item.type as 'stock' | 'crypto' | 'forex') || 'stock'
        }));
        
        // Cache the result
        dataCache.set(cacheKey, { data: formattedData, timestamp: now });
        
        return formattedData;
      }
      
      // If not enough data in database, use demo data
      const mockData = MockDataHelper.generateMockData(symbol, days);
      
      // Cache the mock result
      dataCache.set(cacheKey, { data: mockData, timestamp: now });
      
      return mockData;
    } catch (error) {
      console.error("Error fetching historical data:", error);
      
      // Fallback to demo data
      return MockDataHelper.generateMockData(symbol, days);
    }
  }

  static async fetchMultipleLatestPrices(symbols: string[]): Promise<Array<{ symbol: string; price: number; change?: number; volume?: number }>> {
    try {
      console.log(`Fetching prices for multiple symbols: ${symbols.join(', ')}`);
      
      const now = Date.now();
      const result: Array<{ symbol: string; price: number; change?: number; volume?: number }> = [];
      const symbolsToFetch = [];
      
      // Check cache first for each symbol
      for (const symbol of symbols) {
        const cachedData = priceCache.get(symbol);
        if (cachedData && now - cachedData.timestamp < CACHE_TTL) {
          result.push({
            symbol,
            price: cachedData.price,
            change: 0,
            volume: 0
          });
        } else {
          symbolsToFetch.push(symbol);
        }
      }
      
      // If all symbols are in cache, return them
      if (symbolsToFetch.length === 0) {
        return result;
      }
      
      // Fetch remaining symbols from database in one query
      const { data, error } = await supabase
        .from('market_data')
        .select('*')
        .in('symbol', symbolsToFetch)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Process database results
      if (data && data.length > 0) {
        // Create a map of the latest data for each symbol
        const latestBySymbol = new Map();
        
        data.forEach(item => {
          if (!latestBySymbol.has(item.symbol) || 
              new Date(item.created_at) > new Date(latestBySymbol.get(item.symbol).created_at)) {
            latestBySymbol.set(item.symbol, item);
          }
        });
        
        // Add each symbol's latest data to the result
        for (const symbol of symbolsToFetch) {
          const latestForSymbol = latestBySymbol.get(symbol);
          
          if (latestForSymbol) {
            result.push({ 
              symbol: latestForSymbol.symbol,
              price: latestForSymbol.price,
              change: 0,
              volume: latestForSymbol.volume || 0
            });
            
            // Cache the result
            priceCache.set(symbol, { 
              price: latestForSymbol.price, 
              timestamp: now 
            });
          } else {
            // Generate mock data for missing symbols
            const mockData = MockDataHelper.generateMockDataPoint(symbol);
            result.push({
              symbol,
              price: mockData.price,
              change: 0,
              volume: mockData.volume || 0
            });
            
            // Cache the mock result
            priceCache.set(symbol, { 
              price: mockData.price, 
              timestamp: now 
            });
          }
        }
      } else {
        // No data in database, generate mock data for all remaining symbols
        for (const symbol of symbolsToFetch) {
          const mockData = MockDataHelper.generateMockDataPoint(symbol);
          result.push({
            symbol,
            price: mockData.price,
            change: 0,
            volume: mockData.volume || 0
          });
          
          // Cache the mock result
          priceCache.set(symbol, { 
            price: mockData.price, 
            timestamp: now 
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error("Error fetching multiple stock prices:", error);
      
      // Fallback to demo data for all symbols
      return symbols.map(symbol => {
        const mockData = MockDataHelper.generateMockDataPoint(symbol);
        return {
          symbol,
          price: mockData.price,
          change: 0,
          volume: mockData.volume || 0
        };
      });
    }
  }
  
  // Utility to clear all caches
  static clearCache(): void {
    dataCache.clear();
    priceCache.clear();
    MockDataHelper.clearCache();
  }
  
  // Clear cache for a specific symbol
  static clearSymbolCache(symbol: string): void {
    // Clear price cache
    priceCache.delete(symbol);
    
    // Clear historical data cache
    for (const key of dataCache.keys()) {
      if (key.startsWith(`${symbol}-`)) {
        dataCache.delete(key);
      }
    }
    
    // Clear mock data cache
    MockDataHelper.clearSymbolCache(symbol);
  }
}
