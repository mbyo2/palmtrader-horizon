import { supabase } from "@/integrations/supabase/client";
import { MarketData } from "./types";
import { demoMarketData } from "./mockDataHelper";

export class MarketDataService {
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
              volume: latestForSymbol.volume || 0 // Use volume if exists, otherwise default to 0
            });
          }
        });
      }
      
      // Fill in missing symbols with demo data
      for (const symbol of symbols) {
        if (!result.some(r => r.symbol === symbol)) {
          const demoData = demoMarketData[symbol as keyof typeof demoMarketData];
          if (demoData) {
            const latest = demoData[demoData.length - 1];
            const previous = demoData[demoData.length - 2];
            result.push({
              symbol,
              price: latest.close,
              change: latest.close - previous.close,
              volume: latest.volume || 0 // Use volume if exists, otherwise default to 0
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
        const demoData = demoMarketData[symbol as keyof typeof demoMarketData];
        if (demoData) {
          const latest = demoData[demoData.length - 1];
          return {
            symbol,
            price: latest.close,
            change: 0,
            volume: latest.volume || 0 // Use volume if exists, otherwise default to 0
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
