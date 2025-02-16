
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
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('market_data')
      .select('*')
      .eq('symbol', symbol)
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching historical data:', error);
      throw error;
    }

    // Convert timestamp to string format
    return (data || []).map(item => ({
      ...item,
      timestamp: new Date(item.timestamp).toISOString(),
      type: item.type as 'stock' | 'crypto' | 'forex'
    }));
  },

  async fetchLatestPrice(symbol: string): Promise<MarketData | null> {
    const { data, error } = await supabase
      .from('market_data')
      .select('*')
      .eq('symbol', symbol)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching latest price:', error);
      return null;
    }

    return data ? {
      ...data,
      timestamp: new Date(data.timestamp).toISOString(),
      type: data.type as 'stock' | 'crypto' | 'forex'
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
