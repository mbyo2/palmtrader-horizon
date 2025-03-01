
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
    if (!symbol) {
      console.error('Symbol is required for fetchHistoricalData');
      return this.generateMockData('AAPL', days);
    }
    
    const formattedSymbol = symbol.toUpperCase();
    // First try to get cached data from Supabase
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    try {
      console.log(`Fetching historical data for ${formattedSymbol} for the last ${days} days`);
      
      const { data: cachedData, error: cacheError } = await supabase
        .from('market_data')
        .select('*')
        .eq('symbol', formattedSymbol)
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
          console.log(`Using cached data for ${formattedSymbol}, ${cachedData.length} records`);
          return cachedData.map(item => ({
            ...item,
            timestamp: new Date(item.timestamp).toISOString(),
            type: item.type as 'stock' | 'crypto' | 'forex'
          }));
        }
      }

      // If no recent data, fetch from Alpha Vantage via Supabase function
      console.log(`Refreshing market data for ${formattedSymbol}`);
      const refreshSuccess = await this.refreshMarketData(formattedSymbol);
      
      if (!refreshSuccess) {
        console.warn(`Failed to refresh data for ${formattedSymbol}, returning any available cached data`);
        // Return whatever cached data we have, even if it's old
        if (cachedData && cachedData.length > 0) {
          toast.info(`Using cached data for ${formattedSymbol}`);
          return cachedData.map(item => ({
            ...item,
            timestamp: new Date(item.timestamp).toISOString(),
            type: item.type as 'stock' | 'crypto' | 'forex'
          }));
        }
        
        // If no cached data at all, return mock data for demonstration
        toast.info(`Using simulated data for ${formattedSymbol}`);
        return this.generateMockData(formattedSymbol, days);
      }

      // Get the updated data from Supabase
      const { data: updatedData, error: updateError } = await supabase
        .from('market_data')
        .select('*')
        .eq('symbol', formattedSymbol)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });

      if (updateError) {
        console.error('Error fetching updated market data:', updateError);
        throw updateError;
      }

      if (updatedData && updatedData.length > 0) {
        toast.success(`Loaded ${updatedData.length} data points for ${formattedSymbol}`);
        return updatedData.map(item => ({
          ...item,
          timestamp: new Date(item.timestamp).toISOString(),
          type: item.type as 'stock' | 'crypto' | 'forex'
        }));
      } else {
        toast.info(`No data available for ${formattedSymbol}, using simulated data`);
        return this.generateMockData(formattedSymbol, days);
      }
    } catch (error) {
      console.error(`Error in fetchHistoricalData for ${formattedSymbol}:`, error);
      toast.error(`Error loading data for ${formattedSymbol}`);
      return this.generateMockData(formattedSymbol, days);
    }
  },

  async fetchLatestPrice(symbol: string): Promise<MarketData | null> {
    if (!symbol) {
      console.error('Symbol is required for fetchLatestPrice');
      return this.generateMockDataPoint('AAPL');
    }

    const formattedSymbol = symbol.toUpperCase();
    try {
      console.log(`Fetching latest price for ${formattedSymbol}`);
      
      // First try to get cached data from Supabase
      const { data: cachedData, error: cacheError } = await supabase
        .from('market_data')
        .select('*')
        .eq('symbol', formattedSymbol)
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
          console.log(`Using cached latest price for ${formattedSymbol}`);
          return {
            ...cachedData,
            timestamp: new Date(cachedData.timestamp).toISOString(),
            type: cachedData.type as 'stock' | 'crypto' | 'forex'
          };
        }
      }

      // If no recent data, fetch from Alpha Vantage
      console.log(`Refreshing latest price for ${formattedSymbol}`);
      const refreshSuccess = await this.refreshMarketData(formattedSymbol);
      
      if (!refreshSuccess) {
        console.warn(`Failed to refresh price for ${formattedSymbol}, returning any available cached data`);
        // Return whatever cached data we have, even if it's old
        if (cachedData) {
          toast.info(`Using cached data for ${formattedSymbol}`);
          return {
            ...cachedData,
            timestamp: new Date(cachedData.timestamp).toISOString(),
            type: cachedData.type as 'stock' | 'crypto' | 'forex'
          };
        }
        
        // If no cached data, return a mock data point
        toast.info(`Using simulated data for ${formattedSymbol}`);
        return this.generateMockDataPoint(formattedSymbol);
      }

      // Get the updated data from Supabase
      const { data: updatedData, error: updateError } = await supabase
        .from('market_data')
        .select('*')
        .eq('symbol', formattedSymbol)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (updateError) {
        console.error('Error fetching latest price after refresh:', updateError);
        return this.generateMockDataPoint(formattedSymbol);
      }

      if (updatedData) {
        toast.success(`Updated price data for ${formattedSymbol}`);
        return {
          ...updatedData,
          timestamp: new Date(updatedData.timestamp).toISOString(),
          type: updatedData.type as 'stock' | 'crypto' | 'forex'
        };
      } else {
        toast.info(`No data available for ${formattedSymbol}, using simulated data`);
        return this.generateMockDataPoint(formattedSymbol);
      }
    } catch (error) {
      console.error(`Error in fetchLatestPrice for ${formattedSymbol}:`, error);
      toast.error(`Error loading price for ${formattedSymbol}`);
      return this.generateMockDataPoint(formattedSymbol);
    }
  },

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

  subscribeToUpdates(symbol: string, callback: (payload: MarketData) => void) {
    if (!symbol) return { unsubscribe: () => {} };
    
    const formattedSymbol = symbol.toUpperCase();
    return supabase
      .channel('market_data_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'market_data',
          filter: `symbol=eq.${formattedSymbol}`,
        },
        (payload) => callback(payload.new as MarketData)
      )
      .subscribe();
  },

  // Helper method to generate mock data when real data isn't available
  generateMockData(symbol: string, days: number): MarketData[] {
    if (!symbol) symbol = 'UNKNOWN';
    
    console.log(`Generating mock data for ${symbol} for demonstration purposes`);
    const mockData: MarketData[] = [];
    const basePrice = this.getBasePrice(symbol);
    const now = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(now.getDate() - i);
      
      // Create some random price movement
      const randomFactor = 0.98 + Math.random() * 0.04; // Random between 0.98 and 1.02
      const prevPrice = i === days ? basePrice : mockData[mockData.length - 1].price;
      const price = prevPrice * randomFactor;
      
      mockData.push({
        symbol: symbol.toUpperCase(),
        timestamp: date.toISOString(),
        price: parseFloat(price.toFixed(2)),
        open: parseFloat((price * 0.99).toFixed(2)),
        high: parseFloat((price * 1.01).toFixed(2)),
        low: parseFloat((price * 0.98).toFixed(2)),
        close: parseFloat(price.toFixed(2)),
        volume: Math.floor(Math.random() * 10000000),
        type: 'stock'
      });
    }
    
    return mockData;
  },
  
  generateMockDataPoint(symbol: string): MarketData {
    if (!symbol) symbol = 'UNKNOWN';
    
    console.log(`Generating mock data point for ${symbol} for demonstration purposes`);
    const basePrice = this.getBasePrice(symbol);
    
    return {
      symbol: symbol.toUpperCase(),
      timestamp: new Date().toISOString(),
      price: basePrice,
      open: parseFloat((basePrice * 0.99).toFixed(2)),
      high: parseFloat((basePrice * 1.01).toFixed(2)),
      low: parseFloat((basePrice * 0.98).toFixed(2)),
      close: basePrice,
      volume: Math.floor(Math.random() * 10000000),
      type: 'stock'
    };
  },
  
  getBasePrice(symbol: string): number {
    if (!symbol) return 100.00;
    
    // Return realistic baseline prices for common stocks
    const prices: Record<string, number> = {
      'AAPL': 180.25,
      'MSFT': 350.50,
      'AMZN': 145.75,
      'GOOGL': 140.30,
      'NVDA': 450.20,
      'META': 330.15,
      'TSLA': 200.10,
      'V': 280.45,
      'WMT': 68.90,
      'JPM': 190.25
    };
    
    return prices[symbol.toUpperCase()] || 100.00 + Math.random() * 100;
  }
};

// Helper import for toast
import { toast } from "sonner";
