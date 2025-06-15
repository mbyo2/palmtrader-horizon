
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MarketDataService } from "@/services/MarketDataService";
import { DataCache } from "@/services/market/dataCache";
import { finnhubSocket } from "@/utils/finnhubSocket";

interface EnhancedPriceData {
  symbol: string;
  price: number;
  change?: number;
  timestamp: number;
  source: 'finnhub' | 'alpha_vantage' | 'cache' | 'mock';
  isRealTime: boolean;
  lastUpdate: Date;
}

export function useEnhancedMarketPrice(symbol: string) {
  const [priceData, setPriceData] = useState<EnhancedPriceData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const componentId = useRef(`price-${symbol}-${Date.now()}`);

  // Reduced cache times for more frequent updates
  const PRICE_CACHE_TTL = 10000; // 10 seconds instead of 30
  
  // Query for initial price data
  const { data: initialData, isLoading } = useQuery({
    queryKey: ["enhancedPrice", symbol],
    queryFn: async () => {
      // Check cache first
      const cachedPrice = DataCache.getPrice(symbol, PRICE_CACHE_TTL);
      if (cachedPrice !== null) {
        return {
          symbol,
          price: cachedPrice,
          change: 0,
          timestamp: Date.now(),
          source: 'cache' as const,
          isRealTime: false,
          lastUpdate: new Date()
        };
      }

      try {
        // Try to get real-time data from API
        const latestData = await MarketDataService.fetchLatestPrice(symbol);
        return {
          symbol,
          price: latestData.price,
          change: latestData.change || 0,
          timestamp: Date.now(),
          source: 'finnhub' as const,
          isRealTime: true,
          lastUpdate: new Date()
        };
      } catch (error) {
        console.warn(`Failed to fetch real-time price for ${symbol}, using mock data`);
        // Return mock data as fallback
        return {
          symbol,
          price: 150.75 + (Math.random() - 0.5) * 10, // Mock price with small variation
          change: (Math.random() - 0.5) * 5,
          timestamp: Date.now(),
          source: 'mock' as const,
          isRealTime: false,
          lastUpdate: new Date()
        };
      }
    },
    staleTime: PRICE_CACHE_TTL,
    refetchInterval: 15000, // Refetch every 15 seconds
  });

  // Set up real-time WebSocket connection
  useEffect(() => {
    if (!symbol) return;

    console.log(`Setting up real-time price updates for ${symbol}`);
    
    // Subscribe to real-time updates
    finnhubSocket.subscribe(symbol);
    setIsConnected(true);

    const unsubscribe = finnhubSocket.onMarketData((data) => {
      if (data && data.symbol === symbol && data.price) {
        const enhancedData: EnhancedPriceData = {
          symbol: data.symbol,
          price: data.price,
          change: data.change || 0,
          timestamp: data.timestamp || Date.now(),
          source: 'finnhub',
          isRealTime: true,
          lastUpdate: new Date()
        };
        
        setPriceData(enhancedData);
        
        // Update cache with new price
        DataCache.setPrice(symbol, data.price);
        
        console.log(`Real-time price update for ${symbol}: $${data.price}`);
      }
    });

    return () => {
      console.log(`Cleaning up real-time subscription for ${symbol}`);
      finnhubSocket.unsubscribe(symbol);
      unsubscribe();
      setIsConnected(false);
    };
  }, [symbol]);

  // Update price data when initial data is loaded
  useEffect(() => {
    if (initialData && !priceData) {
      setPriceData(initialData);
    }
  }, [initialData, priceData]);

  return {
    priceData: priceData || initialData,
    isLoading,
    isConnected,
    source: (priceData?.source || initialData?.source || 'unknown') as 'finnhub' | 'alpha_vantage' | 'cache' | 'mock',
    lastUpdate: priceData?.lastUpdate || initialData?.lastUpdate,
    isRealTime: priceData?.isRealTime || false
  };
}
