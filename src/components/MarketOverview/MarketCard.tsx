
import { memo } from "react";
import { Card } from "@/components/ui/card";

export interface Market {
  name: string;
  value: string;
  change: string;
  previousValue?: string;
  symbol: string;
}

interface MarketCardProps {
  market: Market;
}

const MarketCard = memo(({ market }: MarketCardProps) => (
  <Card className="card-gradient p-3 sm:p-4">
    <h3 className="text-sm sm:text-base font-semibold text-foreground/80">{market.name}</h3>
    <p className={`text-lg sm:text-2xl font-bold text-foreground transition-colors duration-300 ${
      market.previousValue && parseFloat(market.value.replace(/[$,]/g, '')) > parseFloat(market.previousValue.replace(/[$,]/g, ''))
        ? 'text-green-500'
        : market.previousValue && parseFloat(market.value.replace(/[$,]/g, '')) < parseFloat(market.previousValue.replace(/[$,]/g, ''))
        ? 'text-red-500'
        : ''
    }`}>
      {market.value}
    </p>
    <span className={`text-xs sm:text-sm ${market.change.startsWith("+") ? "text-green-500" : "text-red-500"}`}>
      {market.change}
    </span>
  </Card>
));

MarketCard.displayName = 'MarketCard';

export default MarketCard;
