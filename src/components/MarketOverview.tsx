
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
    { name: "Apple Inc.", value: "180.00", change: "+0.0%", symbol: "AAPL" },
    { name: "Microsoft Corp.", value: "350.00", change: "+0.0%", symbol: "MSFT" },
    { name: "Amazon.com Inc.", value: "145.00", change: "+0.0%", symbol: "AMZN" },
    { name: "Alphabet Inc.", value: "140.00", change: "+0.0%", symbol: "GOOGL" },
    { name: "NVIDIA Corp.", value: "450.00", change: "+0.0%", symbol: "NVDA" },
    { name: "Meta Platforms Inc.", value: "330.00", change: "+0.0%", symbol: "META" }
  ]);

  const { toast } = useToast();
  const marketDataCache = useRef(new Map<string, { value: string; timestamp: number }>());
  const cacheExpiration = 5000; // 5 seconds

  // Fetch initial market data for each symbol
  useEffect(() => {
    const fetchInitialData = async () => {
      for (const market of markets) {
        try {
          // First try to fetch from cache
          const data = await MarketDataService.fetchLatestPrice(market.symbol);
          
          // If no data is found, try to refresh it from Alpha Vantage
          if (!data) {
            console.log(`No data found for ${market.symbol}, fetching from Alpha Vantage...`);
            const success = await MarketDataService.refreshMarketData(market.symbol, 'stock');
            
            if (success) {
              // Try fetching again after refresh
              const refreshedData = await MarketDataService.fetchLatestPrice(market.symbol);
              if (refreshedData) {
                handleMarketUpdate(market.symbol, refreshedData.price);
              }
            }
          } else {
            handleMarketUpdate(market.symbol, data.price);
          }
        } catch (error) {
          console.error(`Error fetching data for ${market.symbol}:`, error);
          toast({
            title: "Error",
            description: `Could not fetch data for ${market.symbol}`,
            variant: "destructive",
          });
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
