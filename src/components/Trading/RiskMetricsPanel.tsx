import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useTradingAccount } from "@/hooks/useTradingAccount";
import { Shield, AlertTriangle, TrendingDown, Activity, Percent, DollarSign } from "lucide-react";

interface RiskMetricsProps {
  positions?: Array<{
    symbol: string;
    value: number;
    pnl: number;
    pnlPercent: number;
  }>;
}

const RiskMetricsPanel = ({ positions = [] }: RiskMetricsProps) => {
  const { getAccountBalance, getAvailableBalance, activeAccount, isDemo } = useTradingAccount();

  const metrics = useMemo(() => {
    const totalBalance = getAccountBalance();
    const availableBalance = getAvailableBalance();
    const exposedBalance = totalBalance - availableBalance;
    const exposurePercent = totalBalance > 0 ? (exposedBalance / totalBalance) * 100 : 0;
    
    // Calculate portfolio metrics
    const totalPnL = positions.reduce((sum, p) => sum + p.pnl, 0);
    const totalValue = positions.reduce((sum, p) => sum + p.value, 0);
    const winningPositions = positions.filter(p => p.pnl > 0).length;
    const losingPositions = positions.filter(p => p.pnl < 0).length;
    const winRate = positions.length > 0 ? (winningPositions / positions.length) * 100 : 0;
    
    // Concentration risk (largest position as % of portfolio)
    const largestPosition = positions.length > 0 ? Math.max(...positions.map(p => p.value)) : 0;
    const concentrationRisk = totalValue > 0 ? (largestPosition / totalValue) * 100 : 0;
    
    // Drawdown (simplified - would need historical data for accurate calculation)
    const drawdownPercent = totalPnL < 0 ? Math.abs((totalPnL / totalBalance) * 100) : 0;
    
    // Margin level for leveraged accounts
    const leverage = activeAccount?.leverage || 1;
    const marginUsed = exposedBalance / leverage;
    const marginLevel = marginUsed > 0 ? (availableBalance / marginUsed) * 100 : 100;

    return {
      totalBalance,
      availableBalance,
      exposedBalance,
      exposurePercent,
      totalPnL,
      totalValue,
      winRate,
      concentrationRisk,
      drawdownPercent,
      marginLevel,
      leverage,
      winningPositions,
      losingPositions
    };
  }, [getAccountBalance, getAvailableBalance, positions, activeAccount]);

  const getExposureColor = (percent: number) => {
    if (percent < 30) return "text-green-500";
    if (percent < 60) return "text-amber-500";
    return "text-red-500";
  };

  const getMarginLevelColor = (level: number) => {
    if (level > 200) return "text-green-500";
    if (level > 100) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Risk Metrics</CardTitle>
          </div>
          <Badge variant={isDemo ? "secondary" : "default"}>
            {isDemo ? 'Demo' : 'Live'}
          </Badge>
        </div>
        <CardDescription>Monitor your portfolio risk exposure</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Capital Exposure */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Capital Exposure
            </span>
            <span className={`font-bold ${getExposureColor(metrics.exposurePercent)}`}>
              {metrics.exposurePercent.toFixed(1)}%
            </span>
          </div>
          <Progress value={metrics.exposurePercent} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Exposed: ${metrics.exposedBalance.toLocaleString()}</span>
            <span>Available: ${metrics.availableBalance.toLocaleString()}</span>
          </div>
        </div>

        {/* Margin Level (for leveraged accounts) */}
        {metrics.leverage > 1 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Margin Level
              </span>
              <span className={`font-bold ${getMarginLevelColor(metrics.marginLevel)}`}>
                {metrics.marginLevel.toFixed(0)}%
              </span>
            </div>
            <Progress 
              value={Math.min(metrics.marginLevel, 100)} 
              className="h-2" 
            />
            {metrics.marginLevel < 150 && (
              <div className="flex items-center gap-1 text-xs text-amber-500">
                <AlertTriangle className="h-3 w-3" />
                <span>Margin call at 100%</span>
              </div>
            )}
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              Total P&L
            </div>
            <p className={`text-lg font-bold ${metrics.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {metrics.totalPnL >= 0 ? '+' : ''}{metrics.totalPnL.toFixed(2)}
            </p>
          </div>
          
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3" />
              Drawdown
            </div>
            <p className={`text-lg font-bold ${metrics.drawdownPercent > 10 ? 'text-red-500' : 'text-muted-foreground'}`}>
              {metrics.drawdownPercent.toFixed(1)}%
            </p>
          </div>
          
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Win Rate</div>
            <p className="text-lg font-bold">
              {metrics.winRate.toFixed(0)}%
              <span className="text-xs font-normal text-muted-foreground ml-1">
                ({metrics.winningPositions}W / {metrics.losingPositions}L)
              </span>
            </p>
          </div>
          
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Concentration</div>
            <p className={`text-lg font-bold ${metrics.concentrationRisk > 50 ? 'text-amber-500' : ''}`}>
              {metrics.concentrationRisk.toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Risk Warnings */}
        {metrics.concentrationRisk > 40 && (
          <div className="p-3 bg-amber-500/10 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
            <div className="text-sm text-amber-500">
              <p className="font-medium">High Concentration Risk</p>
              <p className="text-xs">Consider diversifying - single position is {metrics.concentrationRisk.toFixed(0)}% of portfolio.</p>
            </div>
          </div>
        )}

        {metrics.drawdownPercent > 20 && (
          <div className="p-3 bg-red-500/10 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
            <div className="text-sm text-red-500">
              <p className="font-medium">Significant Drawdown</p>
              <p className="text-xs">Your account is down {metrics.drawdownPercent.toFixed(1)}%. Consider reducing position sizes.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RiskMetricsPanel;
