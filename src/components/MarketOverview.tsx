
import { Card } from "@/components/ui/card";
import { useState, useEffect, useCallback, memo, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MarketDataService, MarketData } from "@/services/MarketDataService";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

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

  const { toast } = useToast();
  const marketDataCache = useRef(new Map<string, { value: string; timestamp: number }>());
  const cacheExpiration = 5000; // 5 seconds

  // Fetch initial market data for each symbol
  useEffect(() => {
    const fetchInitialData = async () => {
      for (const market of markets) {
        try {
          const data = await MarketDataService.fetchLatestPrice(market.symbol);
          if (data) {
            handleMarketUpdate(market.symbol, data.price);
          }
        } catch (error) {
          console.error(`Error fetching data for ${market.symbol}:`, error);
        }
      }
    };

    fetchInitialData();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const subscriptions = markets.map(market => {
      return MarketDataService.subscribeToUpdates(market.symbol, (data) => {
        handleMarketUpdate(market.symbol, data.price);
      });
    });

    return () => {
      subscriptions.forEach(subscription => subscription.unsubscribe());
    };
  }, [markets]);

  const handleMarketUpdate = useCallback((symbol: string, price: number) => {
    const now = Date.now();
    const cachedData = marketDataCache.current.get(symbol);
    
    // Check cache to prevent too frequent updates
    if (cachedData && now - cachedData.timestamp < cacheExpiration) {
      return;
    }

    marketDataCache.current.set(symbol, { value: price.toString(), timestamp: now });
    
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
  }, []);

  // Clear cache periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      marketDataCache.current.forEach((value, key) => {
        if (now - value.timestamp > cacheExpiration) {
          marketDataCache.current.delete(key);
        }
      });
    }, cacheExpiration);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 content-visibility-auto">
      {markets.map((market) => (
        <MarketCard key={market.symbol} market={market} />
      ))}
    </div>
  );
};

export default memo(MarketOverview);
