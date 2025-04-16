
import { supabase } from "@/integrations/supabase/client";
import { MarketData } from "./types";

// Demo market data for development and fallback
const demoMarketData: Record<string, MarketData[]> = {
  'AAPL': generateDemoData('AAPL', 180),
  'MSFT': generateDemoData('MSFT', 320),
  'GOOGL': generateDemoData('GOOGL', 140),
  'AMZN': generateDemoData('AMZN', 130),
  'TSLA': generateDemoData('TSLA', 240),
  'BTC': generateDemoData('BTC', 35000),
  'ETH': generateDemoData('ETH', 2500),
};

function generateDemoData(symbol: string, basePrice: number): MarketData[] {
  const data: MarketData[] = [];
  const now = new Date();
  
  for (let i = 90; i >= 0; i--) {
    const date = new Date();
    date.setDate(now.getDate() - i);
    
    // Add some randomness to the price
    const volatility = symbol.includes('BTC') || symbol.includes('ETH') ? 0.08 : 0.03;
    const changePercent = (Math.random() - 0.5) * volatility;
    const dayPrice = basePrice * (1 + changePercent);
    
    data.push({
      symbol: symbol,
      timestamp: date.toISOString(),
      price: parseFloat(dayPrice.toFixed(2)),
      open: parseFloat((dayPrice * (1 - Math.random() * 0.01)).toFixed(2)),
      high: parseFloat((dayPrice * (1 + Math.random() * 0.02)).toFixed(2)),
      low: parseFloat((dayPrice * (1 - Math.random() * 0.02)).toFixed(2)),
      close: parseFloat(dayPrice.toFixed(2)),
      volume: Math.round(Math.random() * 10000000),
      type: (symbol.includes('BTC') || symbol.includes('ETH')) ? 'crypto' : 'stock'
    });
  }
  
  return data;
}

export class MarketDataService {
  static async fetchHistoricalData(symbol: string, days = 30): Promise<MarketData[]> {
    try {
      console.log(`Fetching ${days} days of historical data for ${symbol}`);
      
      // Try to fetch from database first
      const { data, error } = await supabase
        .from('market_data')
        .select('*')
        .eq('symbol', symbol)
        .eq('type', 'historical')
        .order('timestamp', { ascending: true })
        .limit(days);
      
      if (error) throw error;
      
      // If we have data in the database, format and return it
      if (data && data.length > 0) {
        return data.map(item => ({
          symbol: item.symbol,
          timestamp: new Date(item.timestamp).toISOString(),
          price: item.price,
          open: item.open || item.price,
          high: item.high || item.price,
          low: item.low || item.price,
          close: item.close || item.price,
          volume: item.volume || 0,
          type: (item.type === 'crypto' || item.type === 'forex') ? 
            (item.type as 'crypto' | 'forex') : 'stock'
        }));
      }
      
      // Fallback to demo data if available
      if (demoMarketData[symbol]) {
        console.log(`Using demo data for ${symbol}`);
        return demoMarketData[symbol].slice(-days);
      }
      
      // If no demo data available, generate random data
      console.log(`Generating random data for ${symbol}`);
      return generateDemoData(symbol, Math.random() * 200 + 50).slice(-days);
    } catch (error) {
      console.error("Error fetching historical data:", error);
      
      // Fallback to demo data in case of error
      if (demoMarketData[symbol]) {
        return demoMarketData[symbol].slice(-days);
      }
      
      return generateDemoData(symbol, Math.random() * 200 + 50).slice(-days);
    }
  }
  
