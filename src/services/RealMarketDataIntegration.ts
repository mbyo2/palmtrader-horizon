import { supabase } from "@/integrations/supabase/client";

export interface RealTimeMarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  marketCap?: number;
  timestamp: number;
}

export interface ZambianStock {
  symbol: string;
  name: string;
  sector: string;
  market: 'LUSE' | 'MAIN' | 'ALTERNATIVE';
  currency: 'ZMW' | 'USD';
  price: number;
  change: number;
  volume: number;
  marketCap: number;
}

export class RealMarketDataIntegration {
  private static readonly FINNHUB_API_KEY = 'demo'; // Use real API key in production
  private static readonly ALPHA_VANTAGE_API_KEY = 'demo'; // Use real API key in production
  private static readonly LUSE_API_ENDPOINT = 'https://api.luse.co.zm/v1'; // Hypothetical LuSE API
  
  // Integrate with real Finnhub API for international stocks
  static async fetchRealTimeData(symbol: string): Promise<RealTimeMarketData | null> {
    try {
      // Use Finnhub WebSocket/REST API
      const { data, error } = await supabase.functions.invoke('finnhub-websocket', {
        body: { action: 'get_quote', symbol }
      });

      if (error) throw error;

      if (data && typeof data.c === 'number') {
        const marketData: RealTimeMarketData = {
          symbol,
          price: data.c, // Current price
          change: data.d || 0, // Change
          changePercent: data.dp || 0, // Change percent
          volume: data.v || 0, // Volume
          high: data.h || data.c, // High
          low: data.l || data.c, // Low
          open: data.o || data.c, // Open
          previousClose: data.pc || data.c, // Previous close
          timestamp: Date.now()
        };

        // Store in database for caching
        await this.cacheMarketData(marketData);
        return marketData;
      }

      return null;
    } catch (error) {
      console.error(`Error fetching real-time data for ${symbol}:`, error);
      return this.getCachedData(symbol);
    }
  }

  // Integrate with Lusaka Stock Exchange
  static async fetchZambianStocks(): Promise<ZambianStock[]> {
    try {
      // Mock LuSE integration - replace with real API
      const zambianStocks: ZambianStock[] = [
        {
          symbol: 'SHOP',
          name: 'Shoprite Holdings Limited',
          sector: 'Consumer Goods',
          market: 'MAIN',
          currency: 'ZMW',
          price: 156.50,
          change: 2.30,
          volume: 12500,
          marketCap: 2800000000
        },
        {
          symbol: 'ZCCM',
          name: 'ZCCM Investments Holdings Plc',
          sector: 'Mining',
          market: 'MAIN', 
          currency: 'ZMW',
          price: 890.00,
          change: -15.50,
          volume: 8750,
          marketCap: 8500000000
        },
        {
          symbol: 'ZAMBEEF',
          name: 'Zambeef Products Plc',
          sector: 'Food Production',
          market: 'MAIN',
          currency: 'ZMW',
          price: 45.75,
          change: 1.25,
          volume: 25600,
          marketCap: 675000000
        },
        {
          symbol: 'FQMZ',
          name: 'First Quantum Minerals - Zambia',
          sector: 'Mining',
          market: 'MAIN',
          currency: 'USD',
          price: 28.50,
          change: 0.85,
          volume: 15300,
          marketCap: 19600000000
        },
        {
          symbol: 'ZANACO',
          name: 'Zambia National Commercial Bank',
          sector: 'Banking',
          market: 'MAIN',
          currency: 'ZMW',
          price: 125.00,
          change: -3.50,
          volume: 18900,
          marketCap: 4200000000
        }
      ];

      // Store in database
      await this.cacheZambianStocks(zambianStocks);
      return zambianStocks;
    } catch (error) {
      console.error('Error fetching Zambian stocks:', error);
      return this.getCachedZambianStocks();
    }
  }

  // Get government securities (bonds, treasury bills)
  static async fetchGovernmentSecurities() {
    try {
      // Mock government securities data - using mock data since table doesn't exist
      const securities = [
        {
          id: 'GRZ-10Y-2024',
          name: 'Government Bond 10 Year',
          type: 'Bond',
          maturity: '2034-12-15',
          couponRate: 18.5,
          currentYield: 17.8,
          price: 102.50,
          minimumInvestment: 1000,
          currency: 'ZMW'
        },
        {
          id: 'TB-91D-2024',
          name: 'Treasury Bill 91 Days',
          type: 'Treasury Bill',
          maturity: '2024-03-15',
          couponRate: 0,
          currentYield: 12.5,
          price: 97.25,
          minimumInvestment: 500,
          currency: 'ZMW'
        },
        {
          id: 'GRZ-5Y-USD-2024',
          name: 'USD Government Bond 5 Year',
          type: 'Bond',
          maturity: '2029-06-30',
          couponRate: 8.5,
          currentYield: 8.2,
          price: 101.25,
          minimumInvestment: 1000,
          currency: 'USD'
        }
      ];

      // Store in local storage as fallback since table doesn't exist
      localStorage.setItem('government_securities', JSON.stringify(securities));
      return securities;
    } catch (error) {
      console.error('Error fetching government securities:', error);
      return [];
    }
  }

