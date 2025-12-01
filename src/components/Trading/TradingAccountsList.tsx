import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TradingAccountService, TradingAccount, TradingAccountType } from "@/services/TradingAccountService";
import { Wallet, TrendingUp, Settings, Plus, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TradingAccountsListProps {
  onSelectAccount?: (account: TradingAccount) => void;
  onOpenNewAccount?: () => void;
}

export default function TradingAccountsList({ onSelectAccount, onOpenNewAccount }: TradingAccountsListProps) {
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setIsLoading(true);
    const data = await TradingAccountService.getUserAccounts();
    setAccounts(data);
    setIsLoading(false);
  };

  const getTypeBadgeStyle = (type: TradingAccountType) => {
    const styles: Record<TradingAccountType, string> = {
      demo: "bg-gray-500/10 text-gray-500 border-gray-500/30",
      cent: "bg-green-500/10 text-green-500 border-green-500/30",
      standard_stp: "bg-blue-500/10 text-blue-500 border-blue-500/30",
      raw_ecn: "bg-purple-500/10 text-purple-500 border-purple-500/30",
      pro_ecn: "bg-amber-500/10 text-amber-500 border-amber-500/30",
      islamic: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
    };
    return styles[type] || styles.demo;
  };

  const getTypeLabel = (type: TradingAccountType) => {
    const labels: Record<TradingAccountType, string> = {
      demo: "Demo",
      cent: "Cent",
      standard_stp: "Standard STP",
      raw_ecn: "Raw ECN",
      pro_ecn: "Pro ECN",
      islamic: "Islamic"
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Trading Accounts</h3>
          <p className="text-muted-foreground text-center mb-4">
            Open your first trading account to start trading
          </p>
          <Button onClick={onOpenNewAccount}>
            <Plus className="h-4 w-4 mr-2" />
            Open Account
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Your Trading Accounts</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadAccounts}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={onOpenNewAccount}>
            <Plus className="h-4 w-4 mr-2" />
            New Account
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <Card 
            key={account.id}
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => onSelectAccount?.(account)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={getTypeBadgeStyle(account.account_type)}>
                  {getTypeLabel(account.account_type)}
                </Badge>
                {account.is_active ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-500">Active</Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-500/10 text-red-500">Inactive</Badge>
                )}
              </div>
              <CardTitle className="text-base mt-2">{account.account_name || "Trading Account"}</CardTitle>
              <CardDescription className="font-mono">{account.account_number}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Balance</span>
                <span className="text-2xl font-bold">
                  {account.currency === 'ZMW' ? 'K' : '$'}
                  {account.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Available</span>
                  <p className="font-medium text-green-500">
                    ${account.available_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Reserved</span>
                  <p className="font-medium text-amber-500">
                    ${account.reserved_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  <span>1:{account.leverage}</span>
                </div>
                <span className="text-muted-foreground">
                  {formatDistanceToNow(new Date(account.created_at), { addSuffix: true })}
                </span>
              </div>

              {account.trading_disabled && (
                <div className="p-2 bg-destructive/10 rounded text-xs text-destructive">
                  Trading disabled: {account.trading_disabled_reason || "Contact support"}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
