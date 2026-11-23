import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart, ColorType, CrosshairMode,
  CandlestickSeries, BarSeries, LineSeries, AreaSeries, BaselineSeries, HistogramSeries,
  type IChartApi, type ISeriesApi, type Time,
} from 'lightweight-charts';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Bell, Camera, Eraser, Minus, MoveDiagonal, PenLine, Square, Type, TrendingUp, Trash2, ChartLine,
} from 'lucide-react';
import { TIMEFRAMES, getTimeframe, fetchCandles, livePrice } from '@/services/charting/candles';
import {
  smaLine, emaLine, bollinger, vwap, rsi, macd, stochastic, atr, ichimoku, heikinAshi, volumeMa,
  type CandleLike,
} from '@/services/charting/indicators';
import { subscribePrices } from '@/services/demo/demoMarket';
import { isDemoSync } from '@/services/demo/DemoBackend';
import { DemoAlerts } from '@/services/demo/demoStocks';
import { supabase } from '@/integrations/supabase/client';

// ---------------------------------------------------------------------------
// Drawings
// ---------------------------------------------------------------------------
type Tool = 'none' | 'trend' | 'hline' | 'ray' | 'fib' | 'rect' | 'text' | 'eraser';
interface DPoint { time: number; price: number }
interface Drawing { id: string; type: Exclude<Tool, 'none' | 'eraser'>; points: DPoint[]; text?: string }

const drawingsKey = (instrument: string) => `palmcacia:drawings:${instrument.toUpperCase()}`;
function loadDrawings(instrument: string): Drawing[] {
  try { return JSON.parse(localStorage.getItem(drawingsKey(instrument)) ?? '[]'); } catch { return []; }
}
function saveDrawings(instrument: string, d: Drawing[]) {
  try { localStorage.setItem(drawingsKey(instrument), JSON.stringify(d)); } catch { /* storage full/blocked */ }
}

type ChartType = 'candles' | 'bars' | 'line' | 'area' | 'heikin' | 'baseline';
const CHART_TYPES: { id: ChartType; label: string }[] = [
  { id: 'candles', label: 'Candles' },
  { id: 'bars', label: 'Bars' },
  { id: 'line', label: 'Line' },
  { id: 'area', label: 'Area' },
  { id: 'heikin', label: 'Heikin-Ashi' },
  { id: 'baseline', label: 'Baseline' },
];

interface IndicatorConfig {
  sma: boolean; smaPeriod: number;
  ema: boolean; emaPeriod: number;
  vwap: boolean;
  bollinger: boolean;
  ichimoku: boolean;
  volume: boolean;
  rsi: boolean; macd: boolean; stoch: boolean; atr: boolean;
}
const DEFAULT_INDICATORS: IndicatorConfig = {
  sma: false, smaPeriod: 20, ema: false, emaPeriod: 50, vwap: false,
  bollinger: false, ichimoku: false, volume: true, rsi: false, macd: false, stoch: false, atr: false,
};

const UP = '#0ECB81';
const DOWN = '#F6465D';
const fmt = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: v < 0.1 ? 6 : v < 10 ? 4 : 2, minimumFractionDigits: v < 0.1 ? 2 : 2 });

interface ProChartProps {
  instrument: string;
  height?: number;
  onPriceUpdate?: (price: number) => void;
}