  // Enhanced currency conversion with real rates
  static async convertCurrency(amount: number, from: string, to: string): Promise<{ amount: number; rate: number; timestamp: number }> {
    try {
      // Use Alpha Vantage for real currency rates
      const { data, error } = await supabase.functions.invoke('alpha-vantage', {
        body: {
          function: 'CURRENCY_EXCHANGE_RATE',
          from_currency: from,
          to_currency: to
        }
      });

      if (error) throw error;

      const exchangeRate = parseFloat(data['Realtime Currency Exchange Rate']['5. Exchange Rate']);
      const convertedAmount = amount * exchangeRate;

      // Cache the rate in localStorage since table doesn't exist
      const rateData = {
        from_currency: from,
        to_currency: to,
        rate: exchangeRate,
        updated_at: new Date().toISOString()
      };
      localStorage.setItem(`currency_rate_${from}_${to}`, JSON.stringify(rateData));

      return {
        amount: convertedAmount,
        rate: exchangeRate,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Currency conversion error:', error);
      // Fallback to cached rate
      return this.getFallbackRate(amount, from, to);
    }
  }

  // Real-time WebSocket connection
  static setupRealTimeConnection(symbols: string[], callback: (data: RealTimeMarketData) => void) {
    // This would connect to real WebSocket feeds
    const ws = new WebSocket('wss://ws.finnhub.io?token=demo');
    
    ws.onopen = () => {
      symbols.forEach(symbol => {
        ws.send(JSON.stringify({ type: 'subscribe', symbol }));
      });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'trade' && data.data) {
          data.data.forEach((trade: any) => {
            callback({
              symbol: trade.s,
              price: trade.p,
              change: 0, // Calculate from previous price
              changePercent: 0,
              volume: trade.v,
              high: trade.p,
              low: trade.p,
              open: trade.p,
              previousClose: trade.p,
              timestamp: trade.t
            });
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    return () => ws.close();
  }

  // Private helper methods
  private static async cacheMarketData(data: RealTimeMarketData) {
    try {
      await supabase.from('market_data').upsert({
        symbol: data.symbol,
        price: data.price,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.price,
        timestamp: data.timestamp,
        type: 'realtime'
      });
    } catch (error) {
      console.error('Error caching market data:', error);
    }
  }

  private static async getCachedData(symbol: string): Promise<RealTimeMarketData | null> {
    try {
      const { data } = await supabase
        .from('market_data')
        .select('*')
        .eq('symbol', symbol)
        .eq('type', 'realtime')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        return {
          symbol: data.symbol,
          price: data.price,
          change: 0,
          changePercent: 0,
          volume: 0,
          high: data.high || data.price,
          low: data.low || data.price,
          open: data.open || data.price,
          previousClose: data.close || data.price,
          timestamp: data.timestamp
        };
      }
    } catch (error) {
      console.error('Error getting cached data:', error);
    }
    return null;
  }

  private static async cacheZambianStocks(stocks: ZambianStock[]) {
    try {
      // Cache in localStorage since table doesn't exist
      localStorage.setItem('zambian_stocks', JSON.stringify(stocks));
    } catch (error) {
      console.error('Error caching Zambian stocks:', error);
    }
  }

  private static async getCachedZambianStocks(): Promise<ZambianStock[]> {
    try {
      // Get from localStorage since table doesn't exist
      const cached = localStorage.getItem('zambian_stocks');
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Error getting cached Zambian stocks:', error);
      return [];
    }
  }

  private static async getFallbackRate(amount: number, from: string, to: string) {
    // Fallback exchange rates (should be updated regularly)
    const rates: { [key: string]: number } = {
      'USD_ZMW': 24.50,
      'ZMW_USD': 0.041,
      'EUR_ZMW': 26.80,
      'GBP_ZMW': 31.20
    };

    const rateKey = `${from}_${to}`;
    const rate = rates[rateKey] || 1;

    return {
      amount: amount * rate,
      rate,
      timestamp: Date.now()
    };
  }
}