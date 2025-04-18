
import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import WatchlistButton from "../WatchlistButton";
import { useMarketPrice } from "@/hooks/useMarketDataQuery";

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
  // Use the optimized hook for market price data
  const { data: priceData, isLoading } = useMarketPrice(stock.symbol, {
    initialData: { 
      symbol: stock.symbol, 
      price: parseFloat(stock.price), 
      change: 0 
    }
  });

  if (isLoading) {
    return <Skeleton className="h-24" />;
  }

  const currentPrice = priceData?.price.toFixed(2) || stock.price;
  
  return (
    <Card className="card-gradient p-4 hover:shadow-lg transition-all duration-200 m-1">
      <div className="flex justify-between items-center">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-foreground truncate">{stock.symbol}</h3>
            <WatchlistButton symbol={stock.symbol} />
          </div>
          <p className="text-sm text-foreground/70 truncate">{stock.name}</p>
        </div>
        <div className="text-right ml-4">
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
      </div>
    </Card>
  );
});

StockCard.displayName = 'StockCard';

export default StockCard;
