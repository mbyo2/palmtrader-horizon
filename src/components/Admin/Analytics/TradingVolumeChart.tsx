import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface VolumeData {
  date: string;
  volume: number;
  trades: number;
  avgTradeSize: number;
}

export const TradingVolumeChart = () => {
  const [data, setData] = useState<VolumeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    fetchVolumeData();
  }, [timeRange]);

  const fetchVolumeData = async () => {
    try {
      const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const { data: trades } = await supabase
        .from('trades')
        .select('created_at, total_amount, shares')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (!trades) {
        setData([]);
        return;
      }

      // Group by date
      const groupedData = trades.reduce((acc, trade) => {
        const date = new Date(trade.created_at).toLocaleDateString();
        if (!acc[date]) {
          acc[date] = { volume: 0, trades: 0, totalShares: 0 };
        }
        acc[date].volume += Number(trade.total_amount);
        acc[date].trades += 1;
        acc[date].totalShares += Number(trade.shares);
        return acc;
      }, {} as Record<string, { volume: number; trades: number; totalShares: number }>);

      const chartData = Object.entries(groupedData).map(([date, stats]) => ({
        date,
        volume: Number(stats.volume.toFixed(2)),
        trades: stats.trades,
        avgTradeSize: Number((stats.volume / stats.trades).toFixed(2)),
      }));

      setData(chartData);
    } catch (error) {
      console.error('Error fetching volume data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Trading Volume</CardTitle>
              <CardDescription>Total trading volume over time</CardDescription>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-3 py-1 rounded-md text-sm ${timeRange === '7d' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                7D
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-3 py-1 rounded-md text-sm ${timeRange === '30d' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                30D
              </button>
              <button
                onClick={() => setTimeRange('90d')}
                className={`px-3 py-1 rounded-md text-sm ${timeRange === '90d' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                90D
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center">Loading...</div>
          ) : data.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No trading data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Volume ($)"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trade Count</CardTitle>
          <CardDescription>Number of trades per day</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[250px] flex items-center justify-center">Loading...</div>
          ) : data.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="trades" fill="hsl(var(--primary))" name="Trades" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Average Trade Size</CardTitle>
          <CardDescription>Average transaction value</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[250px] flex items-center justify-center">Loading...</div>
          ) : data.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="avgTradeSize" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  name="Avg Size ($)"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
