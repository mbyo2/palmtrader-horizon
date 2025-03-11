
import { useState } from "react";
import { Card } from "@/components/ui/card";
import ErrorBoundary from "@/components/ErrorBoundary";
import OrderForm from "./OrderForm";
import PositionsList from "./PositionsList";
import { useTrading } from "@/hooks/useTrading";

const TradingView = () => {
  const [positions, setPositions] = useState([
    { symbol: "AAPL", shares: 10, averagePrice: 150.5 },
    { symbol: "GOOGL", shares: 5, averagePrice: 2750.0 },
  ]);

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
    <div className="space-y-6">
      <ErrorBoundary>
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
          <PositionsList positions={positions} />
        </Card>
      </ErrorBoundary>
    </div>
  );
};

export default TradingView;
