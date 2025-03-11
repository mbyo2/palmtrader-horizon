
import { Loader2 } from "lucide-react";

interface StockInfoProps {
  symbol: string;
  stockPrice: { price: number } | undefined;
  isPriceLoading: boolean;
  userPosition?: { shares: number } | null;
  orderAction: "buy" | "sell";
}

const StockInfo = ({ 
  symbol, 
  stockPrice, 
  isPriceLoading, 
  userPosition, 
  orderAction 
}: StockInfoProps) => {
  // Find the stock name from the popular stocks list if available
  const getStockName = () => {
    // Import is inside the component to avoid circular dependencies
    const { POPULAR_STOCKS } = require('./StockSelector');
    return POPULAR_STOCKS.find(s => s.symbol === symbol)?.name || "Stock";
  };

  return (
    <div className="flex items-center justify-between border rounded-md p-3">
      <div>
        <h3 className="font-medium">{symbol}</h3>
        <p className="text-sm text-muted-foreground">
          {getStockName()}
        </p>
      </div>
      <div className="text-right">
        <p className="font-medium">
          {isPriceLoading ? (
            <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
          ) : (
            `$${stockPrice?.price.toFixed(2) || "N/A"}`
          )}
        </p>
        {userPosition?.shares && orderAction === "sell" && (
          <p className="text-sm text-muted-foreground">
            You own: {userPosition.shares} shares
          </p>
        )}
      </div>
    </div>
  );
};

export default StockInfo;
