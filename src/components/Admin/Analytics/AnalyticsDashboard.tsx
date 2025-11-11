import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TradingVolumeChart } from "./TradingVolumeChart";
import { UserActivityChart } from "./UserActivityChart";
import { ErrorRateChart } from "./ErrorRateChart";
import { SystemHealthMetrics } from "./SystemHealthMetrics";
import { RealtimeMetrics } from "./RealtimeMetrics";
import { supabase } from "@/integrations/supabase/client";
import { Activity, TrendingUp, Users, AlertTriangle } from "lucide-react";

interface MetricsSummary {
  totalTrades: number;
  tradingVolume: number;
  activeUsers: number;
  errorRate: number;
  systemHealth: number;
}

export const AnalyticsDashboard = () => {
  const [metrics, setMetrics] = useState<MetricsSummary>({
    totalTrades: 0,
    tradingVolume: 0,
    activeUsers: 0,
    errorRate: 0,
    systemHealth: 100,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    
    // Set up real-time updates
    const channel = supabase
      .channel('analytics-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades'
        },
        () => {
          fetchMetrics();
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.warn('Analytics subscription error:', err);
        }
      });

    return () => {
      supabase.removeChannel(channel).catch(err => {
        console.warn('Error removing analytics channel:', err);
      });
    };
  }, []);

  const fetchMetrics = async () => {
    try {
      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Fetch total trades
      const { count: tradesCount } = await supabase
        .from('trades')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayISO);

      // Fetch trading volume
      const { data: volumeData } = await supabase
        .from('trades')
        .select('total_amount')
        .gte('created_at', todayISO);

      const totalVolume = volumeData?.reduce((sum, trade) => sum + Number(trade.total_amount), 0) || 0;

      // Fetch active users (users who made trades today)
      const { data: activeUsersData } = await supabase
        .from('trades')
        .select('user_id')
        .gte('created_at', todayISO);

      const uniqueUsers = new Set(activeUsersData?.map(t => t.user_id)).size;

      // Fetch error rate from system logs
      const { count: totalLogs } = await supabase
        .from('system_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayISO);

      const { count: errorLogs } = await supabase
        .from('system_logs')
        .select('*', { count: 'exact', head: true })
        .eq('level', 'error')
        .gte('created_at', todayISO);

      const errorRate = totalLogs ? ((errorLogs || 0) / totalLogs) * 100 : 0;

      // Calculate system health (inverse of error rate)
      const systemHealth = Math.max(0, 100 - errorRate);

      setMetrics({
        totalTrades: tradesCount || 0,
        tradingVolume: totalVolume,
        activeUsers: uniqueUsers,
        errorRate: Number(errorRate.toFixed(2)),
        systemHealth: Number(systemHealth.toFixed(1)),
      });
    } catch (error) {
      console.error('Error fetching analytics metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
        <p className="text-muted-foreground">
          Real-time system metrics and performance insights
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTrades.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Today's transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trading Volume</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.tradingVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">Total value today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Users trading today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.systemHealth}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.errorRate}% error rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="trading" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trading">Trading Volume</TabsTrigger>
          <TabsTrigger value="users">User Activity</TabsTrigger>
          <TabsTrigger value="errors">Error Rates</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
          <TabsTrigger value="realtime">Real-time</TabsTrigger>
        </TabsList>

        <TabsContent value="trading" className="space-y-4">
          <TradingVolumeChart />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UserActivityChart />
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <ErrorRateChart />
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <SystemHealthMetrics />
        </TabsContent>

        <TabsContent value="realtime" className="space-y-4">
          <RealtimeMetrics />
        </TabsContent>
      </Tabs>
    </div>
  );
};
