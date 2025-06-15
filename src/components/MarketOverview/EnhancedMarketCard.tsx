
import { memo } from "react";
import { Card } from "@/components/ui/card";
import PriceSourceIndicator from "../PriceDisplay/PriceSourceIndicator";
import { useEnhancedMarketPrice } from "@/hooks/useEnhancedMarketPrice";

export interface Market {
  name: string;
  value: string;
  change: string;
  previousValue?: string;
  symbol: string;
}

interface EnhancedMarketCardProps {
  market: Market;
}

const EnhancedMarketCard = memo(({ market }: EnhancedMarketCardProps) => {
  const { priceData, isConnected, source, isRealTime } = useEnhancedMarketPrice(market.symbol);
  
  const currentValue = priceData ? `$${priceData.price.toFixed(2)}` : market.value;
  const changeValue = priceData?.change || 0;
  const changeText = priceData ? `${changeValue >= 0 ? '+' : ''}${changeValue.toFixed(2)}%` : market.change;

  return (
    <Card className="card-gradient p-3 sm:p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm sm:text-base font-semibold text-foreground/80">{market.name}</h3>
        {isConnected && isRealTime && (
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" title="Live data" />
        )}
      </div>
      
      <p className={`text-lg sm:text-2xl font-bold text-foreground transition-colors duration-300 ${
        market.previousValue && parseFloat(currentValue.replace(/[$,]/g, '')) > parseFloat(market.previousValue.replace(/[$,]/g, ''))
          ? 'text-green-500'
          : market.previousValue && parseFloat(currentValue.replace(/[$,]/g, '')) < parseFloat(market.previousValue.replace(/[$,]/g, ''))
          ? 'text-red-500'
          : ''
      }`}>
        {currentValue}
      </p>
      
      <div className="flex items-center justify-between">
        <span className={`text-xs sm:text-sm ${changeText.startsWith("+") ? "text-green-500" : "text-red-500"}`}>
          {changeText}
        </span>
        <PriceSourceIndicator 
          source={source as 'finnhub' | 'alpha_vantage' | 'cache' | 'mock'}
          timestamp={priceData?.timestamp}
          isRealTime={isRealTime}
        />
      </div>
    </Card>
  );
});

EnhancedMarketCard.displayName = 'EnhancedMarketCard';

export default EnhancedMarketCard;
