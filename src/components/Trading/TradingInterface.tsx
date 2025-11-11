
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import StockSelector from "./StockSelector";
import StockInfo from "./StockInfo";
import OrderForm from "./OrderForm";
import StockChart from "./StockChart";
import { useTrading } from "@/hooks/useTrading";
import { TradingErrorBoundary } from "@/components/ErrorBoundary/TradingErrorBoundary";

const TradingInterface = () => {
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

  // Add a dummy cash balance for demonstration
  const cashBalance = 10000;

  return (
    <TradingErrorBoundary>
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
                userPosition={userPosition}
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
          />
        </div>
      </div>
    </TradingErrorBoundary>
  );
};

export default TradingInterface;
