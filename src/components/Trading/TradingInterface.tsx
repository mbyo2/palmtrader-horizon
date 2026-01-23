
import { useQuery } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StockSelector from "./StockSelector";
import StockInfo from "./StockInfo";
import OrderForm from "./OrderForm";
import RealTimeChart from "./RealTimeChart";
import { WalletBalanceDisplay } from "./WalletBalanceDisplay";
import { ConnectionStatusIndicator } from "./ConnectionStatusIndicator";
import { useTrading } from "@/hooks/useTrading";
import { useAuth } from "@/hooks/useAuth";
import { TradingErrorBoundary } from "@/components/ErrorBoundary/TradingErrorBoundary";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Zap, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

const TradingInterface = () => {
  const { user } = useAuth();
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [quickTradeAmount, setQuickTradeAmount] = useState<number>(100);
  
  const {
    symbol,
    setSymbol,
    orderAction,
    setOrderAction,
    stockPrice,
    isPriceLoading,
    historicalData,
    isHistoricalLoading,
    userPosition,
    isSubmitting,
    handleSubmitOrder
  } = useTrading();

  // Handle live price updates from chart
  const handlePriceUpdate = useCallback((price: number) => {
    setLivePrice(price);
  }, []);

  // Quick trade - instant market order
  const handleQuickTrade = async (action: 'buy' | 'sell') => {
    if (!user) {
      toast.error("Please log in to trade");
      return;
    }
    
    const price = livePrice || stockPrice?.price;
    if (!price) {
      toast.error("Price not available");
      return;
    }
    
    const shares = Math.floor(quickTradeAmount / price);
    if (shares < 1) {
      toast.error("Amount too small for at least 1 share");
      return;
    }
    
    // Set the order action first
    setOrderAction(action);
    
    try {
      // Use the proper OrderFormData format
      await handleSubmitOrder({
        orderType: 'market',
        shares: shares,
        limitPrice: null,
        stopPrice: null,
        isFractional: false
      });
      toast.success(`Quick ${action}: ${shares} shares of ${symbol} at $${price.toFixed(2)}`);
    } catch (error) {
      toast.error(`Failed to execute quick ${action}`);
    }
  };

  // Fetch real recent transactions for the current symbol
  const { data: recentTransactions = [] } = useQuery({
    queryKey: ["recentTrades", user?.id, symbol],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: trades, error } = await supabase
        .from('trades')
        .select('id, type, total_amount, created_at, status, symbol')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      return (trades || []).map(trade => ({
        id: trade.id,
        type: trade.type as "buy" | "sell",
        amount: trade.total_amount,
        timestamp: trade.created_at,
        status: trade.status,
        symbol: trade.symbol
      }));
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const displayPrice = livePrice || stockPrice?.price || 0;

  return (
    <TradingErrorBoundary>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <WalletBalanceDisplay />
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-yellow-500" />
              Fast Trading
            </Badge>
            <ConnectionStatusIndicator />
          </div>
        </div>
        
        {/* Real-time Chart with Live Price */}
        <RealTimeChart 
          symbol={symbol} 
          height={350}
          onPriceUpdate={handlePriceUpdate}
        />
        
        {/* Quick Trade Panel */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <StockSelector 
                  symbol={symbol} 
                  onSymbolChange={setSymbol} 
                />
                <div className="text-right">
                  <div className="text-2xl font-bold">${displayPrice.toFixed(2)}</div>
                  <div className={cn(
                    'text-sm',
                    (stockPrice?.change || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                  )}>
                    {(stockPrice?.change || 0) >= 0 ? '+' : ''}
                    {(stockPrice?.change || 0).toFixed(2)} ({(stockPrice?.changePercent || 0).toFixed(2)}%)
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Amount:</span>
                  <div className="flex gap-1">
                    {[100, 500, 1000, 5000].map(amount => (
                      <Button
                        key={amount}
                        size="sm"
                        variant={quickTradeAmount === amount ? "default" : "outline"}
                        className="px-2 h-8 text-xs"
                        onClick={() => setQuickTradeAmount(amount)}
                      >
                        ${amount}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleQuickTrade('buy')}
                    disabled={isSubmitting || !displayPrice}
                  >
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Quick Buy
                  </Button>
                  <Button
                    size="lg"
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => handleQuickTrade('sell')}
                    disabled={isSubmitting || !displayPrice || !userPosition?.shares}
                  >
                    <TrendingDown className="h-4 w-4 mr-1" />
                    Quick Sell
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <Card className="w-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">Advanced Order</CardTitle>
              <CardDescription className="text-sm">Place limit, stop-loss, and other order types</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <StockInfo 
                  symbol={symbol}
                  price={displayPrice}
                  change={stockPrice?.change || 0}
                  changePercent={stockPrice?.changePercent || 0}
                  volume={stockPrice?.volume || 0}
                />

                <OrderForm 
                  symbol={symbol}
                  stockPrice={stockPrice}
                  orderAction={orderAction}
                  userPosition={userPosition ? { shares: userPosition.shares } : null}
                  isSubmitting={isSubmitting}
                  onOrderActionChange={setOrderAction}
                  onSubmitOrder={handleSubmitOrder}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card className="w-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">Recent Trades</CardTitle>
              <CardDescription className="text-sm">Your latest trading activity</CardDescription>
            </CardHeader>
            <CardContent>
              {recentTransactions.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No recent trades. Start trading to see your activity here.
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {recentTransactions.map((trade) => (
                    <div 
                      key={trade.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant={trade.type === 'buy' ? 'default' : 'destructive'}>
                          {trade.type.toUpperCase()}
                        </Badge>
                        <div>
                          <div className="font-medium">{trade.symbol}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(trade.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${trade.amount?.toFixed(2) || '0.00'}</div>
                        <Badge variant="outline" className="text-xs">
                          {trade.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TradingErrorBoundary>
  );
};

export default TradingInterface;
