import { MockMarketDataService } from '../MockMarketDataService';
import { supabase } from "@/integrations/supabase/client";

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
  source?: 'alpaca' | 'finnhub' | 'cached' | 'demo';
}

async function tryAlpaca(symbol: string): Promise<MarketData | null> {
  try {
    const { data, error } = await supabase.functions.invoke('alpaca-market-data', {
      body: { action: 'get_quote', symbol },
    });
    if (error || !data || data.error || !data.price) return null;
    return {
      symbol: data.symbol,
      price: data.price,
      change: data.change,
      changePercent: data.changePercent,
      volume: data.volume,
      timestamp: data.timestamp,
      open: data.open,
      high: data.high,
      low: data.low,
      close: data.price,
      type: 'realtime',
      isDemo: false,
      source: 'alpaca',
    };
  } catch {
    return null;
  }
}

async function tryFinnhub(symbol: string): Promise<MarketData | null> {
  try {
    const { data, error } = await supabase.functions.invoke('finnhub-websocket', {
      body: { action: 'get_quote', symbol },
    });
    if (error || !data) return null;
    const price = data.price ?? data.c;
    if (!price) return null;
    return {
      symbol: data.symbol || symbol,
      price,
      change: data.change ?? data.d ?? 0,
      changePercent: data.changePercent ?? data.dp ?? 0,
      volume: data.volume ?? 0,
      timestamp: data.timestamp ?? Date.now(),
      open: data.open ?? data.o ?? price,
      high: data.high ?? data.h ?? price,
      low: data.low ?? data.l ?? price,
      close: price,
      type: data.isDemo ? 'demo' : 'realtime',
      isDemo: !!data.isDemo,
      source: data.isDemo ? 'demo' : 'finnhub',
    };
  } catch {
    return null;
  }
}

export class MarketDataService {
  static async fetchLatestPrice(symbol: string): Promise<MarketData> {
    // 1) Alpaca first (paid-tier semantics, sandbox IEX feed)
    const alpaca = await tryAlpaca(symbol);
    if (alpaca) {
      supabase.from('market_data').upsert({
        symbol: alpaca.symbol,
        price: alpaca.price,
        open: alpaca.open,
        high: alpaca.high,
        low: alpaca.low,
        close: alpaca.close,
        timestamp: alpaca.timestamp,
        type: 'realtime',
      }).then(() => {});
      return alpaca;
    }

    // 2) Finnhub fallback
    const fh = await tryFinnhub(symbol);
    if (fh && !fh.isDemo) return fh;

    // 3) Last-known cached row from DB
    const { data: cachedData } = await supabase
      .from('market_data')
      .select('*')
      .eq('symbol', symbol)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

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
        isDemo: false,
        source: 'cached',
      };
    }

    // 4) Demo (clearly flagged)
    if (fh) return fh; // finnhub demo
    const mock = MockMarketDataService.getPrice(symbol);
    return { ...mock, type: 'demo', isDemo: true, source: 'demo' };
  }

  static async fetchHistoricalData(symbol: string, days: number): Promise<MarketData[]> {
    // Try Alpaca bars first
    try {
      const start = new Date(Date.now() - days * 86400000).toISOString();
      const { data, error } = await supabase.functions.invoke('alpaca-market-data', {
        body: { action: 'get_bars', symbol, timeframe: '1Day', limit: days, start },
      });
      if (!error && data?.bars?.length) {
        const bars: MarketData[] = data.bars.map((b: any) => ({
          symbol,
          price: b.close,
          timestamp: b.time,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
          volume: b.volume,
          type: 'historical',
          isDemo: false,
          source: 'alpaca',
        }));
        supabase.from('market_data').upsert(
          bars.map((item) => ({
            symbol: item.symbol,
            price: item.price,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            timestamp: item.timestamp,
            type: 'daily',
          })),
        ).then(() => {});
        return bars;
      }
    } catch (e) {
      console.warn('Alpaca bars failed, falling back', e);
    }

    // Fallback to cached
    const { data: cachedData } = await supabase
      .from('market_data')
      .select('*')
      .eq('symbol', symbol)
      .eq('type', 'daily')
      .order('timestamp', { ascending: true })
      .limit(days);

    if (cachedData && cachedData.length > 0) {
      return cachedData.map((item) => ({
        symbol: item.symbol,
        price: item.price,
        timestamp: item.timestamp,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: 0,
        type: 'cached',
        isDemo: false,
        source: 'cached',
      }));
    }

    return MockMarketDataService.getHistoricalData(symbol, days);
  }

  static async fetchMultipleLatestPrices(symbols: string[]): Promise<Array<{ symbol: string; price: number; change?: number; volume?: number; isDemo?: boolean; source?: string }>> {
    if (symbols.length === 0) return [];
    // Batch via Alpaca snapshots
    try {
      const { data, error } = await supabase.functions.invoke('alpaca-market-data', {
        body: { action: 'get_quotes', symbols },
      });
      if (!error && data?.quotes) {
        const out = Object.values(data.quotes) as Array<{ symbol: string; price: number; change?: number; volume?: number }>;
        const got = new Set(out.map((q) => q.symbol));
        const missing = symbols.filter((s) => !got.has(s));
        const fallback = await Promise.all(missing.map((s) => this.fetchLatestPrice(s)));
        return [
          ...out.map((q) => ({ ...q, isDemo: false, source: 'alpaca' })),
          ...fallback.map((q) => ({ symbol: q.symbol, price: q.price, change: q.change, volume: q.volume, isDemo: q.isDemo, source: q.source })),
        ];
      }
    } catch (e) {
      console.warn('Alpaca batch quotes failed', e);
    }
    // Per-symbol fallback
    const results = await Promise.allSettled(symbols.map((s) => this.fetchLatestPrice(s)));
    return results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => {
        const d = (r as PromiseFulfilledResult<MarketData>).value;
        return { symbol: d.symbol, price: d.price, change: d.change, volume: d.volume, isDemo: d.isDemo, source: d.source };
      });
  }
}
