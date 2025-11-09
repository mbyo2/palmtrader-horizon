
import { memo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import WatchlistButton from "../WatchlistButton";
import { useMarketPrice } from "@/hooks/useMarketDataQuery";
import { QuickTradeSheet } from "@/components/Trading/Mobile/QuickTradeSheet";
import { Zap } from "lucide-react";
import { useHaptic } from "@/hooks/useHaptic";
import { useIsMobile } from "@/hooks/use-mobile";

export interface Stock {
  symbol: string;
  name: string;
  price: string;
  change: string;
  previousPrice?: string;
}

interface StockCardProps {
  stock: Stock;
}

const StockCard = memo(({ stock }: StockCardProps) => {
  const [showQuickTrade, setShowQuickTrade] = useState(false);
  const { trigger } = useHaptic();
  const isMobile = useIsMobile();
  
  // Use the optimized hook for market price data
  const { data: priceData, isLoading } = useMarketPrice(stock.symbol, {
    initialData: { 
      symbol: stock.symbol, 
      price: parseFloat(stock.price), 
      change: 0 
    }
  });

  const handleQuickTradeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    trigger("medium");
    setShowQuickTrade(true);
  };

  if (isLoading) {
    return <Skeleton className="h-24" />;
  }

  const currentPrice = priceData?.price.toFixed(2) || stock.price;
  
  return (
    <>
      <Card className="card-gradient p-4 hover:shadow-lg transition-all duration-200 m-1">
        <div className="flex justify-between items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-foreground truncate">{stock.symbol}</h3>
              <WatchlistButton symbol={stock.symbol} />
            </div>
            <p className="text-sm text-foreground/70 truncate">{stock.name}</p>
          </div>
          <div className="text-right">
            <p className={`font-bold text-foreground transition-colors duration-300 ${
              stock.previousPrice && parseFloat(currentPrice) > parseFloat(stock.previousPrice)
                ? 'text-green-500'
                : stock.previousPrice && parseFloat(currentPrice) < parseFloat(stock.previousPrice)
                ? 'text-red-500'
                : ''
            }`}>
              ${currentPrice}
            </p>
            <span className={`text-sm ${stock.change.startsWith("+") ? "text-green-500" : "text-red-500"}`}>
              {stock.change}
            </span>
          </div>
          {isMobile && (
            <Button
              size="sm"
              onClick={handleQuickTradeClick}
              className="h-9 w-9 p-0 shrink-0"
              variant="outline"
            >
              <Zap className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Card>

      <QuickTradeSheet
        isOpen={showQuickTrade}
        onClose={() => setShowQuickTrade(false)}
        symbol={stock.symbol}
        companyName={stock.name}
        currentPrice={parseFloat(currentPrice)}
      />
    </>
  );
});

StockCard.displayName = 'StockCard';

export default StockCard;
