// Local indicator math for the pro chart. Pure functions over candle arrays —
// every value is computed from the chart's own candles, nothing is fetched.

export interface CandleLike {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface LinePoint {
  time: number;
  value: number;
}

const closes = (c: CandleLike[]) => c.map((x) => x.close);

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { out.push(null); continue; }
    if (prev === null) {
      let s = 0;
      for (let j = i - period + 1; j <= i; j++) s += values[j];
      prev = s / period;
    } else {
      prev = values[i] * k + prev * (1 - k);
    }
    out.push(prev);
  }
  return out;
}

function toPoints(candles: CandleLike[], series: (number | null)[]): LinePoint[] {
  const out: LinePoint[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (series[i] !== null && series[i] !== undefined && isFinite(series[i] as number)) {
      out.push({ time: candles[i].time, value: series[i] as number });
    }
  }
  return out;
}

export const smaLine = (c: CandleLike[], p: number) => toPoints(c, sma(closes(c), p));
export const emaLine = (c: CandleLike[], p: number) => toPoints(c, ema(closes(c), p));
export const volumeMa = (c: CandleLike[], p: number) => toPoints(c, sma(c.map((x) => x.volume), p));

export function bollinger(c: CandleLike[], period = 20, mult = 2): { upper: LinePoint[]; mid: LinePoint[]; lower: LinePoint[] } {
  const vals = closes(c);
  const mid = sma(vals, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < vals.length; i++) {
    if (mid[i] === null) { upper.push(null); lower.push(null); continue; }
    let sq = 0;
    for (let j = i - period + 1; j <= i; j++) sq += (vals[j] - (mid[i] as number)) ** 2;
    const sd = Math.sqrt(sq / period);
    upper.push((mid[i] as number) + mult * sd);
    lower.push((mid[i] as number) - mult * sd);
  }
  return { upper: toPoints(c, upper), mid: toPoints(c, mid), lower: toPoints(c, lower) };
}

export function vwap(c: CandleLike[]): LinePoint[] {
  const out: LinePoint[] = [];
  let pv = 0;
  let v = 0;
  for (const x of c) {
    const tp = (x.high + x.low + x.close) / 3;
    pv += tp * x.volume;
    v += x.volume;
    if (v > 0) out.push({ time: x.time, value: pv / v });
  }
  return out;
}

export function rsi(c: CandleLike[], period = 14): LinePoint[] {
  const vals = closes(c);
  const out: (number | null)[] = new Array(vals.length).fill(null);
  if (vals.length <= period) return [];
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = vals[i] - vals[i - 1];
    if (d > 0) gain += d; else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < vals.length; i++) {
    const d = vals[i] - vals[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return toPoints(c, out);
}

export function macd(c: CandleLike[], fast = 12, slow = 26, signal = 9): { macd: LinePoint[]; signal: LinePoint[]; hist: { time: number; value: number; color: string }[] } {
  const vals = closes(c);
  const ef = ema(vals, fast);
  const es = ema(vals, slow);
  const line: (number | null)[] = vals.map((_, i) => (ef[i] !== null && es[i] !== null ? (ef[i] as number) - (es[i] as number) : null));
  const compact = line.filter((x) => x !== null) as number[];
  const sigCompact = ema(compact, signal);
  const sig: (number | null)[] = new Array(vals.length).fill(null);
  let k = 0;
  for (let i = 0; i < vals.length; i++) {
    if (line[i] !== null) { sig[i] = sigCompact[k]; k++; }
  }
  const hist: { time: number; value: number; color: string }[] = [];
  for (let i = 0; i < c.length; i++) {
    if (line[i] !== null && sig[i] !== null) {
      const v = (line[i] as number) - (sig[i] as number);
      hist.push({ time: c[i].time, value: v, color: v >= 0 ? 'rgba(14,203,129,0.55)' : 'rgba(246,70,93,0.55)' });
    }
  }
  return { macd: toPoints(c, line), signal: toPoints(c, sig), hist };
}

export function stochastic(c: CandleLike[], kPeriod = 14, dPeriod = 3): { k: LinePoint[]; d: LinePoint[] } {
  const rawK: (number | null)[] = [];
  for (let i = 0; i < c.length; i++) {
    if (i < kPeriod - 1) { rawK.push(null); continue; }
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) { hh = Math.max(hh, c[j].high); ll = Math.min(ll, c[j].low); }
    rawK.push(hh === ll ? 50 : ((c[i].close - ll) / (hh - ll)) * 100);
  }
  const kSmooth = sma(rawK.map((x) => x ?? NaN), dPeriod).map((x, i) => (rawK[i] === null ? null : x));
  // sma over NaN-prefixed data poisons early values; recompute %K smoothing directly
  const kVals: (number | null)[] = rawK.map((x, i) => {
    if (x === null) return null;
    if (i < kPeriod - 1 + dPeriod - 1) return x;
    let s = 0;
    for (let j = i - dPeriod + 1; j <= i; j++) s += rawK[j] as number;
    return s / dPeriod;
  });
  void kSmooth;
  const dVals: (number | null)[] = kVals.map((x, i) => {
    if (x === null || i < 2) return x;
    const a = kVals[i - 2]; const b = kVals[i - 1];
    if (a === null || b === null) return x;
    return (a + b + x) / 3;
  });
  return { k: toPoints(c, kVals), d: toPoints(c, dVals) };
}

