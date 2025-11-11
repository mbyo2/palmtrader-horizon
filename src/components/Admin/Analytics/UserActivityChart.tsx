import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface ActivityData {
  date: string;
  activeUsers: number;
  newUsers: number;
  totalOrders: number;
}

export const UserActivityChart = () => {
  const [data, setData] = useState<ActivityData[]>([]);
  const [userStats, setUserStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivityData();
    fetchUserStats();
  }, []);

  const fetchActivityData = async () => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 14);

      // Get trades data
      const { data: trades } = await supabase
        .from('trades')
        .select('created_at, user_id')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      // Get orders data
      const { data: orders } = await supabase
        .from('orders')
        .select('created_at, user_id')
        .gte('created_at', startDate.toISOString());

      if (!trades) {
        setData([]);
        return;
      }

      // Group by date
      const dailyActivity: Record<string, Set<string>> = {};
      const dailyOrders: Record<string, number> = {};

      trades.forEach(trade => {
        const date = new Date(trade.created_at).toLocaleDateString();
        if (!dailyActivity[date]) {
          dailyActivity[date] = new Set();
          dailyOrders[date] = 0;
        }
        dailyActivity[date].add(trade.user_id);
      });

      orders?.forEach(order => {
        const date = new Date(order.created_at).toLocaleDateString();
        if (!dailyOrders[date]) {
          dailyOrders[date] = 0;
        }
        dailyOrders[date]++;
      });

      const chartData = Object.keys(dailyActivity).map(date => ({
        date,
        activeUsers: dailyActivity[date].size,
        newUsers: 0, // Would need account_details created_at for this
        totalOrders: dailyOrders[date] || 0,
      }));

      setData(chartData);
    } catch (error) {
      console.error('Error fetching activity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      // Total users
      const { count: totalUsers } = await supabase
        .from('account_details')
        .select('*', { count: 'exact', head: true });

      // Active users (made a trade in last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: activeUserIds } = await supabase
        .from('trades')
        .select('user_id')
        .gte('created_at', sevenDaysAgo.toISOString());

      const activeCount = new Set(activeUserIds?.map(t => t.user_id)).size;

      setUserStats({
        total: totalUsers || 0,
        active: activeCount,
        inactive: (totalUsers || 0) - activeCount,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const pieData = [
    { name: 'Active', value: userStats.active },
    { name: 'Inactive', value: userStats.inactive },
  ];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--muted))'];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>User Activity Over Time</CardTitle>
          <CardDescription>Daily active users and order volume</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center">Loading...</div>
          ) : data.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No activity data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="activeUsers" 
                  stackId="1"
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))"
                  fillOpacity={0.6}
                  name="Active Users"
                />
                <Area 
                  type="monotone" 
                  dataKey="totalOrders" 
                  stackId="2"
                  stroke="hsl(var(--accent))" 
                  fill="hsl(var(--accent))"
                  fillOpacity={0.6}
                  name="Total Orders"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Distribution</CardTitle>
          <CardDescription>Active vs inactive users (last 7 days)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="hsl(var(--primary))"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Total Users: {userStats.total}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Metrics</CardTitle>
          <CardDescription>Key user statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Registered</span>
              <span className="text-2xl font-bold">{userStats.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Active (7 days)</span>
              <span className="text-2xl font-bold text-primary">{userStats.active}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Inactive</span>
              <span className="text-2xl font-bold text-muted-foreground">{userStats.inactive}</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-sm font-medium">Activity Rate</span>
              <span className="text-xl font-bold">
                {userStats.total > 0 ? ((userStats.active / userStats.total) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