export const ProChart: React.FC<ProChartProps> = ({ instrument, height = 460, onPriceUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartHostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const overlaySeriesRef = useRef<ISeriesApi<any>[]>([]);
  const subSeriesRef = useRef<ISeriesApi<any>[]>([]);
  const candlesRef = useRef<CandleLike[]>([]);

  const [tf, setTf] = useState('1h');
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [ind, setInd] = useState<IndicatorConfig>(DEFAULT_INDICATORS);
  const [tool, setTool] = useState<Tool>('none');
  const [drawings, setDrawings] = useState<Drawing[]>(() => loadDrawings(instrument));
  const [pending, setPending] = useState<DPoint | null>(null);
  const [overlayTick, setOverlayTick] = useState(0);
  const [legend, setLegend] = useState<CandleLike | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'demo' | 'finnhub'>('demo');
  const [alertPrice, setAlertPrice] = useState('');
  const [alertOpen, setAlertOpen] = useState(false);

  const tfDef = getTimeframe(tf);
  const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  useEffect(() => { setDrawings(loadDrawings(instrument)); setPending(null); }, [instrument]);
  useEffect(() => { saveDrawings(instrument, drawings); }, [instrument, drawings]);

  // ---- data load -----------------------------------------------------------
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchCandles(instrument, tf);
    candlesRef.current = res.candles;
    setSource(res.source);
    if (res.error) setError(res.error);
    if (res.candles.length > 0) {
      setLegend(res.candles[res.candles.length - 1]);
      onPriceUpdate?.(res.candles[res.candles.length - 1].close);
    }
    setLoading(false);
    setOverlayTick((t) => t + 1);
  }, [instrument, tf]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  // signed-in intraday refresh
  useEffect(() => {
    if (isDemoSync() || tfDef.seconds > 900) return;
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load, tfDef.seconds]);

  // ---- chart creation ------------------------------------------------------
  useEffect(() => {
    if (!chartHostRef.current) return;
    const chart = createChart(chartHostRef.current, {
      width: chartHostRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: dark ? '#848E9C' : '#2B3139',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: dark ? '#1E2329' : '#EAECEF' },
        horzLines: { color: dark ? '#1E2329' : '#EAECEF' },
      },
      rightPriceScale: { borderColor: dark ? '#2B3139' : '#EAECEF' },
      timeScale: { borderColor: dark ? '#2B3139' : '#EAECEF', timeVisible: tfDef.seconds < 86400, secondsVisible: false },
      crosshair: { mode: CrosshairMode.Normal },
    });
    chartRef.current = chart;
    const bump = () => setOverlayTick((t) => t + 1);
    chart.timeScale().subscribeVisibleLogicalRangeChange(bump);
    chart.subscribeCrosshairMove((param) => {
      bump();
      if (!param.time) return;
      const t = param.time as number;
      const c = candlesRef.current.find((x) => x.time === t);
      if (c) setLegend(c);
    });
    const onResize = () => {
      if (chartHostRef.current) chart.applyOptions({ width: chartHostRef.current.clientWidth });
      bump();
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      overlaySeriesRef.current = [];
      subSeriesRef.current = [];
    };
  }, [height, dark]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    chartRef.current?.timeScale().applyOptions({ timeVisible: tfDef.seconds < 86400 });
  }, [tfDef.seconds]);

  // ---- main + overlay series ----------------------------------------------
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || loading) return;
    const candles = candlesRef.current;
    const savedRange = chart.timeScale().getVisibleLogicalRange();
    if (mainSeriesRef.current) { try { chart.removeSeries(mainSeriesRef.current); } catch { /* already gone */ } mainSeriesRef.current = null; }
    overlaySeriesRef.current.forEach((s) => { try { chart.removeSeries(s); } catch { /* noop */ } });
    overlaySeriesRef.current = [];
    if (candles.length === 0) return;

    const display = chartType === 'heikin' ? heikinAshi(candles) : candles;
    const candleData = display.map((c) => ({ time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close }));
    let main: ISeriesApi<any>;
    if (chartType === 'candles' || chartType === 'heikin') {
      main = chart.addSeries(CandlestickSeries, { upColor: UP, downColor: DOWN, borderVisible: false, wickUpColor: UP, wickDownColor: DOWN });
      main.setData(candleData);
    } else if (chartType === 'bars') {
      main = chart.addSeries(BarSeries, { upColor: UP, downColor: DOWN });
      main.setData(candleData);
    } else if (chartType === 'line') {
      main = chart.addSeries(LineSeries, { color: '#F0B90B', lineWidth: 2 });
      main.setData(display.map((c) => ({ time: c.time as Time, value: c.close })));
    } else if (chartType === 'area') {
      main = chart.addSeries(AreaSeries, { lineColor: '#F0B90B', topColor: 'rgba(240,185,11,0.28)', bottomColor: 'rgba(240,185,11,0.02)', lineWidth: 2 });
      main.setData(display.map((c) => ({ time: c.time as Time, value: c.close })));
    } else {
      main = chart.addSeries(BaselineSeries, {
        baseValue: { type: 'price', price: display[0].close },
        topLineColor: UP, topFillColor1: 'rgba(14,203,129,0.28)', topFillColor2: 'rgba(14,203,129,0.02)',
        bottomLineColor: DOWN, bottomFillColor1: 'rgba(246,70,93,0.02)', bottomFillColor2: 'rgba(246,70,93,0.28)',
        lineWidth: 2,
      });
      main.setData(display.map((c) => ({ time: c.time as Time, value: c.close })));
    }
    mainSeriesRef.current = main;

    const addLine = (data: { time: number; value: number }[], color: string, width: 1 | 2 = 1, dashed = false) => {
      if (data.length === 0) return;
      const s = chart.addSeries(LineSeries, {
        color, lineWidth: width, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
        lineStyle: dashed ? 2 : 0,
      });
      s.setData(data.map((p) => ({ time: p.time as Time, value: p.value })));
      overlaySeriesRef.current.push(s);
    };

    if (ind.sma) addLine(smaLine(candles, ind.smaPeriod), '#F0B90B', 1);
    if (ind.ema) addLine(emaLine(candles, ind.emaPeriod), '#B18CFF', 1);
    if (ind.vwap) addLine(vwap(candles), '#4FC3F7', 1, true);
    if (ind.bollinger) {
      const b = bollinger(candles);
      addLine(b.upper, '#5B8DEF'); addLine(b.mid, '#5B8DEF', 1, true); addLine(b.lower, '#5B8DEF');
    }
    if (ind.ichimoku) {
      const i = ichimoku(candles);
      addLine(i.tenkan, '#0497D1'); addLine(i.kijun, '#B8336A');
      addLine(i.senkouA, 'rgba(14,203,129,0.6)'); addLine(i.senkouB, 'rgba(246,70,93,0.6)');
      addLine(i.chikou, 'rgba(132,142,156,0.7)', 1, true);
    }
    if (ind.volume) {
      const vol = chart.addSeries(HistogramSeries, { priceScaleId: 'vol', priceFormat: { type: 'volume' }, lastValueVisible: false, priceLineVisible: false });
      chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });
      main.applyOptions({ scaleMargins: undefined });
      chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.06, bottom: 0.18 } });
      vol.setData(candles.map((c) => ({
        time: c.time as Time, value: c.volume,
        color: c.close >= c.open ? 'rgba(14,203,129,0.45)' : 'rgba(246,70,93,0.45)',
      })));
      overlaySeriesRef.current.push(vol);
      const vma = volumeMa(candles, 20);
      if (vma.length) {
        const s = chart.addSeries(LineSeries, { priceScaleId: 'vol', color: 'rgba(240,185,11,0.8)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        s.setData(vma.map((p) => ({ time: p.time as Time, value: p.value })));
        overlaySeriesRef.current.push(s);
      }
    } else {
      chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.06, bottom: 0.02 } });
    }

    if (savedRange) chart.timeScale().setVisibleLogicalRange(savedRange);
    else chart.timeScale().fitContent();
    setOverlayTick((t) => t + 1);
  }, [candlesRef.current, chartType, ind, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- sub panes (RSI / MACD / Stochastic / ATR) ---------------------------
  const subList = useMemo(() => {
    const l: string[] = [];
    if (ind.rsi) l.push('rsi');
    if (ind.macd) l.push('macd');
    if (ind.stoch) l.push('stoch');
    if (ind.atr) l.push('atr');
    return l;
  }, [ind]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || loading) return;
    const candles = candlesRef.current;
    subSeriesRef.current.forEach((s) => { try { chart.removeSeries(s); } catch { /* noop */ } });
    subSeriesRef.current = [];
    while (chart.panes().length > 1) chart.removePane(1);
    if (candles.length === 0) return;
    const savedRange = chart.timeScale().getVisibleLogicalRange();
    subList.forEach((key) => {
      const paneIndex = chart.panes().length;
      chart.addPane();
      const addSub = (def: any, data: any[], opts: Record<string, unknown> = {}) => {
        const s = chart.addSeries(def, { priceLineVisible: false, lastValueVisible: true, ...opts }, paneIndex);
        s.setData(data);
        subSeriesRef.current.push(s);
      };
      if (key === 'rsi') {
        addSub(LineSeries, rsi(candles).map((p) => ({ time: p.time as Time, value: p.value })), { color: '#B18CFF' });
      } else if (key === 'macd') {
        const m = macd(candles);
        addSub(HistogramSeries, m.hist.map((p) => ({ time: p.time as Time, value: p.value, color: p.color })));
        addSub(LineSeries, m.macd.map((p) => ({ time: p.time as Time, value: p.value })), { color: '#4FC3F7' });
        addSub(LineSeries, m.signal.map((p) => ({ time: p.time as Time, value: p.value })), { color: '#F0B90B' });
      } else if (key === 'stoch') {
        const s = stochastic(candles);
        addSub(LineSeries, s.k.map((p) => ({ time: p.time as Time, value: p.value })), { color: '#4FC3F7' });
        addSub(LineSeries, s.d.map((p) => ({ time: p.time as Time, value: p.value })), { color: '#F6465D' });
      } else if (key === 'atr') {
        addSub(LineSeries, atr(candles).map((p) => ({ time: p.time as Time, value: p.value })), { color: '#FF9800' });
      }
      const pane = chart.panes()[paneIndex];
      pane?.setHeight(Math.max(70, Math.floor(height / 5)));
    });
    if (savedRange) chart.timeScale().setVisibleLogicalRange(savedRange);
    setOverlayTick((t) => t + 1);
  }, [subList, loading, height]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- live tail (demo) ----------------------------------------------------
  useEffect(() => {
    if (!isDemoSync()) return;
    return subscribePrices(() => {
      const px = livePrice(instrument);
      const chart = chartRef.current;
      const main = mainSeriesRef.current;
      if (!px || !chart || !main || candlesRef.current.length === 0) return;
      const candles = candlesRef.current;
      const bucket = Math.floor(Date.now() / 1000 / tfDef.seconds) * tfDef.seconds;
      let last = candles[candles.length - 1];
      if (bucket > last.time) {
        last = { time: bucket, open: last.close, high: Math.max(last.close, px), low: Math.min(last.close, px), close: px, volume: 0 };
        candles.push(last);
      } else {
        last.close = px;
        last.high = Math.max(last.high, px);
        last.low = Math.min(last.low, px);
      }
      const display = chartType === 'heikin' ? heikinAshi(candles)[candles.length - 1] : last;
      try {
        if (chartType === 'candles' || chartType === 'heikin' || chartType === 'bars') {
          main.update({ time: last.time as Time, open: display.open, high: display.high, low: display.low, close: display.close });
        } else {
          main.update({ time: last.time as Time, value: last.close });
        }
      } catch { /* series replaced mid-update */ }
      setLegend((prev) => (prev && prev.time === last.time ? { ...last } : prev));
      onPriceUpdate?.(px);
    });
  }, [instrument, tfDef.seconds, chartType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- drawings overlay ----------------------------------------------------
  const pointToXY = useCallback((p: DPoint): { x: number; y: number } | null => {
    const chart = chartRef.current;
    const main = mainSeriesRef.current;
    if (!chart || !main) return null;
    const candles = candlesRef.current;
    if (candles.length === 0) return null;
    const logical = (p.time - candles[0].time) / tfDef.seconds;
    const x = chart.timeScale().logicalToCoordinate(logical as any);
    const y = main.priceToCoordinate(p.price);
    if (x === null || y === null) return null;
    return { x, y };
  }, [tfDef.seconds, overlayTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const xyToPoint = useCallback((x: number, y: number): DPoint | null => {
    const chart = chartRef.current;
    const main = mainSeriesRef.current;
    if (!chart || !main) return null;
    const candles = candlesRef.current;
    if (candles.length === 0) return null;
    const logical = chart.timeScale().coordinateToLogical(x);
    const price = main.coordinateToPrice(y);
    if (logical === null || price === null) return null;
    return { time: candles[0].time + Math.round(logical) * tfDef.seconds, price };
  }, [tfDef.seconds]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tool === 'none') return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (tool === 'eraser') {
      const hit = drawings.find((d) => d.points.some((p) => {
        const xy = pointToXY(p);
        return xy && Math.hypot(xy.x - x, xy.y - y) < 12;
      }));
      if (hit) { setDrawings((ds) => ds.filter((d) => d.id !== hit.id)); toast.success('Drawing removed'); }
      return;
    }
    const pt = xyToPoint(x, y);
    if (!pt) return;
    if (tool === 'hline') {
      setDrawings((ds) => [...ds, { id: `d${Date.now()}`, type: 'hline', points: [pt] }]);
      setTool('none');
      return;
    }
    if (tool === 'text') {
      const text = window.prompt('Note text:');
      if (text) setDrawings((ds) => [...ds, { id: `d${Date.now()}`, type: 'text', points: [pt], text }]);
      setTool('none');
      return;
    }
    if (!pending) { setPending(pt); return; }
    setDrawings((ds) => [...ds, { id: `d${Date.now()}`, type: tool, points: [pending, pt] }]);
    setPending(null);
    setTool('none');
  };

  const renderDrawings = () => {
    const els: React.ReactNode[] = [];
    const chart = chartRef.current;
    const width = chartHostRef.current?.clientWidth ?? 0;
    const all = pending ? [...drawings, { id: 'pending', type: tool as Drawing['type'], points: [pending] }] : drawings;
    for (const d of all) {
      const pts = d.points.map(pointToXY);
      if (pts.some((p) => p === null)) continue;
      const [a, b] = pts as { x: number; y: number }[];
      const key = d.id;
      if (d.type === 'hline' && a) {
        els.push(<line key={key} x1={0} y1={a.y} x2={width} y2={a.y} stroke="#F0B90B" strokeWidth={1} strokeDasharray="5 4" />);
        els.push(<text key={`${key}-t`} x={6} y={a.y - 4} fill="#F0B90B" fontSize={10}>{fmt(d.points[0].price)}</text>);
      } else if (d.type === 'trend' && a && b) {
        els.push(<line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#4FC3F7" strokeWidth={1.5} />);
        els.push(<circle key={`${key}-a`} cx={a.x} cy={a.y} r={3} fill="#4FC3F7" />);
        els.push(<circle key={`${key}-b`} cx={b.x} cy={b.y} r={3} fill="#4FC3F7" />);
      } else if (d.type === 'ray' && a && b) {
        const dx = b.x - a.x; const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const ex = a.x + (dx / len) * (width + 200);
        const ey = a.y + (dy / len) * (width + 200);
        els.push(<line key={key} x1={a.x} y1={a.y} x2={ex} y2={ey} stroke="#B18CFF" strokeWidth={1.5} />);
        els.push(<circle key={`${key}-a`} cx={a.x} cy={a.y} r={3} fill="#B18CFF" />);
      } else if (d.type === 'rect' && a && b) {
        els.push(<rect key={key} x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)} width={Math.abs(b.x - a.x)} height={Math.abs(b.y - a.y)} fill="rgba(79,195,247,0.12)" stroke="#4FC3F7" strokeWidth={1} />);
      } else if (d.type === 'fib' && a && b) {
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        els.push(<line key={`${key}-v`} x1={a.x} y1={a.y} x2={a.x} y2={b.y} stroke="#848E9C" strokeWidth={1} strokeDasharray="3 3" />);
        levels.forEach((lv) => {
          const y = a.y + (b.y - a.y) * lv;
          const price = d.points[0].price + (d.points[1].price - d.points[0].price) * lv;
          els.push(<line key={`${key}-${lv}`} x1={Math.min(a.x, b.x)} y1={y} x2={Math.max(a.x, b.x)} y2={y} stroke="#F0B90B" strokeWidth={1} opacity={0.75} />);
          els.push(<text key={`${key}-${lv}-t`} x={Math.min(a.x, b.x) + 4} y={y - 3} fill="#F0B90B" fontSize={10}>{(lv * 100).toFixed(1)}% · {fmt(price)}</text>);
        });
      } else if (d.type === 'text' && a) {
        els.push(<circle key={`${key}-c`} cx={a.x} cy={a.y} r={3} fill="#F0B90B" />);
        els.push(<text key={key} x={a.x + 6} y={a.y + 3} fill={dark ? '#EAECEF' : '#1E2329'} fontSize={11}>{d.text}</text>);
      } else if (a) {
        els.push(<circle key={key} cx={a.x} cy={a.y} r={4} fill="#F0B90B" />);
      }
    }
    void chart;
    return els;
  };

  // ---- alerts ---------------------------------------------------------------
  const createAlert = async () => {
    const px = parseFloat(alertPrice);
    if (!px || px <= 0) { toast.error('Enter a valid alert price'); return; }
    const last = candlesRef.current[candlesRef.current.length - 1]?.close ?? px;
    const condition: 'above' | 'below' = px >= last ? 'above' : 'below';
    try {
      if (isDemoSync()) {
        DemoAlerts.create(instrument, px, condition);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { toast.error('Sign in to create alerts'); return; }
        const { error: insErr } = await supabase.from('price_alerts').insert({
          user_id: user.id, symbol: instrument.toUpperCase(), target_price: px, condition,
        });
        if (insErr) throw insErr;
      }
      toast.success(`Alert set: ${instrument} ${condition} ${fmt(px)}`);
      setAlertOpen(false);
    } catch {
      toast.error('Could not create the alert');
    }
  };

  const takeScreenshot = () => {
    const chart = chartRef.current;
    if (!chart) return;
    const canvas = chart.takeScreenshot();
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${instrument.replace(/[^A-Za-z0-9]/g, '')}-${tf}.png`;
    a.click();
  };

  const legendChange = legend && candlesRef.current.length > 1
    ? ((legend.close - legend.open) / legend.open) * 100
    : 0;

  const toolBtn = (t: Tool, icon: React.ReactNode, label: string) => (
    <Button
      key={t} size="sm" variant={tool === t ? 'default' : 'ghost'}
      className="h-7 px-2 text-xs" title={label}
      onClick={() => { setTool(tool === t ? 'none' : t); setPending(null); }}
    >{icon}</Button>
  );

  return (
    <div className="w-full min-w-0">
      {/* Toolbar row 1: timeframes + chart type */}
      <div className="flex items-center gap-1 flex-wrap mb-1">
        {TIMEFRAMES.map((t) => (
          <Button key={t.id} size="sm" variant={tf === t.id ? 'default' : 'ghost'} className="h-7 px-2 text-xs" onClick={() => setTf(t.id)}>
            {t.label}
          </Button>
        ))}
        <span className="mx-1 h-4 w-px bg-border" />
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1"><ChartLine className="h-3.5 w-3.5" />{CHART_TYPES.find((c) => c.id === chartType)?.label}</Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-1" align="start">
            {CHART_TYPES.map((c) => (
              <button key={c.id} className={cn('w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted', chartType === c.id && 'bg-muted font-medium')} onClick={() => setChartType(c.id)}>
                {c.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">Indicators</Button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-3 space-y-2" align="start">
            {([
              ['sma', 'SMA'], ['ema', 'EMA'], ['vwap', 'VWAP'], ['bollinger', 'Bollinger Bands (20, 2)'],
              ['ichimoku', 'Ichimoku Cloud'], ['volume', 'Volume + MA(20)'],
              ['rsi', 'RSI (14)'], ['macd', 'MACD (12, 26, 9)'], ['stoch', 'Stochastic (14, 3)'], ['atr', 'ATR (14)'],
            ] as [keyof IndicatorConfig, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-2 text-xs cursor-pointer">
                <span>{label}</span>
                <input type="checkbox" checked={!!ind[key]} onChange={(e) => setInd((s) => ({ ...s, [key]: e.target.checked }))} className="accent-[#F0B90B]" />
              </label>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">SMA period</span>
              <Input type="number" className="h-7 w-16 text-xs" value={ind.smaPeriod} min={2} max={400}
                onChange={(e) => setInd((s) => ({ ...s, smaPeriod: Math.max(2, parseInt(e.target.value) || 20) }))} />
              <span className="text-xs text-muted-foreground">EMA</span>
              <Input type="number" className="h-7 w-16 text-xs" value={ind.emaPeriod} min={2} max={400}
                onChange={(e) => setInd((s) => ({ ...s, emaPeriod: Math.max(2, parseInt(e.target.value) || 50) }))} />
            </div>
          </PopoverContent>
        </Popover>
        <span className="mx-1 h-4 w-px bg-border" />
        {toolBtn('trend', <TrendingUp className="h-3.5 w-3.5" />, 'Trend line')}
        {toolBtn('hline', <Minus className="h-3.5 w-3.5" />, 'Horizontal line')}
        {toolBtn('ray', <MoveDiagonal className="h-3.5 w-3.5" />, 'Ray')}
        {toolBtn('fib', <PenLine className="h-3.5 w-3.5" />, 'Fibonacci retracement')}
        {toolBtn('rect', <Square className="h-3.5 w-3.5" />, 'Rectangle')}
        {toolBtn('text', <Type className="h-3.5 w-3.5" />, 'Text note')}
        {toolBtn('eraser', <Eraser className="h-3.5 w-3.5" />, 'Erase a drawing')}
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" title="Clear all drawings"
          onClick={() => { setDrawings([]); setPending(null); }}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
        <span className="mx-1 h-4 w-px bg-border" />
        <Popover open={alertOpen} onOpenChange={(o) => { setAlertOpen(o); if (o) setAlertPrice(String(candlesRef.current[candlesRef.current.length - 1]?.close ?? '')); }}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1"><Bell className="h-3.5 w-3.5" />Alert</Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3 space-y-2" align="start">
            <div className="text-xs font-medium">Price alert — {instrument}</div>
            <Input type="number" className="h-8 text-xs" value={alertPrice} onChange={(e) => setAlertPrice(e.target.value)} placeholder="Alert price" />
            <Button size="sm" className="w-full h-8 text-xs" onClick={createAlert}>Create alert</Button>
          </PopoverContent>
        </Popover>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" title="Export chart PNG" onClick={takeScreenshot}>
          <Camera className="h-3.5 w-3.5" />
        </Button>
        <span className="ml-auto text-[11px] text-muted-foreground">{source === 'demo' ? 'Demo market data' : 'Live market data'}</span>
      </div>

      {/* Crosshair legend */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground h-5 flex-wrap">
        <span className="font-medium text-foreground">{instrument}</span>
        <span>{tfDef.label}</span>
        {legend && (
          <>
            <span>O <span className="text-foreground">{fmt(legend.open)}</span></span>
            <span>H <span className="text-foreground">{fmt(legend.high)}</span></span>
            <span>L <span className="text-foreground">{fmt(legend.low)}</span></span>
            <span>C <span className="text-foreground">{fmt(legend.close)}</span></span>
            <span className={legendChange >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>{legendChange >= 0 ? '+' : ''}{legendChange.toFixed(2)}%</span>
            <span>Vol <span className="text-foreground">{Math.round(legend.volume).toLocaleString()}</span></span>
          </>
        )}
        {pending && <span className="text-[#F0B90B]">Click a second point to finish the drawing</span>}
      </div>

      {/* Chart + drawings overlay */}
      <div ref={containerRef} className="relative w-full" style={{ height }}>
        <div ref={chartHostRef} className="absolute inset-0" />
        <svg className="absolute inset-0 z-10 pointer-events-none" width="100%" height={height} key={overlayTick}>
          {renderDrawings()}
        </svg>
        {tool !== 'none' && (
          <div className="absolute inset-0 z-20 cursor-crosshair" onMouseDown={handleOverlayClick} />
        )}
        {loading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center text-xs text-muted-foreground bg-background/40">Loading chart…</div>
        )}
        {!loading && error && candlesRef.current.length === 0 && (
          <div className="absolute inset-0 z-30 flex items-center justify-center text-xs text-muted-foreground px-6 text-center">{error}</div>
        )}
      </div>
    </div>
  );
};

export default ProChart;
