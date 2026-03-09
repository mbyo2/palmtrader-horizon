import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { usePortfolio } from "@/hooks/usePortfolio";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, DollarSign, Award } from "lucide-react";

const ActivityStats = ({ userId }: { userId?: string }) => {
  const { summary, isSummaryLoading } = usePortfolio();
  
  const { data: tradeStats, isLoading: isTradeStatsLoading } = useQuery({
    queryKey: ["tradeStats", userId],
    queryFn: async () => {
      if (!userId) return { totalTrades: 0, successRate: 0 };
      const { data: trades, error } = await supabase
        .from('trades')
        .select('id, status, type')
        .eq('user_id', userId);
      if (error) throw error;
      const totalTrades = trades?.length || 0;
      const completedTrades = trades?.filter(t => t.status === 'completed').length || 0;
      const successRate = totalTrades > 0 ? Math.round((completedTrades / totalTrades) * 100) : 0;
      return { totalTrades, successRate };
    },
    enabled: !!userId,
  });

  if (isTradeStatsLoading || isSummaryLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const portfolioValue = summary?.totalValue || 0;
  const gainLossPercent = summary?.gainLossPercentage || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{tradeStats?.totalTrades || 0}</div>
          <p className="text-xs text-muted-foreground">All time trades</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground">
            <span className={gainLossPercent >= 0 ? "text-green-600" : "text-red-600"}>
              {gainLossPercent >= 0 ? "+" : ""}{gainLossPercent.toFixed(1)}%
            </span> overall
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{tradeStats?.successRate || 0}%</div>
          <p className="text-xs text-muted-foreground">Completed trades</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityStats;
