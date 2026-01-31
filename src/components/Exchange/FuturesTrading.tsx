import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { FuturesService, FuturesPosition, OpenPositionRequest } from '@/services/FuturesService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, Target, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const FUTURES_PAIRS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', price: 65000 },
  { symbol: 'ETHUSDT', name: 'Ethereum', price: 3500 },
  { symbol: 'SOLUSDT', name: 'Solana', price: 150 },
  { symbol: 'XRPUSDT', name: 'XRP', price: 0.55 },
];

export const FuturesTrading = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [side, setSide] = useState<'long' | 'short'>('long');
  const [leverage, setLeverage] = useState([10]);
  const [margin, setMargin] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [showTpSl, setShowTpSl] = useState(false);

  const currentPair = FUTURES_PAIRS.find(p => p.symbol === selectedSymbol);
  const currentPrice = currentPair?.price || 0;

  const { data: positions = [], refetch } = useQuery({
    queryKey: ['futures-positions', user?.id],
    queryFn: () => user ? FuturesService.getPositions(user.id, 'open') : [],
    enabled: !!user,
    refetchInterval: 5000
  });

  const { data: history = [] } = useQuery({
    queryKey: ['futures-history', user?.id],
    queryFn: () => user ? FuturesService.getPositionHistory(user.id) : [],
    enabled: !!user
  });

  const openMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const marginValue = parseFloat(margin);
      const quantity = (marginValue * leverage[0]) / currentPrice;
      
      const request: OpenPositionRequest = {
        symbol: selectedSymbol,
        side,
        quantity,
        leverage: leverage[0],
        entryPrice: currentPrice,
        takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined
      };

      return FuturesService.openPosition(user.id, request);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`${side.toUpperCase()} position opened`);
        setMargin('');
        setTakeProfit('');
        setStopLoss('');
        queryClient.invalidateQueries({ queryKey: ['futures-positions'] });
      } else {
        toast.error(result.error || 'Failed to open position');
      }
    }
  });

  const closeMutation = useMutation({
    mutationFn: async (positionId: string) => {
      const position = positions.find(p => p.id === positionId);
      if (!position) throw new Error('Position not found');
      
      // Simulate slight price movement for exit
      const exitPrice = currentPrice * (1 + (Math.random() - 0.5) * 0.01);
      return FuturesService.closePosition(positionId, exitPrice);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Position closed. PnL: $${result.pnl?.toFixed(2)}`);
        queryClient.invalidateQueries({ queryKey: ['futures-positions'] });
        queryClient.invalidateQueries({ queryKey: ['futures-history'] });
      }
    }
  });

  const marginValue = parseFloat(margin) || 0;
  const quantity = marginValue > 0 ? (marginValue * leverage[0]) / currentPrice : 0;
  const liquidationPrice = marginValue > 0 
    ? FuturesService.calculateLiquidationPrice(currentPrice, leverage[0], side)
    : 0;

  const totalUnrealizedPnL = positions.reduce((sum, p) => {
    const pnl = FuturesService.calculatePnL(p.entry_price, currentPrice, p.quantity, p.side, p.leverage);
    return sum + pnl;
  }, 0);

  return (
    <div className="space-y-4">
      {/* Warning Banner */}
      <Card className="border-yellow-500/50 bg-yellow-500/10">
        <CardContent className="p-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <span className="text-sm">
            <strong>High Risk:</strong> Futures trading with leverage can result in significant losses. Trade responsibly.
          </span>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trading Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Symbol Selector */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUTURES_PAIRS.map(pair => (
                      <SelectItem key={pair.symbol} value={pair.symbol}>
                        {pair.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="text-2xl font-bold">
                  ${currentPrice.toLocaleString()}
                </div>

                <Badge variant="outline">{leverage[0]}x</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Open Positions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Open Positions ({positions.length})</span>
                <span className={cn(
                  "text-lg font-bold",
                  totalUnrealizedPnL >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {totalUnrealizedPnL >= 0 ? '+' : ''}{totalUnrealizedPnL.toFixed(2)} USDT
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {positions.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">No open positions</div>
              ) : (
                <div className="space-y-3">
                  {positions.map(position => {
                    const pnl = FuturesService.calculatePnL(position.entry_price, currentPrice, position.quantity, position.side, position.leverage);
                    const roe = FuturesService.calculateROE(position.entry_price, currentPrice, position.leverage, position.side);

                    return (
                      <div key={position.id} className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={position.side === 'long' ? 'default' : 'destructive'}>
                              {position.side.toUpperCase()} {position.leverage}x
                            </Badge>
                            <span className="font-medium">{position.symbol}</span>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => closeMutation.mutate(position.id)}
                          >
                            Close
                          </Button>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-sm">
                          <div>
                            <div className="text-muted-foreground">Size</div>
                            <div>{position.quantity.toFixed(4)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Entry</div>
                            <div>${position.entry_price.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Liq. Price</div>
                            <div className="text-red-500">${position.liquidation_price?.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">PnL (ROE%)</div>
                            <div className={pnl >= 0 ? "text-green-500" : "text-red-500"}>
                              {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} ({roe.toFixed(2)}%)
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order Form */}
        <Card>
          <CardContent className="p-4">
            <Tabs value={side} onValueChange={(v) => setSide(v as 'long' | 'short')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="long" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Long
                </TabsTrigger>
                <TabsTrigger value="short" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Short
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-4 mt-4">
              {/* Leverage */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Leverage</Label>
                  <span className="text-sm font-medium">{leverage[0]}x</span>
                </div>
                <Slider
                  value={leverage}
                  onValueChange={setLeverage}
                  min={1}
                  max={125}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1x</span>
                  <span>25x</span>
                  <span>50x</span>
                  <span>75x</span>
                  <span>125x</span>
                </div>
              </div>

              {/* Margin */}
              <div className="space-y-2">
                <Label>Margin (USDT)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={margin}
                  onChange={(e) => setMargin(e.target.value)}
                />
              </div>

              {/* Position Info */}
              <div className="rounded-lg bg-muted/50 p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Position Size</span>
                  <span>{quantity.toFixed(6)} {selectedSymbol.replace('USDT', '')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entry Price</span>
                  <span>${currentPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Liquidation Price</span>
                  <span className="text-red-500">${liquidationPrice.toFixed(2)}</span>
                </div>
              </div>

              {/* TP/SL Toggle */}
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  TP/SL
                </Label>
                <Switch checked={showTpSl} onCheckedChange={setShowTpSl} />
              </div>

              {showTpSl && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Take Profit</Label>
                    <Input
                      type="number"
                      placeholder="Price"
                      value={takeProfit}
                      onChange={(e) => setTakeProfit(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Stop Loss</Label>
                    <Input
                      type="number"
                      placeholder="Price"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <Button 
                className={cn(
                  "w-full",
                  side === 'long' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                )}
                size="lg"
                onClick={() => openMutation.mutate()}
                disabled={openMutation.isPending || !margin}
              >
                {openMutation.isPending ? 'Opening...' : `Open ${side.toUpperCase()}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
