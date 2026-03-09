import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const RecentActivityList = ({ userId }: { userId?: string }) => {
  const { data: recentActivity, isLoading } = useQuery({
    queryKey: ["recentActivity", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data: trades } = await supabase
        .from('trades')
        .select('id, symbol, type, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      const { data: transfers } = await supabase
        .from('fund_transfers')
        .select('id, direction, amount, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      const activities: Array<{
        id: string; type: string; description: string; status: string; created_at: string;
      }> = [];

      trades?.forEach(trade => {
        activities.push({
          id: trade.id, type: 'trade',
          description: `${trade.type === 'buy' ? 'Bought' : 'Sold'} ${trade.symbol}`,
          status: trade.status, created_at: trade.created_at
        });
      });
      transfers?.forEach(transfer => {
        activities.push({
          id: transfer.id, type: 'transfer',
          description: `${transfer.direction === 'deposit' ? 'Deposited' : 'Withdrew'} $${transfer.amount}`,
          status: transfer.status, created_at: transfer.created_at
        });
      });
      return activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);
    },
    enabled: !!userId,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'cancelled': case 'failed': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center space-x-4 p-3 border rounded-lg">
                <Skeleton className="h-2 w-2 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Your latest account activity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentActivity && recentActivity.length > 0 ? (
            recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                <div className={`h-2 w-2 ${getStatusColor(activity.status)} rounded-full`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">{formatTimeAgo(activity.created_at)}</p>
                </div>
                <Badge variant={activity.status === 'completed' ? 'default' : 'secondary'}>
                  {activity.status}
                </Badge>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-4">No recent activity</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivityList;
