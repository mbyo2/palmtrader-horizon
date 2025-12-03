
import { useState, useEffect, memo } from "react";
import { useMultipleRealTimePrices } from "@/hooks/useRealTimePrice";
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
  const [initialData, setInitialData] = useState<Map<string, { name: string; price: number; change: number }>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  
  const MARKET_SYMBOLS = useMarketSymbols();
  const symbols = MARKET_SYMBOLS.map(m => m.symbol);
  
  // Subscribe to real-time prices using the unified service
  const { prices, isLoading: pricesLoading } = useMultipleRealTimePrices(symbols);
  
  // Fetch initial data as fallback
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      const data = new Map<string, { name: string; price: number; change: number }>();
      
      for (const { symbol, name } of MARKET_SYMBOLS) {
        try {
          const priceData = await MarketDataService.fetchLatestPrice(symbol);
          data.set(symbol, {
            name,
            price: priceData.price,
            change: priceData.changePercent || 0
          });
        } catch (error) {
          console.error(`Failed to fetch data for ${symbol}:`, error);
        }
      }
      
      setInitialData(data);
      setIsLoading(false);
    };

    if (MARKET_SYMBOLS.length > 0) {
      fetchInitialData();
    }
  }, [MARKET_SYMBOLS]);

  // Combine real-time prices with initial data
  const markets: Market[] = MARKET_SYMBOLS.map(({ symbol, name }) => {
    const realTimeData = prices.get(symbol);
    const initialPriceData = initialData.get(symbol);
    
    const price = realTimeData?.price ?? initialPriceData?.price ?? 0;
    const changePercent = realTimeData?.changePercent ?? initialPriceData?.change ?? 0;
    
    return {
      name,
      symbol,
      value: formatCurrency(price),
      change: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`
    };
  });

  if (isLoading && !prices.size) {
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
