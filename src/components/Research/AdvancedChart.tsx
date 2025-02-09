
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
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, ChevronDown, TrendingUp, Layers } from "lucide-react";

interface TimeframeOption {
  label: string;
  value: string;
}

interface ChartType {
  label: string;
  value: 'line' | 'area' | 'candlestick';
  icon: React.ComponentType;
}

const timeframes: TimeframeOption[] = [
  { label: "1D", value: "1d" },
  { label: "1W", value: "1w" },
  { label: "1M", value: "1m" },
  { label: "3M", value: "3m" },
  { label: "1Y", value: "1y" },
  { label: "5Y", value: "5y" },
];

const chartTypes: ChartType[] = [
  { label: "Line", value: "line", icon: TrendingUp },
  { label: "Area", value: "area", icon: Layers },
  { label: "Candlestick", value: "candlestick", icon: BarChart },
];

const AdvancedChart = ({ symbol = "AAPL" }) => {
  const [timeframe, setTimeframe] = useState<string>("1m");
  const [chartType, setChartType] = useState<ChartType["value"]>("line");
  const [showVolume, setShowVolume] = useState(true);
  const [showIndicators, setShowIndicators] = useState(true);

  // Fetch market data
  const { data: marketData, isLoading } = useQuery({
    queryKey: ["market-data", symbol, timeframe],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_data")
        .select("*")
        .eq("symbol", symbol)
        .order("timestamp", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Fetch technical indicators
  const { data: indicators } = useQuery({
    queryKey: ["technical-indicators", symbol],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technical_indicators")
        .select("*")
        .eq("symbol", symbol)
        .order("timestamp", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
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
      <div className="flex justify-between items-center mb-4">
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

      <div className="h-[500px]">
        <ChartContainer config={{}}>
          {chartType === "line" && (
            <LineChart data={marketData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <ChartTooltip />
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
                />
              )}
              {showIndicators &&
                indicators?.map((indicator: any) => (
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
          {chartType === "area" && (
            <AreaChart data={marketData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <ChartTooltip />
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
                />
              )}
            </AreaChart>
          )}
        </ChartContainer>
      </div>
    </Card>
  );
};

export default AdvancedChart;
