
import { useState, useEffect } from "react";
import { finnhubSocket } from "@/utils/finnhubSocket";
import { wsManager } from "@/services/market/WebSocketManager";
import { supabase } from "@/integrations/supabase/client";
import { nanoid } from "nanoid";

export interface Stock {
  symbol: string;
  name: string;
  price: string;
  change: string;
  previousPrice?: string;
}

export const useStockData = (searchQuery: string) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const subscriberId = nanoid();

  // Fetch dynamic stock list from database or popular symbols
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let isActive = true;

    const fetchStockList = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try to get stocks from watchlists and trades to make it dynamic
        const { data: watchlistStocks, error: watchlistError } = await supabase
          .from('watchlists')
          .select('symbol')
          .limit(20);

        const { data: tradedStocks, error: tradesError } = await supabase
          .from('trades')
          .select('symbol')
          .limit(20);

        if (watchlistError) console.warn('Error fetching watchlist stocks:', watchlistError);
        if (tradesError) console.warn('Error fetching traded stocks:', tradesError);

        // Combine and deduplicate symbols
        const allSymbols = new Set<string>();
        
        watchlistStocks?.forEach(item => {
          if (item.symbol) allSymbols.add(item.symbol);
        });
        tradedStocks?.forEach(item => {
          if (item.symbol) allSymbols.add(item.symbol);
        });

        // If we don't have enough dynamic data, add some popular symbols
        const popularSymbols = [
          "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA",
          "JPM", "V", "UNH", "HD", "PG", "MA", "DIS", "PYPL", "ADBE"
        ];

        popularSymbols.forEach(symbol => allSymbols.add(symbol));

        // Convert to stock objects with initial data
        const stockList: Stock[] = Array.from(allSymbols).slice(0, 20).map(symbol => ({
          symbol,
          name: `${symbol} Inc.`,
          price: "0.00",
          change: "+0.0%"
        }));

        if (!isActive) return;

        setStocks(stockList);
        
        // Subscribe to real-time updates for all stocks
        stockList.forEach(stock => {
          try {
            wsManager.subscribe(stock.symbol, subscriberId);
          } catch (e) {
            console.warn(`Failed to subscribe to ${stock.symbol}:`, e);
          }
        });

        // Set up data handler
        const unsubscribe = finnhubSocket.onMarketData(({ symbol, price }) => {
          if (!symbol || !price || !isActive) return;
          
          setStocks(prevStocks => 
            prevStocks.map(stock => {
              if (stock.symbol === symbol) {
                const prevPrice = parseFloat(stock.price);
                const percentChange = prevPrice > 0 ? ((price - prevPrice) / prevPrice * 100).toFixed(2) : "0.00";
                
                return {
                  ...stock,
                  previousPrice: stock.price,
                  price: price.toFixed(2),
                  change: `${percentChange.startsWith('-') ? '' : '+'}${percentChange}%`
                };
              }
              return stock;
            })
          );
        });

        if (isActive) {
          setLoading(false);
        }

        // Set up cleanup function
        cleanup = () => {
          stockList.forEach(stock => {
            try {
              wsManager.unsubscribe(stock.symbol, subscriberId);
            } catch (e) {
              console.warn(`Failed to unsubscribe from ${stock.symbol}:`, e);
            }
          });
          unsubscribe();
        };

      } catch (err) {
        if (isActive) {
          console.warn("Error in useStockData:", err);
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setLoading(false);
        }
      }
    };

    fetchStockList();

    // Cleanup function
    return () => {
      isActive = false;
      if (cleanup) {
        cleanup();
      }
    };
  }, [subscriberId]);

  // Filter stocks based on search query
  const filteredStocks = stocks.filter(
    (stock) =>
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return { filteredStocks, loading, error };
};
