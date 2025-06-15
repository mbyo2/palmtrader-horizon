
import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import WatchlistButton from "../WatchlistButton";
import PriceSourceIndicator from "../PriceDisplay/PriceSourceIndicator";
import { useEnhancedMarketPrice } from "@/hooks/useEnhancedMarketPrice";

export interface Stock {
  symbol: string;
  name: string;
  price: string;
  change: string;
  previousPrice?: string;
}

interface EnhancedStockCardProps {
  stock: Stock;
}

const EnhancedStockCard = memo(({ stock }: EnhancedStockCardProps) => {
  const { priceData, isLoading, isConnected, source, lastUpdate, isRealTime } = useEnhancedMarketPrice(stock.symbol);

  if (isLoading) {
    return <Skeleton className="h-24" />;
  }

  const currentPrice = priceData?.price?.toFixed(2) || stock.price;
  const changePercent = priceData?.change?.toFixed(2) || "0.00";
  const changeText = `${changePercent >= 0 ? '+' : ''}${changePercent}%`;
  
  return (
    <Card className="card-gradient p-4 hover:shadow-lg transition-all duration-200 m-1">
      <div className="flex justify-between items-center">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-foreground truncate">{stock.symbol}</h3>
            <WatchlistButton symbol={stock.symbol} />
            {isConnected && isRealTime && (
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" title="Live data" />
            )}
          </div>
          <p className="text-sm text-foreground/70 truncate">{stock.name}</p>
          <PriceSourceIndicator 
            source={source as any}
            timestamp={priceData?.timestamp}
            isRealTime={isRealTime}
          />
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
          <span className={`text-sm ${changePercent >= 0 ? "text-green-500" : "text-red-500"}`}>
            {changeText}
          </span>
        </div>
      </div>
    </Card>
  );
});

EnhancedStockCard.displayName = 'EnhancedStockCard';

export default EnhancedStockCard;
