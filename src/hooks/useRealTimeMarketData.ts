
import { useState, useEffect, useRef, useCallback } from "react";
import { finnhubSocket } from "@/utils/finnhubSocket";
import { nanoid } from "nanoid";
import { DataCache } from "@/services/market/dataCache";

interface PriceData {
  symbol: string;
  price: number;
  change?: number;
  timestamp?: number;
}

type PriceUpdateHandler = (data: PriceData) => void;

/**
 * Hook for subscribing to real-time market data updates
 * @param symbols Stock symbols to subscribe to
 * @param onUpdate Optional callback function for price updates
 * @returns Object with current price data and loading state
 */
export function useRealTimeMarketData(
  symbols: string | string[], 
  onUpdate?: PriceUpdateHandler
) {
  // Normalize symbols to array
  const symbolsArray = Array.isArray(symbols) ? symbols : [symbols];
  
  // Track mounted state to prevent memory leaks
  const isMounted = useRef(true);
  // Generate a unique ID for this hook instance
  const instanceId = useRef(nanoid(8));
  // Use ref for symbolsArray to avoid unnecessary effect triggers
  const symbolsRef = useRef(symbolsArray);
  
  // State for price data and loading status
  const [priceData, setPriceData] = useState<Record<string, PriceData>>({});
  const [isLoading, setIsLoading] = useState(symbolsArray.length > 0);
  
  // Handler for price updates
  const handlePriceUpdate = useCallback(({ symbol, price, timestamp }: PriceData) => {
    if (!isMounted.current) return;
    
    setPriceData(prevData => {
      const prevPrice = prevData[symbol]?.price;
      const change = prevPrice ? (price - prevPrice) / prevPrice * 100 : 0;
      
      const newData = {
        ...prevData,
        [symbol]: { 
          symbol, 
          price, 
          change,
          timestamp 
        }
      };
      
      // Cache the updated price
      DataCache.setPrice(symbol, price);
      
      // Call the optional update handler
      if (onUpdate) {
        onUpdate({
          symbol,
          price,
          change,
          timestamp
        });
      }
      
      return newData;
    });
  }, [onUpdate]);
  
  // Initialize subscriptions and clean up on unmount
  useEffect(() => {
    isMounted.current = true;
    symbolsRef.current = symbolsArray;
    
    // Skip if no symbols
    if (symbolsArray.length === 0) {
      setIsLoading(false);
      return;
    }
    
    console.log(`[useRealTimeMarketData:${instanceId.current}] Subscribing to ${symbolsArray.length} symbols`);
    
    // Subscribe to all symbols
    symbolsArray.forEach(symbol => {
      finnhubSocket.subscribe(symbol);
      
      // Check cache for initial values
      const cachedPrice = DataCache.getPrice(symbol);
      if (cachedPrice !== null) {
        handlePriceUpdate({
          symbol,
          price: cachedPrice,
          timestamp: Date.now()
        });
      }
    });
    
    // Subscribe to real-time updates
    const unsubscribe = finnhubSocket.onMarketData((data) => {
      if (data && data.symbol && data.price && 
          symbolsRef.current.includes(data.symbol)) {
        handlePriceUpdate(data);
        setIsLoading(false);
      }
    });
    
    // Cleanup on unmount
    return () => {
      console.log(`[useRealTimeMarketData:${instanceId.current}] Unsubscribing`);
      isMounted.current = false;
      
      // Unsubscribe from all symbols
      symbolsArray.forEach(symbol => {
        finnhubSocket.unsubscribe(symbol);
      });
      
      // Unsubscribe from updates
      unsubscribe();
    };
  }, [symbolsArray.join(','), handlePriceUpdate]);
  
  return {
    priceData,
    isLoading,
    // Helper function to get price for a specific symbol
    getPriceForSymbol: useCallback(
      (symbol: string): PriceData | null => priceData[symbol] || null,
      [priceData]
    )
  };
}
