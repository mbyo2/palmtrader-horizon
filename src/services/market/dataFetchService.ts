
import { supabase } from "@/integrations/supabase/client";
import { MarketData } from "./types";
import { MockDataHelper } from "./mockDataHelper";
import { toast } from "sonner";

export const DataFetchService = {
  async refreshMarketData(symbol: string, market: 'stock' | 'crypto' | 'forex' = 'stock'): Promise<boolean> {
    if (!symbol) return false;
    
    const formattedSymbol = symbol.toUpperCase();
    try {
      console.log(`Attempting to fetch data from Alpha Vantage for ${formattedSymbol}`);
      
      // Use the Supabase Edge Function with proper authorization
      const { data, error } = await supabase.functions.invoke('alpha-vantage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: formattedSymbol,
          market,
          dataType: 'TIME_SERIES_DAILY'
        }),
      });

      if (error) {
        console.error('Error calling Alpha Vantage Edge Function:', error);
        return false;
      }

      console.log('Alpha Vantage API response:', data);
      return data?.success || false;
    } catch (error) {
      console.error('Error refreshing market data:', error);
      return false;
    }
  },

  async fetchCachedData(symbol: string, startDate: Date): Promise<MarketData[] | null> {
    const formattedSymbol = symbol.toUpperCase();
    try {
      const { data: cachedData, error: cacheError } = await supabase
        .from('market_data')
        .select('*')
        .eq('symbol', formattedSymbol)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });

      if (cacheError) {
        console.error('Error fetching cached data:', cacheError);
        return null;
      }

      if (cachedData && cachedData.length > 0) {
        return cachedData.map(item => ({
          ...item,
          timestamp: new Date(item.timestamp).toISOString(),
          type: item.type as 'stock' | 'crypto' | 'forex'
        }));
      }

      return cachedData.length > 0 ? cachedData : null;
    } catch (error) {
      console.error('Error fetching cached data:', error);
      return null;
    }
  },

  async fetchLatestCachedData(symbol: string): Promise<MarketData | null> {
    const formattedSymbol = symbol.toUpperCase();
    try {
      const { data: cachedData, error: cacheError } = await supabase
        .from('market_data')
        .select('*')
        .eq('symbol', formattedSymbol)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cacheError) {
        console.error('Error fetching cached latest price:', cacheError);
        return null;
      }

      if (cachedData) {
        return {
          ...cachedData,
          timestamp: new Date(cachedData.timestamp).toISOString(),
          type: cachedData.type as 'stock' | 'crypto' | 'forex'
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching latest cached data:', error);
      return null;
    }
  }
};
