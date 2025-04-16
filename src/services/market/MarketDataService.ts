
import { supabase } from "@/integrations/supabase/client";
import { MarketData } from "./types";
import { MockDataHelper } from "./mockDataHelper";

export class MarketDataService {
  static async fetchLatestPrice(symbol: string): Promise<{ symbol: string; price: number; change?: number; volume?: number }> {
    try {
      console.log(`Fetching latest price for ${symbol}`);
      
      // Fetch from database
      const { data, error } = await supabase
        .from('market_data')
        .select('*')
        .eq('symbol', symbol)
        .eq('type', 'realtime')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      // If we have data, return it
      if (data && data.length > 0) {
        return {
          symbol: data[0].symbol,
          price: data[0].price,
          change: 0, // We don't have change data yet
          volume: 0 // Default volume to 0 since it doesn't exist in the database schema
        };
      }
      
      // If no data in database, use demo data
      const mockData = MockDataHelper.generateMockDataPoint(symbol);
      return {
        symbol: mockData.symbol,
        price: mockData.price,
        change: 0,
        volume: mockData.volume || 0
      };
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
      console.log(`Fetching historical data for ${symbol} for ${days} days`);
      
      // Fetch from database
      const { data, error } = await supabase
        .from('market_data')
        .select('*')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: true })
        .limit(days);
      
      if (error) throw error;
      
      // If we have enough data, return it
      if (data && data.length > 0) {
        // Convert the data to match the MarketData interface
        const formattedData: MarketData[] = data.map(item => ({
          symbol: item.symbol,
          timestamp: item.timestamp.toString(), // Convert timestamp to string as required by MarketData
          price: item.price,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close || item.price, // Use price as fallback
          volume: 0, // Default volume since it doesn't exist in database schema
          type: (item.type as 'stock' | 'crypto' | 'forex') || 'stock' // Use type from DB or default to 'stock'
        }));
        return formattedData;
      }
      
      // If not enough data in database, use demo data
      return MockDataHelper.generateMockData(symbol, days);
    } catch (error) {
      console.error("Error fetching historical data:", error);
      
      // Fallback to demo data
      return MockDataHelper.generateMockData(symbol, days);
    }
  }

  static async fetchMultipleLatestPrices(symbols: string[]): Promise<Array<{ symbol: string; price: number; change?: number; volume?: number }>> {
    try {
      console.log(`Fetching prices for multiple symbols: ${symbols.join(', ')}`);
      
      const result: Array<{ symbol: string; price: number; change?: number; volume?: number }> = [];
      
      // Fetch from database in one query
      const { data, error } = await supabase
        .from('market_data')
        .select('*')
        .in('symbol', symbols)
        .eq('type', 'realtime')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Process database results
      if (data && data.length > 0) {
        // Group by symbol to get the latest for each
        symbols.forEach(symbol => {
          const latestForSymbol = data
            .filter(item => item.symbol === symbol)
            .sort((a, b) => {
              const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
              const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
              return dateB - dateA;
            })[0];
          
          if (latestForSymbol) {
            result.push({ 
              symbol: latestForSymbol.symbol,
              price: latestForSymbol.price,
              change: 0, // We don't have change data yet
              volume: 0 // Default volume since it doesn't exist in database schema
            });
          }
        });
      }
      
      // Fill in missing symbols with demo data
      for (const symbol of symbols) {
        if (!result.some(r => r.symbol === symbol)) {
          const mockData = MockDataHelper.generateMockData(symbol, 2);
          if (mockData && mockData.length >= 2) {
            const latest = mockData[mockData.length - 1];
            const previous = mockData[mockData.length - 2];
            result.push({
              symbol,
              price: latest.close,
              change: latest.close - previous.close,
              volume: latest.volume || 0
            });
          } else {
            // Random data as last resort
            result.push({
              symbol,
              price: parseFloat((Math.random() * 200 + 50).toFixed(2)),
              change: parseFloat((Math.random() * 10 - 5).toFixed(2)),
              volume: Math.round(Math.random() * 1000000)
            });
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error("Error fetching multiple stock prices:", error);
      
      // Fallback to demo data for all symbols
      return symbols.map(symbol => {
        const mockData = MockDataHelper.generateMockData(symbol, 2);
        if (mockData && mockData.length >= 2) {
          const latest = mockData[mockData.length - 1];
          return {
            symbol,
            price: latest.close,
            change: 0,
            volume: latest.volume || 0
          };
        } else {
          return {
            symbol,
            price: parseFloat((Math.random() * 200 + 50).toFixed(2)),
            change: parseFloat((Math.random() * 10 - 5).toFixed(2)),
            volume: Math.round(Math.random() * 1000000)
          };
        }
      });
    }
  }
}
