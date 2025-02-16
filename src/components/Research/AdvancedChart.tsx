
import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { MarketData } from '@/services/MarketDataService';

interface AdvancedChartProps {
  data: MarketData[];
  height?: number;
}

const AdvancedChart: React.FC<AdvancedChartProps> = ({ data, height = 400 }) => {
  const chartData = useMemo(() => {
    return data.map(item => ({
      date: new Date(item.timestamp).toLocaleDateString(),
      price: item.price,
    }));
  }, [data]);

  return (
    <Card className="p-4">
      <div style={{ width: '100%', height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#8884d8"
              fillOpacity={1}
              fill="url(#colorPrice)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default AdvancedChart;
