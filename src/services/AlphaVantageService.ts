
import { supabase } from "@/integrations/supabase/client";

export interface TechnicalIndicator {
  date: string;
  value: number;
  signal?: number;
  histogram?: number;
  upperBand?: number;
  lowerBand?: number;
}

export interface NewsItem {
  title: string;
  url: string;
  timePublished: string;
  summary: string;
  source: string;
  overallSentiment: number;
  sentimentLabel: string;
  tickerSentiment?: Array<{
    ticker: string;
    relevanceScore: number;
    sentimentScore: number;
    sentimentLabel: string;
  }>;
}

export interface ForexRate {
  fromCurrency: string;
  toCurrency: string;
  exchangeRate: number;
  bidPrice: number;
  askPrice: number;
  lastRefreshed: string;
}

export interface EconomicDataPoint {
  date: string;
  value: number;
}

export interface EconomicIndicator {
  name: string;
  data: EconomicDataPoint[];
}

async function invokeAlphaVantage(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke('alpha-vantage', { body });
  if (error) throw error;
  return data;
}

export class AlphaVantageService {
  // Technical Indicators
  static async fetchRSI(symbol: string, period: number = 14): Promise<TechnicalIndicator[]> {
    try {
      const data = await invokeAlphaVantage({
        function: 'RSI',
        symbol,
        interval: 'daily',
        time_period: period.toString(),
        series_type: 'close'
      });

      const rsiData = data['Technical Analysis: RSI'] || {};
      return Object.entries(rsiData)
        .map(([date, values]: [string, any]) => ({
          date,
          value: parseFloat(values.RSI)
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error('Error fetching RSI:', error);
      return [];
    }
  }

  static async fetchMACD(symbol: string): Promise<TechnicalIndicator[]> {
    try {
      const data = await invokeAlphaVantage({
        function: 'MACD',
        symbol,
        interval: 'daily',
        series_type: 'close'
      });

      const macdData = data['Technical Analysis: MACD'] || {};
      return Object.entries(macdData)
        .map(([date, values]: [string, any]) => ({
          date,
          value: parseFloat(values.MACD),
          signal: parseFloat(values.MACD_Signal),
          histogram: parseFloat(values.MACD_Hist)
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error('Error fetching MACD:', error);
      return [];
    }
  }

  static async fetchSMA(symbol: string, period: number = 20): Promise<TechnicalIndicator[]> {
    try {
      const data = await invokeAlphaVantage({
        function: 'SMA',
        symbol,
        interval: 'daily',
        time_period: period.toString(),
        series_type: 'close'
      });

      const smaData = data['Technical Analysis: SMA'] || {};
      return Object.entries(smaData)
        .map(([date, values]: [string, any]) => ({
          date,
          value: parseFloat(values.SMA)
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error('Error fetching SMA:', error);
      return [];
    }
  }

  static async fetchEMA(symbol: string, period: number = 20): Promise<TechnicalIndicator[]> {
    try {
      const data = await invokeAlphaVantage({
        function: 'EMA',
        symbol,
        interval: 'daily',
        time_period: period.toString(),
        series_type: 'close'
      });

      const emaData = data['Technical Analysis: EMA'] || {};
      return Object.entries(emaData)
        .map(([date, values]: [string, any]) => ({
          date,
          value: parseFloat(values.EMA)
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error('Error fetching EMA:', error);
      return [];
    }
  }

  static async fetchBollingerBands(symbol: string, period: number = 20): Promise<TechnicalIndicator[]> {
    try {
      const data = await invokeAlphaVantage({
        function: 'BBANDS',
        symbol,
        interval: 'daily',
        time_period: period.toString(),
        series_type: 'close'
      });

      const bbandsData = data['Technical Analysis: BBANDS'] || {};
      return Object.entries(bbandsData)
        .map(([date, values]: [string, any]) => ({
          date,
          value: parseFloat(values['Real Middle Band']),
          upperBand: parseFloat(values['Real Upper Band']),
          lowerBand: parseFloat(values['Real Lower Band'])
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error('Error fetching Bollinger Bands:', error);
      return [];
    }
  }

  // News & Sentiment
  static async fetchMarketNews(tickers?: string[], topics?: string[]): Promise<NewsItem[]> {
    try {
      const data = await invokeAlphaVantage({
        function: 'NEWS_SENTIMENT',
        tickers: tickers?.join(','),
        topics: topics?.join(',')
      });

      const feed = data.feed || [];
      return feed.map((item: any) => ({
        title: item.title,
        url: item.url,
        timePublished: item.time_published,
        summary: item.summary,
        source: item.source,
        overallSentiment: parseFloat(item.overall_sentiment_score) || 0,
        sentimentLabel: item.overall_sentiment_label || 'Neutral',
        tickerSentiment: item.ticker_sentiment?.map((t: any) => ({
          ticker: t.ticker,
          relevanceScore: parseFloat(t.relevance_score) || 0,
          sentimentScore: parseFloat(t.ticker_sentiment_score) || 0,
          sentimentLabel: t.ticker_sentiment_label || 'Neutral'
        }))
      }));
    } catch (error) {
      console.error('Error fetching news:', error);
      return [];
    }
  }

  // Forex
  static async fetchForexRate(fromCurrency: string, toCurrency: string): Promise<ForexRate | null> {
    try {
      const data = await invokeAlphaVantage({
        function: 'CURRENCY_EXCHANGE_RATE',
        from_currency: fromCurrency,
        to_currency: toCurrency
      });

      const rate = data['Realtime Currency Exchange Rate'];
      if (!rate) return null;

      return {
        fromCurrency: rate['1. From_Currency Code'],
        toCurrency: rate['3. To_Currency Code'],
        exchangeRate: parseFloat(rate['5. Exchange Rate']),
        bidPrice: parseFloat(rate['8. Bid Price']) || 0,
        askPrice: parseFloat(rate['9. Ask Price']) || 0,
        lastRefreshed: rate['6. Last Refreshed']
      };
    } catch (error) {
      console.error('Error fetching forex rate:', error);
      return null;
    }
  }

  static async fetchMultipleForexRates(pairs: Array<{ from: string; to: string }>): Promise<ForexRate[]> {
    const rates = await Promise.all(
      pairs.map(pair => this.fetchForexRate(pair.from, pair.to))
    );
    return rates.filter((r): r is ForexRate => r !== null);
  }

  // Economic Indicators
  static async fetchEconomicIndicator(indicator: 'REAL_GDP' | 'INFLATION' | 'FEDERAL_FUNDS_RATE' | 'UNEMPLOYMENT' | 'TREASURY_YIELD', maturity?: string): Promise<EconomicIndicator | null> {
    try {
      const data = await invokeAlphaVantage({
        function: indicator,
        maturity
      });

      return {
        name: data.name || indicator,
        data: (data.data || []).map((item: any) => ({
          date: item.date,
          value: parseFloat(item.value)
        }))
      };
    } catch (error) {
      console.error(`Error fetching ${indicator}:`, error);
      return null;
    }
  }

  static async fetchAllEconomicIndicators(): Promise<Record<string, EconomicIndicator | null>> {
    const [gdp, inflation, fedFunds, unemployment, treasury] = await Promise.all([
      this.fetchEconomicIndicator('REAL_GDP'),
      this.fetchEconomicIndicator('INFLATION'),
      this.fetchEconomicIndicator('FEDERAL_FUNDS_RATE'),
      this.fetchEconomicIndicator('UNEMPLOYMENT'),
      this.fetchEconomicIndicator('TREASURY_YIELD', '10year')
    ]);

    return { gdp, inflation, fedFunds, unemployment, treasury };
  }
}
