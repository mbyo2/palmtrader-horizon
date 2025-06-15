
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react";
import { PortfolioSummary } from "@/services/RealTimePortfolioManager";

interface RealTimePortfolioSummaryProps {
  summary: PortfolioSummary | null;
}

const RealTimePortfolioSummary = ({ summary }: RealTimePortfolioSummaryProps) => {
  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Summary</CardTitle>
          <CardDescription>Real-time portfolio performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No portfolio data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPositive = summary.totalUnrealizedPL >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Portfolio Summary
        </CardTitle>
        <CardDescription>
          Last updated: {summary.lastUpdate.toLocaleTimeString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Value</span>
            <span className="font-semibold">${summary.totalValue.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Cost</span>
            <span className="font-medium">${summary.totalCost.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Unrealized P&L</span>
            <div className="flex items-center gap-1">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={isPositive ? "text-green-600" : "text-red-600"}>
                ${Math.abs(summary.totalUnrealizedPL).toFixed(2)} ({summary.totalUnrealizedPLPercent.toFixed(2)}%)
              </span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Day Change</span>
            <div className="flex items-center gap-1">
              <span className={summary.dayChange >= 0 ? "text-green-600" : "text-red-600"}>
                ${Math.abs(summary.dayChange).toFixed(2)} ({summary.dayChangePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Positions</span>
            <Badge variant="outline">{summary.positions.length}</Badge>
          </div>
        </div>

        {summary.positions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Top Holdings</h4>
            {summary.positions.slice(0, 3).map((position) => (
              <div key={position.id} className="flex justify-between items-center text-sm">
                <span>{position.symbol}</span>
                <div className="text-right">
                  <div>${position.marketValue.toFixed(2)}</div>
                  <div className={`text-xs ${position.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {position.unrealizedPL >= 0 ? '+' : ''}{position.unrealizedPLPercent.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RealTimePortfolioSummary;
