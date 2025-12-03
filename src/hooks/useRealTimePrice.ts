import { useState, useEffect, useCallback } from 'react';
import { unifiedPriceService } from '@/services/UnifiedPriceService';

interface PriceData {
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

export const useRealTimePrice = (symbol: string | null) => {
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  useEffect(() => {
    if (!symbol) {
      setPriceData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribe = unifiedPriceService.subscribe(symbol, (data) => {
      setPriceData({
        price: data.price,
        change: data.change,
        changePercent: data.changePercent,
        timestamp: data.timestamp
      });
      setIsLoading(false);
    });

    // Check connection status periodically
    const statusInterval = setInterval(() => {
      setConnectionStatus(unifiedPriceService.getConnectionStatus());
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(statusInterval);
    };
  }, [symbol]);

  return {
    price: priceData?.price ?? null,
    change: priceData?.change ?? 0,
    changePercent: priceData?.changePercent ?? 0,
    timestamp: priceData?.timestamp ?? null,
    isLoading,
    connectionStatus
  };
};

export const useMultipleRealTimePrices = (symbols: string[]) => {
  const [prices, setPrices] = useState<Map<string, PriceData>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (symbols.length === 0) {
      setPrices(new Map());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribes: (() => void)[] = [];

    symbols.forEach(symbol => {
      const unsubscribe = unifiedPriceService.subscribe(symbol, (data) => {
        setPrices(prev => {
          const newMap = new Map(prev);
          newMap.set(symbol, {
            price: data.price,
            change: data.change,
            changePercent: data.changePercent,
            timestamp: data.timestamp
          });
          return newMap;
        });
        setIsLoading(false);
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [symbols.join(',')]);

  const getPrice = useCallback((symbol: string) => {
    return prices.get(symbol) ?? null;
  }, [prices]);

  return {
    prices,
    getPrice,
    isLoading
  };
};
