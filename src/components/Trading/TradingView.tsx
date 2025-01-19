import { useState } from "react";
import { Card } from "@/components/ui/card";
import ErrorBoundary from "@/components/ErrorBoundary";
import OrderForm from "./OrderForm";
import PositionsList from "./PositionsList";

const TradingView = () => {
  const [positions, setPositions] = useState([
    { symbol: "AAPL", shares: 10, averagePrice: 150.5 },
    { symbol: "GOOGL", shares: 5, averagePrice: 2750.0 },
  ]);

  const handleOrderPlaced = () => {
    // Refresh positions after order is placed
    // You can implement the actual refresh logic here
    console.log("Order placed, refreshing positions...");
  };

  return (
    <div className="space-y-6">
      <ErrorBoundary>
        <Card className="p-6 card-gradient">
          <h2 className="text-xl font-semibold mb-4">Place Order</h2>
          <OrderForm onOrderPlaced={handleOrderPlaced} />
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