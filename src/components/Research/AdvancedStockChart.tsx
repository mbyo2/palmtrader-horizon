
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
      // Use timestamp property for date filtering
      const itemDate = new Date(item.timestamp);
      return itemDate >= startDate;
    });
  })();

  // Calculate price change
  const currentPrice = data.length > 0 ? data[data.length - 1].close || data[data.length - 1].price : 0;
  const initialPrice = filteredData.length > 0 ? filteredData[0].open || filteredData[0].price : 0;
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
    // Format date based on time range
    displayDate: (() => {
      const itemDate = new Date(item.timestamp);
      
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
      <div className="h-[300px] sm:h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.primary} stopOpacity={0.8} />
                <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis 
              dataKey="displayDate" 
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
              tickMargin={8}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              domain={['auto', 'auto']} 
              tick={{ fontSize: 10 }}
              width={60}
            />
            <Tooltip
              formatter={(value: any) => [`$${value}`, "Price"]}
              labelFormatter={(label) => `Date: ${label}`}
              contentStyle={{ fontSize: '12px' }}
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
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div className="w-full sm:w-auto">
          <CardTitle className="text-lg sm:text-xl">{symbol}</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-base sm:text-lg font-semibold">${currentPrice.toFixed(2)}</span>
            <span
              className={`text-sm sm:text-base ${
                priceChange >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {priceChange >= 0 ? "+" : ""}
              {priceChange.toFixed(2)} ({percentChange.toFixed(2)}%)
            </span>
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-[80px] h-9">
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
            <TabsList className="grid grid-cols-4 h-9">
              <TabsTrigger value="area" className="px-2 text-xs">Area</TabsTrigger>
              <TabsTrigger value="line" className="px-2 text-xs">Line</TabsTrigger>
              <TabsTrigger value="candle" className="px-2 text-xs">Candle</TabsTrigger>
              <TabsTrigger value="bar" className="px-2 text-xs">Bar</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] sm:h-[400px] lg:h-[500px] w-full">
          {chartType === "area" && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.primary} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                  tickMargin={8}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  domain={['auto', 'auto']} 
                  tick={{ fontSize: 10 }}
                  width={60}
                />
                <Tooltip
                  formatter={(value: any) => [`$${value}`, "Price"]}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{ fontSize: '12px' }}
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
              <ComposedChart data={formattedData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                  tickMargin={8}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  domain={['auto', 'auto']} 
                  tick={{ fontSize: 10 }}
                  width={60}
                />
                <Tooltip
                  formatter={(value: any) => [`$${value}`, "Price"]}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{ fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
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
              <ComposedChart data={formattedData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                  tickMargin={8}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  domain={['auto', 'auto']} 
                  tick={{ fontSize: 10 }}
                  width={60}
                />
                <Tooltip
                  formatter={(value: any, name: any) => {
                    const labels: Record<string, string> = {
                      high: 'High',
                      low: 'Low',
                      open: 'Open',
                      close: 'Close'
                    };
                    return [`$${value}`, labels[name] || name];
                  }}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{ fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar 
                  dataKey="high" 
                  fill="transparent" 
                  stroke={colors.secondary} 
                  barSize={2}
                  name="High"
                />
                <Bar 
                  dataKey="low" 
                  fill="transparent" 
                  stroke={colors.secondary} 
                  barSize={2}
                  name="Low"
                />
                <Bar 
                  dataKey="close" 
                  fill={colors.positive} 
                  barSize={8}
                  name="Close"
                />
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke={colors.primary}
                  dot={false}
                  strokeWidth={1}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}

          {chartType === "bar" && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                  tickMargin={8}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  domain={['auto', 'auto']} 
                  tick={{ fontSize: 10 }}
                  width={60}
                />
                <Tooltip
                  formatter={(value: any) => [`$${value}`, "Price"]}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{ fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar 
                  dataKey="close" 
                  fill={colors.primary} 
                  barSize={3}
                  name="Close Price"
                />
                <Bar 
                  dataKey="open" 
                  fill={colors.secondary} 
                  barSize={3}
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
