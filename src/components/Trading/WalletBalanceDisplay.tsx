import { useWallet } from '@/hooks/useWallet';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value);
};

export const WalletBalanceDisplay = () => {
  const { user } = useAuth();
  const { balances, isLoading, refreshBalances } = useWallet();

  const usdBalance = balances.find(b => b.currency === 'USD');
  const available = usdBalance?.available ?? 0;
  const reserved = usdBalance?.reserved ?? 0;

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="card-gradient">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-gradient">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Available Balance</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-lg font-bold",
              available > 0 ? "text-green-500" : "text-muted-foreground"
            )}>
              {formatCurrency(available)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={refreshBalances}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
        {reserved > 0 && (
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>Reserved</span>
            <span>{formatCurrency(reserved)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
