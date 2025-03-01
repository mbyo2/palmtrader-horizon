
import { Card } from "@/components/ui/card";
import { useState, useEffect, useCallback, memo, useRef } from "react";
import { MarketDataService } from "@/services/MarketDataService";
import { toast } from "sonner";
import { finnhubSocket } from "@/utils/finnhubSocket";

interface Market {
  name: string;
  value: string;
  change: string;
  previousValue?: string;
  symbol: string;
}

const formatCurrency = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numValue);
};

const MarketCard = memo(({ market }: { market: Market }) => (
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

const MarketOverview = () => {
  const [markets, setMarkets] = useState<Market[]>([
    { name: "Apple Inc.", value: formatCurrency(180.00), change: "+0.0%", symbol: "AAPL" },
    { name: "Microsoft Corp.", value: formatCurrency(350.00), change: "+0.0%", symbol: "MSFT" },
    { name: "Amazon.com Inc.", value: formatCurrency(145.00), change: "+0.0%", symbol: "AMZN" },
    { name: "Alphabet Inc.", value: formatCurrency(140.00), change: "+0.0%", symbol: "GOOGL" },
    { name: "NVIDIA Corp.", value: formatCurrency(450.00), change: "+0.0%", symbol: "NVDA" },
    { name: "Meta Platforms Inc.", value: formatCurrency(330.00), change: "+0.0%", symbol: "META" }
  ]);

  const marketDataCache = useRef(new Map<string, { value: string; timestamp: number }>());
  const cacheExpiration = 1000; // 1 second for more frequent updates

  // Subscribe to Finnhub WebSocket updates
  useEffect(() => {
    console.log("Setting up market overview real-time updates");
    
    // Subscribe to real-time updates for each market
    markets.forEach(market => {
      finnhubSocket.subscribe(market.symbol);
    });

    // Handle real-time market data updates
    const unsubscribe = finnhubSocket.onMarketData((data) => {
      if (data.price) {
        handleMarketUpdate(data.symbol, data.price);
      }
    });

    return () => {
      // Cleanup: unsubscribe from all symbols and WebSocket updates
      markets.forEach(market => {
        finnhubSocket.unsubscribe(market.symbol);
      });
      unsubscribe();
    };
  }, []);

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
          const prevValue = parseFloat(market.value.replace(/[$,]/g, ''));
          const newValue = price;
          const percentChange = ((newValue - prevValue) / prevValue * 100).toFixed(2);
          
          return {
            ...market,
            previousValue: market.value,
            value: formatCurrency(newValue),
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
