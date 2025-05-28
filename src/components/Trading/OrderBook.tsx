
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
}

interface OrderBookProps {
  symbol: string;
  currentPrice: number;
}

const OrderBook = ({ symbol, currentPrice }: OrderBookProps) => {
  const [bids, setBids] = useState<OrderBookLevel[]>([]);
  const [asks, setAsks] = useState<OrderBookLevel[]>([]);
  const [spread, setSpread] = useState(0);
  const [lastTrades, setLastTrades] = useState<any[]>([]);

  // Mock data generation - in production, this would come from WebSocket
  useEffect(() => {
    const generateOrderBookData = () => {
      const mockBids: OrderBookLevel[] = [];
      const mockAsks: OrderBookLevel[] = [];
      
      let total = 0;
      for (let i = 0; i < 10; i++) {
        const bidPrice = currentPrice - (i + 1) * 0.01;
        const bidSize = Math.random() * 1000 + 100;
        total += bidSize;
        mockBids.push({
          price: bidPrice,
          size: bidSize,
          total: total
        });
      }

      total = 0;
      for (let i = 0; i < 10; i++) {
        const askPrice = currentPrice + (i + 1) * 0.01;
        const askSize = Math.random() * 1000 + 100;
        total += askSize;
        mockAsks.push({
          price: askPrice,
          size: askSize,
          total: total
        });
      }

      setBids(mockBids);
      setAsks(mockAsks.reverse());
      setSpread(mockAsks[0]?.price - mockBids[0]?.price || 0);
    };

    const generateLastTrades = () => {
      const trades = [];
      for (let i = 0; i < 20; i++) {
        trades.push({
          id: i,
          price: currentPrice + (Math.random() - 0.5) * 0.1,
          size: Math.random() * 500 + 50,
          side: Math.random() > 0.5 ? 'buy' : 'sell',
          timestamp: new Date(Date.now() - i * 10000)
        });
      }
      setLastTrades(trades);
    };

    generateOrderBookData();
    generateLastTrades();

    const interval = setInterval(() => {
      generateOrderBookData();
      generateLastTrades();
    }, 1000);

    return () => clearInterval(interval);
  }, [currentPrice]);

  const maxBidTotal = Math.max(...bids.map(b => b.total));
  const maxAskTotal = Math.max(...asks.map(a => a.total));
  const maxTotal = Math.max(maxBidTotal, maxAskTotal);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(0);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Order Book - {symbol}
        </CardTitle>
        <div className="flex items-center gap-4">
          <Badge variant="outline">Spread: ${spread.toFixed(4)}</Badge>
          <Badge variant="outline">Last: ${currentPrice.toFixed(2)}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="book" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="book">Order Book</TabsTrigger>
            <TabsTrigger value="trades">Last Trades</TabsTrigger>
          </TabsList>
          
          <TabsContent value="book" className="space-y-4">
            <div className="grid grid-cols-3 text-xs font-medium text-muted-foreground border-b pb-2">
              <div>Price ($)</div>
              <div className="text-right">Size</div>
              <div className="text-right">Total</div>
            </div>

            {/* Asks (Sell Orders) */}
            <div className="space-y-1">
              {asks.map((ask, index) => (
                <div key={`ask-${index}`} className="relative grid grid-cols-3 text-xs py-1 hover:bg-muted/50">
                  <Progress 
                    value={(ask.total / maxTotal) * 100} 
                    className="absolute inset-0 h-full opacity-20"
                    style={{ background: 'rgba(239, 68, 68, 0.1)' }}
                  />
                  <div className="text-red-500 font-mono relative z-10">{ask.price.toFixed(2)}</div>
                  <div className="text-right relative z-10">{formatNumber(ask.size)}</div>
                  <div className="text-right text-muted-foreground relative z-10">{formatNumber(ask.total)}</div>
                </div>
              ))}
            </div>

            {/* Current Price */}
            <div className="flex items-center justify-center py-2 border-y">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">${currentPrice.toFixed(2)}</span>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
            </div>

            {/* Bids (Buy Orders) */}
            <div className="space-y-1">
              {bids.map((bid, index) => (
                <div key={`bid-${index}`} className="relative grid grid-cols-3 text-xs py-1 hover:bg-muted/50">
                  <Progress 
                    value={(bid.total / maxTotal) * 100} 
                    className="absolute inset-0 h-full opacity-20"
                    style={{ background: 'rgba(34, 197, 94, 0.1)' }}
                  />
                  <div className="text-green-500 font-mono relative z-10">{bid.price.toFixed(2)}</div>
                  <div className="text-right relative z-10">{formatNumber(bid.size)}</div>
                  <div className="text-right text-muted-foreground relative z-10">{formatNumber(bid.total)}</div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="trades" className="space-y-2">
            <div className="grid grid-cols-3 text-xs font-medium text-muted-foreground border-b pb-2">
              <div>Price ($)</div>
              <div className="text-right">Size</div>
              <div className="text-right">Time</div>
            </div>
            
            <div className="max-h-96 overflow-y-auto space-y-1">
              {lastTrades.map((trade) => (
                <div key={trade.id} className="grid grid-cols-3 text-xs py-1 hover:bg-muted/50">
                  <div className={`font-mono ${trade.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                    {trade.price.toFixed(2)}
                  </div>
                  <div className="text-right">{formatNumber(trade.size)}</div>
                  <div className="text-right text-muted-foreground">
                    {trade.timestamp.toLocaleTimeString().slice(0, 5)}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default OrderBook;
