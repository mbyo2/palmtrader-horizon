
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

  static async fetchRealTimePrice(symbol: string): Promise<RealTimePrice | null> {
    try {
      // Use Supabase edge function to fetch from Finnhub API
      const { data, error } = await supabase.functions.invoke('finnhub-websocket', {
        body: { action: 'get_quote', symbol }
      });

      if (error) throw error;

      if (data && data.c) {
        return {
          symbol,
          price: data.c,
          change: data.d || 0,
          changePercent: data.dp || 0,
          volume: data.v || 0,
          timestamp: Date.now()
        };
      }

      return null;
    } catch (error) {
      console.error(`Error fetching real-time price for ${symbol}:`, error);
      return null;
    }
  }

  static async fetchHistoricalData(symbol: string, days: number = 30): Promise<HistoricalPrice[]> {
    try {
      const { data, error } = await supabase.functions.invoke('alpha-vantage', {
        body: { 
          function: 'TIME_SERIES_DAILY',
          symbol,
          outputsize: days > 100 ? 'full' : 'compact'
        }
      });

      if (error) throw error;

      const timeSeries = data['Time Series (Daily)'];
      if (!timeSeries) return [];

      const prices: HistoricalPrice[] = [];
      const dates = Object.keys(timeSeries).sort().slice(-days);

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

      return prices;
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      return [];
    }
  }

  static async fetchMarketNews(symbols?: string[], limit: number = 20): Promise<NewsItem[]> {
    try {
      const { data, error } = await supabase.functions.invoke('finnhub-websocket', {
        body: { 
          action: 'get_news',
          category: 'general',
          minId: 0
        }
      });

      if (error) throw error;

      if (!Array.isArray(data)) return [];

      return data.slice(0, limit).map((item: any) => ({
        id: item.id.toString(),
        title: item.headline,
        summary: item.summary,
        source: item.source,
        url: item.url,
        publishedAt: new Date(item.datetime * 1000).toISOString(),
        symbols: item.related?.split(',') || [],
        sentiment: item.sentiment as 'positive' | 'negative' | 'neutral'
      }));
    } catch (error) {
      console.error('Error fetching market news:', error);
      return [];
    }
  }

  static async fetchCompanyFundamentals(symbol: string): Promise<CompanyFundamentals | null> {
    try {
      const { data, error } = await supabase.functions.invoke('alpha-vantage', {
        body: { 
          function: 'OVERVIEW',
          symbol
        }
      });

      if (error) throw error;

      if (!data || data.Symbol !== symbol) return null;

      return {
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
    } catch (error) {
      console.error(`Error fetching fundamentals for ${symbol}:`, error);
      return null;
    }
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
}
