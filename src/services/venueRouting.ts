/**
 * VenueRouting — decides WHERE an order executes for a signed-in user.
 *
 * CEO directive (2026-11-23): trading must run on the Alpaca Sandbox
 * (paper) account, not on local simulation — except for the Zambian
 * market, the African markets, and P2P crypto, which stay local.
 *
 * - US stocks                       → Alpaca paper ('alpaca')
 * - Crypto bases Alpaca lists, when the pair is USD/USDT quoted
 *                                   → Alpaca paper crypto ('alpaca'),
 *                                     executed as BASE/USD on Alpaca
 * - LuSE (Zambian) stocks           → local engine ('local') — LuSE carve-out
 * - ZMW-quoted crypto pairs         → local engine ('local') — ZMW carve-out,
 *                                     labelled "PalmCacia simulated market"
 * - Crypto bases Alpaca does not list (e.g. BNB)
 *                                   → local engine ('local'), labelled simulated
 *
 * Signed-out demo mode never reaches this module's Alpaca paths: the demo
 * layer (DemoBackend) short-circuits services before venue routing applies.
 */
import { getPairDef, getStockDef } from './demo/demoMarket';

export type Venue = 'alpaca' | 'local';

/** Crypto bases tradable on Alpaca (paper supports the same list as live). */
export const ALPACA_CRYPTO_BASES: ReadonlySet<string> = new Set([
  'AAVE', 'ALGO', 'APE', 'AVAX', 'BAT', 'BCH', 'BTC', 'CRV', 'DOGE', 'DOT',
  'ETH', 'GRT', 'LINK', 'LTC', 'MKR', 'NEAR', 'PAXG', 'PEPE', 'SHIB', 'SOL',
  'SUSHI', 'UNI', 'USDC', 'XRP', 'XTZ', 'YFI',
]);

/** Alpaca order symbol for a crypto base, e.g. BTC -> BTCUSD. */
export function alpacaCryptoSymbol(base: string): string {
  return `${base.toUpperCase()}USD`;
}

/** True when an Alpaca position/order symbol (e.g. BTCUSD) is a crypto asset. */
export function isAlpacaCryptoSymbol(symbol: string): boolean {
  const s = symbol.toUpperCase();
  if (!s.endsWith('USD')) return false;
  return ALPACA_CRYPTO_BASES.has(s.slice(0, -3));
}

/** Venue for a stock symbol from the catalogue. Unknown symbols default to Alpaca (US). */
export function stockVenue(symbol: string): Venue {
  const def = getStockDef(symbol);
  if (def) return def.market === 'LuSE' ? 'local' : 'alpaca';
  return 'alpaca';
}

export interface ResolvedInstrument {
  kind: 'stock' | 'crypto';
  /** Base asset / ticker, e.g. 'AAPL' or 'BTC'. */
  base: string;
  /** Pair id from the demo catalogue when the symbol is a crypto pair, else null. */
  pairId: string | null;
  /** Quote currency of the pair as displayed ('USD' | 'USDT' | 'ZMW'), null for stocks. */
  quote: string | null;
  venue: Venue;
  /** Symbol to send to Alpaca when venue === 'alpaca' (e.g. 'AAPL', 'BTCUSD'). */
  alpacaSymbol: string | null;
  /** Human label for the venue, used in UI badges. */
  venueLabel: string;
}

/**
 * Resolve any symbol the trade surfaces accept — 'AAPL', 'ZCCM', 'BTC',
 * 'BTC-USDT', 'BTC-ZMW', 'BTCUSD' — to its execution venue.
 */
export function resolveInstrument(rawSymbol: string): ResolvedInstrument {
  const symbol = (rawSymbol || '').toUpperCase();

  const stock = getStockDef(symbol);
  if (stock) {
    const venue: Venue = stock.market === 'LuSE' ? 'local' : 'alpaca';
    return {
      kind: 'stock',
      base: stock.symbol,
      pairId: null,
      quote: null,
      venue,
      alpacaSymbol: venue === 'alpaca' ? stock.symbol : null,
      venueLabel: venue === 'alpaca' ? 'Alpaca Sandbox' : 'LuSE — PalmCacia paper market',
    };
  }

  // Crypto: pair id ('BTC-USDT'), bare base ('BTC'), or Alpaca symbol ('BTCUSD').
  let pairId: string | null = null;
  let base = symbol;
  let quote: string | null = null;

  const pairDef = getPairDef(symbol);
  if (pairDef) {
    pairId = pairDef.id;
    base = pairDef.base;
    quote = pairDef.quote;
  } else if (symbol.includes('-')) {
    const [b, q] = symbol.split('-');
    base = b;
    quote = q ?? null;
  } else if (isAlpacaCryptoSymbol(symbol)) {
    base = symbol.slice(0, -3);
    quote = 'USD';
    pairId = getPairDef(`${base}-USDT`)?.id ?? null;
  } else {
    // Bare base like 'BTC' — prefer the USDT pair, fall back to ZMW.
    const usdt = getPairDef(`${symbol}-USDT`);
    const zmw = getPairDef(`${symbol}-ZMW`);
    if (usdt) { pairId = usdt.id; quote = usdt.quote; }
    else if (zmw) { pairId = zmw.id; quote = zmw.quote; }
  }

  const alpacaListed = ALPACA_CRYPTO_BASES.has(base);
  // ZMW-quoted pairs stay local under the African/ZMW carve-out; everything
  // else Alpaca lists executes on Alpaca paper as BASE/USD.
  const venue: Venue = alpacaListed && quote !== 'ZMW' ? 'alpaca' : 'local';
  return {
    kind: 'crypto',
    base,
    pairId,
    quote,
    venue,
    alpacaSymbol: venue === 'alpaca' ? alpacaCryptoSymbol(base) : null,
    venueLabel: venue === 'alpaca' ? 'Alpaca Sandbox' : 'PalmCacia simulated market',
  };
}
