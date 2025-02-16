
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

    const { data: cachedData, error: cacheError } = await supabase
      .from('market_data')
      .select('*')
      .eq('symbol', symbol)
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: true });

    // If we have recent data, return it
    if (cachedData && cachedData.length > 0) {
      const latestDataPoint = new Date(cachedData[cachedData.length - 1].timestamp);
      const now = new Date();
      const hoursSinceLastUpdate = (now.getTime() - latestDataPoint.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastUpdate < 24) {
        return cachedData.map(item => ({
          ...item,
          timestamp: new Date(item.timestamp).toISOString(),
          type: item.type as 'stock' | 'crypto' | 'forex'
        }));
      }
    }

    // If no recent data, fetch from Alpha Vantage
    await this.refreshMarketData(symbol);

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
  },

  async fetchLatestPrice(symbol: string): Promise<MarketData | null> {
    // First try to get cached data from Supabase
    const { data: cachedData, error: cacheError } = await supabase
      .from('market_data')
      .select('*')
      .eq('symbol', symbol)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cachedData) {
      const latestDataPoint = new Date(cachedData.timestamp);
      const now = new Date();
      const hoursSinceLastUpdate = (now.getTime() - latestDataPoint.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastUpdate < 24) {
        return {
          ...cachedData,
          timestamp: new Date(cachedData.timestamp).toISOString(),
          type: cachedData.type as 'stock' | 'crypto' | 'forex'
        };
      }
    }

    // If no recent data, fetch from Alpha Vantage
    await this.refreshMarketData(symbol);

    // Get the updated data from Supabase
    const { data: updatedData, error: updateError } = await supabase
      .from('market_data')
      .select('*')
      .eq('symbol', symbol)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (updateError) {
      console.error('Error fetching latest price:', updateError);
      return null;
    }

    return updatedData ? {
      ...updatedData,
      timestamp: new Date(updatedData.timestamp).toISOString(),
      type: updatedData.type as 'stock' | 'crypto' | 'forex'
    } : null;
  },

  async refreshMarketData(symbol: string, market: 'stock' | 'crypto' | 'forex' = 'stock'): Promise<boolean> {
    try {
      const response = await fetch('/api/alpha-vantage', {
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
        throw new Error('Failed to fetch market data');
      }

      const result = await response.json();
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
