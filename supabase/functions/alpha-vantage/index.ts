
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_URL = 'https://www.alphavantage.co/query';

// Demo data generators for when API is rate-limited
function generateMockHistoricalData(symbol: string, days: number = 100) {
  const basePrice = getBasePrice(symbol);
  let price = basePrice;
  const timeSeries: Record<string, any> = {};
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    const dateStr = date.toISOString().split('T')[0];
    const dailyChange = (Math.random() - 0.48) * 0.03;
    price = price * (1 + dailyChange);
    
    const open = price * (1 + (Math.random() - 0.5) * 0.01);
    const high = Math.max(open, price) * (1 + Math.random() * 0.02);
    const low = Math.min(open, price) * (1 - Math.random() * 0.02);
    const volume = Math.floor(1000000 + Math.random() * 10000000);
    
    timeSeries[dateStr] = {
      '1. open': open.toFixed(4),
      '2. high': high.toFixed(4),
      '3. low': low.toFixed(4),
      '4. close': price.toFixed(4),
      '5. volume': volume.toString()
    };
  }
  
  return {
    'Meta Data': {
      '1. Information': 'Demo Daily Time Series',
      '2. Symbol': symbol,
      '3. Last Refreshed': new Date().toISOString().split('T')[0],
    },
    'Time Series (Daily)': timeSeries,
    '_isDemo': true
  };
}

function generateMockIndicator(symbol: string, indicator: string, days: number = 100) {
  const data: Record<string, any> = {};
  const now = new Date();
  let value = 50 + Math.random() * 30;
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    const dateStr = date.toISOString().split('T')[0];
    value = Math.max(0, Math.min(100, value + (Math.random() - 0.5) * 10));
    
    if (indicator === 'RSI') {
      data[dateStr] = { RSI: value.toFixed(4) };
    } else if (indicator === 'MACD') {
      data[dateStr] = {
        MACD: ((Math.random() - 0.5) * 5).toFixed(4),
        MACD_Signal: ((Math.random() - 0.5) * 4).toFixed(4),
        MACD_Hist: ((Math.random() - 0.5) * 2).toFixed(4)
      };
    } else if (indicator === 'SMA' || indicator === 'EMA') {
      const basePrice = getBasePrice(symbol);
      data[dateStr] = { [indicator]: (basePrice * (0.95 + Math.random() * 0.1)).toFixed(4) };
    } else if (indicator === 'BBANDS') {
      const basePrice = getBasePrice(symbol);
      const middle = basePrice * (0.98 + Math.random() * 0.04);
      data[dateStr] = {
        'Real Upper Band': (middle * 1.02).toFixed(4),
        'Real Middle Band': middle.toFixed(4),
        'Real Lower Band': (middle * 0.98).toFixed(4)
      };
    }
  }
  
  return {
    'Meta Data': { '1: Symbol': symbol, '2: Indicator': indicator },
    [`Technical Analysis: ${indicator}`]: data,
    '_isDemo': true
  };
}

function generateMockNews(symbol?: string) {
  const topics = ['Technology', 'Finance', 'Markets', 'Economy'];
  const sentiments = ['Bullish', 'Bearish', 'Neutral'];
  const news = [];
  
  for (let i = 0; i < 10; i++) {
    const date = new Date();
    date.setHours(date.getHours() - i * 2);
    
    news.push({
      title: `${symbol || 'Market'} ${['surges', 'drops', 'stabilizes', 'shows momentum'][i % 4]} amid ${topics[i % 4]} developments`,
      url: `https://example.com/news/${i}`,
      time_published: date.toISOString().replace(/[-:]/g, '').split('.')[0],
      authors: ['Market Analyst'],
      summary: `Latest market analysis for ${symbol || 'the market'} shows interesting patterns...`,
      source: ['Reuters', 'Bloomberg', 'CNBC', 'MarketWatch'][i % 4],
      overall_sentiment_score: (Math.random() * 0.6 - 0.3).toFixed(4),
      overall_sentiment_label: sentiments[i % 3],
      ticker_sentiment: symbol ? [{
        ticker: symbol,
        relevance_score: (0.5 + Math.random() * 0.5).toFixed(4),
        ticker_sentiment_score: (Math.random() * 0.6 - 0.3).toFixed(4),
        ticker_sentiment_label: sentiments[i % 3]
      }] : []
    });
  }
  
  return { feed: news, _isDemo: true };
}

function generateMockForex(from: string, to: string) {
  const rates: Record<string, number> = {
    'USD_EUR': 0.92, 'USD_GBP': 0.79, 'USD_JPY': 149.50, 'USD_ZMW': 26.50,
    'EUR_USD': 1.09, 'GBP_USD': 1.27, 'BTC_USD': 67500, 'ETH_USD': 3450
  };
  const key = `${from}_${to}`;
  const rate = rates[key] || 1 + Math.random();
  
  return {
    'Realtime Currency Exchange Rate': {
      '1. From_Currency Code': from,
      '2. From_Currency Name': from,
      '3. To_Currency Code': to,
      '4. To_Currency Name': to,
      '5. Exchange Rate': rate.toFixed(4),
      '6. Last Refreshed': new Date().toISOString(),
      '8. Bid Price': (rate * 0.999).toFixed(4),
      '9. Ask Price': (rate * 1.001).toFixed(4)
    },
    '_isDemo': true
  };
}

