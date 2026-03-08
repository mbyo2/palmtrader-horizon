import { useTradingAccount } from "@/hooks/useTradingAccount";
import { AlertTriangle, Shield, TrendingUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DemoModeBannerProps {
  compact?: boolean;
}

const DemoModeBanner = ({ compact = false }: DemoModeBannerProps) => {
  const { isDemo, activeAccount, switchToReal, switchToDemo } = useTradingAccount();

  if (!activeAccount) return null;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
        isDemo 
          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' 
          : 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
      }`}>
        {isDemo ? (
          <>
            <Shield className="h-3 w-3" />
            <span>DEMO</span>
          </>
        ) : (
          <>
            <TrendingUp className="h-3 w-3" />
            <span>LIVE</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`w-full px-4 py-2.5 flex items-center justify-between ${
      isDemo 
        ? 'bg-amber-500/10 border-b border-amber-500/20' 
        : 'bg-green-500/10 border-b border-green-500/20'
    }`}>
      <div className="flex items-center gap-2">
        {isDemo ? (
          <>
            <Shield className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Demo Mode — Virtual funds only. Trades are simulated.
            </span>
            <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-xs">
              ${activeAccount.available_balance.toLocaleString()} virtual
            </Badge>
          </>
        ) : (
          <>
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              Live Trading — Real money. All trades are final.
            </span>
            <Badge variant="outline" className="text-green-500 border-green-500/30 text-xs">
              {activeAccount.account_name}
            </Badge>
          </>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs h-7"
        onClick={isDemo ? switchToReal : switchToDemo}
      >
        <RefreshCw className="h-3 w-3 mr-1" />
        Switch to {isDemo ? 'Live' : 'Demo'}
      </Button>
    </div>
  );
};

export default DemoModeBanner;
