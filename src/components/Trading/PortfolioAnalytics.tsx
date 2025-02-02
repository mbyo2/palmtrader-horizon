import { useState } from "react";
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartLegend } from "@/components/ui/chart";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

const PortfolioAnalytics = () => {
  const [timeRange, setTimeRange] = useState<"1d" | "1w" | "1m" | "3m" | "1y">("1m");
  const [visibleSeries, setVisibleSeries] = useState({
    portfolioValue: true,
    returns: true,
  });

  // Fetch portfolio data
  const { data: portfolioData } = useQuery({
    queryKey: ["portfolio"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("portfolio")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data;
    },
  });

  // Fetch historical trades for performance tracking
  const { data: tradesHistory } = useQuery({
    queryKey: ["trades-history"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Calculate portfolio value and diversification
  const portfolioValue = portfolioData?.reduce(
    (total, position) => total + position.shares * position.average_price,
    0
  ) || 0;

  const diversificationData = portfolioData?.map((position) => ({
    name: position.symbol,
    value: (position.shares * position.average_price / portfolioValue) * 100,
  })) || [];

  // Mock performance data (in a real app, this would come from historical price data)
  const performanceData = [
    { date: "2024-01", value: 10000, returns: 0 },
    { date: "2024-02", value: 12000, returns: 20 },
    { date: "2024-03", value: 11500, returns: 15 },
    { date: "2024-04", value: 13000, returns: 30 },
  ];

  const handleLegendClick = (dataKey: keyof typeof visibleSeries) => {
    setVisibleSeries(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }));
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 card-gradient">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Portfolio Analytics</h2>
          <Select value={timeRange} onValueChange={(value: typeof timeRange) => setTimeRange(value)}>
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
        </div>

        <div className="space-y-6">
          {/* Performance Chart */}
          <div className="h-64">
            <h3 className="text-lg font-medium mb-2">Performance</h3>
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
            <h3 className="text-lg font-medium mb-2">Portfolio Diversification</h3>
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

          {/* Summary Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-background/50">
              <h4 className="text-sm text-muted-foreground">Total Value</h4>
              <p className="text-lg font-semibold">
                ${portfolioValue.toLocaleString()}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-background/50">
              <h4 className="text-sm text-muted-foreground">Total Gain/Loss</h4>
              <p className="text-lg font-semibold text-green-500">+15.2%</p>
            </div>
            <div className="p-4 rounded-lg bg-background/50">
              <h4 className="text-sm text-muted-foreground">Total Positions</h4>
              <p className="text-lg font-semibold">
                {portfolioData?.length || 0}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-background/50">
              <h4 className="text-sm text-muted-foreground">Total Trades</h4>
              <p className="text-lg font-semibold">
                {tradesHistory?.length || 0}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PortfolioAnalytics;