import { useState, useEffect, useCallback, useRef } from 'react';
import { finnhubSocket } from '@/utils/finnhubSocket';
import { supabase } from '@/integrations/supabase/client';

export interface ChartTick {
  time: number;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

interface UseStreamingChartDataOptions {
  maxTicks?: number;
  aggregationInterval?: number; // ms - aggregate ticks into candles
}

export function useStreamingChartData(
  symbol: string | null,
  options: UseStreamingChartDataOptions = {}
) {
  const { maxTicks = 500, aggregationInterval = 0 } = options;
  
  const [ticks, setTicks] = useState<ChartTick[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  
  const aggregationBuffer = useRef<ChartTick[]>([]);
  const lastAggregationTime = useRef<number>(0);
  
  // Load historical data first
  const loadHistoricalData = useCallback(async (sym: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('finnhub-websocket', {
        body: { 
          action: 'get_candles', 
          symbol: sym,
          resolution: '1',
          from: Math.floor(Date.now() / 1000) - 3600, // Last hour
          to: Math.floor(Date.now() / 1000)
        }
      });
      
      if (!error && data?.candles) {
        const historicalTicks: ChartTick[] = data.candles.map((candle: any) => ({
          time: candle.time,
          price: candle.close,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume
        }));
        
        setTicks(historicalTicks.slice(-maxTicks));
        if (historicalTicks.length > 0) {
          setCurrentPrice(historicalTicks[historicalTicks.length - 1].price);
        }
      }
    } catch (err) {
      console.warn('Failed to load historical chart data:', err);
    }
    setIsLoading(false);
  }, [maxTicks]);
  
  // Aggregate ticks into candles if interval is set
  const aggregateTick = useCallback((tick: ChartTick) => {
    if (aggregationInterval <= 0) {
      // No aggregation, just add the tick
      setTicks(prev => {
        const newTicks = [...prev, tick];
        return newTicks.slice(-maxTicks);
      });
      return;
    }
    
    const now = Date.now();
    const intervalStart = Math.floor(now / aggregationInterval) * aggregationInterval;
    
    if (intervalStart !== lastAggregationTime.current) {
      // New interval - flush buffer and create candle
      if (aggregationBuffer.current.length > 0) {
        const buffer = aggregationBuffer.current;
        const candle: ChartTick = {
          time: lastAggregationTime.current,
          open: buffer[0].price,
          high: Math.max(...buffer.map(t => t.price)),
          low: Math.min(...buffer.map(t => t.price)),
          close: buffer[buffer.length - 1].price,
          price: buffer[buffer.length - 1].price,
          volume: buffer.reduce((sum, t) => sum + (t.volume || 0), 0)
        };
        
        setTicks(prev => {
          const newTicks = [...prev, candle];
          return newTicks.slice(-maxTicks);
        });
      }
      
      aggregationBuffer.current = [tick];
      lastAggregationTime.current = intervalStart;
    } else {
      // Same interval - add to buffer
      aggregationBuffer.current.push(tick);
    }
  }, [aggregationInterval, maxTicks]);
  
  useEffect(() => {
    if (!symbol) {
      setTicks([]);
      setCurrentPrice(null);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    loadHistoricalData(symbol);
    
    // Subscribe to real-time updates
    finnhubSocket.subscribe(symbol);
    
    const unsubscribe = finnhubSocket.onMarketData((data) => {
      if (data.symbol === symbol && data.price) {
        setCurrentPrice(data.price);
        
        const newTick: ChartTick = {
          time: data.timestamp || Date.now(),
          price: data.price,
          volume: data.volume
        };
        
        aggregateTick(newTick);
      }
    });
    
    // Check connection status periodically
    const statusInterval = setInterval(() => {
      setConnectionStatus(finnhubSocket.getConnectionStatus());
    }, 1000);
    
    return () => {
      finnhubSocket.unsubscribe(symbol);
      unsubscribe();
      clearInterval(statusInterval);
      aggregationBuffer.current = [];
    };
  }, [symbol, loadHistoricalData, aggregateTick]);
  
  return {
    ticks,
    currentPrice,
    isLoading,
    connectionStatus,
    tickCount: ticks.length
  };
}
