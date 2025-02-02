import { Card } from "@/components/ui/card";
import { useState, useEffect, useCallback, memo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { finnhubSocket } from "@/utils/finnhubSocket";

interface Market {
  name: string;
  value: string;
  change: string;
  previousValue?: string;
  symbol: string;
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

const MarketOverview = () => {
  const [markets, setMarkets] = useState<Market[]>([
    { name: "Lusaka SEC All Share", value: "7,245.32", change: "+1.2%", symbol: "LUSE.ZM" },
    { name: "NSE All Share", value: "54,123.45", change: "-0.5%", symbol: "NSE.KE" },
    { name: "JSE Top 40", value: "68,432.12", change: "+0.8%", symbol: "TOP40.JO" },
    { name: "EGX 30", value: "24,567.89", change: "-0.3%", symbol: "EGX30.EG" },
    { name: "NSE Nigeria", value: "45,678.90", change: "+0.6%", symbol: "NGSE.NG" },
    { name: "GSE Composite", value: "3,456.78", change: "-0.4%", symbol: "GSE.GH" }
  ]);

  const isMobile = useIsMobile();

  useEffect(() => {
    console.log("Setting up market data subscriptions");
    
    // Subscribe to all market symbols
    markets.forEach(market => {
      finnhubSocket.subscribe(market.symbol);
    });

    // Set up data handler
    const unsubscribe = finnhubSocket.onMarketData(({ symbol, price }) => {
      console.log("Received market data:", { symbol, price });
      
      setMarkets(prevMarkets => 
        prevMarkets.map(market => {
          if (market.symbol === symbol) {
            const prevValue = parseFloat(market.value.replace(',', ''));
            const newValue = price;
            const percentChange = ((newValue - prevValue) / prevValue * 100).toFixed(2);
            
            return {
              ...market,
              previousValue: market.value,
              value: newValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }),
              change: `${percentChange.startsWith('-') ? '' : '+'}${percentChange}%`
            };
          }
          return market;
        })
      );
    });

    // Cleanup subscriptions
    return () => {
      console.log("Cleaning up market data subscriptions");
      markets.forEach(market => {
        finnhubSocket.unsubscribe(market.symbol);
      });
      unsubscribe();
    };
  }, [markets]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 content-visibility-auto">
      {markets.map((market) => (
        <MarketCard key={market.symbol} market={market} />
      ))}
    </div>
  );
};

export default memo(MarketOverview);