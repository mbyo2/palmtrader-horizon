import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SpotTradingService, type OrderBook } from '@/services/SpotTradingService';
import { isDemoSync } from '@/services/demo/DemoBackend';

/** Cumulative market-depth chart fed by the same order-book source as the book panel. */
export const DepthChart: React.FC<{ pairId: string }> = ({ pairId }) => {
  const [book, setBook] = useState<OrderBook | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const b = await SpotTradingService.getOrderBook(pairId);
        if (alive) setBook(b);
      } catch { /* keep last book */ }
    };
    load();
    const id = setInterval(load, isDemoSync() ? 2500 : 8000);
    return () => { alive = false; clearInterval(id); };
  }, [pairId]);

  const geom = useMemo(() => {
    if (!book || book.bids.length === 0 || book.asks.length === 0) return null;
    const W = 560;
    const H = 150;
    const PAD = 6;
    let cum = 0;
    const bidPts = [...book.bids].sort((a, b) => b.price - a.price).map((l) => { cum += l.quantity; return { price: l.price, cum }; });
    cum = 0;
    const askPts = [...book.asks].sort((a, b) => a.price - b.price).map((l) => { cum += l.quantity; return { price: l.price, cum }; });
    const minP = bidPts[bidPts.length - 1].price;
    const maxP = askPts[askPts.length - 1].price;
    const maxC = Math.max(bidPts[bidPts.length - 1].cum, askPts[askPts.length - 1].cum) || 1;
    const X = (p: number) => PAD + ((p - minP) / (maxP - minP || 1)) * (W - PAD * 2);
    const Y = (c: number) => H - 14 - (c / maxC) * (H - 30);
    const toPath = (pts: { price: number; cum: number }[], startX: number) => {
      let d = `M ${startX} ${Y(0)}`;
      for (const p of pts) d += ` L ${X(p.price)} ${Y(p.cum)}`;
      return d;
    };
    const mid = book.lastPrice || (minP + maxP) / 2;
    const bidsLine = toPath([...bidPts].reverse(), X(minP));
    const asksLine = toPath(askPts, X(askPts[0].price));
    return {
      W, H, X, Y, mid,
      bidsArea: `${bidsLine} L ${X(mid)} ${Y(0)} Z`,
      asksArea: `${asksLine} L ${X(maxP)} ${Y(0)} Z`,
      bidsLine, asksLine,
      bidTotal: bidPts[bidPts.length - 1].cum, askTotal: askPts[askPts.length - 1].cum,
    };
  }, [book]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Market Depth</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {!geom ? (
          <div className="text-xs text-muted-foreground py-8 text-center">Loading depth…</div>
        ) : (
          <>
            <svg viewBox={`0 0 ${geom.W} ${geom.H}`} className="w-full" role="img" aria-label="Market depth chart">
              <path d={geom.bidsArea} fill="rgba(14,203,129,0.15)" />
              <path d={geom.asksArea} fill="rgba(246,70,93,0.15)" />
              <path d={geom.bidsLine} fill="none" stroke="#0ECB81" strokeWidth={1.5} />
              <path d={geom.asksLine} fill="none" stroke="#F6465D" strokeWidth={1.5} />
              <line x1={geom.X(geom.mid)} y1={4} x2={geom.X(geom.mid)} y2={geom.H - 14} stroke="#848E9C" strokeDasharray="3 3" strokeWidth={1} />
              <text x={geom.X(geom.mid)} y={geom.H - 2} fill="#848E9C" fontSize={9} textAnchor="middle">
                {geom.mid.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </text>
            </svg>
            <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
              <span>Bids depth <span className="text-[#0ECB81]">{geom.bidTotal.toFixed(3)}</span></span>
              <span>Asks depth <span className="text-[#F6465D]">{geom.askTotal.toFixed(3)}</span></span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DepthChart;
