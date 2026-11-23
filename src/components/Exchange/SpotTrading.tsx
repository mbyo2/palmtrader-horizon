import { useState, useEffect, useMemo } from 'react';
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
import { AlpacaPaperService } from '@/services/AlpacaPaperService';
import { CryptoWalletService } from '@/services/CryptoWalletService';
import { FeeTierService } from '@/services/FeeTierService';
import { useDemoPrice } from '@/hooks/useDemoPrice';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RealTimeOrderBook } from './RealTimeOrderBook';
import { AdvancedStockChart } from '@/components/Research/AdvancedStockChart';
import { generateChartData } from '@/services/demo/demoMarket';

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

  const { data: wallets = [] } = useQuery({
    queryKey: ['crypto-wallets', user?.id],
    queryFn: () => user ? CryptoWalletService.getWallets(user.id) : [],
    enabled: !!user
  });

  const { price: livePrice, changePct } = useDemoPrice(selectedPairId || null);

  // Chart series for the selected pair (same demo market generator as the Crypto page)
  const chartData = useMemo(() => {
    if (!selectedPair) return [];
    return generateChartData(selectedPair.base_currency, 60).map((c, i) => ({
      symbol: selectedPair.base_currency,
      timestamp: (Date.now() - (59 - i) * 3600000).toString(),
      price: c.close, close: c.close, type: 'crypto' as const,
    }));
  }, [selectedPair]);

  // For Alpaca-venue pairs, available balances are read back from the
  // Alpaca paper account (cash for buys, position quantity for sells) —
  // the local wallet table does not govern Alpaca execution.
  const isAlpacaPair = selectedPair?.venue === 'alpaca';
  const { data: alpacaAccountRes } = useQuery({
    queryKey: ['alpaca-paper-account'],
    queryFn: () => AlpacaPaperService.getAccount(),
    enabled: !!user && isAlpacaPair
  });
  const { data: alpacaPositionsRes } = useQuery({
    queryKey: ['paperPositions'],
    queryFn: () => AlpacaPaperService.getPositions(),
    enabled: !!user && isAlpacaPair
  });

  const spotAvailable = (currency?: string) => {
    if (isAlpacaPair && selectedPair) {
      if (currency === 'USD') {
        return alpacaAccountRes ? Number(alpacaAccountRes.account?.cash ?? 0) : 0;
      }
      if (currency === selectedPair.base_currency) {
        const pos = (alpacaPositionsRes?.positions ?? []).find(
          (p: any) => p.symbol === `${currency}USD`
        );
        return pos ? Number(pos.qty) : 0;
      }
      return 0;
    }
    return wallets.find(w => w.currency === currency && w.wallet_type === 'spot')?.available_balance ?? 0;
  };

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
        if (result.venue === 'alpaca') {
          toast.success(`${side.toUpperCase()} order placed on Alpaca Sandbox`);
        } else if (result.venue === 'simulated') {
          toast.success(`${side.toUpperCase()} order placed — PalmCacia simulated market`);
        } else {
          toast.success(`${side.toUpperCase()} order placed`);
        }
        setQuantity('');
        setPrice('');
        setPercentage([0]);
        queryClient.invalidateQueries({ queryKey: ['open-orders'] });
        queryClient.invalidateQueries({ queryKey: ['crypto-wallets'] });
        queryClient.invalidateQueries({ queryKey: ['user-volume'] });
        queryClient.invalidateQueries({ queryKey: ['alpaca-paper-account'] });
        queryClient.invalidateQueries({ queryKey: ['paperPositions'] });
        queryClient.invalidateQueries({ queryKey: ['paperOrders'] });
      } else {
        toast.error(result.error || 'Failed to place order');
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to place order');
    }
  });

  const cancelMutation = useMutation({
    mutationFn: SpotTradingService.cancelOrder,
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Order cancelled');
        queryClient.invalidateQueries({ queryKey: ['open-orders'] });
        queryClient.invalidateQueries({ queryKey: ['crypto-wallets'] });
        queryClient.invalidateQueries({ queryKey: ['alpaca-paper-account'] });
        queryClient.invalidateQueries({ queryKey: ['paperPositions'] });
        queryClient.invalidateQueries({ queryKey: ['paperOrders'] });
      } else {
        toast.error(result.error || 'Failed to cancel order');
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel order');
    }
  });

  const handlePriceClick = (clickedPrice: number) => {
    setPrice(clickedPrice.toString());
    setOrderType('limit');
  };

  const total = parseFloat(price || '0') * parseFloat(quantity || '0');
  const currentFee = userVolume?.current_tier;

  return (
    <div className="space-y-4">
      {/* Ticker header strip */}
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

              {livePrice !== null && selectedPair && (
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold">{livePrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} {selectedPair.quote_currency}</span>
                  <span className={changePct >= 0 ? 'text-gain text-sm font-medium' : 'text-loss text-sm font-medium'}>
                    {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                  </span>
                </div>
              )}

              {currentFee && (
                <Badge variant="secondary" className="text-xs">
                  {currentFee.tier_name} • Maker {(currentFee.maker_fee * 100).toFixed(2)}% / Taker {(currentFee.taker_fee * 100).toFixed(2)}%
                </Badge>
              )}

              {selectedPair?.venue === 'alpaca' && (
                <Badge className="text-xs">Venue: Alpaca Sandbox</Badge>
              )}
              {selectedPair?.venue === 'simulated' && (
                <Badge variant="outline" className="text-xs">Venue: PalmCacia simulated market</Badge>
              )}
            </div>
          </CardContent>
        </Card>

      {/* Binance arrangement: chart centre, order book + trade panel right rail (desktop);
          on mobile the trade panel sits directly under the chart, book below it. */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-6 order-1 min-w-0">
          {selectedPair ? (
            <AdvancedStockChart
              symbol={`${selectedPair.base_currency}/${selectedPair.quote_currency}`}
              data={chartData}
              compact
            />
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                Select a pair to view its chart
              </CardContent>
            </Card>
          )}
        </div>

        <div className="xl:col-span-3 order-3 xl:order-2 min-w-0">
          {selectedPairId && (
            <RealTimeOrderBook pairId={selectedPairId} onPriceClick={handlePriceClick} />
          )}
        </div>

        <div className="xl:col-span-3 order-2 xl:order-3 min-w-0">
          <Card>
        <CardContent className="p-4">
          <Tabs value={side} onValueChange={(v) => setSide(v as 'buy' | 'sell')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="buy" className={cn("data-[state=active]:bg-gain data-[state=active]:text-white")}>
                Buy
              </TabsTrigger>
              <TabsTrigger value="sell" className={cn("data-[state=active]:bg-loss data-[state=active]:text-white")}>
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
                <span>Available: {spotAvailable(side === 'buy' ? selectedPair?.quote_currency : selectedPair?.base_currency).toLocaleString(undefined, { maximumFractionDigits: 6 })} {side === 'buy' ? selectedPair?.quote_currency : selectedPair?.base_currency}</span>
                <span>{percentage[0]}%</span>
              </div>
              <Slider
                value={percentage}
                onValueChange={(v) => {
                  setPercentage(v);
                  const pct = v[0] / 100;
                  const refPrice = orderType === 'limit' ? parseFloat(price) || livePrice || 0 : livePrice || parseFloat(price) || 0;
                  if (side === 'buy') {
                    if (refPrice > 0) setQuantity(((spotAvailable(selectedPair?.quote_currency) * pct) / refPrice).toFixed(6));
                  } else {
                    setQuantity((spotAvailable(selectedPair?.base_currency) * pct).toFixed(6));
                  }
                }}
                max={100}
                step={25}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
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
                side === 'buy' ? 'bg-gain hover:bg-gain/90 text-white' : 'bg-loss hover:bg-loss/90 text-white'
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
      </div>

      {/* Open orders / history below */}
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
  );
};
