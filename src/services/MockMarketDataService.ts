
// Mock market data service for demo/fallback data when APIs are rate-limited

const BASE_PRICES: Record<string, { price: number; name: string; sector: string }> = {
  'AAPL': { price: 178.50, name: 'Apple Inc.', sector: 'Technology' },
  'GOOGL': { price: 141.25, name: 'Alphabet Inc.', sector: 'Technology' },
  'MSFT': { price: 378.90, name: 'Microsoft Corporation', sector: 'Technology' },
  'AMZN': { price: 178.25, name: 'Amazon.com Inc.', sector: 'Consumer Discretionary' },
  'META': { price: 505.75, name: 'Meta Platforms Inc.', sector: 'Technology' },
  'NVDA': { price: 875.50, name: 'NVIDIA Corporation', sector: 'Technology' },
  'TSLA': { price: 245.80, name: 'Tesla Inc.', sector: 'Consumer Discretionary' },
  'BRK.B': { price: 412.30, name: 'Berkshire Hathaway', sector: 'Financials' },
  'JPM': { price: 195.45, name: 'JPMorgan Chase', sector: 'Financials' },
  'V': { price: 275.80, name: 'Visa Inc.', sector: 'Financials' },
  'JNJ': { price: 156.20, name: 'Johnson & Johnson', sector: 'Healthcare' },
  'WMT': { price: 165.50, name: 'Walmart Inc.', sector: 'Consumer Staples' },
  'PG': { price: 162.75, name: 'Procter & Gamble', sector: 'Consumer Staples' },
  'XOM': { price: 105.30, name: 'Exxon Mobil', sector: 'Energy' },
  'HD': { price: 385.60, name: 'Home Depot', sector: 'Consumer Discretionary' },
  'BAC': { price: 35.80, name: 'Bank of America', sector: 'Financials' },
  'DIS': { price: 112.45, name: 'Walt Disney', sector: 'Communication Services' },
  'NFLX': { price: 628.90, name: 'Netflix Inc.', sector: 'Communication Services' },
  'AMD': { price: 178.25, name: 'AMD Inc.', sector: 'Technology' },
  'CRM': { price: 285.40, name: 'Salesforce Inc.', sector: 'Technology' },
};

// Seed for consistent random values within a session
let sessionSeed = Date.now();

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getRandomVariation(symbol: string, factor: number = 0.02): number {
  const seed = sessionSeed + symbol.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return (seededRandom(seed) - 0.5) * 2 * factor;
}

export interface MockMarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
  isDemo: boolean;
}

export class MockMarketDataService {
  static getPrice(symbol: string): MockMarketData {
    const base = BASE_PRICES[symbol];
    const basePrice = base?.price || 100 + seededRandom(symbol.charCodeAt(0)) * 200;
    
    const variation = getRandomVariation(symbol, 0.02);
    const price = basePrice * (1 + variation);
    const change = basePrice * variation;
    const changePercent = variation * 100;
    
    return {
      symbol,
      price: parseFloat(price.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      open: parseFloat((price * 0.998).toFixed(2)),
      high: parseFloat((price * 1.015).toFixed(2)),
      low: parseFloat((price * 0.985).toFixed(2)),
      close: parseFloat(price.toFixed(2)),
      volume: Math.floor(1000000 + seededRandom(symbol.charCodeAt(0)) * 10000000),
      timestamp: Date.now(),
      isDemo: true
    };
  }

  static getHistoricalData(symbol: string, days: number = 90): MockMarketData[] {
    const base = BASE_PRICES[symbol];
    let basePrice = base?.price || 100 + seededRandom(symbol.charCodeAt(0)) * 200;
    
    const data: MockMarketData[] = [];
    const now = new Date();
    
    // Generate data going backwards
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      // Add some daily variation with trend
      const dailySeed = date.getTime() + symbol.charCodeAt(0);
      const dailyChange = (seededRandom(dailySeed) - 0.48) * 0.03; // Slight upward bias
      basePrice = basePrice * (1 + dailyChange);
      
      const open = basePrice * (1 + (seededRandom(dailySeed + 1) - 0.5) * 0.01);
      const high = Math.max(open, basePrice) * (1 + seededRandom(dailySeed + 2) * 0.02);
      const low = Math.min(open, basePrice) * (1 - seededRandom(dailySeed + 3) * 0.02);
      const close = basePrice;
      
      data.push({
        symbol,
        price: parseFloat(close.toFixed(2)),
        change: parseFloat((close - open).toFixed(2)),
        changePercent: parseFloat(((close - open) / open * 100).toFixed(2)),
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: Math.floor(1000000 + seededRandom(dailySeed + 4) * 10000000),
        timestamp: date.getTime(),
        isDemo: true
      });
    }
    
    return data;
  }

  static getCompanyInfo(symbol: string) {
    const base = BASE_PRICES[symbol];
    if (!base) {
      return {
        symbol,
        name: symbol,
        sector: 'Unknown',
        industry: 'Unknown',
        marketCap: 0,
        peRatio: 0,
        eps: 0,
        dividendYield: 0,
        isDemo: true
      };
    }
    
    const seed = symbol.charCodeAt(0);
    return {
      symbol,
      name: base.name,
      sector: base.sector,
      industry: base.sector,
      marketCap: Math.floor(100000000000 + seededRandom(seed) * 2000000000000),
      peRatio: parseFloat((15 + seededRandom(seed + 1) * 30).toFixed(2)),
      eps: parseFloat((2 + seededRandom(seed + 2) * 15).toFixed(2)),
      dividendYield: parseFloat((seededRandom(seed + 3) * 3).toFixed(2)),
      isDemo: true
    };
  }

  static getMultiplePrices(symbols: string[]): Map<string, MockMarketData> {
    const prices = new Map<string, MockMarketData>();
    for (const symbol of symbols) {
      prices.set(symbol, this.getPrice(symbol));
    }
    return prices;
  }
}
