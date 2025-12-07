
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import StockSelector from "./StockSelector";
import StockInfo from "./StockInfo";
import OrderForm from "./OrderForm";
import StockChart from "./StockChart";
import { WalletBalanceDisplay } from "./WalletBalanceDisplay";
import { ConnectionStatusIndicator } from "./ConnectionStatusIndicator";
import { useTrading } from "@/hooks/useTrading";
import { useAuth } from "@/hooks/useAuth";
import { TradingErrorBoundary } from "@/components/ErrorBoundary/TradingErrorBoundary";
import { supabase } from "@/integrations/supabase/client";

const TradingInterface = () => {
  const { user } = useAuth();
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
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <TradingErrorBoundary>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <WalletBalanceDisplay />
          <ConnectionStatusIndicator />
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <Card className="w-full order-2 xl:order-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">Trade Stocks</CardTitle>
              <CardDescription className="text-sm">Buy and sell stocks with real-time pricing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <StockSelector 
                  symbol={symbol} 
                  onSymbolChange={setSymbol} 
                />

                <StockInfo 
                  symbol={symbol}
                  price={stockPrice?.price || 0}
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
          
          <div className="order-1 xl:order-2">
            <StockChart 
              symbol={symbol}
              historicalData={historicalData || []}
              isHistoricalLoading={isHistoricalLoading}
              recentTransactions={recentTransactions}
            />
          </div>
        </div>
      </div>
    </TradingErrorBoundary>
  );
};

export default TradingInterface;
