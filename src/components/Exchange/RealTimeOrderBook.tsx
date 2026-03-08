import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SpotTradingService, OrderBook } from '@/services/SpotTradingService';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Props {
  pairId: string;
  onPriceClick?: (price: number) => void;
}

export const RealTimeOrderBook = ({ pairId, onPriceClick }: Props) => {
  const [orderBook, setOrderBook] = useState<OrderBook>({ bids: [], asks: [] });
  const [lastTradePrice, setLastTradePrice] = useState<number | null>(null);

  const fetchOrderBook = useCallback(async () => {
    if (!pairId) return;
    try {
      const book = await SpotTradingService.getOrderBook(pairId);
      setOrderBook(book);
      if (book.lastPrice) setLastTradePrice(book.lastPrice);
    } catch {}
  }, [pairId]);

  useEffect(() => {
    fetchOrderBook();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`orderbook-${pairId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'spot_orders',
        filter: `pair_id=eq.${pairId}`,
      }, () => {
        fetchOrderBook();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pairId, fetchOrderBook]);

  const maxBidQty = Math.max(...orderBook.bids.map(b => b.quantity), 1);
  const maxAskQty = Math.max(...orderBook.asks.map(a => a.quantity), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Order Book</CardTitle>
          {orderBook.spread !== undefined && (
            <Badge variant="outline" className="text-xs">
              Spread: {orderBook.spread.toFixed(2)}
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-3 text-xs text-muted-foreground font-medium">
          <span>Price</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Total</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Asks (sells) - reversed so lowest ask is at bottom */}
        <div className="max-h-[200px] overflow-hidden flex flex-col-reverse">
          {orderBook.asks.slice(0, 10).map((ask, i) => (
            <div
              key={`ask-${i}`}
              className="relative grid grid-cols-3 text-xs py-0.5 px-3 cursor-pointer hover:bg-muted/50"
              onClick={() => onPriceClick?.(ask.price)}
            >
              <div
                className="absolute inset-0 bg-red-500/10"
                style={{ width: `${(ask.quantity / maxAskQty) * 100}%`, right: 0, left: 'auto' }}
              />
              <span className="text-red-500 relative z-10">{ask.price.toFixed(2)}</span>
              <span className="text-right relative z-10">{ask.quantity.toFixed(4)}</span>
              <span className="text-right text-muted-foreground relative z-10">{ask.total.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Last trade price */}
        <div className="py-1.5 px-3 text-center border-y">
          <span className={cn(
            "font-bold text-sm",
            lastTradePrice && orderBook.bids[0]?.price && lastTradePrice >= orderBook.bids[0].price
              ? "text-green-500" : "text-red-500"
          )}>
            {lastTradePrice?.toFixed(2) || '—'}
          </span>
        </div>

        {/* Bids (buys) */}
        <div className="max-h-[200px] overflow-hidden">
          {orderBook.bids.slice(0, 10).map((bid, i) => (
            <div
              key={`bid-${i}`}
              className="relative grid grid-cols-3 text-xs py-0.5 px-3 cursor-pointer hover:bg-muted/50"
              onClick={() => onPriceClick?.(bid.price)}
            >
              <div
                className="absolute inset-0 bg-green-500/10"
                style={{ width: `${(bid.quantity / maxBidQty) * 100}%`, right: 0, left: 'auto' }}
              />
              <span className="text-green-500 relative z-10">{bid.price.toFixed(2)}</span>
              <span className="text-right relative z-10">{bid.quantity.toFixed(4)}</span>
              <span className="text-right text-muted-foreground relative z-10">{bid.total.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