  static async fetchLatestPrice(symbol: string): Promise<{ price: number; change?: number; changePercent?: number }> {
    try {
      console.log(`Fetching latest price for ${symbol}`);
      
      // Try to fetch from database first
      const { data, error } = await supabase
        .from('market_data')
        .select('*')
        .eq('symbol', symbol)
        .eq('type', 'realtime')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        console.log(`No real-time data found for ${symbol}, falling back to demo`);
        // Fall back to demo data
        const demoData = demoMarketData[symbol as keyof typeof demoMarketData];
        if (demoData) {
          const latestDay = demoData[demoData.length - 1];
          const previousDay = demoData[demoData.length - 2];
          
          const price = latestDay.close;
          const change = price - previousDay.close;
          const changePercent = (change / previousDay.close) * 100;
          
          return {
            price,
            change,
            changePercent
          };
        }
        
        // Generate random price if no demo data
        return {
          price: parseFloat((Math.random() * 1000 + 50).toFixed(2)),
          change: parseFloat((Math.random() * 20 - 10).toFixed(2)),
          changePercent: parseFloat((Math.random() * 5 - 2.5).toFixed(2))
        };
      }
      
      return {
        price: data.price,
        // We don't have change data in this implementation yet
        // This would be calculated from previous closing price
        change: 0,
        changePercent: 0
      };
    } catch (error) {
      console.error("Error fetching latest price:", error);
      
      // Fallback to demo data
      const demoData = demoMarketData[symbol as keyof typeof demoMarketData];
      if (demoData) {
        return {
          price: demoData[demoData.length - 1].close,
          change: 0,
          changePercent: 0
        };
      }
      
      // Generate random price as last resort
      return {
        price: parseFloat((Math.random() * 1000 + 50).toFixed(2))
      };
    }
  }
  
  static async fetchMultipleLatestPrices(symbols: string[]): Promise<Array<{ symbol: string; price: number; change?: number }>> {
    try {
      console.log(`Fetching prices for multiple symbols: ${symbols.join(', ')}`);
      
      const result = await this.fetchMultipleStockPrices(symbols);
      
      // Convert the object format to an array format
      return Object.entries(result).map(([symbol, data]) => ({
        symbol,
        price: data.price,
        change: data.change
      }));
    } catch (error) {
      console.error("Error in fetchMultipleLatestPrices:", error);
      
      // Fallback to generating demo data
      return symbols.map(symbol => {
        const demoData = demoMarketData[symbol as keyof typeof demoMarketData];
        if (demoData) {
          return {
            symbol,
            price: demoData[demoData.length - 1].close,
            change: 0
          };
        }
        
        return {
          symbol,
          price: parseFloat((Math.random() * 200 + 50).toFixed(2)),
          change: parseFloat((Math.random() * 10 - 5).toFixed(2))
        };
      });
    }
  }
  
  static async fetchMultipleStockPrices(symbols: string[]): Promise<Record<string, { price: number; change?: number }>> {
    try {
      console.log(`Fetching prices for multiple symbols: ${symbols.join(', ')}`);
      
      const result: Record<string, { price: number; change?: number }> = {};
      
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
        const latestBySymbol = symbols.reduce((acc, symbol) => {
          const latestForSymbol = data
            .filter(item => item.symbol === symbol)
            .sort((a, b) => {
              const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
              const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
              return dateB - dateA;
            })[0];
          
          if (latestForSymbol) {
            acc[symbol] = { 
              price: latestForSymbol.price,
              change: 0 // We don't have change data yet
            };
          }
          return acc;
        }, {} as Record<string, { price: number; change?: number }>);
        
        // Merge with result
        Object.assign(result, latestBySymbol);
      }
      
      // Fill in missing symbols with demo data
      for (const symbol of symbols) {
        if (!result[symbol]) {
          const demoData = demoMarketData[symbol as keyof typeof demoMarketData];
          if (demoData) {
            const latest = demoData[demoData.length - 1];
            const previous = demoData[demoData.length - 2];
            result[symbol] = {
              price: latest.close,
              change: latest.close - previous.close
            };
          } else {
            // Random data as last resort
            result[symbol] = {
              price: parseFloat((Math.random() * 200 + 50).toFixed(2)),
              change: parseFloat((Math.random() * 10 - 5).toFixed(2))
            };
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error("Error fetching multiple stock prices:", error);
      
      // Fallback to demo data for all symbols
      return symbols.reduce((acc, symbol) => {
        const demoData = demoMarketData[symbol as keyof typeof demoMarketData];
        if (demoData) {
          acc[symbol] = {
            price: demoData[demoData.length - 1].close,
            change: 0
          };
        } else {
          acc[symbol] = {
            price: parseFloat((Math.random() * 200 + 50).toFixed(2)),
            change: parseFloat((Math.random() * 10 - 5).toFixed(2))
          };
        }
        return acc;
      }, {} as Record<string, { price: number; change?: number }>);
    }
  }
}
