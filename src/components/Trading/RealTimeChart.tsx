import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import ProChart from './ProChart';

interface RealTimeChartProps {
  symbol: string;
  height?: number;
  showControls?: boolean;
  onPriceUpdate?: (price: number) => void;
}

/**
 * Superseded by ProChart (the professional charting toolkit): real venue
 * candles, full timeframe set, indicators, drawings and sub-panes. This
 * wrapper keeps the old call sites (TradingInterface, Portfolio) working.
 * The previous implementation fabricated candle OHLC with Math.random()
 * around tick prices and fell back to hard-coded prices — removed.
 */
export const RealTimeChart: React.FC<RealTimeChartProps> = ({ symbol, height = 400, onPriceUpdate }) => (
  <Card className="w-full">
    <CardContent className="p-3">
      <ProChart instrument={symbol} height={height} onPriceUpdate={onPriceUpdate} />
    </CardContent>
  </Card>
);

export default RealTimeChart;
