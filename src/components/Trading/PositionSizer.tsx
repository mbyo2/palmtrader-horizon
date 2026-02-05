import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useTradingAccount } from "@/hooks/useTradingAccount";
import { Calculator, AlertTriangle, TrendingUp, Shield } from "lucide-react";

interface PositionSizerProps {
  currentPrice: number;
  symbol: string;
}

const PositionSizer = ({ currentPrice, symbol }: PositionSizerProps) => {
  const { getAvailableBalance, activeAccount } = useTradingAccount();
  const [riskPercent, setRiskPercent] = useState(2);
  const [stopLossPercent, setStopLossPercent] = useState(5);
  const [entryPrice, setEntryPrice] = useState(currentPrice);

  const calculations = useMemo(() => {
    const accountBalance = getAvailableBalance();
    const riskAmount = accountBalance * (riskPercent / 100);
    const stopLossPrice = entryPrice * (1 - stopLossPercent / 100);
    const riskPerShare = entryPrice - stopLossPrice;
    const positionSize = riskPerShare > 0 ? Math.floor(riskAmount / riskPerShare) : 0;
    const positionValue = positionSize * entryPrice;
    const maxLoss = positionSize * riskPerShare;
    const leverage = activeAccount?.leverage || 1;
    const marginRequired = positionValue / leverage;

    return {
      accountBalance,
      riskAmount,
      stopLossPrice,
      riskPerShare,
      positionSize,
      positionValue,
      maxLoss,
      leverage,
      marginRequired
    };
  }, [riskPercent, stopLossPercent, entryPrice, getAvailableBalance, activeAccount]);

  const getRiskLevel = (percent: number) => {
    if (percent <= 1) return { label: 'Conservative', color: 'text-green-500', bg: 'bg-green-500/10' };
    if (percent <= 2) return { label: 'Moderate', color: 'text-blue-500', bg: 'bg-blue-500/10' };
    if (percent <= 5) return { label: 'Aggressive', color: 'text-amber-500', bg: 'bg-amber-500/10' };
    return { label: 'High Risk', color: 'text-red-500', bg: 'bg-red-500/10' };
  };

  const riskLevel = getRiskLevel(riskPercent);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Position Sizer</CardTitle>
          </div>
          <Badge variant="outline" className={`${riskLevel.bg} ${riskLevel.color}`}>
            {riskLevel.label}
          </Badge>
        </div>
        <CardDescription>
          Calculate optimal position size based on your risk tolerance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Risk Per Trade */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Risk Per Trade</Label>
            <span className="text-sm font-medium">{riskPercent}% (${calculations.riskAmount.toFixed(2)})</span>
          </div>
          <Slider
            value={[riskPercent]}
            onValueChange={([value]) => setRiskPercent(value)}
            min={0.5}
            max={10}
            step={0.5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0.5%</span>
            <span>Conservative</span>
            <span>Aggressive</span>
            <span>10%</span>
          </div>
        </div>

        {/* Stop Loss */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Stop Loss Distance</Label>
            <span className="text-sm font-medium">{stopLossPercent}%</span>
          </div>
          <Slider
            value={[stopLossPercent]}
            onValueChange={([value]) => setStopLossPercent(value)}
            min={1}
            max={20}
            step={0.5}
            className="w-full"
          />
        </div>

        {/* Entry Price */}
        <div className="space-y-2">
          <Label>Entry Price</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={entryPrice}
              onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
              className="pl-7"
              step="0.01"
            />
          </div>
        </div>

        {/* Calculations Display */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">Position Size</p>
            <p className="text-lg font-bold">{calculations.positionSize} shares</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">Position Value</p>
            <p className="text-lg font-bold">${calculations.positionValue.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">Stop Loss Price</p>
            <p className="text-lg font-bold text-red-500">${calculations.stopLossPrice.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">Max Loss</p>
            <p className="text-lg font-bold text-red-500">-${calculations.maxLoss.toFixed(2)}</p>
          </div>
        </div>

        {/* Leverage Info */}
        {calculations.leverage > 1 && (
          <div className="p-3 bg-primary/10 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="font-medium">Leverage: 1:{calculations.leverage}</span>
              </div>
              <span className="text-sm">
                Margin: ${calculations.marginRequired.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Risk Warning */}
        {riskPercent > 5 && (
          <div className="p-3 bg-red-500/10 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
            <div className="text-sm text-red-500">
              <p className="font-medium">High Risk Warning</p>
              <p>Risking more than 5% per trade can lead to significant account drawdown.</p>
            </div>
          </div>
        )}

        {/* Best Practice Tip */}
        <div className="p-3 bg-muted/50 rounded-lg flex items-start gap-2">
          <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Professional traders typically risk 1-2% per trade. This ensures longevity even during losing streaks.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PositionSizer;
