import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

  useEffect(() => {
    // Subscribe to real-time updates
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
          console.log('Received real-time market data:', payload)
          
          // Update the corresponding market data
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {markets.map((market) => (
        <Card key={market.name} className="card-gradient p-3 sm:p-4">
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
      ))}
    </div>
  );
};

export default MarketOverview;