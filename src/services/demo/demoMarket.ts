/**
 * DemoMarket — simulated market data for PalmTrader Horizon's frontend demo mode.
 *
 * This is the single source of simulated prices for the whole app when the
 * demo backend is active (see DemoBackend). Prices random-walk around seeded
 * base values on a 2-second tick so every surface (spot, futures, convert,
 * portfolio, alerts) sees the same moving market.
 *
 * All data here is DEMO data. When the real Supabase backend is wired up,
 * services stop calling this module — nothing else needs to change.
 */

export const USD_ZMW_RATE = 25.4;

export interface CryptoPairDef {
  id: string;
  base: string;
  quote: string;
  baseUsd: number; // reference price of 1 unit of base in USD
}

export const CRYPTO_PAIRS: CryptoPairDef[] = [
  { id: 'BTC-USDT', base: 'BTC', quote: 'USDT', baseUsd: 97412 },
  { id: 'ETH-USDT', base: 'ETH', quote: 'USDT', baseUsd: 3418 },
  { id: 'BNB-USDT', base: 'BNB', quote: 'USDT', baseUsd: 692 },
  { id: 'SOL-USDT', base: 'SOL', quote: 'USDT', baseUsd: 213.4 },
  { id: 'XRP-USDT', base: 'XRP', quote: 'USDT', baseUsd: 2.34 },
  { id: 'ADA-USDT', base: 'ADA', quote: 'USDT', baseUsd: 0.97 },
  { id: 'DOGE-USDT', base: 'DOGE', quote: 'USDT', baseUsd: 0.318 },
  { id: 'BTC-ZMW', base: 'BTC', quote: 'ZMW', baseUsd: 97412 },
  { id: 'ETH-ZMW', base: 'ETH', quote: 'ZMW', baseUsd: 3418 },
  { id: 'USDT-ZMW', base: 'USDT', quote: 'ZMW', baseUsd: 1 },
];

export const CRYPTO_USD_BASE: Record<string, number> = {
  BTC: 97412, ETH: 3418, BNB: 692, SOL: 213.4, XRP: 2.34, ADA: 0.97,
  DOGE: 0.318, DOT: 8.9, USDC: 1, USDT: 1, USD: 1,
};

export interface StockDef {
  symbol: string;
  name: string;
  currency: 'USD' | 'ZMW';
  market: 'US' | 'LuSE';
  basePrice: number;
}

export const STOCKS: StockDef[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', currency: 'USD', market: 'US', basePrice: 213.88 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', currency: 'USD', market: 'US', basePrice: 415.50 },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', currency: 'USD', market: 'US', basePrice: 183.34 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', currency: 'USD', market: 'US', basePrice: 218.94 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', currency: 'USD', market: 'US', basePrice: 300.88 },
  { symbol: 'META', name: 'Meta Platforms Inc.', currency: 'USD', market: 'US', basePrice: 660.57 },
  { symbol: 'TSLA', name: 'Tesla Inc.', currency: 'USD', market: 'US', basePrice: 175.20 },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', currency: 'USD', market: 'US', basePrice: 198.40 },
  { symbol: 'NFLX', name: 'Netflix Inc.', currency: 'USD', market: 'US', basePrice: 762.15 },
  { symbol: 'AMD', name: 'Advanced Micro Devices', currency: 'USD', market: 'US', basePrice: 122.60 },
  // LuSE (Lusaka Securities Exchange) — demo prices in ZMW
  { symbol: 'ZCCM', name: 'ZCCM Investment Holdings Plc', currency: 'ZMW', market: 'LuSE', basePrice: 64.20 },
  { symbol: 'ZANACO', name: 'Zambia National Commercial Bank Plc', currency: 'ZMW', market: 'LuSE', basePrice: 5.24 },
  { symbol: 'ATEL', name: 'Airtel Networks Zambia Plc', currency: 'ZMW', market: 'LuSE', basePrice: 104.75 },
  { symbol: 'CECZ', name: 'Copperbelt Energy Corporation Plc', currency: 'ZMW', market: 'LuSE', basePrice: 14.86 },
  { symbol: 'ZAMEFA', name: 'Metal Fabricators of Zambia Plc', currency: 'ZMW', market: 'LuSE', basePrice: 8.62 },
  { symbol: 'SCBL', name: 'Standard Chartered Bank Zambia Plc', currency: 'ZMW', market: 'LuSE', basePrice: 2.94 },
  { symbol: 'CHIL', name: 'Chilanga Cement Plc', currency: 'ZMW', market: 'LuSE', basePrice: 21.30 },
  { symbol: 'PUMA', name: 'Puma Energy Zambia Plc', currency: 'ZMW', market: 'LuSE', basePrice: 3.87 },
];

