
import React, { useState, useRef } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { 
  Area, 
  Line, 
  Bar, 
  ComposedChart, 
  Legend, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip,
  ReferenceLine,
  Brush
} from 'recharts';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertCircle, 
  ZoomIn, 
  ZoomOut, 
  RefreshCw, 
  ChevronDown, 
  PanelTopOpen,
  GitBranch,
  Activity
} from "lucide-react";
import { MarketData } from "@/services/market/types";

interface AdvancedChartProps {
  symbol: string;
  data: MarketData[];
  height?: number;
}

const AdvancedChart: React.FC<AdvancedChartProps> = ({ 
  symbol, 
  data,
  height = 500
}) => {
  const [chartType, setChartType] = useState<string>("area");
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);
  const [showVolume, setShowVolume] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState("1d");
  const chartRef = useRef<any>(null);
  
  // Calculate some basic indicators
  const calculateSMA = (period: number) => {
    if (!data || data.length === 0) return [];
    
    const result = [...data];
    for (let i = period; i < result.length; i++) {
      const slice = result.slice(i - period, i);
      const sum = slice.reduce((total, item) => total + item.price, 0);
      result[i] = {
        ...result[i],
        [`sma${period}`]: sum / period
      };
    }
    return result;
  };
  
  // Process the data with selected indicator
  const processedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    let result = [...data];
    
    result = result.map(item => ({
      ...item,
      date: new Date(parseInt(item.timestamp)).toLocaleDateString(),
      formattedDate: new Date(parseInt(item.timestamp)).toLocaleString(),
    }));
    
    // Add indicators if selected
    if (selectedIndicator === "sma50") {
      result = calculateSMA(50);
    } else if (selectedIndicator === "sma200") {
      result = calculateSMA(200);
    }
    
    return result;
  }, [data, selectedIndicator]);
  
  // Determine min and max for y-axis scaling
  const yAxisDomain = React.useMemo(() => {
    if (!data || data.length === 0) return [0, 100];
    
    const prices = data.map(d => d.price);
    const min = Math.min(...prices) * 0.95; // 5% padding
    const max = Math.max(...prices) * 1.05;
    
    return [min, max];
  }, [data]);
  
  // Handles for zoom in/out
  const handleZoomIn = () => {
    if (chartRef.current) {
      // This is where we'd implement zoom functionality
      console.log("Zoom in");
    }
  };
  
  const handleZoomOut = () => {
    if (chartRef.current) {
      // This is where we'd implement zoom functionality
      console.log("Zoom out");
    }
  };

  // Mock prediction data (for demonstration)
  const predictions = React.useMemo(() => {
    if (!data || data.length < 5) return [];
    
    const lastPrice = data[data.length - 1].price;
    const lastDate = new Date(parseInt(data[data.length - 1].timestamp));
    
    const result = [];
    for (let i = 1; i <= 5; i++) {
      const newDate = new Date(lastDate);
      newDate.setDate(lastDate.getDate() + i);
      
      // Simple random movement prediction (for demo)
      const predictedPrice = lastPrice * (1 + (Math.random() * 0.04 - 0.02));
      
      result.push({
        date: newDate.toLocaleDateString(),
        formattedDate: newDate.toLocaleString(),
        price: predictedPrice,
        isPrediction: true
      });
    }
    
    return result;
  }, [data]);
  
  const allData = React.useMemo(() => {
    return [...processedData, ...(selectedIndicator === "prediction" ? predictions : [])];
  }, [processedData, predictions, selectedIndicator]);
  
  // Custom tooltip formatting
  const formatTooltip = (value: any, name: any) => {
    if (name === "price") {
      return [`$${value.toFixed(2)}`, "Price"];
    }
    if (name === "volume") {
      return [`${(value / 1000000).toFixed(2)}M`, "Volume"];
    }
    if (name.startsWith("sma")) {
      return [`$${value.toFixed(2)}`, `SMA ${name.substring(3)}`];
    }
    return [value, name];
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{symbol} Chart</CardTitle>
          <div className="flex space-x-2">
            <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">1 Day</SelectItem>
                <SelectItem value="1w">1 Week</SelectItem>
                <SelectItem value="1m">1 Month</SelectItem>
                <SelectItem value="1y">1 Year</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="standard" className="w-full mb-4">
          <TabsList>
            <TabsTrigger value="standard">Standard</TabsTrigger>
            <TabsTrigger value="technical">Technical</TabsTrigger>
            <TabsTrigger value="predictive">Predictive</TabsTrigger>
          </TabsList>
          
          <TabsContent value="standard">
            <div className="flex mb-2 space-x-2">
              <Button 
                variant={chartType === "area" ? "default" : "outline"} 
                size="sm"
                onClick={() => setChartType("area")}
              >
                Area
              </Button>
              <Button 
                variant={chartType === "line" ? "default" : "outline"} 
                size="sm"
                onClick={() => setChartType("line")}
              >
                Line
              </Button>
              <Button 
                variant={chartType === "candle" ? "default" : "outline"} 
                size="sm"
                onClick={() => setChartType("candle")}
              >
                Candle
              </Button>
              <div className="ml-auto">
                <Button 
                  variant={showVolume ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setShowVolume(!showVolume)}
                >
                  Volume
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="technical">
            <div className="flex mb-2 space-x-2">
              <Button 
                variant={selectedIndicator === "sma50" ? "default" : "outline"} 
                size="sm"
                onClick={() => setSelectedIndicator(selectedIndicator === "sma50" ? null : "sma50")}
              >
                SMA 50
              </Button>
              <Button 
                variant={selectedIndicator === "sma200" ? "default" : "outline"} 
                size="sm"
                onClick={() => setSelectedIndicator(selectedIndicator === "sma200" ? null : "sma200")}
              >
                SMA 200
              </Button>
              <Button 
                variant={selectedIndicator === "bollinger" ? "default" : "outline"} 
                size="sm"
                onClick={() => setSelectedIndicator(selectedIndicator === "bollinger" ? null : "bollinger")}
              >
                Bollinger
              </Button>
              <Button 
                variant={selectedIndicator === "rsi" ? "default" : "outline"} 
                size="sm"
                onClick={() => setSelectedIndicator(selectedIndicator === "rsi" ? null : "rsi")}
              >
                RSI
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="predictive">
            <div className="flex mb-2 space-x-2">
              <Button 
                variant={selectedIndicator === "prediction" ? "default" : "outline"} 
                size="sm"
                onClick={() => setSelectedIndicator(selectedIndicator === "prediction" ? null : "prediction")}
              >
                Price Prediction
              </Button>
              
              <Button 
                variant={selectedIndicator === "trend" ? "default" : "outline"} 
                size="sm"
                onClick={() => setSelectedIndicator(selectedIndicator === "trend" ? null : "trend")}
              >
                Trend Analysis
              </Button>
            </div>
            
            {selectedIndicator === "prediction" && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Predictions are for demonstration purposes only and should not be used for trading decisions.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
        
        <div className="w-full h-[500px]">
          <ChartContainer 
            config={{
              price: { theme: { dark: '#8884d8', light: '#8884d8' } },
              prediction: { theme: { dark: '#ff9800', light: '#ff9800' } },
              sma50: { theme: { dark: '#4CAF50', light: '#4CAF50' } },
              sma200: { theme: { dark: '#F44336', light: '#F44336' } },
              volume: { theme: { dark: '#64748b', light: '#64748b' } },
            }}
          >
            <ComposedChart 
              data={allData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <XAxis dataKey="date" />
              <YAxis 
                domain={yAxisDomain} 
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              {showVolume && (
                <YAxis 
                  yAxisId="volume" 
                  orientation="right" 
                  tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                />
              )}
              
              <ChartTooltip  
                content={<ChartTooltipContent formatter={formatTooltip} />}
              />
              
              <Legend />
              
              {/* Render chart based on type selection */}
              {chartType === "area" && (
                <Area 
                  type="monotone" 
                  dataKey="price" 
                  name="Price" 
                  fill="url(#colorPrice)" 
                  stroke="var(--color-price)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                />
              )}
              
              {chartType === "line" && (
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  name="Price" 
                  stroke="var(--color-price)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                />
              )}
              
              {/* Predictions line if enabled */}
              {selectedIndicator === "prediction" && (
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  name="Prediction" 
                  stroke="var(--color-prediction)"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={true}
                  connectNulls={true}
                  isAnimationActive={false}
                  // Only show prediction data
                  data={predictions}
                />
              )}
              
              {/* SMA indicators if enabled */}
              {selectedIndicator === "sma50" && (
                <Line 
                  type="monotone" 
                  dataKey="sma50" 
                  name="SMA 50" 
                  stroke="var(--color-sma50)"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              )}
              
              {selectedIndicator === "sma200" && (
                <Line 
                  type="monotone" 
                  dataKey="sma200" 
                  name="SMA 200" 
                  stroke="var(--color-sma200)"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              )}
              
              {/* Volume if enabled */}
              {showVolume && (
                <Bar 
                  dataKey="volume" 
                  name="Volume" 
                  yAxisId="volume" 
                  fill="var(--color-volume)"
                  opacity={0.5}
                  isAnimationActive={false}
                />
              )}
              
              {/* Reference line for last price */}
              {data && data.length > 0 && (
                <ReferenceLine 
                  y={data[data.length - 1].price} 
                  stroke="#888" 
                  strokeDasharray="3 3" 
                  label={{ value: `Last: $${data[data.length - 1].price.toFixed(2)}`, position: 'right' }} 
                />
              )}
              
              {/* Gradient fill for area chart */}
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-price)" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="var(--color-price)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              
              {/* Interactive brush for zooming */}
              <Brush 
                dataKey="date" 
                height={30} 
                stroke="#8884d8"
                startIndex={Math.max(0, allData.length - 30)}
              />
            </ComposedChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvancedChart;
