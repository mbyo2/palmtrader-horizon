import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { OptimizedMarketDataService } from "@/services/OptimizedMarketDataService";
import { debounce } from "@/lib/utils";

export interface OptimizedMarketDataOptions {
  refreshInterval?: number;
  enableRealtime?: boolean;
  enableCaching?: boolean;
  batchSize?: number;
}

export function useOptimizedMarketData(
  symbols: string | string[], 
  options: OptimizedMarketDataOptions = {}
) {
  const {
    refreshInterval = 30000, // 30 seconds default
    enableRealtime = true,
    enableCaching = true,
    batchSize = 20
  } = options;
  
  const [priceData, setPriceData] = useState<Map<string, { price: number; change?: number; timestamp: number }>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  
  const symbolsArray = useMemo(() => Array.isArray(symbols) ? symbols : [symbols], [symbols]);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeFunctions = useRef<Map<string, () => void>>(new Map());
  const lastFetchTime = useRef<number>(0);
  
  // Debounced update function to batch state updates
  const debouncedUpdate = useCallback(
    debounce((updates: Map<string, any>) => {
      setPriceData(prevData => {
        const newData = new Map(prevData);
        updates.forEach((value, key) => {
          newData.set(key, value);
        });
        return newData;
      });
    }, 100),
    []
  );

  // Optimized price fetching with batching
  const fetchPrices = useCallback(async (symbolsToFetch: string[]) => {
    if (symbolsToFetch.length === 0) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const now = Date.now();
      if (now - lastFetchTime.current < 1000) {
        // Rate limiting - don't fetch more than once per second
        return;
      }
      lastFetchTime.current = now;
      
      // Process symbols in batches
      const batches = [];
      for (let i = 0; i < symbolsToFetch.length; i += batchSize) {
        batches.push(symbolsToFetch.slice(i, i + batchSize));
      }
      
      const updateBatch = new Map();
      
      for (const batch of batches) {
        const results = await Promise.allSettled(
          batch.map(symbol => OptimizedMarketDataService.fetchLatestPrice(symbol))
        );
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            const { symbol, price, change } = result.value;
            updateBatch.set(symbol, {
              price,
              change,
              timestamp: now
            });
          }
        });
        
        // Small delay between batches to avoid overwhelming the system
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      if (updateBatch.size > 0) {
        debouncedUpdate(updateBatch);
      }
      
      setConnectionStatus('connected');
    } catch (err) {
      console.error('Error fetching prices:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setConnectionStatus('disconnected');
    } finally {
      setIsLoading(false);
    }
  }, [batchSize, debouncedUpdate]);

  // Set up real-time subscriptions
  const setupRealtimeSubscriptions = useCallback(() => {
    if (!enableRealtime) return;
    
    symbolsArray.forEach(symbol => {
      // Skip if already subscribed
      if (unsubscribeFunctions.current.has(symbol)) return;
      
      const unsubscribe = OptimizedMarketDataService.subscribeToRealTimePrice(
        symbol,
        ({ symbol: updatedSymbol, price }) => {
          const updateMap = new Map();
          updateMap.set(updatedSymbol, {
            price,
            timestamp: Date.now()
          });
          debouncedUpdate(updateMap);
        }
      );
      
      unsubscribeFunctions.current.set(symbol, unsubscribe);
    });
  }, [symbolsArray, enableRealtime, debouncedUpdate]);

  // Clean up subscriptions
  const cleanupSubscriptions = useCallback(() => {
    unsubscribeFunctions.current.forEach(unsubscribe => unsubscribe());
    unsubscribeFunctions.current.clear();
  }, []);

  // Initial data fetch and setup
  useEffect(() => {
    fetchPrices(symbolsArray);
    setupRealtimeSubscriptions();
    
    // Set up periodic refresh
    if (refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        fetchPrices(symbolsArray);
      }, refreshInterval);
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      cleanupSubscriptions();
    };
  }, [symbolsArray, refreshInterval, fetchPrices, setupRealtimeSubscriptions, cleanupSubscriptions]);

  // Memoized return value to prevent unnecessary re-renders
  const returnValue = useMemo(() => ({
    priceData,
    isLoading,
    error,
    connectionStatus,
    refreshData: () => fetchPrices(symbolsArray),
    getPrice: (symbol: string) => priceData.get(symbol)?.price || null,
    getChange: (symbol: string) => priceData.get(symbol)?.change || null,
    getTimestamp: (symbol: string) => priceData.get(symbol)?.timestamp || null,
    isDataStale: (symbol: string, maxAge: number = 60000) => {
      const timestamp = priceData.get(symbol)?.timestamp;
      return timestamp ? Date.now() - timestamp > maxAge : true;
    }
  }), [priceData, isLoading, error, connectionStatus, fetchPrices, symbolsArray]);

  return returnValue;
}

// Hook for single symbol with additional optimizations
export function useOptimizedSinglePrice(symbol: string, options: OptimizedMarketDataOptions = {}) {
  const marketData = useOptimizedMarketData(symbol, options);
  
  return useMemo(() => ({
    price: marketData.getPrice(symbol),
    change: marketData.getChange(symbol),
    timestamp: marketData.getTimestamp(symbol),
    isLoading: marketData.isLoading,
    error: marketData.error,
    connectionStatus: marketData.connectionStatus,
    isStale: marketData.isDataStale(symbol),
    refresh: marketData.refreshData
  }), [marketData, symbol]);
}