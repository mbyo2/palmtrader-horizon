
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

interface CryptoPrice {
  price: number;
  change: number;
  timestamp: number;
}

export function useCryptoData(cryptoId: string) {
  const [price, setPrice] = useState<number | null>(null);
  const [change, setChange] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial data and set up real-time updates
  const { data, isLoading, error } = useQuery({
    queryKey: ['cryptoPrice', cryptoId],
    queryFn: async () => {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=usd&include_24hr_change=true`
      );
      const data = await response.json();
      
      if (data[cryptoId]) {
        return {
          price: data[cryptoId].usd,
          change: data[cryptoId].usd_24h_change,
          timestamp: Date.now()
        };
      }
      throw new Error(`No data found for ${cryptoId}`);
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  });

  // Update local state when query data changes
  useEffect(() => {
    if (data) {
      setPrice(data.price);
      setChange(data.change);
    }
  }, [data]);

  // Set up more frequent updates for real-time feel
  useEffect(() => {
    if (data) {
      intervalRef.current = setInterval(async () => {
        try {
          const response = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=usd&include_24hr_change=true`
          );
          const newData = await response.json();
          
          if (newData[cryptoId]) {
            setPrice(newData[cryptoId].usd);
            setChange(newData[cryptoId].usd_24h_change);
          }
        } catch (error) {
          console.warn('Failed to fetch real-time crypto data:', error);
        }
      }, 15000); // Update every 15 seconds for real-time feel
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [cryptoId, data]);

  return {
    price,
    change,
    isLoading,
    error,
    lastUpdate: data?.timestamp
  };
}