export function getStockDef(symbol: string): StockDef | undefined {
  return STOCKS.find(s => s.symbol === symbol.toUpperCase());
}

export function getPairDef(pairId: string): CryptoPairDef | undefined {
  return CRYPTO_PAIRS.find(p => p.id === pairId);
}

export interface InstrumentDef {
  symbol: string;
  name: string;
  currency: string;
  exchange: string;
  basePrice: number;
}

const CRYPTO_NAMES: Record<string, string> = {
  BTC: 'Bitcoin', ETH: 'Ethereum', BNB: 'BNB', SOL: 'Solana', XRP: 'XRP',
  ADA: 'Cardano', DOGE: 'Dogecoin', DOT: 'Polkadot', USDT: 'Tether', USDC: 'USD Coin',
};

/** Unified instrument lookup: stock symbol, crypto symbol, or pair id. */
export function getInstrument(id: string): InstrumentDef | undefined {
  const stock = getStockDef(id);
  if (stock) {
    return { symbol: stock.symbol, name: stock.name, currency: stock.currency, exchange: stock.market, basePrice: stock.basePrice };
  }
  const pair = getPairDef(id);
  if (pair) {
    return {
      symbol: pair.id, name: `${CRYPTO_NAMES[pair.base] || pair.base} / ${pair.quote}`,
      currency: pair.quote, exchange: 'Crypto',
      basePrice: pair.quote === 'ZMW' ? pair.baseUsd * USD_ZMW_RATE : pair.baseUsd,
    };
  }
  const base = CRYPTO_USD_BASE[id.toUpperCase()];
  if (base !== undefined) {
    return { symbol: id.toUpperCase(), name: CRYPTO_NAMES[id.toUpperCase()] || id.toUpperCase(), currency: 'USD', exchange: 'Crypto', basePrice: base };
  }
  return undefined;
}

/** USD value of 1 unit of a currency/asset (ZMW converted at the demo rate). */
export function usdValueOf(currency: string): number {
  if (currency === 'ZMW') return 1 / USD_ZMW_RATE;
  return CRYPTO_USD_BASE[currency] ?? 1;
}

/** Price of `base` denominated in `quote` (e.g. BTC in ZMW). */
export function crossRate(base: string, quote: string): number {
  return usdValueOf(base) / usdValueOf(quote);
}

// ---------------------------------------------------------------------------
// Price engine — one shared random walk for every instrument.
// ---------------------------------------------------------------------------

const priceState = new Map<string, number>();
const openState = new Map<string, number>(); // price at engine start (≈24h ago reference)
const listeners = new Set<() => void>();
let engineStarted = false;

function seedPrices() {
  CRYPTO_PAIRS.forEach(p => {
    const px = p.baseUsd * (p.quote === 'ZMW' ? USD_ZMW_RATE : 1);
    priceState.set(p.id, px);
    openState.set(p.id, px * (1 - 0.008));
  });
  Object.entries(CRYPTO_USD_BASE).forEach(([sym, px]) => {
    priceState.set(`CRYPTO:${sym}`, px);
    openState.set(`CRYPTO:${sym}`, px * (1 - 0.008));
  });
  STOCKS.forEach(s => {
    priceState.set(`STOCK:${s.symbol}`, s.basePrice);
    openState.set(`STOCK:${s.symbol}`, s.basePrice * (1 - 0.005));
  });
  priceState.set('FX:USDZMW', USD_ZMW_RATE);
  openState.set('FX:USDZMW', USD_ZMW_RATE);
}

function tick() {
  priceState.forEach((px, key) => {
    if (key.startsWith('FX:')) return;
    const vol = key.startsWith('STOCK:') ? 0.0016 : 0.0028;
    const drift = (Math.random() - 0.5) * 2 * vol;
    // gentle mean reversion toward ±12% of the session open
    const open = openState.get(key) || px;
    const deviation = (px - open) / open;
    const reversion = -deviation * 0.01;
    priceState.set(key, Math.max(px * (1 + drift + reversion), px * 0.5, 0.0001));
  });
  listeners.forEach(fn => fn());
}

export function ensurePriceEngine() {
  if (engineStarted) return;
  engineStarted = true;
  seedPrices();
  setInterval(tick, 2000);
}

