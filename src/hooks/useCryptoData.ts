
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface CryptoPrice {
  price: number;
  change: number;
  timestamp: number;
}

export function useCryptoData(cryptoId: string) {
  const [price, setPrice] = useState<number | null>(null);
  const [change, setChange] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  // Cleanup function to prevent memory leaks
  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Fetch initial data with better error handling
  const { data, isLoading, error } = useQuery({
    queryKey: ['cryptoPrice', cryptoId],
    queryFn: async () => {
      try {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=usd&include_24hr_change=true`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data[cryptoId]) {
          return {
            price: data[cryptoId].usd,
            change: data[cryptoId].usd_24h_change,
            timestamp: Date.now()
          };
        }
        throw new Error(`No data found for ${cryptoId}`);
      } catch (error) {
        console.error(`Error fetching crypto data for ${cryptoId}:`, error);
        throw error;
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Update local state when query data changes
  useEffect(() => {
    if (data) {
      setPrice(data.price);
      setChange(data.change);
    }
  }, [data]);

  // Set up more frequent updates for real-time feel with proper cleanup
  useEffect(() => {
    if (data && !isLoading) {
      cleanup(); // Clear any existing interval
      
      intervalRef.current = setInterval(async () => {
        try {
          const response = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=usd&include_24hr_change=true`
          );
          
          if (!response.ok) return; // Skip update on error
          
          const newData = await response.json();
          
          if (newData[cryptoId]) {
            setPrice(newData[cryptoId].usd);
            setChange(newData[cryptoId].usd_24h_change);
            
            // Update the query cache
            queryClient.setQueryData(['cryptoPrice', cryptoId], {
              price: newData[cryptoId].usd,
              change: newData[cryptoId].usd_24h_change,
              timestamp: Date.now()
            });
          }
        } catch (error) {
          console.warn('Failed to fetch real-time crypto data:', error);
        }
      }, 15000); // Update every 15 seconds
    }

    return cleanup;
  }, [cryptoId, data, isLoading, cleanup, queryClient]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    price,
    change,
    isLoading,
    error,
    lastUpdate: data?.timestamp
  };
}
