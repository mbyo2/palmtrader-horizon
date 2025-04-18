
import { useState, useEffect, useRef, useCallback } from "react";
import { MarketDataService } from "@/services/MarketDataService";
import { WebSocketService } from "@/services/market/websocketService";
import { MarketData } from "@/services/market/types";
import { nanoid } from "nanoid";

export interface MarketDataOptions {
  pollingInterval?: number; // in milliseconds
  historicalDays?: number;
  enableRealtime?: boolean;
  onUpdate?: (data: any) => void;
}

export function useMarketData(
  symbol: string, 
  options: MarketDataOptions = {}
) {
  const {
    pollingInterval = 60000, // Default to 1 minute
    historicalDays = 30,
    enableRealtime = true,
    onUpdate
  } = options;
  
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [historicalData, setHistoricalData] = useState<MarketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // Generate a unique ID for this component instance
  const componentId = useRef(nanoid());
  
  // For polling, track the interval ID
  const pollingIntervalId = useRef<NodeJS.Timeout | null>(null);
  
  // Helper to update price from any source
  const updatePrice = useCallback((price: number) => {
    setCurrentPrice(price);
    setLastUpdate(new Date());
    if (onUpdate) {
      onUpdate({ symbol, price, timestamp: new Date() });
    }
  }, [symbol, onUpdate]);
  
  // Fetch initial data and set up subscriptions
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Check if we have cached data first
        const cachedData = WebSocketService.getLatestData(symbol);
        if (cachedData && cachedData.price) {
          updatePrice(cachedData.price);
        }
        
        // Fetch latest price
        const latestData = await MarketDataService.fetchLatestPrice(symbol);
        if (latestData) {
          updatePrice(latestData.price);
        }
        
        // Fetch historical data
        const history = await MarketDataService.fetchHistoricalData(symbol, historicalDays);
        setHistoricalData(history);
      } catch (err) {
        console.error("Error fetching market data:", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    };
    
    // Initial fetch
    fetchData();
    
    // Set up polling if enabled
    if (pollingInterval > 0) {
      pollingIntervalId.current = setInterval(async () => {
        try {
          const data = await MarketDataService.fetchLatestPrice(symbol);
          if (data && data.price) {
            updatePrice(data.price);
          }
        } catch (err) {
          console.warn("Polling update failed:", err);
        }
      }, pollingInterval);
    }
    
    // Set up real-time updates if enabled
    if (enableRealtime) {
      WebSocketService.subscribe(symbol, componentId.current);
    }
    
    // Cleanup function
    return () => {
      // Clear polling interval
      if (pollingIntervalId.current) {
        clearInterval(pollingIntervalId.current);
      }
      
      // Unsubscribe from real-time updates
      if (enableRealtime) {
        WebSocketService.unsubscribe(symbol, componentId.current);
      }
    };
  }, [symbol, historicalDays, pollingInterval, enableRealtime, updatePrice]);
  
  // Listen for real-time updates
  useEffect(() => {
    if (!enableRealtime) return;
    
    const unsubscribe = WebSocketService.onMarketData((data) => {
      if (data.symbol === symbol && data.price) {
        updatePrice(data.price);
      }
    });
    
    return () => unsubscribe();
  }, [symbol, enableRealtime, updatePrice]);
  
  // Clean up all subscriptions when component unmounts
  useEffect(() => {
    return () => {
      WebSocketService.clearComponentSubscriptions(componentId.current);
    };
  }, []);
  
  return {
    currentPrice,
    historicalData,
    isLoading,
    error,
    lastUpdate
  };
}
