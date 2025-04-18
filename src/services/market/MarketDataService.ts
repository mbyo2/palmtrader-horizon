import { supabase } from "@/integrations/supabase/client";
import { MarketData } from "./types";
import { MockDataHelper } from "./mockDataHelper";

// Cache for market data to reduce database queries
const dataCache = new Map<string, { data: MarketData[]; timestamp: number }>();
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache lifetime
const BATCH_INTERVAL = 100; // Batch requests within 100ms

// Batch processor for price updates
let batchQueue: string[] = [];
let batchTimeout: NodeJS.Timeout | null = null;

export class MarketDataService {
  static async fetchLatestPrice(symbol: string): Promise<{ symbol: string; price: number; change?: number; volume?: number }> {
    try {
      console.log(`Checking cache for ${symbol}`);
      
      const now = Date.now();
      const cachedData = priceCache.get(symbol);
      if (cachedData && now - cachedData.timestamp < CACHE_TTL) {
        return {
          symbol,
          price: cachedData.price,
          change: 0,
          volume: 0
        };
      }

      // Add to batch queue
      return new Promise((resolve) => {
        batchQueue.push(symbol);
        
        if (!batchTimeout) {
          batchTimeout = setTimeout(async () => {
            const symbols = [...batchQueue];
            batchQueue = [];
            batchTimeout = null;
            
            try {
              const { data, error } = await supabase
                .from('market_data')
                .select('*')
                .in('symbol', symbols)
                .order('created_at', { ascending: false });

              if (error) throw error;

              // Process results
              const results = new Map();
              if (data) {
                data.forEach(item => {
                  if (!results.has(item.symbol)) {
                    results.set(item.symbol, {
                      symbol: item.symbol,
                      price: item.price,
                      change: 0,
                      volume: 0
                    });
                    
                    // Update cache
                    priceCache.set(item.symbol, {
                      price: item.price,
                      timestamp: now
                    });
                  }
                });
              }

              // Resolve all pending promises
              symbols.forEach(sym => {
                const result = results.get(sym) || MockDataHelper.generateMockDataPoint(sym);
                resolve(result);
              });
            } catch (error) {
              console.error("Batch fetch error:", error);
              const mockData = MockDataHelper.generateMockDataPoint(symbol);
              resolve(mockData);
            }
          }, BATCH_INTERVAL);
        }
      });
    } catch (error) {
      console.error("Error fetching stock price:", error);
      return MockDataHelper.generateMockDataPoint(symbol);
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
          volume: 0, // Default to 0 since volume might not exist in the database
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
      const now = Date.now();
      const result: Array<{ symbol: string; price: number; change?: number; volume?: number }> = [];
      const symbolsToFetch = [];
      
      // Check cache first
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
      
      if (symbolsToFetch.length === 0) {
        return result;
      }
      
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
            priceCache.set(item.symbol, {
              price: item.price,
              timestamp: now
            });
          }
        });
      }
      
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
  
  static clearCache(): void {
    dataCache.clear();
    priceCache.clear();
    MockDataHelper.clearCache();
  }
  
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
