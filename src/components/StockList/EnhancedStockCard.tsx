
import { memo, useMemo, useCallback } from "react";
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
  const { priceData, isLoading, isConnected, source, isRealTime } = useEnhancedMarketPrice(stock.symbol);

  // Memoize expensive calculations
  const memoizedPriceData = useMemo(() => {
    const currentPrice = priceData?.price?.toFixed(2) || stock.price;
    const rawChangePercent = priceData?.change?.toFixed(2) || parseFloat(stock.change.replace(/[+%]/g, '')) || 0;
    const changePercentNum = typeof rawChangePercent === 'string' ? parseFloat(rawChangePercent) : rawChangePercent;
    const changeText = `${changePercentNum >= 0 ? '+' : ''}${changePercentNum.toFixed(2)}%`;
    
    return { currentPrice, changePercentNum, changeText };
  }, [priceData?.price, priceData?.change, stock.price, stock.change]);

  // Memoize price color calculation
  const priceColorClass = useMemo(() => {
    if (!stock.previousPrice) return '';
    const currentPriceNum = parseFloat(memoizedPriceData.currentPrice);
    const previousPriceNum = parseFloat(stock.previousPrice);
    
    if (currentPriceNum > previousPriceNum) return 'text-green-500';
    if (currentPriceNum < previousPriceNum) return 'text-red-500';
    return '';
  }, [memoizedPriceData.currentPrice, stock.previousPrice]);

  // Memoize change color class
  const changeColorClass = useMemo(() => 
    memoizedPriceData.changePercentNum >= 0 ? "text-green-500" : "text-red-500",
    [memoizedPriceData.changePercentNum]
  );

  const handleCardClick = useCallback(() => {
    // Handle card click with minimal re-renders
  }, []);

  if (isLoading) {
    return <Skeleton className="h-24 mx-1" />;
  }
  
  return (
    <Card 
      className="card-gradient p-4 hover:shadow-lg transition-shadow duration-200 m-1 cursor-pointer will-change-transform"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
    >
      <div className="flex justify-between items-center">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-foreground truncate">{stock.symbol}</h3>
            <WatchlistButton symbol={stock.symbol} />
            {isConnected && isRealTime && (
              <div 
                className="h-2 w-2 bg-green-500 rounded-full animate-pulse" 
                title="Live data"
                aria-label="Live market data"
              />
            )}
          </div>
          <p className="text-sm text-foreground/70 truncate">{stock.name}</p>
          <PriceSourceIndicator 
            source={source as 'finnhub' | 'alpha_vantage' | 'cache' | 'mock'}
            timestamp={priceData?.timestamp}
            isRealTime={isRealTime}
          />
        </div>
        <div className="text-right ml-4">
          <p className={`font-bold text-foreground transition-colors duration-300 ${priceColorClass}`}>
            ${memoizedPriceData.currentPrice}
          </p>
          <span className={`text-sm ${changeColorClass}`}>
            {memoizedPriceData.changeText}
          </span>
        </div>
      </div>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.stock.symbol === nextProps.stock.symbol &&
    prevProps.stock.price === nextProps.stock.price &&
    prevProps.stock.change === nextProps.stock.change &&
    prevProps.stock.previousPrice === nextProps.stock.previousPrice
  );
});

EnhancedStockCard.displayName = 'EnhancedStockCard';

export default EnhancedStockCard;
