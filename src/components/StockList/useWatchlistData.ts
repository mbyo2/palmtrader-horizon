import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Stock } from "./useStockData";

export const useWatchlistData = () => {
  const { user } = useAuth();
  const [watchlistStocks, setWatchlistStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchWatchlistStocks = async () => {
      try {
        setLoading(true);
        
        // Fetch user's watchlist
        const { data: watchlistData, error: watchlistError } = await supabase
          .from('watchlists')
          .select('symbol')
          .eq('user_id', user.id);

        if (watchlistError) throw watchlistError;

        if (!watchlistData || watchlistData.length === 0) {
          setWatchlistStocks([]);
          setLoading(false);
          return;
        }

        // Convert to stock objects with initial data
        const stocks: Stock[] = watchlistData.map(item => ({
          symbol: item.symbol,
          name: `${item.symbol} Inc.`,
          price: "0.00",
          change: "+0.0%"
        }));

        setWatchlistStocks(stocks);
      } catch (err) {
        console.error("Error fetching watchlist data:", err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchWatchlistStocks();

    // Set up real-time subscription for watchlist changes
    const subscription = supabase
      .channel('watchlist_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'watchlists',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchWatchlistStocks();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return { watchlistStocks, loading, error };
};