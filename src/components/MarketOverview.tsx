import { Card } from "@/components/ui/card";
import { useState, useEffect, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

interface Market {
  name: string;
  value: string;
  change: string;
  previousValue?: string;
}

// Memoize the MarketCard component to prevent unnecessary re-renders
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
    { name: "Lusaka SEC", value: "7,245.32", change: "+1.2%" },
    { name: "NSE", value: "54,123.45", change: "-0.5%" },
    { name: "JSE", value: "68,432.12", change: "+0.8%" },
  ]);

  const isMobile = useIsMobile();

  // Debounce market updates to prevent too frequent re-renders
  const updateMarket = useCallback((payload: any) => {
    console.log('Received real-time market data:', payload);
    
    setMarkets(prevMarkets => 
      prevMarkets.map(market => {
        if (market.name.includes(payload.new.symbol)) {
          const newValue = parseFloat(payload.new.price).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
          
          const previousValueNum = parseFloat(market.value.replace(',', ''));
          const newValueNum = payload.new.price;
          const changePercent = ((newValueNum - previousValueNum) / previousValueNum) * 100;
          
          return {
            ...market,
            previousValue: market.value,
            value: newValue,
            change: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`
          };
        }
        return market;
      })
    );
  }, []);

  useEffect(() => {
    let timeoutId: number;
    
    // Subscribe to real-time updates with debouncing
    const channel = supabase
      .channel('market-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'market_data'
        },
        (payload) => {
          // Debounce updates on mobile devices
          if (isMobile) {
            window.clearTimeout(timeoutId);
            timeoutId = window.setTimeout(() => updateMarket(payload), 1000);
          } else {
            updateMarket(payload);
          }
        }
      )
      .subscribe();

    return () => {
      window.clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [updateMarket, isMobile]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 content-visibility-auto">
      {markets.map((market) => (
        <MarketCard key={market.name} market={market} />
      ))}
    </div>
  );
};

export default memo(MarketOverview);