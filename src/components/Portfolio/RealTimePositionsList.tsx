import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRealTimePortfolio, RealTimePosition } from '@/hooks/useRealTimePortfolio';
import { TrendingUp, TrendingDown } from 'lucide-react';
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

const PositionRow = ({ position }: { position: RealTimePosition }) => {
  const isPositive = position.totalGainLoss >= 0;

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex-1">
        <div className="font-semibold">{position.symbol}</div>
        <div className="text-sm text-muted-foreground">
          {position.shares.toFixed(position.shares % 1 !== 0 ? 4 : 0)} shares @ {formatCurrency(position.averagePrice)}
        </div>
      </div>
      
      <div className="text-right">
        <div className="font-semibold">{formatCurrency(position.currentValue)}</div>
        <div className="text-sm text-muted-foreground">
          {formatCurrency(position.currentPrice)}/share
        </div>
      </div>
      
      <div className={cn(
        "text-right ml-4 min-w-[100px]",
        isPositive ? "text-green-500" : "text-red-500"
      )}>
        <div className="flex items-center justify-end gap-1">
          {isPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          <span className="font-semibold">{formatCurrency(position.totalGainLoss)}</span>
        </div>
        <div className="text-sm">
          {formatPercent(position.gainLossPercentage)}
        </div>
      </div>
    </div>
  );
};

export const RealTimePositionsList = () => {
  const { positions, isLoading } = useRealTimePortfolio();

  if (isLoading) {
    return (
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle>Positions</CardTitle>
        </CardHeader>
        <CardContent>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div>
                <Skeleton className="h-5 w-16 mb-1" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (positions.length === 0) {
    return (
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle>Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No positions yet</p>
            <p className="text-sm mt-1">Start trading to build your portfolio</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-gradient">
      <CardHeader>
        <CardTitle>Positions ({positions.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {positions.map(position => (
          <PositionRow key={position.id} position={position} />
        ))}
      </CardContent>
    </Card>
  );
};
