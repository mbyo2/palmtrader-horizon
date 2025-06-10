
import { useQuery } from "@tanstack/react-query";
import { MarketDataService } from "@/services/MarketDataService";
import { MarketData } from "@/services/market/types";

// Define a more aggressive stale time for less frequent data
const MARKET_DATA_STALE_TIME = 30000; // 30 seconds
const PRICE_DATA_STALE_TIME = 10000; // 10 seconds
const GC_TIME = 5 * 60 * 1000; // 5 minutes cache persistence

/**
 * Hook for querying historical market data for a symbol
 * @param symbol Stock symbol
 * @param options Additional React Query options
 * @returns Query result containing historical market data
 */
export function useMarketDataQuery(symbol: string, options = {}) {
  return useQuery({
    queryKey: ["marketData", symbol],
    queryFn: () => MarketDataService.fetchHistoricalData(symbol, 90),
    staleTime: MARKET_DATA_STALE_TIME,
    gcTime: GC_TIME, // Cache persists for 5 minutes (formerly cacheTime)
    refetchOnWindowFocus: false, // Don't refetch on window focus
    ...options
  });
}

/**
 * Hook for querying the latest price for a symbol
 * @param symbol Stock symbol 
 * @param options Additional React Query options
 * @returns Query result containing the latest price data
 */
export function useMarketPrice(symbol: string, options = {}) {
  return useQuery({
    queryKey: ["marketPrice", symbol],
    queryFn: () => MarketDataService.fetchLatestPrice(symbol),
    staleTime: PRICE_DATA_STALE_TIME,
    ...options
  });
}

/**
 * Hook for querying multiple prices at once
 * @param symbols Array of stock symbols
 * @param options Additional React Query options
 * @returns Query result containing price data for multiple symbols
 */
export function useMultipleMarketPrices(symbols: string[], options = {}) {
  return useQuery({
    queryKey: ["marketPrices", symbols],
    queryFn: () => MarketDataService.fetchMultipleLatestPrices(symbols),
    staleTime: PRICE_DATA_STALE_TIME,
    enabled: symbols.length > 0,
    ...options
  });
}
