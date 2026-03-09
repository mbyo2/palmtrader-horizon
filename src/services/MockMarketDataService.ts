
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
  'BTC': { price: 67500, name: 'Bitcoin', sector: 'Crypto' },
  'ETH': { price: 3450, name: 'Ethereum', sector: 'Crypto' },
  'BNB': { price: 585, name: 'Binance Coin', sector: 'Crypto' },
  'SOL': { price: 175, name: 'Solana', sector: 'Crypto' },
  'XRP': { price: 0.62, name: 'Ripple', sector: 'Crypto' },
};

// Time bucket size: prices update every 4 seconds
const TIME_BUCKET_MS = 4000;

/** Fast deterministic pseudo-random [0, 1) from a seed */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Hash a symbol string into a stable integer seed */
function symbolSeed(symbol: string): number {
  return symbol.split('').reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 7), 0);
}

/**
 * Compute a live price that changes every TIME_BUCKET_MS milliseconds.
 * Uses multi-scale variation so movements look natural.
 */
function getLivePrice(symbol: string, basePrice: number): number {
  const ss = symbolSeed(symbol);
  const bucket = Math.floor(Date.now() / TIME_BUCKET_MS);

  // Three overlapping oscillation scales
  const micro  = (seededRandom(ss + bucket % 10007)           - 0.5) * 0.008; // ±0.4%
  const short  = (seededRandom(ss * 3 + Math.floor(bucket / 6)  % 9973) - 0.5) * 0.016; // ±0.8%
  const medium = (seededRandom(ss * 7 + Math.floor(bucket / 30) % 9901) - 0.5) * 0.030; // ±1.5%

  const variation = micro + short + medium;
  return Math.max(basePrice * 0.50, basePrice * (1 + variation));
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
    const basePrice = base?.price ?? (100 + seededRandom(symbolSeed(symbol)) * 200);

    const price      = getLivePrice(symbol, basePrice);
    const prevPrice  = getLivePrice(symbol + '_prev', basePrice); // slightly different seed for "prev close"
    const change        = parseFloat((price - prevPrice).toFixed(2));
    const changePercent = parseFloat(((change / prevPrice) * 100).toFixed(2));

    const ss = symbolSeed(symbol);
    const bucket = Math.floor(Date.now() / TIME_BUCKET_MS);

    return {
      symbol,
      price:         parseFloat(price.toFixed(2)),
      change,
      changePercent,
      open:          parseFloat((price * (1 - seededRandom(ss + bucket + 1) * 0.005)).toFixed(2)),
      high:          parseFloat((price * (1 + seededRandom(ss + bucket + 2) * 0.015)).toFixed(2)),
      low:           parseFloat((price * (1 - seededRandom(ss + bucket + 3) * 0.015)).toFixed(2)),
      close:         parseFloat(price.toFixed(2)),
      volume:        Math.floor(500_000 + seededRandom(ss + bucket + 4) * 15_000_000),
      timestamp:     Date.now(),
      isDemo:        true,
    };
  }

  static getHistoricalData(symbol: string, days: number = 90): MockMarketData[] {
    const base = BASE_PRICES[symbol];
    let price = base?.price ?? (100 + seededRandom(symbolSeed(symbol)) * 200);

    const data: MockMarketData[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      const dailySeed = date.getTime() / 86400000 + symbolSeed(symbol);
      const dailyChange = (seededRandom(dailySeed) - 0.48) * 0.028; // slight upward bias
      price = Math.max(price * 0.10, price * (1 + dailyChange));

      const open  = price * (1 + (seededRandom(dailySeed + 1) - 0.5) * 0.008);
      const high  = Math.max(open, price) * (1 + seededRandom(dailySeed + 2) * 0.015);
      const low   = Math.min(open, price) * (1 - seededRandom(dailySeed + 3) * 0.015);
      const close = price;

      data.push({
        symbol,
        price:         parseFloat(close.toFixed(2)),
        change:        parseFloat((close - open).toFixed(2)),
        changePercent: parseFloat(((close - open) / open * 100).toFixed(2)),
        open:          parseFloat(open.toFixed(2)),
        high:          parseFloat(high.toFixed(2)),
        low:           parseFloat(low.toFixed(2)),
        close:         parseFloat(close.toFixed(2)),
        volume:        Math.floor(500_000 + seededRandom(dailySeed + 4) * 15_000_000),
        timestamp:     date.getTime(),
        isDemo:        true,
      });
    }

    return data;
  }

  static getCompanyInfo(symbol: string) {
    const base = BASE_PRICES[symbol];
    const ss   = symbolSeed(symbol);

    if (!base) {
      return {
        symbol, name: symbol, sector: 'Unknown', industry: 'Unknown',
        marketCap: 0, peRatio: 0, eps: 0, dividendYield: 0, isDemo: true,
      };
    }

    return {
      symbol,
      name:          base.name,
      sector:        base.sector,
      industry:      base.sector,
      marketCap:     Math.floor(50_000_000_000 + seededRandom(ss)     * 2_500_000_000_000),
      peRatio:       parseFloat((15 + seededRandom(ss + 1) * 35).toFixed(2)),
      eps:           parseFloat((1  + seededRandom(ss + 2) * 18).toFixed(2)),
      dividendYield: parseFloat((seededRandom(ss + 3) * 3.5).toFixed(2)),
      isDemo:        true,
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
