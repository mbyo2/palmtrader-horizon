import { Card } from "@/components/ui/card";
import OrderForm from "./OrderForm";
import PositionsList from "./PositionsList";
import { useTrading } from "@/hooks/useTrading";
import { TradingErrorBoundary } from "@/components/ErrorBoundary/TradingErrorBoundary";
import { useRealTimePortfolio } from "@/hooks/useRealTimePortfolio";

const TradingView = () => {
  const { positions } = useRealTimePortfolio();

  const positionsForList = positions.map(p => ({
    symbol: p.symbol,
    shares: p.shares,
    averagePrice: p.averagePrice,
  }));

  const {
    symbol, 
    orderAction, 
    setOrderAction, 
    stockPrice, 
    userPosition, 
    isSubmitting, 
    handleSubmitOrder
  } = useTrading("AAPL");

  return (
    <TradingErrorBoundary>
      <div className="space-y-6">
        <Card className="p-6 card-gradient">
          <h2 className="text-xl font-semibold mb-4">Place Order</h2>
          <OrderForm
            symbol={symbol}
            stockPrice={stockPrice}
            orderAction={orderAction}
            userPosition={userPosition}
            isSubmitting={isSubmitting}
            onOrderActionChange={setOrderAction}
            onSubmitOrder={handleSubmitOrder}
          />
        </Card>

        <Card className="p-6 card-gradient">
          <h2 className="text-xl font-semibold mb-4">Current Positions</h2>
          <PositionsList positions={positionsForList} />
        </Card>
      </div>
    </TradingErrorBoundary>
  );
};

export default TradingView;
