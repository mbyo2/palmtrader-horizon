
import { useQuery } from "@tanstack/react-query";
import { MarketDataService } from "@/services/MarketDataService";
import { MarketData } from "@/services/market/types";

export function useMarketDataQuery(symbol: string, options = {}) {
  return useQuery({
    queryKey: ["marketData", symbol],
    queryFn: () => MarketDataService.fetchHistoricalData(symbol),
    staleTime: 30000, // Data stays fresh for 30 seconds
    cacheTime: 5 * 60 * 1000, // Cache persists for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    ...options
  });
}

export function useMarketPrice(symbol: string, options = {}) {
  return useQuery({
    queryKey: ["marketPrice", symbol],
    queryFn: () => MarketDataService.fetchLatestPrice(symbol),
    staleTime: 10000, // Price stays fresh for 10 seconds
    ...options
  });
}

