
import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Bar,
  BarChart,
  ComposedChart,
  Line,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketData } from "@/services/MarketDataService";

interface AdvancedStockChartProps {
  symbol: string;
  data: MarketData[];
  compact?: boolean;
}

export function AdvancedStockChart({ symbol, data, compact = false }: AdvancedStockChartProps) {
  const [timeRange, setTimeRange] = useState<"1W" | "1M" | "3M" | "1Y" | "ALL">("1M");
  const [chartType, setChartType] = useState<"area" | "candle" | "line" | "bar">("area");

  // Filter data based on selected time range
  const filteredData = (() => {
    const currentDate = new Date();
    let startDate: Date;

    switch (timeRange) {
      case "1W":
        startDate = new Date(currentDate);
        startDate.setDate(currentDate.getDate() - 7);
        break;
      case "1M":
        startDate = new Date(currentDate);
        startDate.setMonth(currentDate.getMonth() - 1);
        break;
      case "3M":
        startDate = new Date(currentDate);
        startDate.setMonth(currentDate.getMonth() - 3);
        break;
      case "1Y":
        startDate = new Date(currentDate);
        startDate.setFullYear(currentDate.getFullYear() - 1);
        break;
      default:
        return data;
    }

    return data.filter((item) => {
      // Check if date property exists, otherwise use timestamp
      const itemDate = item.date ? new Date(item.date) : 
                       (item.timestamp ? new Date(item.timestamp) : null);
      return itemDate ? itemDate >= startDate : true;
    });
  })();

  // Calculate price change
  const currentPrice = data.length > 0 ? data[data.length - 1].close : 0;
  const initialPrice = filteredData.length > 0 ? filteredData[0].open : 0;
  const priceChange = currentPrice - initialPrice;
  const percentChange = initialPrice > 0 ? (priceChange / initialPrice) * 100 : 0;

  const isDarkMode = document.documentElement.classList.contains("dark");
  const colors = {
    primary: isDarkMode ? "#818cf8" : "#4f46e5",
    secondary: isDarkMode ? "#9ca3af" : "#6b7280",
    positive: "#10b981",
    negative: "#ef4444",
    background: isDarkMode ? "#1f2937" : "#f3f4f6",
    grid: isDarkMode ? "#374151" : "#e5e7eb",
  };

  // Format data for better visualization
  const formattedData = filteredData.map((item) => ({
    ...item,
    // Format date based on time range and available properties
    displayDate: (() => {
      const itemDate = item.date ? new Date(item.date) : 
                       (item.timestamp ? new Date(item.timestamp) : new Date());
      
      return timeRange === "1W" || timeRange === "1M"
        ? itemDate.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })
        : itemDate.toLocaleDateString(undefined, {
            month: "short",
            year: "2-digit",
          });
    })()
  }));

  // If compact mode is enabled, reduce the UI complexity
  if (compact) {
    return (
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.primary} stopOpacity={0.8} />
                <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis 
              dataKey="displayDate" 
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
              tickMargin={10}
            />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: any) => [`$${value}`, "Price"]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke={colors.primary}
              fillOpacity={1}
              fill="url(#colorClose)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl">{symbol}</CardTitle>
          <CardDescription className="flex items-center mt-1">
            <span className="text-lg font-semibold">${currentPrice.toFixed(2)}</span>
            <span
              className={`ml-2 ${
                priceChange >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {priceChange >= 0 ? "+" : ""}
              {priceChange.toFixed(2)} ({percentChange.toFixed(2)}%)
            </span>
          </CardDescription>
        </div>
        <div className="flex space-x-2">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-[80px]">
              <SelectValue placeholder={timeRange} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1W">1W</SelectItem>
              <SelectItem value="1M">1M</SelectItem>
              <SelectItem value="3M">3M</SelectItem>
              <SelectItem value="1Y">1Y</SelectItem>
              <SelectItem value="ALL">ALL</SelectItem>
            </SelectContent>
          </Select>
          <Tabs defaultValue="area" value={chartType} onValueChange={(value: any) => setChartType(value)}>
            <TabsList className="grid grid-cols-4 h-8">
              <TabsTrigger value="area" className="px-2 text-xs">Area</TabsTrigger>
              <TabsTrigger value="line" className="px-2 text-xs">Line</TabsTrigger>
              <TabsTrigger value="candle" className="px-2 text-xs">Candle</TabsTrigger>
              <TabsTrigger value="bar" className="px-2 text-xs">Bar</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          {chartType === "area" && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.primary} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                  tickMargin={10}
                />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: any) => [`$${value}`, "Price"]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke={colors.primary}
                  fillOpacity={1}
                  fill="url(#colorClose)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {chartType === "line" && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                  tickMargin={10}
                />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: any) => [`$${value}`, "Price"]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke={colors.primary}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="open"
                  stroke={colors.secondary}
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}

          {chartType === "candle" && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                  tickMargin={10}
                />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: any) => [`$${value}`, "Price"]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Bar 
                  dataKey="high" 
                  fill="transparent" 
                  stroke={colors.secondary} 
                  barSize={3}
                />
                <Bar 
                  dataKey="low" 
                  fill="transparent" 
                  stroke={colors.secondary} 
                  barSize={3}
                />
                <Bar 
                  dataKey="close" 
                  fill={colors.positive} 
                  barSize={10}
                />
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke={colors.primary}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}

          {chartType === "bar" && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                  tickMargin={10}
                />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: any) => [`$${value}`, "Price"]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Bar 
                  dataKey="close" 
                  fill={colors.primary} 
                  barSize={4}
                  name="Close Price"
                />
                <Bar 
                  dataKey="open" 
                  fill={colors.secondary} 
                  barSize={4}
                  name="Open Price"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
