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
import { SpotTradingService, TradingPair, SpotOrder } from '@/services/SpotTradingService';
import { FeeTierService } from '@/services/FeeTierService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RealTimeOrderBook } from './RealTimeOrderBook';

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

  const { data: openOrders = [] } = useQuery({
    queryKey: ['open-orders', user?.id, selectedPairId],
    queryFn: () => user ? SpotTradingService.getOpenOrders(user.id, selectedPairId || undefined) : [],
    enabled: !!user
  });

  const { data: userVolume } = useQuery({
    queryKey: ['user-volume', user?.id],
    queryFn: () => user ? FeeTierService.getUserVolume(user.id) : null,
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
        toast.success(`${side.toUpperCase()} order placed — matching engine active`);
        setQuantity('');
        setPrice('');
        queryClient.invalidateQueries({ queryKey: ['open-orders'] });
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
      }
    }
  });

  const handlePriceClick = (clickedPrice: number) => {
    setPrice(clickedPrice.toString());
    setOrderType('limit');
  };

  const total = parseFloat(price || '0') * parseFloat(quantity || '0');
  const currentFee = userVolume?.current_tier;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Left: Pair selector + Order Book + Open Orders */}
      <div className="lg:col-span-3 space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
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

              {currentFee && (
                <Badge variant="secondary" className="text-xs">
                  {currentFee.tier_name} • Maker {(currentFee.maker_fee * 100).toFixed(2)}% / Taker {(currentFee.taker_fee * 100).toFixed(2)}%
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Real-Time Order Book with Supabase Realtime */}
        {selectedPairId && (
          <RealTimeOrderBook pairId={selectedPairId} onPriceClick={handlePriceClick} />
        )}

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
                      <span className="font-medium text-sm">{order.quantity} @ {order.price}</span>
                      <Badge variant="outline">{order.order_type}</Badge>
                      {order.status === 'partially_filled' && (
                        <Badge variant="secondary" className="text-xs">
                          Filled: {order.filled_quantity}/{order.quantity}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => cancelMutation.mutate(order.id)}
                      aria-label="Cancel order"
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

      {/* Right: Order Form */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={side} onValueChange={(v) => setSide(v as 'buy' | 'sell')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="buy" className={cn("data-[state=active]:bg-green-600 data-[state=active]:text-white")}>
                Buy
              </TabsTrigger>
              <TabsTrigger value="sell" className={cn("data-[state=active]:bg-red-600 data-[state=active]:text-white")}>
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

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium">
                  {isNaN(total) ? '0.00' : total.toFixed(2)} {selectedPair?.quote_currency || 'USDT'}
                </span>
              </div>
              {currentFee && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Est. fee ({currentFee.tier_name})</span>
                  <span>{(total * currentFee.taker_fee).toFixed(4)} {selectedPair?.quote_currency || 'USDT'}</span>
                </div>
              )}
            </div>

            <Button 
              className={cn(
                "w-full",
                side === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
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
