import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

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

  const queryClient = useQueryClient();

  const generateMockData = useCallback((timeframe: string): StockDataPoint[] => {
    const now = Date.now();
    const points: StockDataPoint[] = [];
    let dataPoints = 100;
    let interval = 60000; // 1 minute

    switch (timeframe) {
      case "1D":
        dataPoints = 390; // trading minutes in a day
        interval = 60000; // 1 minute
        break;
      case "1W":
        dataPoints = 5 * 390;
        interval = 60000;
        break;
      case "1M":
        dataPoints = 30;
        interval = 86400000; // 1 day
        break;
      case "3M":
        dataPoints = 90;
        interval = 86400000;
        break;
      case "1Y":
        dataPoints = 365;
        interval = 86400000;
        break;
    }

    let basePrice = 150 + Math.random() * 50;

    for (let i = dataPoints; i >= 0; i--) {
      const time = new Date(now - i * interval).toISOString();
      const volatility = 0.02;
      const change = (Math.random() - 0.5) * basePrice * volatility;
      basePrice += change;

      const open = basePrice;
      const close = basePrice + (Math.random() - 0.5) * basePrice * 0.01;
      const high = Math.max(open, close) + Math.random() * basePrice * 0.005;
      const low = Math.min(open, close) - Math.random() * basePrice * 0.005;

      points.push({
        time,
        value: close,
        open,
        high,
        low,
        close,
      });
    }

    return points;
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      // Generate mock data
      const chartData = generateMockData(timeframe);
      const currentPrice = chartData[chartData.length - 1]?.value || 0;
      const previousPrice = chartData[0]?.value || currentPrice;
      const priceChange = currentPrice - previousPrice;
      const priceChangePercent = (priceChange / previousPrice) * 100;

      setData({
        symbol,
        currentPrice,
        priceChange,
        priceChangePercent,
        chartData,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error as Error,
      }));
    }
  }, [symbol, timeframe, generateMockData]);

  useEffect(() => {
    fetchData();

    // Real-time updates every 5 seconds
    const interval = setInterval(() => {
      setData(prev => {
        if (!prev.chartData.length) return prev;

        const lastPoint = prev.chartData[prev.chartData.length - 1];
        const newPrice = lastPoint.value + (Math.random() - 0.5) * lastPoint.value * 0.001;
        
        const newPoint: StockDataPoint = {
          time: new Date().toISOString(),
          value: newPrice,
          open: lastPoint.close || lastPoint.value,
          high: Math.max(newPrice, lastPoint.close || lastPoint.value),
          low: Math.min(newPrice, lastPoint.close || lastPoint.value),
          close: newPrice,
        };

        const updatedChartData = [...prev.chartData.slice(1), newPoint];
        const previousPrice = updatedChartData[0]?.value || newPrice;
        const priceChange = newPrice - previousPrice;
        const priceChangePercent = (priceChange / previousPrice) * 100;

        return {
          ...prev,
          currentPrice: newPrice,
          priceChange,
          priceChangePercent,
          chartData: updatedChartData,
        };
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchData]);

  return data;
};
