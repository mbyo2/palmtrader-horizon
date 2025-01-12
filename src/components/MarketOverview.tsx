import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";

interface Market {
  name: string;
  value: string;
  change: string;
  previousValue?: string;
}

const MarketOverview = () => {
  const [markets, setMarkets] = useState<Market[]>([
    { name: "Lusaka SEC", value: "7,245.32", change: "+1.2%" },
    { name: "NSE", value: "54,123.45", change: "-0.5%" },
    { name: "JSE", value: "68,432.12", change: "+0.8%" },
  ]);

  // Simulate real-time updates
  useEffect(() => {
    const updateInterval = setInterval(() => {
      setMarkets(prevMarkets => 
        prevMarkets.map(market => {
          // Generate a random price change between -0.5% and +0.5%
          const changePercent = (Math.random() * 1 - 0.5) / 100;
          const currentValue = parseFloat(market.value.replace(',', ''));
          const newValue = currentValue * (1 + changePercent);
          const valueChange = ((newValue - currentValue) / currentValue) * 100;
          
          return {
            ...market,
            previousValue: market.value,
            value: newValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            change: `${valueChange >= 0 ? '+' : ''}${valueChange.toFixed(1)}%`
          };
        })
      );
    }, 5000); // Update every 5 seconds

    return () => clearInterval(updateInterval);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {markets.map((market) => (
        <Card key={market.name} className="card-gradient p-4">
          <h3 className="font-semibold text-foreground/80">{market.name}</h3>
          <p className={`text-2xl font-bold text-foreground transition-colors duration-300 ${
            market.previousValue && parseFloat(market.value.replace(',', '')) > parseFloat(market.previousValue.replace(',', ''))
              ? 'text-green-500'
              : market.previousValue && parseFloat(market.value.replace(',', '')) < parseFloat(market.previousValue.replace(',', ''))
              ? 'text-red-500'
              : ''
          }`}>
            {market.value}
          </p>
          <span className={`text-sm ${market.change.startsWith("+") ? "text-green-500" : "text-red-500"}`}>
            {market.change}
          </span>
        </Card>
      ))}
    </div>
  );
};

export default MarketOverview;