export function subscribePrices(fn: () => void): () => void {
  ensurePriceEngine();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Current price of a trading pair id, e.g. 'BTC-USDT'. */
export function getPairPrice(pairId: string): number {
  ensurePriceEngine();
  return priceState.get(pairId) ?? getPairDef(pairId)?.baseUsd ?? 0;
}

/** Current USD price of a crypto asset symbol, e.g. 'BTC'. */
export function getCryptoPrice(symbol: string): number {
  ensurePriceEngine();
  return priceState.get(`CRYPTO:${symbol.toUpperCase()}`) ?? CRYPTO_USD_BASE[symbol.toUpperCase()] ?? 0;
}

/** Current price of a stock symbol in its listing currency. */
export function getStockPrice(symbol: string): number {
  ensurePriceEngine();
  const def = getStockDef(symbol);
  return priceState.get(`STOCK:${symbol.toUpperCase()}`) ?? def?.basePrice ?? 0;
}

/** Current price of any instrument: pair id, crypto symbol or stock symbol. */
export function getPrice(instrument: string): number {
  if (getPairDef(instrument)) return getPairPrice(instrument);
  if (getStockDef(instrument)) return getStockPrice(instrument);
  return getCryptoPrice(instrument);
}

/** % change vs session open for an instrument key (pair id or symbol). */
export function getChangePct(instrument: string): number {
  ensurePriceEngine();
  const key = getPairDef(instrument)
    ? instrument
    : getStockDef(instrument)
      ? `STOCK:${instrument.toUpperCase()}`
      : `CRYPTO:${instrument.toUpperCase()}`;
  const open = openState.get(key);
  const px = priceState.get(key);
  if (!open || !px) return 0;
  return ((px - open) / open) * 100;
}

// ---------------------------------------------------------------------------
// Order book synthesis
// ---------------------------------------------------------------------------

export interface BookLevel { price: number; quantity: number; total: number }

function seededRandom(seed: number) {
  let t = seed + 0x6D2B79F5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function synthesizeOrderBook(pairId: string, levels = 15): { bids: BookLevel[]; asks: BookLevel[]; lastPrice: number; spread: number } {
  const mid = getPairPrice(pairId);
  const bucket = Math.floor(Date.now() / 5000);
  const rand = seededRandom(bucket * 7919 + pairId.length * 131 + pairId.charCodeAt(0));
  const stepPct = 0.0006;
  const bids: BookLevel[] = [];
  const asks: BookLevel[] = [];
  for (let i = 0; i < levels; i++) {
    const askPrice = mid * (1 + stepPct * (i + 1) * (0.8 + rand() * 0.5));
    const bidPrice = mid * (1 - stepPct * (i + 1) * (0.8 + rand() * 0.5));
    const askQty = 0.02 + rand() * 1.8;
    const bidQty = 0.02 + rand() * 1.8;
    asks.push({ price: askPrice, quantity: askQty, total: askPrice * askQty });
    bids.push({ price: bidPrice, quantity: bidQty, total: bidPrice * bidQty });
  }
  asks.sort((a, b) => a.price - b.price);
  bids.sort((a, b) => b.price - a.price);
  return { bids, asks, lastPrice: mid, spread: asks[0].price - bids[0].price };
}

// ---------------------------------------------------------------------------
// Chart data (OHLC) — deterministic per symbol/timeframe
// ---------------------------------------------------------------------------

export interface Candle { time: string; open: number; high: number; low: number; close: number; value: number }

export function generateChartData(instrument: string, points = 60): Candle[] {
  const base = getPrice(instrument) || 100;
  const seed = instrument.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 31 + points;
  const rand = seededRandom(seed);
  const candles: Candle[] = [];
  let price = base * (0.94 + rand() * 0.04);
  const now = Date.now();
  for (let i = points; i > 0; i--) {
    const open = price;
    const change = price * (rand() - 0.485) * 0.012;
    price = Math.max(price + change, base * 0.5);
    const high = Math.max(open, price) * (1 + rand() * 0.004);
    const low = Math.min(open, price) * (1 - rand() * 0.004);
    candles.push({
      time: new Date(now - i * 3600_000).toISOString(),
      open, high, low, close: price, value: price,
    });
  }
  // last candle closes at the live price so chart and quote agree
  const last = candles[candles.length - 1];
  if (last) { last.close = getPrice(instrument) || last.close; last.value = last.close; }
  return candles;
}
