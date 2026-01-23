
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { 
  ChartContainer, 
  ChartTooltip,
  ChartLegend
} from "@/components/ui/chart";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent,
  ChartBar, 
  ChartLine, 
  ChartPie 
} from "lucide-react";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

const PortfolioPerformance = () => {
  const [timeRange, setTimeRange] = useState<"1d" | "1w" | "1m" | "3m" | "1y">("1m");
  const [visibleSeries, setVisibleSeries] = useState({
    portfolioValue: true,
    returns: true,
  });

  // Fetch portfolio data
  const { data: portfolioData, isLoading: portfolioLoading } = useQuery({
    queryKey: ["portfolio", timeRange],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("portfolio")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch historical trades for performance tracking
  const { data: tradesHistory, isLoading: tradesLoading } = useQuery({
    queryKey: ["trades-history", timeRange],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch market data for stocks in portfolio
  const { data: marketData, isLoading: marketLoading } = useQuery({
    queryKey: ["market-data", portfolioData, timeRange],
    enabled: !!portfolioData && portfolioData.length > 0,
    queryFn: async () => {
      if (!portfolioData || portfolioData.length === 0) return [];
      
      const symbols = portfolioData.map(position => position.symbol);
      const results = [];
      
      for (const symbol of symbols) {
        const days = timeRangeToDays(timeRange);
        const { data, error } = await supabase
          .from("market_data")
          .select("*")
          .eq("symbol", symbol)
          .order("timestamp", { ascending: true })
          .limit(days);
          
        if (!error && data) {
          results.push(...data);
        }
      }
      
      return results;
    },
  });

  const isLoading = portfolioLoading || tradesLoading || marketLoading;

  // Calculate portfolio value and diversification
  const portfolioValue = portfolioData?.reduce(
    (total, position) => total + position.shares * position.average_price,
    0
  ) || 0;

  const diversificationData = portfolioData?.map((position) => ({
    name: position.symbol,
    value: (position.shares * position.average_price / portfolioValue) * 100,
  })) || [];

  // Generate performance data based on time range
  const performanceData = generatePerformanceData(timeRange, portfolioData, tradesHistory, marketData);

  // Get portfolio metrics
  const metrics = calculatePortfolioMetrics(performanceData, portfolioValue);

  const handleLegendClick = (dataKey: keyof typeof visibleSeries) => {
    setVisibleSeries(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }));
  };

  // Helper function to convert time range to days
  function timeRangeToDays(range: "1d" | "1w" | "1m" | "3m" | "1y"): number {
    switch (range) {
      case "1d": return 1;
      case "1w": return 7;
      case "1m": return 30;
      case "3m": return 90;
      case "1y": return 365;
      default: return 30;
    }
  }

  // Generate performance data from actual portfolio and trades
  function generatePerformanceData(
    range: "1d" | "1w" | "1m" | "3m" | "1y",
    portfolio?: any[],
    trades?: any[],
    marketData?: any[]
  ) {
    if (!portfolio || portfolio.length === 0) {
      return [];
    }

    // Calculate current portfolio value
    const currentValue = portfolio.reduce(
      (total, pos) => total + pos.shares * pos.average_price,
      0
    );

    if (currentValue === 0) return [];

    // Group trades by date to calculate cumulative portfolio value over time
    const tradesByDate = new Map<string, number>();
    let runningValue = 0;

    const sortedTrades = [...(tradesHistory || [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    sortedTrades.forEach(trade => {
      const date = new Date(trade.created_at).toLocaleDateString();
      const tradeValue = trade.type === 'buy' ? trade.total_amount : -trade.total_amount;
      runningValue += trade.type === 'buy' ? trade.total_amount : 0;
      tradesByDate.set(date, runningValue);
    });

    // Create data points based on time range
    const days = timeRangeToDays(range);
    const data: Array<{ date: string; value: number; returns: number }> = [];
    const now = new Date();
    const initialValue = sortedTrades.length > 0 ? (sortedTrades[0].total_amount || currentValue) : currentValue;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      let dateLabel: string;
      if (range === "1d") {
        dateLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (range === "1w") {
        dateLabel = date.toLocaleDateString([], { weekday: 'short' });
      } else {
        dateLabel = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }

      // Find closest trade value or use current value
      const closestValue = tradesByDate.get(date.toLocaleDateString()) || currentValue;
      
      // Use actual trade data without random variation
      const value = Math.max(0, closestValue);
      const returns = initialValue > 0 ? ((value - initialValue) / initialValue) * 100 : 0;

      data.push({
        date: dateLabel,
        value: Math.round(value * 100) / 100,
        returns: Math.round(returns * 100) / 100
      });
    }

    return data.length > 0 ? data : [{ date: 'Now', value: currentValue, returns: 0 }];
  }

  // Calculate portfolio metrics from real data
  function calculatePortfolioMetrics(performanceData: any[], currentValue: number) {
    if (!performanceData.length || currentValue === 0) {
      return {
        totalGain: { value: 0, percentage: 0 },
        todayGain: { value: 0, percentage: 0 },
        annualReturn: 0
      };
    }
    
    const initialValue = performanceData[0]?.value || currentValue;
    const previousValue = performanceData.length > 1 ? performanceData[performanceData.length - 2]?.value : initialValue;
    const finalValue = currentValue;
    
    const totalGainValue = finalValue - initialValue;
    const totalGainPercent = initialValue > 0 ? (totalGainValue / initialValue) * 100 : 0;
    
    const todayGainValue = finalValue - previousValue;
    const todayGainPercent = previousValue > 0 ? (todayGainValue / previousValue) * 100 : 0;

    // Calculate annualized return based on available data
    const annualReturn = totalGainPercent * (365 / Math.max(performanceData.length, 1));
    
    return {
      totalGain: { 
        value: totalGainValue, 
        percentage: totalGainPercent
      },
      todayGain: { 
        value: todayGainValue, 
        percentage: todayGainPercent 
      },
      annualReturn: Math.min(annualReturn, 999) // Cap at 999% for display
    };
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <CardHeader>
          <CardTitle>Portfolio Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <Skeleton className="h-[250px] w-full" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-gradient">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-semibold">Portfolio Performance</CardTitle>
        <Select value={timeRange} onValueChange={(value: "1d" | "1w" | "1m" | "3m" | "1y") => setTimeRange(value)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Time Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1d">1 Day</SelectItem>
            <SelectItem value="1w">1 Week</SelectItem>
            <SelectItem value="1m">1 Month</SelectItem>
            <SelectItem value="3m">3 Months</SelectItem>
            <SelectItem value="1y">1 Year</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Portfolio Value Chart */}
        <div className="h-64">
          <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
            <ChartLine className="h-5 w-5" />
            Performance
          </h3>
          <ChartContainer config={{}}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <ChartTooltip />
              <Legend 
                onClick={(e) => handleLegendClick(e.dataKey as keyof typeof visibleSeries)}
              />
              {visibleSeries.portfolioValue && (
                <Line
                  type="monotone"
                  dataKey="value"
                  name="Portfolio Value"
                  stroke="#8884d8"
                  strokeWidth={2}
                />
              )}
              {visibleSeries.returns && (
                <Line
                  type="monotone"
                  dataKey="returns"
                  name="Returns %"
                  stroke="#82ca9d"
                  strokeWidth={2}
                />
              )}
            </LineChart>
          </ChartContainer>
        </div>

        {/* Portfolio Diversification */}
        <div className="h-64">
          <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
            <ChartPie className="h-5 w-5" />
            Portfolio Diversification
          </h3>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={diversificationData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {diversificationData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-background/50">
            <div className="flex items-center justify-between">
              <h4 className="text-sm text-muted-foreground">Total Value</h4>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold">
              ${portfolioValue.toLocaleString()}
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-background/50">
            <div className="flex items-center justify-between">
              <h4 className="text-sm text-muted-foreground">Total Gain/Loss</h4>
              {metrics.totalGain.percentage >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
            <p className={`text-lg font-semibold ${metrics.totalGain.percentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {metrics.totalGain.percentage >= 0 ? '+' : ''}{metrics.totalGain.percentage.toFixed(2)}%
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-background/50">
            <div className="flex items-center justify-between">
              <h4 className="text-sm text-muted-foreground">Today's Change</h4>
              {metrics.todayGain.percentage >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
            <p className={`text-lg font-semibold ${metrics.todayGain.percentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {metrics.todayGain.percentage >= 0 ? '+' : ''}{metrics.todayGain.percentage.toFixed(2)}%
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-background/50">
            <div className="flex items-center justify-between">
              <h4 className="text-sm text-muted-foreground">Annual Return</h4>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold">
              {metrics.annualReturn.toFixed(2)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioPerformance;
