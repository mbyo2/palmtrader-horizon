import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTradingAccount } from "@/hooks/useTradingAccount";
import { useRealTimePrice } from "@/hooks/useRealTimePrice";
import { useAuth } from "@/hooks/useAuth";
import { OrderExecutionEngine } from "@/services/OrderExecutionEngine";
import { TrendingUp, TrendingDown, Zap, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface QuickTradePanelProps {
  symbol: string;
  onTrade?: (type: 'buy' | 'sell', amount: number) => Promise<void>;
}

const QUICK_AMOUNTS = [100, 500, 1000, 2500, 5000];

const QuickTradePanel = ({ symbol, onTrade }: QuickTradePanelProps) => {
  const { user } = useAuth();
  const { activeAccount, isDemo, getAvailableBalance, refreshAccounts } = useTradingAccount();
  const { price, change, changePercent, isLoading } = useRealTimePrice(symbol);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);

  const tradeAmount = selectedAmount || parseFloat(customAmount) || 0;
  const availableBalance = getAvailableBalance();
  const canAfford = tradeAmount <= availableBalance;
  const shares = price ? tradeAmount / price : 0;

  const handleQuickTrade = async (type: 'buy' | 'sell') => {
    if (!user) {
      toast.error("Please sign in to trade");
      return;
    }

    if (!tradeAmount || tradeAmount <= 0) {
      toast.error("Please select or enter an amount");
      return;
    }

    if (type === 'buy' && !canAfford) {
      toast.error("Insufficient funds");
      return;
    }

    if (!price) {
      toast.error("Unable to get current price");
      return;
    }

    setIsExecuting(true);
    try {
      if (onTrade) {
        await onTrade(type, tradeAmount);
      } else {
        const quantityToTrade = Math.max(Math.floor(shares), 1);
        const result = await OrderExecutionEngine.executeOrder({
          userId: user.id,
          symbol,
          type,
          shares: quantityToTrade,
          price,
          orderType: 'market',
          isFractional: shares < 1,
        });

        if (result.success) {
          toast.success(
            `${type === 'buy' ? 'Bought' : 'Sold'} ${result.executedShares || quantityToTrade} shares of ${symbol} at $${(result.executedPrice || price).toFixed(2)}`
          );
          await refreshAccounts();
        } else {
          toast.error(result.error || "Trade execution failed");
        }
      }
    } catch (error) {
      toast.error("Trade execution failed");
      console.error("Trade error:", error);
    } finally {
      setIsExecuting(false);
      setSelectedAmount(null);
      setCustomAmount("");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">Quick Trade</CardTitle>
          </div>
          <Badge variant={isDemo ? "secondary" : "default"} className={isDemo ? "" : "bg-green-500"}>
            {isDemo ? 'Demo' : 'Live'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Symbol and Price */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div>
            <h3 className="text-xl font-bold">{symbol}</h3>
            <p className="text-sm text-muted-foreground">Market Order</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              ${isLoading ? '...' : price?.toFixed(2)}
            </p>
            {change !== null && changePercent !== null && (
              <p className={`text-sm flex items-center justify-end gap-1 ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {change >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
              </p>
            )}
          </div>
        </div>

        {/* Quick Amount Buttons */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Select Amount</p>
          <div className="grid grid-cols-5 gap-2">
            {QUICK_AMOUNTS.map(amount => (
              <Button
                key={amount}
                variant={selectedAmount === amount ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedAmount(amount);
                  setCustomAmount("");
                }}
                className="text-xs"
              >
                ${amount >= 1000 ? `${amount / 1000}K` : amount}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Or Enter Amount</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              placeholder="Custom amount"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedAmount(null);
              }}
              className="pl-7"
            />
          </div>
        </div>

        {/* Order Preview */}
        {tradeAmount > 0 && price && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Trade Amount:</span>
              <span className="font-medium">${tradeAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Est. Shares:</span>
              <span className="font-medium">{shares.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Available:</span>
              <span className={`font-medium ${canAfford ? 'text-green-500' : 'text-red-500'}`}>
                ${availableBalance.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Trade Warning for Live Mode */}
        {!isDemo && tradeAmount > 0 && (
          <div className="p-2 bg-amber-500/10 rounded-lg flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <span>You are trading with real money!</span>
          </div>
        )}

        {/* Buy/Sell Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            size="lg"
            className="bg-green-500 hover:bg-green-600 text-white"
            disabled={!tradeAmount || !canAfford || isExecuting || !price}
            onClick={() => handleQuickTrade('buy')}
          >
            {isExecuting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <TrendingUp className="h-4 w-4 mr-2" />
            )}
            Buy
          </Button>
          <Button
            size="lg"
            variant="destructive"
            disabled={!tradeAmount || isExecuting || !price}
            onClick={() => handleQuickTrade('sell')}
          >
            {isExecuting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <TrendingDown className="h-4 w-4 mr-2" />
            )}
            Sell
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickTradePanel;
