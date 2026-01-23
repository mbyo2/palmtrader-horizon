import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { finnhubSocket } from "@/utils/finnhubSocket";

interface StockDataPoint {
  time: string;
  value: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

interface RealtimeStockData {
  symbol: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  chartData: StockDataPoint[];
  isLoading: boolean;
  error: Error | null;
}

export const useRealtimeStockData = (
  symbol: string,
  timeframe: string = "1D"
): RealtimeStockData => {
  const [data, setData] = useState<RealtimeStockData>({
    symbol,
    currentPrice: 0,
    priceChange: 0,
    priceChangePercent: 0,
    chartData: [],
    isLoading: true,
    error: null,
  });

  // Fetch real historical data from database/API
  const fetchHistoricalData = useCallback(async (tf: string): Promise<StockDataPoint[]> => {
    try {
      const days = tf === "1D" ? 1 : tf === "1W" ? 7 : tf === "1M" ? 30 : tf === "3M" ? 90 : 365;
      const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      
      // Try to get from database first
      const { data: dbData, error } = await supabase
        .from('market_data')
        .select('price, timestamp, open, high, low, close')
        .eq('symbol', symbol)
        .gte('timestamp', fromDate)
        .order('timestamp', { ascending: true });
      
      if (!error && dbData && dbData.length > 0) {
        return dbData.map(d => ({
          time: new Date(d.timestamp).toISOString(),
          value: d.close || d.price,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close || d.price
        }));
      }
      
      // Fallback to edge function for candle data
      const { data: candleData } = await supabase.functions.invoke('finnhub-websocket', {
        body: { 
          action: 'get_candles', 
          symbol,
          resolution: tf === "1D" ? "1" : tf === "1W" ? "15" : "D",
          from: Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000),
          to: Math.floor(Date.now() / 1000)
        }
      });
      
      if (candleData?.candles) {
        return candleData.candles.map((c: any) => ({
          time: new Date(c.time).toISOString(),
          value: c.close,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close
        }));
      }
      
      return [];
    } catch (err) {
      console.warn('Error fetching historical data:', err);
      return [];
    }
  }, [symbol]);

  const fetchData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      const chartData = await fetchHistoricalData(timeframe);
      
      if (chartData.length > 0) {
        const currentPrice = chartData[chartData.length - 1]?.value || 0;
        const previousPrice = chartData[0]?.value || currentPrice;
        const priceChange = currentPrice - previousPrice;
        const priceChangePercent = previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0;

        setData({
          symbol,
          currentPrice,
          priceChange,
          priceChangePercent,
          chartData,
          isLoading: false,
          error: null,
        });
      } else {
        // No data available
        setData(prev => ({
          ...prev,
          isLoading: false,
          chartData: []
        }));
      }
    } catch (error) {
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error as Error,
      }));
    }
  }, [symbol, timeframe, fetchHistoricalData]);

  useEffect(() => {
    fetchData();

    // Subscribe to real-time WebSocket updates
    finnhubSocket.subscribe(symbol);
    
    const unsubscribe = finnhubSocket.onMarketData((update) => {
      if (update.symbol === symbol && update.price) {
        setData(prev => {
          const newPoint: StockDataPoint = {
            time: new Date().toISOString(),
            value: update.price,
            close: update.price,
          };

          const updatedChartData = prev.chartData.length > 0 
            ? [...prev.chartData.slice(1), newPoint]
            : [newPoint];
            
          const previousPrice = updatedChartData[0]?.value || update.price;
          const priceChange = update.price - previousPrice;
          const priceChangePercent = previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0;

          return {
            ...prev,
            currentPrice: update.price,
            priceChange,
            priceChangePercent,
            chartData: updatedChartData,
          };
        });
      }
    });

    return () => {
      finnhubSocket.unsubscribe(symbol);
      unsubscribe();
    };
  }, [fetchData, symbol]);

  return data;
};
