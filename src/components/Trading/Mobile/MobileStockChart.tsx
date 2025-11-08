import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  Time,
  LineSeries,
  CandlestickSeries,
} from "lightweight-charts";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHaptic } from "@/hooks/useHaptic";
import { useTheme } from "next-themes";

interface MobileStockChartProps {
  symbol: string;
  data: Array<{ time: string; value: number; open?: number; high?: number; low?: number; close?: number }>;
  onTimeframeChange?: (timeframe: string) => void;
}

type ChartType = "line" | "candlestick";

export const MobileStockChart = ({
  symbol,
  data,
  onTimeframeChange,
}: MobileStockChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line" | "Candlestick"> | null>(null);
  const [timeframe, setTimeframe] = useState("1D");
  const [chartType, setChartType] = useState<ChartType>("line");
  const { trigger } = useHaptic();
  const { theme } = useTheme();

  const isDark = theme === "dark";

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: isDark ? "#a1a1aa" : "#71717a",
      },
      grid: {
        vertLines: { color: isDark ? "#27272a" : "#f4f4f5" },
        horzLines: { color: isDark ? "#27272a" : "#f4f4f5" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: isDark ? "#52525b" : "#d4d4d8",
          style: 3,
        },
        horzLine: {
          width: 1,
          color: isDark ? "#52525b" : "#d4d4d8",
          style: 3,
        },
      },
      rightPriceScale: {
        borderColor: isDark ? "#27272a" : "#e4e4e7",
      },
      timeScale: {
        borderColor: isDark ? "#27272a" : "#e4e4e7",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: true,
        },
        mouseWheel: false,
        pinch: true,
      },
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
    });

    chartRef.current = chart;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [isDark]);

  useEffect(() => {
    if (!chartRef.current || !data.length) return;

    // Remove old series
    if (seriesRef.current) {
      chartRef.current.removeSeries(seriesRef.current);
    }

    // Determine if we have OHLC data
    const hasOHLC = data.some(d => d.open !== undefined);
    const useChartType: ChartType = hasOHLC && chartType === "candlestick" ? "candlestick" : "line";

    if (useChartType === "candlestick" && hasOHLC) {
      const candlestickSeries = chartRef.current.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderVisible: false,
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      });

      const candlestickData = data
        .filter(d => d.open !== undefined)
        .map(d => ({
          time: (new Date(d.time).getTime() / 1000) as Time,
          open: d.open!,
          high: d.high!,
          low: d.low!,
          close: d.close!,
        }));

      candlestickSeries.setData(candlestickData);
      seriesRef.current = candlestickSeries as any;
    } else {
      const lineSeries = chartRef.current.addSeries(LineSeries, {
        color: "#3b82f6",
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        lastValueVisible: true,
        priceLineVisible: true,
      });

      const lineData = data.map(d => ({
        time: (new Date(d.time).getTime() / 1000) as Time,
        value: d.value || d.close || 0,
      }));

      lineSeries.setData(lineData);
      seriesRef.current = lineSeries as any;
    }

    chartRef.current.timeScale().fitContent();
  }, [data, chartType, isDark]);

  const handleTimeframeChange = (value: string) => {
    trigger("selection");
    setTimeframe(value);
    onTimeframeChange?.(value);
  };

  const handleChartTypeChange = (value: string) => {
    trigger("selection");
    setChartType(value as ChartType);
  };

  return (
    <div className="space-y-4">
      {/* Timeframe Selector */}
      <div className="flex items-center justify-between gap-2">
        <Tabs value={timeframe} onValueChange={handleTimeframeChange} className="flex-1">
          <TabsList className="grid w-full grid-cols-5 h-10">
            <TabsTrigger value="1D" className="text-xs">1D</TabsTrigger>
            <TabsTrigger value="1W" className="text-xs">1W</TabsTrigger>
            <TabsTrigger value="1M" className="text-xs">1M</TabsTrigger>
            <TabsTrigger value="3M" className="text-xs">3M</TabsTrigger>
            <TabsTrigger value="1Y" className="text-xs">1Y</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Tabs value={chartType} onValueChange={handleChartTypeChange}>
          <TabsList className="h-10">
            <TabsTrigger value="line" className="text-xs">Line</TabsTrigger>
            <TabsTrigger value="candlestick" className="text-xs">Candle</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Chart */}
      <Card className="overflow-hidden bg-card">
        <div ref={chartContainerRef} className="w-full touch-pan-x" />
      </Card>
    </div>
  );
};
