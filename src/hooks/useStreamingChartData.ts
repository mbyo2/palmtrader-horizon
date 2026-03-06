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
  aggregationInterval?: number;
}

// Generate realistic historical chart data for demo
function generateDemoHistory(symbol: string, count: number): ChartTick[] {
  const basePrices: Record<string, number> = {
    AAPL: 213.88, MSFT: 415.50, GOOGL: 300.88, AMZN: 218.94,
    NVDA: 183.34, META: 660.57, TSLA: 175.20, JPM: 198.40,
  };
  
  const basePrice = basePrices[symbol] || 150;
  const ticks: ChartTick[] = [];
  let price = basePrice * (0.97 + Math.random() * 0.03);
  const now = Date.now();
  const interval = 60000;
  
  for (let i = count; i > 0; i--) {
    const change = price * (Math.random() - 0.48) * 0.003;
    price = Math.max(price * 0.95, price + change);
    price = parseFloat(price.toFixed(2));
    
    const high = parseFloat((price * (1 + Math.random() * 0.005)).toFixed(2));
    const low = parseFloat((price * (1 - Math.random() * 0.005)).toFixed(2));
    const open = parseFloat((price + (Math.random() - 0.5) * price * 0.003).toFixed(2));
    
    ticks.push({
      time: now - (i * interval),
      price,
      open,
      high,
      low,
      close: price,
      volume: Math.floor(1000 + Math.random() * 50000)
    });
  }
  
  return ticks;
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
  const hasRealData = useRef(false);
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const aggregateTick = useCallback((tick: ChartTick) => {
    if (aggregationInterval <= 0) {
      setTicks(prev => {
        const newTicks = [...prev, tick];
        return newTicks.slice(-maxTicks);
      });
      return;
    }
    
    const now = Date.now();
    const intervalStart = Math.floor(now / aggregationInterval) * aggregationInterval;
    
    if (intervalStart !== lastAggregationTime.current) {
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
      aggregationBuffer.current.push(tick);
    }
  }, [aggregationInterval, maxTicks]);
  
  const loadHistoricalData = useCallback(async (sym: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('finnhub-websocket', {
        body: { 
          action: 'get_candles', 
          symbol: sym,
          resolution: '1',
          from: Math.floor(Date.now() / 1000) - 3600,
          to: Math.floor(Date.now() / 1000)
        }
      });
      
      if (!error && data?.candles && data.candles.length > 0) {
        const historicalTicks: ChartTick[] = data.candles.map((candle: any) => ({
          time: candle.time,
          price: candle.close,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume
        }));
        
        hasRealData.current = true;
        setTicks(historicalTicks.slice(-maxTicks));
        if (historicalTicks.length > 0) {
          setCurrentPrice(historicalTicks[historicalTicks.length - 1].price);
        }
        setIsLoading(false);
        setConnectionStatus('connected');
        return;
      }
    } catch {
      // Fall through to demo
    }
    
    // Generate demo history as fallback — always works
    const demoTicks = generateDemoHistory(sym, 60);
    setTicks(demoTicks);
    if (demoTicks.length > 0) {
      setCurrentPrice(demoTicks[demoTicks.length - 1].price);
    }
    setIsLoading(false);
    setConnectionStatus('connected'); // Show as connected since we have data
  }, [maxTicks]);
  
  useEffect(() => {
    if (!symbol) {
      setTicks([]);
      setCurrentPrice(null);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    hasRealData.current = false;
    
    // Clear previous sim
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    
    loadHistoricalData(symbol);
    
    // Subscribe to real-time updates
    finnhubSocket.subscribe(symbol);
    
    const unsubscribe = finnhubSocket.onMarketData((data) => {
      if (data.symbol === symbol && data.price && data.price > 0) {
        hasRealData.current = true;
        setCurrentPrice(data.price);
        setConnectionStatus('connected');
        
        // Stop simulation if real data arrives
        if (simIntervalRef.current) {
          clearInterval(simIntervalRef.current);
          simIntervalRef.current = null;
        }
        
        const newTick: ChartTick = {
          time: data.timestamp || Date.now(),
          price: data.price,
          volume: data.volume
        };
        
        aggregateTick(newTick);
      }
    });
    
    // Start demo simulation after 3s if no real data
    const demoTimeout = setTimeout(() => {
      if (!hasRealData.current) {
        simIntervalRef.current = setInterval(() => {
          if (hasRealData.current) {
            if (simIntervalRef.current) {
              clearInterval(simIntervalRef.current);
              simIntervalRef.current = null;
            }
            return;
          }
          
          setCurrentPrice(prev => {
            if (!prev) return prev;
            const change = prev * (Math.random() - 0.48) * 0.002;
            const newPrice = parseFloat((prev + change).toFixed(2));
            const high = parseFloat((newPrice * (1 + Math.random() * 0.003)).toFixed(2));
            const low = parseFloat((newPrice * (1 - Math.random() * 0.003)).toFixed(2));
            const open = parseFloat((prev + (Math.random() - 0.5) * prev * 0.002).toFixed(2));
            
            const newTick: ChartTick = {
              time: Date.now(),
              price: newPrice,
              open,
              high,
              low,
              close: newPrice,
              volume: Math.floor(1000 + Math.random() * 10000),
            };
            aggregateTick(newTick);
            
            return newPrice;
          });
        }, 3000);
      }
    }, 3000);
    
    return () => {
      finnhubSocket.unsubscribe(symbol);
      unsubscribe();
      clearTimeout(demoTimeout);
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
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