export function atr(c: CandleLike[], period = 14): LinePoint[] {
  const tr: number[] = c.map((x, i) => {
    if (i === 0) return x.high - x.low;
    const pc = c[i - 1].close;
    return Math.max(x.high - x.low, Math.abs(x.high - pc), Math.abs(x.low - pc));
  });
  return toPoints(c, ema(tr, period));
}

export function ichimoku(c: CandleLike[], tenkanP = 9, kijunP = 26, senkouP = 52): {
  tenkan: LinePoint[]; kijun: LinePoint[]; senkouA: LinePoint[]; senkouB: LinePoint[]; chikou: LinePoint[];
} {
  const mid = (i: number, p: number): number | null => {
    if (i < p - 1) return null;
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - p + 1; j <= i; j++) { hh = Math.max(hh, c[j].high); ll = Math.min(ll, c[j].low); }
    return (hh + ll) / 2;
  };
  const tenkan: (number | null)[] = c.map((_, i) => mid(i, tenkanP));
  const kijun: (number | null)[] = c.map((_, i) => mid(i, kijunP));
  const senkouA: LinePoint[] = [];
  const senkouB: LinePoint[] = [];
  // Senkou spans are plotted 26 periods ahead — shift by re-dating points.
  for (let i = 0; i < c.length; i++) {
    const t = tenkan[i]; const kj = kijun[i];
    const shiftedTime = i + kijunP < c.length ? c[i + kijunP].time : c[c.length - 1].time + (i + kijunP - (c.length - 1)) * (c.length > 1 ? c[1].time - c[0].time : 60);
    if (t !== null && kj !== null) senkouA.push({ time: shiftedTime, value: (t + kj) / 2 });
    const sb = mid(i, senkouP);
    if (sb !== null) senkouB.push({ time: shiftedTime, value: sb });
  }
  const chikou: LinePoint[] = [];
  for (let i = kijunP; i < c.length; i++) chikou.push({ time: c[i - kijunP].time, value: c[i].close });
  return { tenkan: toPoints(c, tenkan), kijun: toPoints(c, kijun), senkouA, senkouB, chikou };
}

export function heikinAshi(c: CandleLike[]): CandleLike[] {
  const out: CandleLike[] = [];
  for (let i = 0; i < c.length; i++) {
    const x = c[i];
    const close = (x.open + x.high + x.low + x.close) / 4;
    const open = i === 0 ? (x.open + x.close) / 2 : (out[i - 1].open + out[i - 1].close) / 2;
    out.push({
      time: x.time,
      open,
      close,
      high: Math.max(x.high, open, close),
      low: Math.min(x.low, open, close),
      volume: x.volume,
    });
  }
  return out;
}
