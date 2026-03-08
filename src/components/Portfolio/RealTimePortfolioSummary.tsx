import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useRealTimePortfolio } from '@/hooks/useRealTimePortfolio';
import { useTradingAccount } from '@/hooks/useTradingAccount';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value);
};

const formatPercent = (value: number) => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

export const RealTimePortfolioSummary = () => {
  const { summary, isLoading } = useRealTimePortfolio();
  const { isDemo } = useTradingAccount();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="card-gradient">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-20 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const isPositive = summary.totalGainLoss >= 0;
  const isDayPositive = summary.dayChange >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="card-gradient">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Portfolio Value
          </CardTitle>
          <div className="flex items-center gap-1">
            {isDemo && <Badge variant="secondary" className="text-[10px] h-5"><Shield className="h-3 w-3 mr-0.5" />Demo</Badge>}
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalValue)}</div>
          <p className="text-xs text-muted-foreground">
            {summary.positionsCount} position{summary.positionsCount !== 1 ? 's' : ''}
            {isDemo && ' (virtual)'}
          </p>
        </CardContent>
      </Card>

      <Card className="card-gradient">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total P&L
          </CardTitle>
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-success" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
        </CardHeader>
        <CardContent>
          <div className={cn(
            "text-2xl font-bold",
            isPositive ? "text-success" : "text-destructive"
          )}>
            {formatCurrency(summary.totalGainLoss)}
          </div>
          <p className={cn(
            "text-xs",
            isPositive ? "text-success" : "text-destructive"
          )}>
            {formatPercent(summary.gainLossPercentage)}
          </p>
        </CardContent>
      </Card>

      <Card className="card-gradient">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Day Change
          </CardTitle>
          {isDayPositive ? (
            <TrendingUp className="h-4 w-4 text-success" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
        </CardHeader>
        <CardContent>
          <div className={cn(
            "text-2xl font-bold",
            isDayPositive ? "text-success" : "text-destructive"
          )}>
            {formatCurrency(summary.dayChange)}
          </div>
          <p className={cn(
            "text-xs",
            isDayPositive ? "text-success" : "text-destructive"
          )}>
            {formatPercent(summary.dayChangePercent)} today
          </p>
        </CardContent>
      </Card>

      <Card className="card-gradient">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Invested
          </CardTitle>
          <PieChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalInvested)}</div>
          <p className="text-xs text-muted-foreground">
            Cost basis
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
