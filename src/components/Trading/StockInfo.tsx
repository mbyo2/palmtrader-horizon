
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import PriceAlertModal from "@/components/Alerts/PriceAlertModal";

interface StockInfoProps {
  symbol: string;
  stockPrice: { price: number } | undefined;
  isPriceLoading: boolean;
  userPosition?: { shares: number } | null;
  orderAction: "buy" | "sell";
  cashBalance?: number;
}

const StockInfo = ({ 
  symbol, 
  stockPrice, 
  isPriceLoading, 
  userPosition, 
  orderAction,
  cashBalance
}: StockInfoProps) => {
  // Find the stock name from the popular stocks list if available
  const getStockName = () => {
    // Import is inside the component to avoid circular dependencies
    const { POPULAR_STOCKS } = require('./StockSelector');
    return POPULAR_STOCKS.find(s => s.symbol === symbol)?.name || "Stock";
  };

  return (
    <div className="flex flex-col space-y-4">
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
          
          {stockPrice && !isPriceLoading && (
            <div className="mt-1">
              <PriceAlertModal symbol={symbol} currentPrice={stockPrice.price}>
                <Button variant="outline" size="sm" className="text-xs flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Set Alert
                </Button>
              </PriceAlertModal>
            </div>
          )}
        </div>
      </div>
      
      {cashBalance !== undefined && (
        <div className="border rounded-md p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Available Cash:</span>
            <span className="font-medium">${cashBalance.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockInfo;
