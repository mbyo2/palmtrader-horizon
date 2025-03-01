
import { supabase } from "@/integrations/supabase/client";
import { MarketData, MarketDataCallback } from "./types";

export const SubscriptionService = {
  subscribeToUpdates(symbol: string, callback: MarketDataCallback) {
    if (!symbol) return { unsubscribe: () => {} };
    
    const formattedSymbol = symbol.toUpperCase();
    return supabase
      .channel('market_data_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'market_data',
          filter: `symbol=eq.${formattedSymbol}`,
        },
        (payload) => callback(payload.new as MarketData)
      )
      .subscribe();
  }
};