function generateMockEconomicData(indicator: string) {
  const data = [];
  const now = new Date();
  
  for (let i = 0; i < 20; i++) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    
    let value;
    switch (indicator) {
      case 'REAL_GDP': value = (22000 + Math.random() * 2000).toFixed(2); break;
      case 'INFLATION': value = (2 + Math.random() * 4).toFixed(2); break;
      case 'FEDERAL_FUNDS_RATE': value = (4 + Math.random() * 1.5).toFixed(2); break;
      case 'UNEMPLOYMENT': value = (3.5 + Math.random() * 2).toFixed(2); break;
      case 'TREASURY_YIELD': value = (3 + Math.random() * 2).toFixed(2); break;
      default: value = (Math.random() * 100).toFixed(2);
    }
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: value
    });
  }
  
  return { name: indicator, data, _isDemo: true };
}

function getBasePrice(symbol: string): number {
  const prices: Record<string, number> = {
    'AAPL': 178.50, 'GOOGL': 141.25, 'MSFT': 378.90, 'AMZN': 178.25,
    'META': 505.75, 'NVDA': 875.50, 'TSLA': 245.80, 'BTC': 67500, 'ETH': 3450
  };
  return prices[symbol] || 100 + Math.random() * 200;
}

async function fetchWithFallback(params: URLSearchParams, fallbackFn: () => any) {
  const apiKey = Deno.env.get('ALPHAVANTAGE_API_KEY');
  
  if (!apiKey) {
    console.log('No API key, using demo data');
    return fallbackFn();
  }
  
  params.append('apikey', apiKey);
  
  try {
    const response = await fetch(`${BASE_URL}?${params}`);
    if (!response.ok) {
      console.log(`API error ${response.status}, using demo data`);
      return fallbackFn();
    }
    
    const data = await response.json();
    
    if (data['Error Message'] || data['Note'] || data['Information']?.includes('rate limit')) {
      console.log('API rate limited or error, using demo data');
      return fallbackFn();
    }
    
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    return fallbackFn();
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { function: func, symbol, interval, time_period, series_type, outputsize,
            from_currency, to_currency, tickers, topics, maturity } = body;
    
    let result;
    const params = new URLSearchParams({ function: func });
    
    // Route to appropriate handler based on function type
    switch (func) {
      // Stock Time Series
      case 'TIME_SERIES_DAILY':
      case 'TIME_SERIES_DAILY_ADJUSTED':
        params.append('symbol', symbol);
        if (outputsize) params.append('outputsize', outputsize);
        result = await fetchWithFallback(params, () => generateMockHistoricalData(symbol));
        break;
        
      // Technical Indicators
      case 'RSI':
        params.append('symbol', symbol);
        params.append('interval', interval || 'daily');
        params.append('time_period', time_period || '14');
        params.append('series_type', series_type || 'close');
        result = await fetchWithFallback(params, () => generateMockIndicator(symbol, 'RSI'));
        break;
        
      case 'MACD':
        params.append('symbol', symbol);
        params.append('interval', interval || 'daily');
        params.append('series_type', series_type || 'close');
        result = await fetchWithFallback(params, () => generateMockIndicator(symbol, 'MACD'));
        break;
        
      case 'SMA':
      case 'EMA':
        params.append('symbol', symbol);
        params.append('interval', interval || 'daily');
        params.append('time_period', time_period || '20');
        params.append('series_type', series_type || 'close');
        result = await fetchWithFallback(params, () => generateMockIndicator(symbol, func));
        break;
        
      case 'BBANDS':
        params.append('symbol', symbol);
        params.append('interval', interval || 'daily');
        params.append('time_period', time_period || '20');
        params.append('series_type', series_type || 'close');
        result = await fetchWithFallback(params, () => generateMockIndicator(symbol, 'BBANDS'));
        break;
        
      // News & Sentiment
      case 'NEWS_SENTIMENT':
        if (tickers) params.append('tickers', tickers);
        if (topics) params.append('topics', topics);
        result = await fetchWithFallback(params, () => generateMockNews(tickers));
        break;
        
      // Forex
      case 'CURRENCY_EXCHANGE_RATE':
        params.append('from_currency', from_currency);
        params.append('to_currency', to_currency);
        result = await fetchWithFallback(params, () => generateMockForex(from_currency, to_currency));
        break;
        
      // Crypto
      case 'CRYPTO_RATING':
        params.append('symbol', symbol);
        result = await fetchWithFallback(params, () => ({ rating: 'B', _isDemo: true }));
        break;
        
      // Economic Indicators
      case 'REAL_GDP':
      case 'INFLATION':
      case 'FEDERAL_FUNDS_RATE':
      case 'UNEMPLOYMENT':
      case 'TREASURY_YIELD':
        if (maturity) params.append('maturity', maturity);
        result = await fetchWithFallback(params, () => generateMockEconomicData(func));
        break;
        
      // Company Overview
      case 'OVERVIEW':
        params.append('symbol', symbol);
        result = await fetchWithFallback(params, () => ({
          Symbol: symbol,
          Name: symbol,
          Sector: 'Technology',
          MarketCapitalization: '2000000000000',
          PERatio: '25.5',
          EPS: '6.50',
          DividendYield: '0.005',
          _isDemo: true
        }));
        break;
        
      default:
        return new Response(
          JSON.stringify({ error: `Unsupported function: ${func}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
    
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Alpha Vantage API error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});