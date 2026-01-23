import React, { useRef, useEffect, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, LineSeries, CandlestickSeries, ColorType, LineData, CandlestickData } from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStreamingChartData, ChartTick } from '@/hooks/useStreamingChartData';
import { cn } from '@/lib/utils';
import { Activity, Wifi, WifiOff, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

interface RealTimeChartProps {
  symbol: string;
  height?: number;
  showControls?: boolean;
  onPriceUpdate?: (price: number) => void;
}

export const RealTimeChart: React.FC<RealTimeChartProps> = ({
  symbol,
  height = 400,
  showControls = true,
  onPriceUpdate
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line" | "Candlestick"> | null>(null);
  
  const [chartType, setChartType] = useState<'line' | 'candle'>('line');
  const [timeframe, setTimeframe] = useState('1m');
  
  // Get aggregation interval based on timeframe
  const getAggregationInterval = () => {
    switch (timeframe) {
      case '1m': return 60000;
      case '5m': return 300000;
      case '15m': return 900000;
      case '1h': return 3600000;
      default: return 0; // tick by tick
    }
  };
  
  const { ticks, currentPrice, isLoading, connectionStatus } = useStreamingChartData(
    symbol,
    { aggregationInterval: getAggregationInterval() }
  );
  
  // Notify parent of price updates
  useEffect(() => {
    if (currentPrice && onPriceUpdate) {
      onPriceUpdate(currentPrice);
    }
  }, [currentPrice, onPriceUpdate]);
  
  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;
    
    const isDark = document.documentElement.classList.contains('dark');
    
    chartRef.current = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: isDark ? '#9CA3AF' : '#374151',
      },
      grid: {
        vertLines: { color: isDark ? '#374151' : '#E5E7EB' },
        horzLines: { color: isDark ? '#374151' : '#E5E7EB' },
      },
      rightPriceScale: {
        borderColor: isDark ? '#374151' : '#E5E7EB',
      },
      timeScale: {
        borderColor: isDark ? '#374151' : '#E5E7EB',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
      },
    });
    
    // Handle resize
    const handleResize = () => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [height]);
  
  // Update chart type and series
  useEffect(() => {
    if (!chartRef.current) return;
    
    // Remove old series
    if (seriesRef.current) {
      chartRef.current.removeSeries(seriesRef.current);
    }
    
    // Add new series based on type
    if (chartType === 'candle') {
      seriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });
    } else {
      seriesRef.current = chartRef.current.addSeries(LineSeries, {
        color: '#3b82f6',
        lineWidth: 2,
        priceLineVisible: true,
        lastValueVisible: true,
      });
    }
  }, [chartType]);
  
  // Update data when ticks change
  useEffect(() => {
    if (!seriesRef.current || ticks.length === 0) return;
    
    if (chartType === 'candle') {
      const candleData: CandlestickData[] = ticks
        .filter(tick => tick.open && tick.high && tick.low && tick.close)
        .map(tick => ({
          time: Math.floor(tick.time / 1000) as any,
          open: tick.open!,
          high: tick.high!,
          low: tick.low!,
          close: tick.close!,
        }));
      
      if (candleData.length > 0) {
        seriesRef.current.setData(candleData as any);
      }
    } else {
      const lineData: LineData[] = ticks.map(tick => ({
        time: Math.floor(tick.time / 1000) as any,
        value: tick.price,
      }));
      
      seriesRef.current.setData(lineData as any);
    }
    
    chartRef.current?.timeScale().fitContent();
  }, [ticks, chartType]);
  
  // Calculate price change
  const priceChange = ticks.length >= 2 
    ? currentPrice! - ticks[0].price 
    : 0;
  const priceChangePercent = ticks.length >= 2 && ticks[0].price > 0
    ? (priceChange / ticks[0].price) * 100
    : 0;
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">{symbol}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge 
                variant={connectionStatus === 'connected' ? 'default' : 'secondary'}
                className={cn(
                  'flex items-center gap-1',
                  connectionStatus === 'connected' && 'bg-green-500 hover:bg-green-600'
                )}
              >
                {connectionStatus === 'connected' ? (
                  <><Wifi className="h-3 w-3" /> Live</>
                ) : connectionStatus === 'connecting' ? (
                  <><Activity className="h-3 w-3 animate-pulse" /> Connecting</>
                ) : (
                  <><WifiOff className="h-3 w-3" /> Offline</>
                )}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {currentPrice && (
              <div className="text-right">
                <div className="text-2xl font-bold">${currentPrice.toFixed(2)}</div>
                <div className={cn(
                  'flex items-center justify-end text-sm',
                  priceChange >= 0 ? 'text-green-500' : 'text-red-500'
                )}>
                  {priceChange >= 0 ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
                </div>
              </div>
            )}
          </div>
        </div>
        
        {showControls && (
          <div className="flex gap-2 mt-3 flex-wrap">
            <Tabs value={timeframe} onValueChange={setTimeframe}>
              <TabsList className="h-8">
                <TabsTrigger value="tick" className="text-xs px-2">Tick</TabsTrigger>
                <TabsTrigger value="1m" className="text-xs px-2">1m</TabsTrigger>
                <TabsTrigger value="5m" className="text-xs px-2">5m</TabsTrigger>
                <TabsTrigger value="15m" className="text-xs px-2">15m</TabsTrigger>
                <TabsTrigger value="1h" className="text-xs px-2">1h</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Tabs value={chartType} onValueChange={(v) => setChartType(v as 'line' | 'candle')}>
              <TabsList className="h-8">
                <TabsTrigger value="line" className="text-xs px-2">Line</TabsTrigger>
                <TabsTrigger value="candle" className="text-xs px-2">Candle</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center" style={{ height }}>
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div ref={containerRef} style={{ height }} />
        )}
      </CardContent>
    </Card>
  );
};

export default RealTimeChart;
