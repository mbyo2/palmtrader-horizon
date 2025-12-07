import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Stock } from "./useStockData";

const useWatchlistData = () => {
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

    // Set up real-time subscription for watchlist changes with error handling
    let channel: ReturnType<typeof supabase.channel> | null = null;
    
    try {
      channel = supabase
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
        .subscribe((status, err) => {
          if (err) {
            console.warn('Watchlist subscription error:', err);
          }
          if (status === 'CHANNEL_ERROR') {
            console.warn('Watchlist channel error, will retry on next mount');
          }
        });
    } catch (error) {
      console.warn('Failed to setup watchlist subscription:', error);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel).catch(() => {
          // Ignore cleanup errors
        });
      }
    };
  }, [user]);

  return { watchlistStocks, loading, error };
};

export default useWatchlistData;