
import { MockMarketDataService } from '../MockMarketDataService';

export interface MarketData {
  symbol: string;
  price: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  timestamp?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  type?: string;
  isDemo?: boolean;
}

export class MarketDataService {
  static async fetchLatestPrice(symbol: string): Promise<MarketData> {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      const { data, error } = await supabase.functions.invoke('finnhub-websocket', {
        body: { action: 'get_quote', symbol }
      });

      // Handle the response format from the edge function
      if (!error && data && (data.price || data.c)) {
        const price = data.price ?? data.c;
        const marketData: MarketData = {
          symbol: data.symbol || symbol,
          price: price,
          change: data.change ?? data.d ?? 0,
          changePercent: data.changePercent ?? data.dp ?? 0,
          volume: data.volume ?? data.v ?? 0,
          timestamp: data.timestamp ?? Date.now(),
          open: data.open ?? data.o ?? price,
          high: data.high ?? data.h ?? price,
          low: data.low ?? data.l ?? price,
          close: price,
          type: data.isDemo ? 'demo' : 'realtime',
          isDemo: data.isDemo || false
        };

        // Cache in database (fire and forget) - only for real data
        if (!data.isDemo) {
          supabase.from('market_data').upsert({
            symbol: marketData.symbol,
            price: marketData.price,
            open: marketData.open,
            high: marketData.high,
            low: marketData.low,
            close: marketData.close,
            timestamp: marketData.timestamp,
            type: 'realtime'
          });
        }

        return marketData;
      }

      // Fallback to cached data if API fails
      const { data: cachedData } = await supabase
        .from('market_data')
        .select('*')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (cachedData) {
        return {
          symbol: cachedData.symbol,
          price: cachedData.price,
          change: 0,
          changePercent: 0,
          volume: 0,
          timestamp: cachedData.timestamp,
          open: cachedData.open,
          high: cachedData.high,
          low: cachedData.low,
          close: cachedData.close,
          type: 'cached',
          isDemo: false
        };
      }

      // Final fallback to mock data
      const mockData = MockMarketDataService.getPrice(symbol);
      return {
        ...mockData,
        type: 'demo'
      };
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      // Return mock data on error
      const mockData = MockMarketDataService.getPrice(symbol);
      return {
        ...mockData,
        type: 'demo'
      };
    }
  }

  static async fetchHistoricalData(symbol: string, days: number): Promise<MarketData[]> {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Try Alpha Vantage for historical data
      const { data, error } = await supabase.functions.invoke('alpha-vantage', {
        body: {
          function: 'TIME_SERIES_DAILY',
          symbol: symbol,
          outputsize: days > 100 ? 'full' : 'compact'
        }
      });

      if (!error && data && data['Time Series (Daily)']) {
        const timeSeries = data['Time Series (Daily)'];
        const historicalData: MarketData[] = [];
        
        const entries = Object.entries(timeSeries)
          .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
          .slice(0, days);

        for (const [date, values] of entries) {
          const dateObj = new Date(date);
          historicalData.push({
            symbol,
            price: parseFloat((values as any)['4. close']),
            timestamp: dateObj.getTime(),
            open: parseFloat((values as any)['1. open']),
            high: parseFloat((values as any)['2. high']),
            low: parseFloat((values as any)['3. low']),
            close: parseFloat((values as any)['4. close']),
            volume: parseInt((values as any)['5. volume']),
            type: 'historical',
            isDemo: false
          });
        }

        // Cache in database
        for (const item of historicalData) {
          await supabase.from('market_data').upsert({
            symbol: item.symbol,
            price: item.price,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            timestamp: item.timestamp,
            type: 'daily'
          });
        }

        return historicalData.reverse(); // Return in ascending order
      }

      // Check for rate limit message
      if (data?.Information?.includes('rate limit') || data?.Note) {
        console.log('Alpha Vantage rate limited, using mock data');
        return MockMarketDataService.getHistoricalData(symbol, days);
      }

      // Fallback to cached data
      const { data: cachedData } = await supabase
        .from('market_data')
        .select('*')
        .eq('symbol', symbol)
        .eq('type', 'daily')
        .order('timestamp', { ascending: true })
        .limit(days);

      if (cachedData && cachedData.length > 0) {
        return cachedData.map(item => ({
          symbol: item.symbol,
          price: item.price,
          timestamp: item.timestamp,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: 0,
          type: 'cached',
          isDemo: false
        }));
      }

      // Final fallback to mock data
      return MockMarketDataService.getHistoricalData(symbol, days);
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      // Return mock data on error
      return MockMarketDataService.getHistoricalData(symbol, days);
    }
  }

  static async fetchMultipleLatestPrices(symbols: string[]): Promise<Array<{ symbol: string; price: number; change?: number; volume?: number; isDemo?: boolean }>> {
    try {
      const results = await Promise.allSettled(
        symbols.map(symbol => this.fetchLatestPrice(symbol))
      );

      return results
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => {
          const data = (result as PromiseFulfilledResult<MarketData>).value;
          return {
            symbol: data.symbol,
            price: data.price,
            change: data.change,
            volume: data.volume,
            isDemo: data.isDemo
          };
        });
    } catch (error) {
      console.error('Error fetching multiple prices:', error);
      // Return mock data for all symbols
      return symbols.map(symbol => {
        const mock = MockMarketDataService.getPrice(symbol);
        return {
          symbol: mock.symbol,
          price: mock.price,
          change: mock.change,
          volume: mock.volume,
          isDemo: true
        };
      });
    }
  }
}
