import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { subscribePrices, getPairPrice } from '@/services/demo/demoMarket';
import { isDemoSync } from '@/services/demo/DemoBackend';
import { finnhubSocket } from '@/utils/finnhubSocket';
import { cn } from '@/lib/utils';

interface TapePrint {
  id: number;
  time: string;
  price: number;
  size: number | null;
  up: boolean;
}

/** Deterministic print size from the tick timestamp (demo venue prints). */
function seededSize(seed: number): number {
  let t = seed + 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return 0.01 + (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 1.6;
}

/**
 * Recent-trades tape. Demo mode: prints are the demo engine's own ticks for
 * the pair. Signed-in: prints stream from the Finnhub socket (same feed the
 * quotes use). Nothing is shown until a real print arrives.
 */
export const TradesTape: React.FC<{ pairId: string }> = ({ pairId }) => {
  const [prints, setPrints] = useState<TapePrint[]>([]);
  const lastPriceRef = useRef<number | null>(null);
  const idRef = useRef(0);

  useEffect(() => {
    setPrints([]);
    lastPriceRef.current = null;
    const push = (price: number, size: number | null) => {
      if (!price || price <= 0) return;
      const prev = lastPriceRef.current;
      lastPriceRef.current = price;
      const print: TapePrint = {
        id: ++idRef.current,
        time: new Date().toLocaleTimeString([], { hour12: false }),
        price,
        size,
        up: prev === null ? true : price >= prev,
      };
      setPrints((p) => [print, ...p].slice(0, 28));
    };

    if (isDemoSync()) {
      return subscribePrices(() => {
        const px = getPairPrice(pairId);
        if (px && px !== lastPriceRef.current) push(px, seededSize(Math.floor(Date.now() / 2000)));
      });
    }
    const symbol = pairId.includes('-') ? pairId.split('-')[0] : pairId;
    finnhubSocket.subscribe(symbol);
    const unsub = finnhubSocket.onMarketData((d: any) => {
      if (d.symbol === symbol && d.price) push(d.price, d.volume ?? null);
    });
    return () => { finnhubSocket.unsubscribe(symbol); unsub(); };
  }, [pairId]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Recent Trades</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {prints.length === 0 ? (
          <div className="text-xs text-muted-foreground py-6 text-center">Waiting for trades…</div>
        ) : (
          <div className="space-y-0.5">
            <div className="grid grid-cols-3 text-[10px] uppercase tracking-wide text-muted-foreground pb-1">
              <span>Price</span><span className="text-right">Amount</span><span className="text-right">Time</span>
            </div>
            {prints.map((p) => (
              <div key={p.id} className="grid grid-cols-3 text-xs tabular-nums">
                <span className={cn(p.up ? 'text-[#0ECB81]' : 'text-[#F6465D]')}>
                  {p.price.toLocaleString(undefined, { maximumFractionDigits: p.price < 1 ? 6 : 2 })}
                </span>
                <span className="text-right">{p.size !== null ? p.size.toFixed(4) : '—'}</span>
                <span className="text-right text-muted-foreground">{p.time}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TradesTape;
