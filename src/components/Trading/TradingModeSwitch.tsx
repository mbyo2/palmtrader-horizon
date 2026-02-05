import { useTradingAccount } from "@/hooks/useTradingAccount";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Wallet, TrendingUp, Shield, Zap, AlertTriangle, Check } from "lucide-react";
import { TradingAccountType } from "@/services/TradingAccountService";

const TradingModeSwitch = () => {
  const { 
    accounts, 
    activeAccount, 
    isDemo, 
    setActiveAccount,
    switchToDemo,
    switchToReal,
    getAccountBalance,
    getAvailableBalance
  } = useTradingAccount();

  const getAccountIcon = (type: TradingAccountType) => {
    switch (type) {
      case 'demo': return <Shield className="h-4 w-4" />;
      case 'cent': return <Wallet className="h-4 w-4" />;
      case 'standard_stp': return <TrendingUp className="h-4 w-4" />;
      case 'raw_ecn': return <Zap className="h-4 w-4" />;
      case 'pro_ecn': return <Zap className="h-4 w-4" />;
      default: return <Wallet className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: TradingAccountType) => {
    const colors: Record<TradingAccountType, string> = {
      demo: "bg-muted text-muted-foreground",
      cent: "bg-green-500/10 text-green-500",
      standard_stp: "bg-blue-500/10 text-blue-500",
      raw_ecn: "bg-purple-500/10 text-purple-500",
      pro_ecn: "bg-amber-500/10 text-amber-500",
      islamic: "bg-emerald-500/10 text-emerald-500"
    };
    return colors[type] || colors.demo;
  };

  const formatBalance = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: activeAccount?.currency || 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (!activeAccount) return null;

  return (
    <Card className={`border-2 transition-colors ${isDemo ? 'border-muted-foreground/30 bg-muted/20' : 'border-green-500/30 bg-green-500/5'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Mode Indicator */}
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDemo ? 'bg-muted' : 'bg-green-500/10'}`}>
              {isDemo ? (
                <Shield className="h-5 w-5 text-muted-foreground" />
              ) : (
                <TrendingUp className="h-5 w-5 text-green-500" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {isDemo ? 'Demo Mode' : 'Live Trading'}
                </span>
                <Badge variant={isDemo ? "secondary" : "default"} className={isDemo ? "" : "bg-green-500"}>
                  {isDemo ? 'Virtual' : 'Real Money'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {activeAccount.account_name} • {activeAccount.account_number}
              </p>
            </div>
          </div>

          {/* Balance Display */}
          <div className="text-right hidden sm:block">
            <p className="text-2xl font-bold">{formatBalance(getAccountBalance())}</p>
            <p className="text-sm text-muted-foreground">
              Available: {formatBalance(getAvailableBalance())}
            </p>
          </div>

          {/* Demo/Real Toggle */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`text-sm ${isDemo ? 'text-muted-foreground' : 'font-medium'}`}>Demo</span>
              <Switch
                checked={!isDemo}
                onCheckedChange={(checked) => {
                  if (checked) {
                    switchToReal();
                  } else {
                    switchToDemo();
                  }
                }}
                className="data-[state=checked]:bg-green-500"
              />
              <span className={`text-sm ${!isDemo ? 'text-green-500 font-medium' : 'text-muted-foreground'}`}>Live</span>
            </div>

            {/* Account Selector Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Select Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Demo Accounts */}
                {accounts.filter(a => a.account_type === 'demo').map(account => (
                  <DropdownMenuItem
                    key={account.id}
                    onClick={() => setActiveAccount(account)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {getAccountIcon(account.account_type)}
                      <div>
                        <p className="font-medium">{account.account_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatBalance(account.balance)}
                        </p>
                      </div>
                    </div>
                    {activeAccount?.id === account.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}

                {accounts.filter(a => a.account_type !== 'demo').length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs">Live Accounts</DropdownMenuLabel>
                  </>
                )}

                {/* Real Accounts */}
                {accounts.filter(a => a.account_type !== 'demo').map(account => (
                  <DropdownMenuItem
                    key={account.id}
                    onClick={() => setActiveAccount(account)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {getAccountIcon(account.account_type)}
                      <div>
                        <p className="font-medium">{account.account_name}</p>
                        <Badge variant="outline" className={`text-xs ${getTypeColor(account.account_type)}`}>
                          {account.account_type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    {activeAccount?.id === account.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Demo Warning */}
        {isDemo && (
          <div className="mt-3 p-2 bg-amber-500/10 rounded-lg flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <span>Demo mode uses virtual funds. Switch to Live for real trading.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TradingModeSwitch;
