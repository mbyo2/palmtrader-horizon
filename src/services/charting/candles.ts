// Candle resolution for the pro chart, per venue/mode:
// - Demo mode: the demo market's own seeded series (generateCandles) — the
//   same walk that prices the whole demo app, last close = live price.
// - Signed-in: real candles from the finnhub-websocket edge function
//   (get_candles). On failure we return an error — never fabricated candles.

import { supabase } from '@/integrations/supabase/client';
import { isDemoSync } from '@/services/demo/DemoBackend';
import { generateCandles, getPrice } from '@/services/demo/demoMarket';
import type { CandleLike } from './indicators';

export interface TimeframeDef {
  id: string;
  label: string;
  seconds: number;
  finnhubResolution: string;
  count: number;
}

export const TIMEFRAMES: TimeframeDef[] = [
  { id: '1m', label: '1m', seconds: 60, finnhubResolution: '1', count: 300 },
  { id: '5m', label: '5m', seconds: 300, finnhubResolution: '5', count: 300 },
  { id: '15m', label: '15m', seconds: 900, finnhubResolution: '15', count: 300 },
  { id: '1h', label: '1h', seconds: 3600, finnhubResolution: '60', count: 300 },
  { id: '4h', label: '4h', seconds: 14400, finnhubResolution: '240', count: 220 },
  { id: '1D', label: '1D', seconds: 86400, finnhubResolution: 'D', count: 180 },
  { id: '1W', label: '1W', seconds: 604800, finnhubResolution: 'W', count: 104 },
  { id: '1M', label: '1M', seconds: 2592000, finnhubResolution: 'M', count: 60 },
];

export const getTimeframe = (id: string): TimeframeDef =>
  TIMEFRAMES.find((t) => t.id === id) ?? TIMEFRAMES[3];

export interface CandleResult {
  candles: CandleLike[];
  source: 'demo' | 'finnhub';
  error?: string;
}

/** The symbol the candle backend understands: pair ids → base asset for Finnhub. */
function finnhubSymbol(instrument: string): string {
  if (instrument.includes('-')) return instrument.split('-')[0].toUpperCase();
  return instrument.toUpperCase();
}

export async function fetchCandles(instrument: string, tfId: string): Promise<CandleResult> {
  const tf = getTimeframe(tfId);
  if (isDemoSync()) {
    return { candles: generateCandles(instrument, tf.seconds, tf.count), source: 'demo' };
  }
  try {
    const to = Math.floor(Date.now() / 1000);
    const from = to - tf.seconds * tf.count;
    const { data, error } = await supabase.functions.invoke('finnhub-websocket', {
      body: { action: 'get_candles', symbol: finnhubSymbol(instrument), resolution: tf.finnhubResolution, from, to },
    });
    if (error) throw new Error(error.message);
    const raw: any[] = data?.candles ?? [];
    const candles: CandleLike[] = raw
      .map((c) => {
        const t = Number(c.time ?? c.t ?? 0);
        return {
          time: t > 1e12 ? Math.floor(t / 1000) : t,
          open: Number(c.open), high: Number(c.high), low: Number(c.low), close: Number(c.close),
          volume: Number(c.volume ?? 0),
        };
      })
      .filter((c) => c.time > 0 && isFinite(c.close) && c.close > 0)
      .sort((a, b) => a.time - b.time);
    if (candles.length === 0) return { candles: [], source: 'finnhub', error: 'No candle data returned for this symbol and timeframe.' };
    return { candles, source: 'finnhub' };
  } catch (e: any) {
    return { candles: [], source: 'finnhub', error: e?.message ?? 'Could not load chart data.' };
  }
}

/** Live price for tail updates; demo reads the engine, signed-in returns null (caller refetches). */
export function livePrice(instrument: string): number | null {
  if (isDemoSync()) return getPrice(instrument) || null;
  return null;
}
