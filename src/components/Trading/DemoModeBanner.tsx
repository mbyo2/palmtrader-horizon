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
          ? 'bg-warning/10 text-warning border border-warning/20' 
          : 'bg-success/10 text-success border border-success/20'
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
        ? 'bg-warning/10 border-b border-warning/20' 
        : 'bg-success/10 border-b border-success/20'
    }`}>
      <div className="flex items-center gap-2">
        {isDemo ? (
          <>
            <Shield className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium text-warning">
              Demo Mode — Trading with virtual funds. Same execution as live.
            </span>
            <Badge variant="outline" className="text-warning border-warning/30 text-xs">
              ${activeAccount.available_balance.toLocaleString()} virtual
            </Badge>
          </>
        ) : (
          <>
            <TrendingUp className="h-4 w-4 text-success" />
            <span className="text-sm font-medium text-success">
              Live Trading — Real money. All trades are final.
            </span>
            <Badge variant="outline" className="text-success border-success/30 text-xs">
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
