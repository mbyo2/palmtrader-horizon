
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import StockSelector from "./StockSelector";
import StockInfo from "./StockInfo";
import OrderForm from "./OrderForm";
import StockChart from "./StockChart";
import { useTrading } from "@/hooks/useTrading";

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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Trade Stocks</CardTitle>
          <CardDescription>Buy and sell stocks with real-time pricing</CardDescription>
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
      
      <StockChart 
        symbol={symbol}
        historicalData={historicalData || []}
        isHistoricalLoading={isHistoricalLoading}
      />
    </div>
  );
};

export default TradingInterface;
