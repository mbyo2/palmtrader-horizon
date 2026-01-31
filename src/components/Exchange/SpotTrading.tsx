import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { SpotTradingService, TradingPair, OrderBook, SpotOrder } from '@/services/SpotTradingService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const SpotTrading = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPairId, setSelectedPairId] = useState<string>('');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('limit');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [percentage, setPercentage] = useState([0]);

  const { data: pairs = [] } = useQuery({
    queryKey: ['trading-pairs'],
    queryFn: SpotTradingService.getTradingPairs
  });

  const selectedPair = pairs.find(p => p.id === selectedPairId);

  const { data: orderBook, refetch: refetchOrderBook } = useQuery({
    queryKey: ['order-book', selectedPairId],
    queryFn: () => SpotTradingService.getOrderBook(selectedPairId),
    enabled: !!selectedPairId,
    refetchInterval: 2000
  });

  const { data: openOrders = [] } = useQuery({
    queryKey: ['open-orders', user?.id, selectedPairId],
    queryFn: () => user ? SpotTradingService.getOpenOrders(user.id, selectedPairId || undefined) : [],
    enabled: !!user
  });

  useEffect(() => {
    if (pairs.length > 0 && !selectedPairId) {
      setSelectedPairId(pairs[0].id);
    }
  }, [pairs, selectedPairId]);

  const placeMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedPairId) throw new Error('Invalid state');
      return SpotTradingService.placeOrder(
        user.id,
        selectedPairId,
        side,
        orderType,
        parseFloat(quantity),
        orderType === 'limit' ? parseFloat(price) : undefined
      );
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`${side.toUpperCase()} order placed`);
        setQuantity('');
        setPrice('');
        queryClient.invalidateQueries({ queryKey: ['open-orders'] });
        queryClient.invalidateQueries({ queryKey: ['order-book'] });
      } else {
        toast.error(result.error || 'Failed to place order');
      }
    }
  });

  const cancelMutation = useMutation({
    mutationFn: SpotTradingService.cancelOrder,
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Order cancelled');
        queryClient.invalidateQueries({ queryKey: ['open-orders'] });
        queryClient.invalidateQueries({ queryKey: ['order-book'] });
      }
    }
  });

  const handlePriceClick = (clickedPrice: number) => {
    setPrice(clickedPrice.toString());
    setOrderType('limit');
  };

  const total = parseFloat(price || '0') * parseFloat(quantity || '0');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Trading Pair Selector & Chart Area */}
      <div className="lg:col-span-3 space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Select value={selectedPairId} onValueChange={setSelectedPairId}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select pair" />
                </SelectTrigger>
                <SelectContent>
                  {pairs.map(pair => (
                    <SelectItem key={pair.id} value={pair.id}>
                      {pair.base_currency}/{pair.quote_currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedPair && (
                <>
                  <div className="text-2xl font-bold">
                    {orderBook?.lastPrice?.toFixed(selectedPair.price_precision) || '—'}
                  </div>
                  {orderBook?.spread && (
                    <div className="text-sm text-muted-foreground">
                      Spread: {orderBook.spread.toFixed(2)}
                    </div>
                  )}
                </>
              )}

              <Button variant="ghost" size="icon" onClick={() => refetchOrderBook()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Order Book */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Sell Orders (Asks)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-64 overflow-y-auto">
                {orderBook?.asks.slice(0, 10).reverse().map((entry, i) => (
                  <div 
                    key={i} 
                    className="grid grid-cols-3 gap-2 px-4 py-1.5 text-sm hover:bg-muted/50 cursor-pointer"
                    onClick={() => handlePriceClick(entry.price)}
                  >
                    <span className="text-red-500">{entry.price.toFixed(2)}</span>
                    <span className="text-right">{entry.quantity.toFixed(4)}</span>
                    <span className="text-right text-muted-foreground">{entry.total.toFixed(2)}</span>
                  </div>
                ))}
                {(!orderBook?.asks.length) && (
                  <div className="p-4 text-center text-muted-foreground text-sm">No sell orders</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Buy Orders (Bids)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-64 overflow-y-auto">
                {orderBook?.bids.slice(0, 10).map((entry, i) => (
                  <div 
                    key={i} 
                    className="grid grid-cols-3 gap-2 px-4 py-1.5 text-sm hover:bg-muted/50 cursor-pointer"
                    onClick={() => handlePriceClick(entry.price)}
                  >
                    <span className="text-green-500">{entry.price.toFixed(2)}</span>
                    <span className="text-right">{entry.quantity.toFixed(4)}</span>
                    <span className="text-right text-muted-foreground">{entry.total.toFixed(2)}</span>
                  </div>
                ))}
                {(!orderBook?.bids.length) && (
                  <div className="p-4 text-center text-muted-foreground text-sm">No buy orders</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Open Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Open Orders ({openOrders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {openOrders.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">No open orders</div>
            ) : (
              <div className="space-y-2">
                {openOrders.map(order => (
                  <div key={order.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Badge variant={order.side === 'buy' ? 'default' : 'destructive'}>
                        {order.side.toUpperCase()}
                      </Badge>
                      <span className="font-medium">{order.quantity} @ {order.price}</span>
                      <Badge variant="outline">{order.order_type}</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => cancelMutation.mutate(order.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Form */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={side} onValueChange={(v) => setSide(v as 'buy' | 'sell')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="buy" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                Buy
              </TabsTrigger>
              <TabsTrigger value="sell" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
                Sell
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Button
                variant={orderType === 'limit' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setOrderType('limit')}
              >
                Limit
              </Button>
              <Button
                variant={orderType === 'market' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setOrderType('market')}
              >
                Market
              </Button>
            </div>

            {orderType === 'limit' && (
              <div className="space-y-2">
                <Label>Price ({selectedPair?.quote_currency || 'USDT'})</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Amount ({selectedPair?.base_currency || 'BTC'})</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
              <Slider
                value={percentage}
                onValueChange={setPercentage}
                max={100}
                step={25}
              />
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium">
                {isNaN(total) ? '0.00' : total.toFixed(2)} {selectedPair?.quote_currency || 'USDT'}
              </span>
            </div>

            <Button 
              className={cn(
                "w-full",
                side === 'buy' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
              )}
              onClick={() => placeMutation.mutate()}
              disabled={placeMutation.isPending || !quantity || (orderType === 'limit' && !price)}
            >
              {placeMutation.isPending ? 'Placing...' : `${side.toUpperCase()} ${selectedPair?.base_currency || 'BTC'}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
