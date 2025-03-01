
import { supabase } from "@/integrations/supabase/client";

export interface MarketData {
  symbol: string;
  timestamp: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  type: 'stock' | 'crypto' | 'forex';
}

export const MarketDataService = {
  async fetchHistoricalData(symbol: string, days: number = 30): Promise<MarketData[]> {
    // First try to get cached data from Supabase
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    try {
      const { data: cachedData, error: cacheError } = await supabase
        .from('market_data')
        .select('*')
        .eq('symbol', symbol)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });

      if (cacheError) {
        console.error('Error fetching cached data:', cacheError);
      }

      // If we have recent data, return it
      if (cachedData && cachedData.length > 0) {
        const latestDataPoint = new Date(cachedData[cachedData.length - 1].timestamp);
        const now = new Date();
        const hoursSinceLastUpdate = (now.getTime() - latestDataPoint.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastUpdate < 24) {
          console.log(`Using cached data for ${symbol}, ${cachedData.length} records`);
          return cachedData.map(item => ({
            ...item,
            timestamp: new Date(item.timestamp).toISOString(),
            type: item.type as 'stock' | 'crypto' | 'forex'
          }));
        }
      }

      // If no recent data, fetch from Alpha Vantage
      console.log(`Refreshing market data for ${symbol}`);
      const refreshSuccess = await this.refreshMarketData(symbol);
      
      if (!refreshSuccess) {
        console.warn(`Failed to refresh data for ${symbol}, returning any available cached data`);
        // Return whatever cached data we have, even if it's old
        if (cachedData && cachedData.length > 0) {
          return cachedData.map(item => ({
            ...item,
            timestamp: new Date(item.timestamp).toISOString(),
            type: item.type as 'stock' | 'crypto' | 'forex'
          }));
        }
        return [];
      }

      // Get the updated data from Supabase
      const { data: updatedData, error: updateError } = await supabase
        .from('market_data')
        .select('*')
        .eq('symbol', symbol)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });

      if (updateError) {
        console.error('Error fetching updated market data:', updateError);
        throw updateError;
      }

      return (updatedData || []).map(item => ({
        ...item,
        timestamp: new Date(item.timestamp).toISOString(),
        type: item.type as 'stock' | 'crypto' | 'forex'
      }));
    } catch (error) {
      console.error(`Error in fetchHistoricalData for ${symbol}:`, error);
      return [];
    }
  },

  async fetchLatestPrice(symbol: string): Promise<MarketData | null> {
    try {
      // First try to get cached data from Supabase
      const { data: cachedData, error: cacheError } = await supabase
        .from('market_data')
        .select('*')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cacheError) {
        console.error('Error fetching cached latest price:', cacheError);
      }

      if (cachedData) {
        const latestDataPoint = new Date(cachedData.timestamp);
        const now = new Date();
        const hoursSinceLastUpdate = (now.getTime() - latestDataPoint.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastUpdate < 24) {
          console.log(`Using cached latest price for ${symbol}`);
          return {
            ...cachedData,
            timestamp: new Date(cachedData.timestamp).toISOString(),
            type: cachedData.type as 'stock' | 'crypto' | 'forex'
          };
        }
      }

      // If no recent data, fetch from Alpha Vantage
      console.log(`Refreshing latest price for ${symbol}`);
      const refreshSuccess = await this.refreshMarketData(symbol);
      
      if (!refreshSuccess) {
        console.warn(`Failed to refresh price for ${symbol}, returning any available cached data`);
        // Return whatever cached data we have, even if it's old
        if (cachedData) {
          return {
            ...cachedData,
            timestamp: new Date(cachedData.timestamp).toISOString(),
            type: cachedData.type as 'stock' | 'crypto' | 'forex'
          };
        }
        return null;
      }

      // Get the updated data from Supabase
      const { data: updatedData, error: updateError } = await supabase
        .from('market_data')
        .select('*')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (updateError) {
        console.error('Error fetching latest price after refresh:', updateError);
        return null;
      }

      return updatedData ? {
        ...updatedData,
        timestamp: new Date(updatedData.timestamp).toISOString(),
        type: updatedData.type as 'stock' | 'crypto' | 'forex'
      } : null;
    } catch (error) {
      console.error(`Error in fetchLatestPrice for ${symbol}:`, error);
      return null;
    }
  },

  async refreshMarketData(symbol: string, market: 'stock' | 'crypto' | 'forex' = 'stock'): Promise<boolean> {
    try {
      console.log(`Attempting to fetch data from Alpha Vantage for ${symbol}`);
      
      // Use the correct endpoint URL - use Supabase function directly instead of API route
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://hvrcchjbqumlknaboczh.supabase.co";
      if (!supabaseUrl) {
        console.error('Supabase URL not configured');
        return false;
      }

      console.log(`Using Supabase URL: ${supabaseUrl}`);
      const response = await fetch(`${supabaseUrl}/functions/v1/alpha-vantage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol,
          market,
          dataType: 'TIME_SERIES_DAILY'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch market data:', response.status, errorText);
        return false;
      }

      const result = await response.json();
      console.log('Alpha Vantage API response:', result);
      return result.success;
    } catch (error) {
      console.error('Error refreshing market data:', error);
      return false;
    }
  },

  subscribeToUpdates(symbol: string, callback: (payload: MarketData) => void) {
    return supabase
      .channel('market_data_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'market_data',
          filter: `symbol=eq.${symbol}`,
        },
        (payload) => callback(payload.new as MarketData)
      )
      .subscribe();
  }
};
