
import { useState, useEffect, memo } from "react";
import { useRealTimeMarketData } from "@/hooks/useRealTimeMarketData";
import { MarketDataService } from "@/services/MarketDataService";
import EnhancedMarketCard, { Market } from "./EnhancedMarketCard";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

const formatCurrency = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numValue);
};

// Dynamic market symbols fetched from database
const useMarketSymbols = () => {
  const [symbols, setSymbols] = useState([
    { symbol: "AAPL", name: "Apple Inc." },
    { symbol: "MSFT", name: "Microsoft Corp." },
    { symbol: "AMZN", name: "Amazon.com Inc." },
    { symbol: "GOOGL", name: "Alphabet Inc." },
    { symbol: "NVDA", name: "NVIDIA Corp." },
    { symbol: "META", name: "Meta Platforms Inc." }
  ]);

  useEffect(() => {
    const fetchPopularSymbols = async () => {
      try {
        const { data } = await supabase.rpc("get_popular_stocks");
        if (data && data.length > 0) {
          const popularSymbols = data.slice(0, 6).map((stock: any) => ({
            symbol: stock.symbol,
            name: `${stock.symbol} Inc.`
          }));
          
          // Combine with default symbols if we don't have enough popular ones
          const defaultSymbols = [
            { symbol: "AAPL", name: "Apple Inc." },
            { symbol: "MSFT", name: "Microsoft Corp." },
            { symbol: "AMZN", name: "Amazon.com Inc." },
            { symbol: "GOOGL", name: "Alphabet Inc." },
            { symbol: "NVDA", name: "NVIDIA Corp." },
            { symbol: "META", name: "Meta Platforms Inc." }
          ];
          
          const combinedSymbols = [...popularSymbols];
          defaultSymbols.forEach(defaultSymbol => {
            if (!combinedSymbols.find(s => s.symbol === defaultSymbol.symbol)) {
              combinedSymbols.push(defaultSymbol);
            }
          });
          
          setSymbols(combinedSymbols.slice(0, 6));
        }
      } catch (error) {
        console.error("Error fetching popular symbols:", error);
        // Keep default symbols on error
      }
    };

    fetchPopularSymbols();
  }, []);

  return symbols;
};

const MarketOverview = () => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const MARKET_SYMBOLS = useMarketSymbols();
  const symbols = MARKET_SYMBOLS.map(m => m.symbol);
  
  // Fetch initial data for all symbols
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const initialMarkets: Market[] = [];
        
        for (const { symbol, name } of MARKET_SYMBOLS) {
          try {
            const data = await MarketDataService.fetchLatestPrice(symbol);
            initialMarkets.push({
              name,
              symbol,
              value: formatCurrency(data.price),
              change: `${data.change ? (data.change >= 0 ? '+' : '') + data.change.toFixed(2) : '+0.00'}%`
            });
          } catch (error) {
            console.error(`Failed to fetch data for ${symbol}:`, error);
            // Add placeholder with no price data
            initialMarkets.push({
              name,
              symbol,
              value: formatCurrency(0),
              change: "+0.00%"
            });
          }
        }
        
        setMarkets(initialMarkets);
      } catch (error) {
        console.error("Error fetching initial market data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);
  
  // Use real-time data hook for updates
  const { } = useRealTimeMarketData(symbols, (data) => {
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

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 content-visibility-auto">
      {markets.map((market) => (
        <EnhancedMarketCard key={market.symbol} market={market} />
      ))}
    </div>
  );
};

export default memo(MarketOverview);
