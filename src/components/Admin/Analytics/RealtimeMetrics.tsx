import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Users, DollarSign, Activity } from "lucide-react";

interface RealtimeData {
  activeUsers: number;
  pendingOrders: number;
  recentTrades: number;
  liveVolume: number;
}

interface RecentActivity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  status: 'success' | 'pending' | 'error';
}

export const RealtimeMetrics = () => {
  const [data, setData] = useState<RealtimeData>({
    activeUsers: 0,
    pendingOrders: 0,
    recentTrades: 0,
    liveVolume: 0,
  });
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchRealtimeData();

    // Subscribe to real-time updates
    const tradesChannel = supabase
      .channel('realtime-trades')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trades'
        },
        (payload) => {
          handleNewTrade(payload.new);
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.warn('Realtime trades subscription error:', err);
        }
      });

    const ordersChannel = supabase
      .channel('realtime-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          fetchRealtimeData();
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.warn('Realtime orders subscription error:', err);
        }
      });

    // Refresh data every 10 seconds
    const interval = setInterval(() => {
      fetchRealtimeData();
      setLastUpdate(new Date());
    }, 10000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(tradesChannel).catch(err => {
        console.warn('Error removing trades channel:', err);
      });
      supabase.removeChannel(ordersChannel).catch(err => {
        console.warn('Error removing orders channel:', err);
      });
    };
  }, []);

  const fetchRealtimeData = async () => {
    try {
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

      // Get recent trades
      const { data: recentTrades, count: tradesCount } = await supabase
        .from('trades')
        .select('*', { count: 'exact' })
        .gte('created_at', fiveMinutesAgo.toISOString());

      // Calculate live volume
      const volume = recentTrades?.reduce((sum, trade) => sum + Number(trade.total_amount), 0) || 0;

      // Get active users (unique users in last 5 minutes)
      const activeUsers = new Set(recentTrades?.map(t => t.user_id)).size;

      // Get pending orders
      const { count: pendingCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setData({
        activeUsers,
        pendingOrders: pendingCount || 0,
        recentTrades: tradesCount || 0,
        liveVolume: volume,
      });

      // Fetch recent activities
      const { data: recentActivities } = await supabase
        .from('trades')
        .select('id, symbol, type, shares, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentActivities) {
        const formattedActivities: RecentActivity[] = recentActivities.map(trade => ({
          id: trade.id,
          type: trade.type,
          message: `${trade.type.toUpperCase()} ${trade.shares} shares of ${trade.symbol}`,
          timestamp: new Date(trade.created_at).toLocaleTimeString(),
          status: trade.status === 'completed' ? 'success' : trade.status === 'pending' ? 'pending' : 'error',
        }));
        setActivities(formattedActivities);
      }
    } catch (error) {
      console.error('Error fetching realtime data:', error);
    }
  };

  const handleNewTrade = (trade: any) => {
    // Update metrics
    setData(prev => ({
      ...prev,
      recentTrades: prev.recentTrades + 1,
      liveVolume: prev.liveVolume + Number(trade.total_amount),
    }));

    // Add to activities
    const newActivity: RecentActivity = {
      id: trade.id,
      type: trade.type,
      message: `${trade.type.toUpperCase()} ${trade.shares} shares of ${trade.symbol}`,
      timestamp: new Date().toLocaleTimeString(),
      status: 'success',
    };

    setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
    setLastUpdate(new Date());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Real-time Monitoring</h3>
          <p className="text-sm text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <Badge variant="outline" className="animate-pulse">
          <Activity className="h-3 w-3 mr-1" />
          Live
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Users (5 min)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Awaiting execution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Trades</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.recentTrades}</div>
            <p className="text-xs text-muted-foreground">Last 5 minutes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.liveVolume.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">Last 5 minutes</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Live transaction feed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent activity
              </p>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        activity.status === 'success' ? 'default' :
                        activity.status === 'pending' ? 'secondary' :
                        'destructive'
                      }
                    >
                      {activity.type}
                    </Badge>
                    <span className="text-sm">{activity.message}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {activity.timestamp}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
