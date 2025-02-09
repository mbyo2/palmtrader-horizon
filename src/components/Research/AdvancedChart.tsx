import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, ChevronDown, TrendingUp, Layers } from "lucide-react";
import { format } from "date-fns";

interface TimeframeOption {
  label: string;
  value: string;
  days: number;
}

interface ChartType {
  label: string;
  value: 'line' | 'area' | 'candlestick';
  icon: React.ComponentType;
}

interface MarketDataPoint {
  timestamp: string;
  price: number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number;
  symbol: string;
  type: string;
  id: string;
  created_at: string;
}

interface CandlestickProps {
  x: number;
  y: number;
  width: number;
  height: number;
  open: number;
  close: number;
  high: number;
  low: number;
}

const timeframes: TimeframeOption[] = [
  { label: "1D", value: "1d", days: 1 },
  { label: "1W", value: "1w", days: 7 },
  { label: "1M", value: "1m", days: 30 },
  { label: "3M", value: "3m", days: 90 },
  { label: "1Y", value: "1y", days: 365 },
  { label: "5Y", value: "5y", days: 1825 },
];

const chartTypes: ChartType[] = [
  { label: "Line", value: "line", icon: TrendingUp },
  { label: "Area", value: "area", icon: Layers },
  { label: "Candlestick", value: "candlestick", icon: BarChart },
];

const technicalIndicators = [
  { label: "Moving Average (MA)", value: "ma" },
  { label: "RSI", value: "rsi" },
  { label: "MACD", value: "macd" },
  { label: "Bollinger Bands", value: "bollinger" },
];

const CustomCandlestick: React.FC<CandlestickProps> = ({ x, y, width, height, open, close, high, low }) => {
  const isGreen = close > open;
  const color = isGreen ? "#22c55e" : "#ef4444";
  const bodyHeight = Math.abs(close - open);
  const bodyY = isGreen ? close : open;

  return (
    <g>
      <line
        x1={x + width / 2}
        y1={y + height - Math.max(open, close)}
        x2={x + width / 2}
        y2={y + height - high}
        stroke={color}
        strokeWidth={1}
      />
      <line
        x1={x + width / 2}
        y1={y + height - Math.min(open, close)}
        x2={x + width / 2}
        y2={y + height - low}
        stroke={color}
        strokeWidth={1}
      />
      <rect
        x={x}
        y={y + height - bodyY}
        width={width}
        height={bodyHeight}
        fill={color}
      />
    </g>
  );
};

const AdvancedChart = ({ symbol = "AAPL" }) => {
  const [timeframe, setTimeframe] = useState<string>("1m");
  const [chartType, setChartType] = useState<ChartType["value"]>("line");
  const [showVolume, setShowVolume] = useState(true);
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(["ma"]);

  // Fetch market data
  const { data: marketData, isLoading: isLoadingMarketData } = useQuery({
    queryKey: ["market-data", symbol, timeframe],
    queryFn: async () => {
      const selectedTimeframe = timeframes.find(tf => tf.value === timeframe);
      const daysAgo = selectedTimeframe ? selectedTimeframe.days : 30;
      
      const { data, error } = await supabase
        .from("market_data")
        .select("*")
        .eq("symbol", symbol)
        .gte("timestamp", new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString())
        .order("timestamp", { ascending: true });

      if (error) throw error;
      return data?.map(d => ({
        ...d,
        timestamp: format(new Date(d.timestamp), "MMM dd HH:mm"),
        open: d.open || d.price,
        high: d.high || d.price,
        low: d.low || d.price,
        close: d.close || d.price,
        volume: 0, // Add a default volume since it's not in our database yet
      })) as MarketDataPoint[];
    },
  });

  // Fetch technical indicators
  const { data: indicators, isLoading: isLoadingIndicators } = useQuery({
    queryKey: ["technical-indicators", symbol, selectedIndicators],
    queryFn: async () => {
      if (selectedIndicators.length === 0) return [];

      const { data, error } = await supabase
        .from("technical_indicators")
        .select("*")
        .eq("symbol", symbol)
        .in("indicator_type", selectedIndicators)
        .order("timestamp", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: selectedIndicators.length > 0,
  });

  const toggleIndicator = (indicator: string) => {
    setSelectedIndicators(prev =>
      prev.includes(indicator)
        ? prev.filter(i => i !== indicator)
        : [...prev, indicator]
    );
  };

  if (isLoadingMarketData) {
    return (
      <Card className="p-4">
        <div className="h-[500px] flex items-center justify-center">
          Loading chart data...
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{symbol} Chart</h2>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-24">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                {timeframes.map((tf) => (
                  <SelectItem key={tf.value} value={tf.value}>
                    {tf.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            {chartTypes.map((type) => (
              <Button
                key={type.value}
                variant={chartType === type.value ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType(type.value)}
              >
                <type.icon className="h-4 w-4 mr-1" />
                {type.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center space-x-2">
            <Switch
              id="volume"
              checked={showVolume}
              onCheckedChange={setShowVolume}
            />
            <Label htmlFor="volume">Volume</Label>
          </div>
          {technicalIndicators.map((indicator) => (
            <div key={indicator.value} className="flex items-center space-x-2">
              <Switch
                id={indicator.value}
                checked={selectedIndicators.includes(indicator.value)}
                onCheckedChange={() => toggleIndicator(indicator.value)}
              />
              <Label htmlFor={indicator.value}>{indicator.label}</Label>
            </div>
          ))}
        </div>

        <div className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "candlestick" ? (
              <ComposedChart data={marketData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip />
                <Legend />
                {marketData?.map((entry, index) => (
                  <CustomCandlestick
                    key={`candle-${index}`}
                    x={index * 20}
                    y={0}
                    width={10}
                    height={300}
                    open={entry.open || entry.price}
                    close={entry.close || entry.price}
                    high={entry.high || entry.price}
                    low={entry.low || entry.price}
                  />
                ))}
              </ComposedChart>
            ) : chartType === "area" ? (
              <AreaChart data={marketData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                  name="Price"
                />
                {showVolume && (
                  <Area
                    type="monotone"
                    dataKey="volume"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    fillOpacity={0.3}
                    name="Volume"
                    yAxisId={1}
                  />
                )}
              </AreaChart>
            ) : (
              <LineChart data={marketData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#8884d8"
                  dot={false}
                  name="Price"
                />
                {showVolume && (
                  <Line
                    type="monotone"
                    dataKey="volume"
                    stroke="#82ca9d"
                    dot={false}
                    name="Volume"
                    yAxisId={1}
                  />
                )}
                {indicators?.map((indicator) => (
                  <Line
                    key={indicator.indicator_type}
                    type="monotone"
                    dataKey="value"
                    stroke="#ffc658"
                    dot={false}
                    name={indicator.indicator_type}
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
};

export default AdvancedChart;
