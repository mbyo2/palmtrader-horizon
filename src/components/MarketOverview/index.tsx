
import { useState, useEffect, memo } from "react";
import { useRealTimeMarketData } from "@/hooks/useRealTimeMarketData";
import MarketCard, { Market } from "./MarketCard";

const formatCurrency = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numValue);
};

const INITIAL_MARKETS: Market[] = [
  { name: "Apple Inc.", value: formatCurrency(180.00), change: "+0.0%", symbol: "AAPL" },
  { name: "Microsoft Corp.", value: formatCurrency(350.00), change: "+0.0%", symbol: "MSFT" },
  { name: "Amazon.com Inc.", value: formatCurrency(145.00), change: "+0.0%", symbol: "AMZN" },
  { name: "Alphabet Inc.", value: formatCurrency(140.00), change: "+0.0%", symbol: "GOOGL" },
  { name: "NVIDIA Corp.", value: formatCurrency(450.00), change: "+0.0%", symbol: "NVDA" },
  { name: "Meta Platforms Inc.", value: formatCurrency(330.00), change: "+0.0%", symbol: "META" }
];

const MarketOverview = () => {
  const [markets, setMarkets] = useState<Market[]>(INITIAL_MARKETS);
  
  // Get all symbols for the markets
  const symbols = markets.map(m => m.symbol);
  
  // Use our new real-time data hook
  const { isLoading } = useRealTimeMarketData(symbols, (data) => {
    // Update the specific market when new data arrives
    setMarkets(prev => 
      prev.map(market => {
        if (market.symbol === data.symbol) {
          const previousValue = market.value;
          const newValue = formatCurrency(data.price);
          const change = data.change ?? 0;
          
          return {
            ...market,
            previousValue,
            value: newValue,
            change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`
          };
        }
        return market;
      })
    );
  });
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 content-visibility-auto">
      {markets.map((market) => (
        <MarketCard key={market.symbol} market={market} />
      ))}
    </div>
  );
};

export default memo(MarketOverview);
