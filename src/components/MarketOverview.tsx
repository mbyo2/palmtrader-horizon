import { Card } from "@/components/ui/card";
import { useState, useEffect, useCallback, memo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface Market {
  name: string;
  value: string;
  change: string;
  previousValue?: string;
}

const MarketCard = memo(({ market }: { market: Market }) => (
  <Card className="card-gradient p-3 sm:p-4">
    <h3 className="text-sm sm:text-base font-semibold text-foreground/80">{market.name}</h3>
    <p className={`text-lg sm:text-2xl font-bold text-foreground transition-colors duration-300 ${
      market.previousValue && parseFloat(market.value.replace(',', '')) > parseFloat(market.previousValue.replace(',', ''))
        ? 'text-green-500'
        : market.previousValue && parseFloat(market.value.replace(',', '')) < parseFloat(market.previousValue.replace(',', ''))
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

const generateRandomChange = () => {
  const isPositive = Math.random() > 0.5;
  const change = (Math.random() * 2).toFixed(1);
  return `${isPositive ? '+' : '-'}${change}%`;
};

const generateRandomValue = (baseValue: number) => {
  const change = (Math.random() - 0.5) * 100;
  return (baseValue + change).toFixed(2);
};

const MarketOverview = () => {
  const [markets, setMarkets] = useState<Market[]>([
    { name: "Lusaka SEC", value: "7,245.32", change: "+1.2%" },
    { name: "NSE", value: "54,123.45", change: "-0.5%" },
    { name: "JSE", value: "68,432.12", change: "+0.8%" },
  ]);

  const isMobile = useIsMobile();

  const updateMarkets = useCallback(() => {
    setMarkets(prevMarkets => 
      prevMarkets.map(market => {
        const currentValue = parseFloat(market.value.replace(',', ''));
        const newValue = generateRandomValue(currentValue);
        
        return {
          ...market,
          previousValue: market.value,
          value: Number(newValue).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }),
          change: generateRandomChange()
        };
      })
    );
  }, []);

  useEffect(() => {
    // Update less frequently on mobile devices
    const interval = setInterval(updateMarkets, isMobile ? 5000 : 2000);
    return () => clearInterval(interval);
  }, [updateMarkets, isMobile]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 content-visibility-auto">
      {markets.map((market) => (
        <MarketCard key={market.name} market={market} />
      ))}
    </div>
  );
};

export default memo(MarketOverview);