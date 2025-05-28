
import { supabase } from "@/integrations/supabase/client";

export interface RealTimePrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
}

export interface HistoricalPrice {
  symbol: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  symbols: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface CompanyFundamentals {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  marketCap: number;
  peRatio: number;
  eps: number;
  dividendYield: number;
  revenue: number;
  profitMargin: number;
  debtToEquity: number;
}

export class RealMarketDataService {
  private static readonly FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
  private static readonly ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
  private static readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests
  private static lastRequestTime = 0;

  private static async rateLimitedRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY - timeSinceLastRequest));
    }
    
    this.lastRequestTime = Date.now();
    return await requestFn();
  }

  static async fetchRealTimePrice(symbol: string, retries = 3): Promise<RealTimePrice | null> {
    try {
      return await this.rateLimitedRequest(async () => {
        console.log(`Fetching real-time price for ${symbol}`);
        
        const { data, error } = await supabase.functions.invoke('finnhub-websocket', {
          body: { action: 'get_quote', symbol }
        });

        if (error) {
          console.error('Finnhub API error:', error);
          throw error;
        }

        if (data && typeof data.c === 'number') {
          const result = {
            symbol,
            price: data.c,
            change: data.d || 0,
            changePercent: data.dp || 0,
            volume: data.v || 0,
            timestamp: Date.now()
          };
          
          // Cache the result
          await this.cachePrice(result);
          return result;
        }

        return null;
      });
    } catch (error) {
      console.error(`Error fetching real-time price for ${symbol}:`, error);
      
      if (retries > 0) {
        console.log(`Retrying... ${retries} attempts left`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.fetchRealTimePrice(symbol, retries - 1);
      }
      
      // Fallback to cached data
      return this.getCachedPrice(symbol);
    }
  }

  static async fetchHistoricalData(symbol: string, days: number = 30, retries = 3): Promise<HistoricalPrice[]> {
    try {
      return await this.rateLimitedRequest(async () => {
        console.log(`Fetching ${days} days of historical data for ${symbol}`);
        
        const { data, error } = await supabase.functions.invoke('alpha-vantage', {
          body: { 
            function: 'TIME_SERIES_DAILY',
            symbol,
            outputsize: days > 100 ? 'full' : 'compact'
          }
        });

        if (error) {
          console.error('Alpha Vantage API error:', error);
          throw error;
        }

        const timeSeries = data['Time Series (Daily)'];
        if (!timeSeries) {
          console.warn(`No historical data found for ${symbol}`);
          return [];
        }

        const prices: HistoricalPrice[] = [];
        const dates = Object.keys(timeSeries)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
          .slice(0, days);

        for (const date of dates) {
          const dayData = timeSeries[date];
          prices.push({
            symbol,
            timestamp: new Date(date).getTime(),
            open: parseFloat(dayData['1. open']),
            high: parseFloat(dayData['2. high']),
            low: parseFloat(dayData['3. low']),
            close: parseFloat(dayData['4. close']),
            volume: parseInt(dayData['5. volume'])
          });
        }

        // Store in database
        await this.storeMarketData(prices);
        return prices.reverse(); // Return chronological order
      });
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      
      if (retries > 0) {
        console.log(`Retrying... ${retries} attempts left`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        return this.fetchHistoricalData(symbol, days, retries - 1);
      }
      
      // Fallback to database
      return this.getCachedHistoricalData(symbol, days);
    }
  }

  static async fetchMarketNews(symbols?: string[], limit: number = 20): Promise<NewsItem[]> {
    try {
      return await this.rateLimitedRequest(async () => {
        console.log('Fetching market news');
        
        const { data, error } = await supabase.functions.invoke('finnhub-websocket', {
          body: { 
            action: 'get_news',
            category: 'general',
            minId: 0
          }
        });

        if (error) throw error;

        if (!Array.isArray(data)) return [];

        const news = data.slice(0, limit).map((item: any) => ({
          id: item.id.toString(),
          title: item.headline,
          summary: item.summary,
          source: item.source,
          url: item.url,
          publishedAt: new Date(item.datetime * 1000).toISOString(),
          symbols: item.related?.split(',') || [],
          sentiment: item.sentiment as 'positive' | 'negative' | 'neutral'
        }));

        // Filter by symbols if provided
        if (symbols && symbols.length > 0) {
          return news.filter(item => 
            item.symbols.some(symbol => symbols.includes(symbol))
          );
        }

        return news;
      });
    } catch (error) {
      console.error('Error fetching market news:', error);
      return [];
    }
  }

  static async fetchCompanyFundamentals(symbol: string, retries = 3): Promise<CompanyFundamentals | null> {
    try {
      return await this.rateLimitedRequest(async () => {
        console.log(`Fetching fundamentals for ${symbol}`);
        
        const { data, error } = await supabase.functions.invoke('alpha-vantage', {
          body: { 
            function: 'OVERVIEW',
            symbol
          }
        });

        if (error) throw error;

        if (!data || data.Symbol !== symbol) return null;

        const fundamentals = {
          symbol: data.Symbol,
          name: data.Name,
          sector: data.Sector,
          industry: data.Industry,
          marketCap: parseFloat(data.MarketCapitalization) || 0,
          peRatio: parseFloat(data.PERatio) || 0,
          eps: parseFloat(data.EPS) || 0,
          dividendYield: parseFloat(data.DividendYield) || 0,
          revenue: parseFloat(data.RevenueTTM) || 0,
          profitMargin: parseFloat(data.ProfitMargin) || 0,
          debtToEquity: parseFloat(data.DebtToEquityRatio) || 0
        };

        await this.storeFundamentals(fundamentals);
        return fundamentals;
      });
    } catch (error) {
      console.error(`Error fetching fundamentals for ${symbol}:`, error);
      
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.fetchCompanyFundamentals(symbol, retries - 1);
      }
      
      return this.getCachedFundamentals(symbol);
    }
  }

  // Cache management methods
  private static async cachePrice(price: RealTimePrice): Promise<void> {
    try {
      await supabase.from('market_data').upsert({
        symbol: price.symbol,
        price: price.price,
        timestamp: price.timestamp,
        type: 'realtime'
      });
    } catch (error) {
      console.error('Error caching price:', error);
    }
  }

  private static async getCachedPrice(symbol: string): Promise<RealTimePrice | null> {
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
          timestamp: data.timestamp
        };
      }
    } catch (error) {
      console.error('Error getting cached price:', error);
    }
    return null;
  }

  private static async getCachedHistoricalData(symbol: string, days: number): Promise<HistoricalPrice[]> {
    try {
      const { data } = await supabase
        .from('market_data')
        .select('*')
        .eq('symbol', symbol)
        .eq('type', 'daily')
        .order('timestamp', { ascending: false })
        .limit(days);

      if (data) {
        return data.map(item => ({
          symbol: item.symbol,
          timestamp: item.timestamp,
          open: item.open || item.price,
          high: item.high || item.price,
          low: item.low || item.price,
          close: item.close || item.price,
          volume: 0
        })).reverse();
      }
    } catch (error) {
      console.error('Error getting cached historical data:', error);
    }
    return [];
  }

  private static async getCachedFundamentals(symbol: string): Promise<CompanyFundamentals | null> {
    try {
      const { data } = await supabase
        .from('company_fundamentals')
        .select('*')
        .eq('symbol', symbol)
        .single();

      if (data) {
        return {
          symbol: data.symbol,
          name: data.name,
          sector: data.sector,
          industry: data.industry,
          marketCap: data.market_cap,
          peRatio: data.pe_ratio,
          eps: data.eps,
          dividendYield: data.dividend_yield,
          revenue: data.revenue,
          profitMargin: data.profit_margin,
          debtToEquity: data.debt_to_equity
        };
      }
    } catch (error) {
      console.error('Error getting cached fundamentals:', error);
    }
    return null;
  }

  static async storeMarketData(data: HistoricalPrice[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('market_data')
        .upsert(data.map(price => ({
          symbol: price.symbol,
          timestamp: price.timestamp,
          open: price.open,
          high: price.high,
          low: price.low,
          close: price.close,
          price: price.close,
          type: 'daily'
        })));

      if (error) throw error;
    } catch (error) {
      console.error('Error storing market data:', error);
    }
  }

  static async storeNewsData(news: NewsItem[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('market_news')
        .upsert(news.map(item => ({
          id: item.id,
          title: item.title,
          summary: item.summary,
          source: item.source,
          url: item.url,
          published_at: item.publishedAt,
          symbols: item.symbols,
          sentiment: item.sentiment
        })));

      if (error) throw error;
    } catch (error) {
      console.error('Error storing news data:', error);
    }
  }

  static async storeFundamentals(fundamentals: CompanyFundamentals): Promise<void> {
    try {
      const { error } = await supabase
        .from('company_fundamentals')
        .upsert({
          symbol: fundamentals.symbol,
          name: fundamentals.name,
          sector: fundamentals.sector,
          industry: fundamentals.industry,
          market_cap: fundamentals.marketCap,
          pe_ratio: fundamentals.peRatio,
          eps: fundamentals.eps,
          dividend_yield: fundamentals.dividendYield,
          revenue: fundamentals.revenue,
          profit_margin: fundamentals.profitMargin,
          debt_to_equity: fundamentals.debtToEquity
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error storing fundamentals:', error);
    }
  }

  // Batch operations for efficiency
  static async fetchMultiplePrices(symbols: string[]): Promise<RealTimePrice[]> {
    const results = await Promise.allSettled(
      symbols.map(symbol => this.fetchRealTimePrice(symbol))
    );

    return results
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => (result as PromiseFulfilledResult<RealTimePrice>).value);
  }

  static async validateDataIntegrity(symbol: string): Promise<boolean> {
    try {
      // Check if we have recent data
      const { data } = await supabase
        .from('market_data')
        .select('timestamp')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (!data) return false;

      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      return data.timestamp > oneHourAgo;
    } catch (error) {
      console.error('Error validating data integrity:', error);
      return false;
    }
  }
}
