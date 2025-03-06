import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ComposedChart
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { fetchHistoricalData } from "@/services/market/dataFetchService";
import { Calculator, Calendar, Clock, TrendingUp } from "lucide-react";

const AdvancedStockChart = ({ symbol, compact = false }: { symbol: string, compact?: boolean }) => {
  const [chartType, setChartType] = useState<'price' | 'volume' | 'both'>('price');
  const [timeframe, setTimeframe] = useState<number>(30);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const historicalData = await fetchHistoricalData(symbol, timeframe);
        setData(historicalData);
      } catch (error) {
        console.error("Failed to fetch historical data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [symbol, timeframe]);

  const processedData = data.map(item => ({
    date: new Date(parseInt(item.timestamp)).toLocaleDateString(),
    price: item.price,
    volume: item.volume,
  }));

  return (
    <Card className={compact ? "h-[400px]" : ""}>
      <CardHeader>
        <CardTitle>{symbol} Historical Data</CardTitle>
        {!compact && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{timeframe} Days</span>
            <Clock className="h-4 w-4" />
            <span>Updated {new Date().toLocaleTimeString()}</span>
          </div>
        )}
        <div className="flex items-center space-x-2 mt-2">
          <Button variant="outline" size="sm" onClick={() => setTimeframe(30)}>30D</Button>
          <Button variant="outline" size="sm" onClick={() => setTimeframe(90)}>90D</Button>
          <Button variant="outline" size="sm" onClick={() => setTimeframe(365)}>1Y</Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <Tabs defaultValue="price" className="h-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="price">Price</TabsTrigger>
            <TabsTrigger value="volume">Volume</TabsTrigger>
            <TabsTrigger value="both">Both</TabsTrigger>
          </TabsList>
          
          <TabsContent value="price" className="h-full">
            <ResponsiveContainer width="100%" height={compact ? 350 : 500}>
              <LineChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="price" stroke="#8884d8" name="Price" />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
          
          <TabsContent value="volume" className="h-full">
            <ResponsiveContainer width="100%" height={compact ? 350 : 500}>
              <BarChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="volume" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="volume"
                  fill="#64748b"
                  opacity={0.5}
                  yAxisId="volume"
                  name="Volume"
                />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
          
          <TabsContent value="both" className="h-full">
            <ResponsiveContainer width="100%" height={compact ? 350 : 500}>
              <ComposedChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="price" />
                <YAxis yAxisId="volume" orientation="right" />
                <Tooltip />
                <Legend />
                <Line type="monotone" yAxisId="price" dataKey="price" stroke="#8884d8" name="Price" />
                <Bar yAxisId="volume" dataKey="volume" fill="#64748b" opacity={0.5} name="Volume" />
              </ComposedChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export { AdvancedStockChart };
