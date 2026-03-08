import { useState, useMemo } from "react";
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
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealTimePortfolio } from "@/hooks/useRealTimePortfolio";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--info))",
];

const PortfolioAnalytics = () => {
  const [timeRange, setTimeRange] = useState<"1d" | "1w" | "1m" | "3m" | "1y">("1m");
  const [visibleSeries, setVisibleSeries] = useState({
    portfolioValue: true,
    returns: true,
  });

  const { positions, summary } = useRealTimePortfolio();

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

  // Diversification from real portfolio positions
  const diversificationData = useMemo(() => {
    if (!positions.length || summary.totalValue === 0) return [];
    return positions.map(p => ({
      name: p.symbol,
      value: parseFloat(((p.currentValue / summary.totalValue) * 100).toFixed(1)),
    }));
  }, [positions, summary.totalValue]);

  // Build performance data from actual trades
  const performanceData = useMemo(() => {
    if (!tradesHistory || tradesHistory.length === 0) return [];

    const days = timeRange === '1d' ? 1 : timeRange === '1w' ? 7 : timeRange === '1m' ? 30 : timeRange === '3m' ? 90 : 365;
    const cutoff = new Date(Date.now() - days * 86400000);

    // Build cumulative invested amount by date
    let invested = 0;
    const tradePoints: Array<{ date: string; value: number }> = [];

    tradesHistory
      .filter(t => new Date(t.created_at) >= cutoff)
      .forEach(trade => {
        invested += trade.type === 'buy' ? (trade.total_amount || 0) : -(trade.total_amount || 0);
        tradePoints.push({
          date: new Date(trade.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          value: Math.max(0, invested),
        });
      });

    // Append current value as the last point
    if (summary.totalValue > 0) {
      tradePoints.push({
        date: 'Now',
        value: summary.totalValue,
      });
    }

    const initial = tradePoints[0]?.value || 1;
    return tradePoints.map(p => ({
      ...p,
      returns: parseFloat((((p.value - initial) / initial) * 100).toFixed(2)),
    }));
  }, [tradesHistory, timeRange, summary.totalValue]);

  // Compute gain/loss from real data
  const totalGainPercent = summary.totalInvested > 0
    ? ((summary.totalValue - summary.totalInvested) / summary.totalInvested) * 100
    : 0;

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
            {performanceData.length > 0 ? (
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
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                    />
                  )}
                  {visibleSeries.returns && (
                    <Line
                      type="monotone"
                      dataKey="returns"
                      name="Returns %"
                      stroke="hsl(var(--success))"
                      strokeWidth={2}
                    />
                  )}
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No trade history for this period
              </div>
            )}
          </div>

          {/* Portfolio Diversification */}
          <div className="h-64">
            <h3 className="text-lg font-medium mb-2">Portfolio Diversification</h3>
            {diversificationData.length > 0 ? (
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
                    {diversificationData.map((_, index) => (
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
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No positions to display
              </div>
            )}
          </div>

          {/* Summary Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-background/50">
              <h4 className="text-sm text-muted-foreground">Total Value</h4>
              <p className="text-lg font-semibold">
                ${summary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-background/50">
              <h4 className="text-sm text-muted-foreground">Total Gain/Loss</h4>
              <p className={`text-lg font-semibold ${totalGainPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                {totalGainPercent >= 0 ? '+' : ''}{totalGainPercent.toFixed(2)}%
              </p>
            </div>
            <div className="p-4 rounded-lg bg-background/50">
              <h4 className="text-sm text-muted-foreground">Total Positions</h4>
              <p className="text-lg font-semibold">
                {positions.length}
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
