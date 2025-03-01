
import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { MarketData } from '@/services/MarketDataService';
import { Button } from '@/components/ui/button';

interface AdvancedChartProps {
  data: MarketData[];
  height?: number;
}

const AdvancedChart: React.FC<AdvancedChartProps> = ({ data, height = 400 }) => {
  const [timeRange, setTimeRange] = useState<'1d' | '7d' | '30d' | 'all'>('30d');
  
  const filteredData = useMemo(() => {
    const now = new Date();
    let filterDate = new Date();
    
    if (timeRange === '1d') {
      filterDate.setDate(now.getDate() - 1);
    } else if (timeRange === '7d') {
      filterDate.setDate(now.getDate() - 7);
    } else if (timeRange === '30d') {
      filterDate.setDate(now.getDate() - 30);
    } else {
      return data;
    }
    
    return data.filter(item => new Date(item.timestamp) >= filterDate);
  }, [data, timeRange]);

  const chartData = useMemo(() => {
    return filteredData.map(item => ({
      date: new Date(item.timestamp).toLocaleDateString(),
      price: item.price,
      open: item.open || item.price,
      high: item.high || item.price,
      low: item.low || item.price,
      close: item.close || item.price,
    }));
  }, [filteredData]);

  // Calculate the percentage change for the selected time period
  const priceChange = useMemo(() => {
    if (chartData.length < 2) return 0;
    const firstPrice = chartData[0].price;
    const lastPrice = chartData[chartData.length - 1].price;
    return ((lastPrice - firstPrice) / firstPrice) * 100;
  }, [chartData]);

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {data[0]?.symbol} Chart 
          <span className={`ml-4 text-base ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
          </span>
        </h2>
        <div className="flex space-x-2">
          <Button 
            variant={timeRange === '1d' ? 'default' : 'outline'} 
            onClick={() => setTimeRange('1d')}
            size="sm"
          >
            1D
          </Button>
          <Button 
            variant={timeRange === '7d' ? 'default' : 'outline'} 
            onClick={() => setTimeRange('7d')}
            size="sm"
          >
            1W
          </Button>
          <Button 
            variant={timeRange === '30d' ? 'default' : 'outline'} 
            onClick={() => setTimeRange('30d')}
            size="sm"
          >
            1M
          </Button>
          <Button 
            variant={timeRange === 'all' ? 'default' : 'outline'} 
            onClick={() => setTimeRange('all')}
            size="sm"
          >
            All
          </Button>
        </div>
      </div>
      
      <div style={{ width: '100%', height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop 
                  offset="5%" 
                  stopColor={priceChange >= 0 ? "#10b981" : "#ef4444"} 
                  stopOpacity={0.8}
                />
                <stop 
                  offset="95%" 
                  stopColor={priceChange >= 0 ? "#10b981" : "#ef4444"} 
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => {
                if (timeRange === '1d') {
                  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
                return date;
              }}
            />
            <YAxis domain={['auto', 'auto']} />
            <Tooltip 
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="price"
              stroke={priceChange >= 0 ? "#10b981" : "#ef4444"}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPrice)"
              name="Price"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {chartData.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-center">
          <div className="rounded-lg bg-background/50 p-2">
            <p className="text-sm text-muted-foreground">Open</p>
            <p className="font-semibold">${chartData[chartData.length - 1].open.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-background/50 p-2">
            <p className="text-sm text-muted-foreground">High</p>
            <p className="font-semibold">${chartData[chartData.length - 1].high.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-background/50 p-2">
            <p className="text-sm text-muted-foreground">Low</p>
            <p className="font-semibold">${chartData[chartData.length - 1].low.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-background/50 p-2">
            <p className="text-sm text-muted-foreground">Close</p>
            <p className="font-semibold">${chartData[chartData.length - 1].close.toFixed(2)}</p>
          </div>
        </div>
      )}
    </Card>
  );
};

export default AdvancedChart;
