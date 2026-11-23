
import { memo } from "react";
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

/**
 * One market row in the overview list — the Binance/Coinbase pattern:
 * symbol + name on the left, tabular price and coloured change text on
 * the right, hairline divider below. No card, no badge, no decoration.
 */
const EnhancedMarketCard = memo(({ market }: EnhancedMarketCardProps) => {
  const { priceData, isConnected, isRealTime } = useEnhancedMarketPrice(market.symbol);

  const currentValue = priceData ? `$${priceData.price.toFixed(2)}` : market.value;
  const changeValue = priceData?.change || 0;
  const changeText = priceData ? `${changeValue >= 0 ? '+' : ''}${changeValue.toFixed(2)}%` : market.change;
  const up = changeText.startsWith("+");

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{market.symbol}</p>
          <p className="truncate text-xs text-muted-foreground">{market.name}</p>
        </div>
        {isConnected && isRealTime && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gain" title="Live data" />
        )}
      </div>
      <div className="text-right">
        <p className="text-sm tabular-nums text-foreground">{currentValue}</p>
        <p className={`text-xs tabular-nums ${up ? "text-gain" : "text-loss"}`}>{changeText}</p>
      </div>
    </div>
  );
});

EnhancedMarketCard.displayName = 'EnhancedMarketCard';

export default EnhancedMarketCard;
