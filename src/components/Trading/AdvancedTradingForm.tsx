import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, TrendingUp, TrendingDown, Settings } from "lucide-react";
import { useTradingAccount } from "@/hooks/useTradingAccount";
import { useRealTimePrice } from "@/hooks/useRealTimePrice";
import { MarketDataService } from "@/services/MarketDataService";
import { useQuery } from "@tanstack/react-query";
import StockSelector from "./StockSelector";
import { toast } from "sonner";

interface AdvancedOrderFormProps {
  onOrderSubmit?: (order: any) => Promise<void>;
}

const AdvancedTradingForm = ({ onOrderSubmit }: AdvancedOrderFormProps) => {
  const { activeAccount, isDemo, getAvailableBalance } = useTradingAccount();
  const [symbol, setSymbol] = useState("AAPL");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit" | "stop" | "stop_limit">("market");
  const [timeInForce, setTimeInForce] = useState<"day" | "gtc" | "ioc" | "fok">("day");
  const [quantity, setQuantity] = useState<number>(1);
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [stopPrice, setStopPrice] = useState<string>("");
  const [takeProfit, setTakeProfit] = useState<string>("");
  const [stopLoss, setStopLoss] = useState<string>("");
  const [useAdvancedOrders, setUseAdvancedOrders] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { price: currentPrice, isLoading: isPriceLoading } = useRealTimePrice(symbol);
  const availableBalance = getAvailableBalance();
  const leverage = activeAccount?.leverage || 1;

  // Calculate order value and margin
  const orderPrice = orderType === 'limit' ? parseFloat(limitPrice) || currentPrice || 0 : currentPrice || 0;
  const orderValue = quantity * orderPrice;
  const marginRequired = orderValue / leverage;
  const canAfford = marginRequired <= availableBalance;

  const handleSubmit = async () => {
    if (!activeAccount) {
      toast.error("No active trading account");
      return;
    }

    if (!quantity || quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (orderType === 'limit' && !limitPrice) {
      toast.error("Please enter a limit price");
      return;
    }

    if (orderType === 'stop' && !stopPrice) {
      toast.error("Please enter a stop price");
      return;
    }

    if (!canAfford && side === 'buy') {
      toast.error("Insufficient margin");
      return;
    }

    setIsSubmitting(true);
    try {
      const order = {
        symbol,
        side,
        orderType,
        quantity,
        limitPrice: limitPrice ? parseFloat(limitPrice) : undefined,
        stopPrice: stopPrice ? parseFloat(stopPrice) : undefined,
        timeInForce,
        takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        accountId: activeAccount.id
      };

      if (onOrderSubmit) {
        await onOrderSubmit(order);
      } else {
        // Simulate order for demo
        toast.success(`${side === 'buy' ? 'Buy' : 'Sell'} order placed: ${quantity} ${symbol} @ ${orderType === 'market' ? 'Market' : `$${orderPrice}`}`);
      }
    } catch (error) {
      toast.error("Failed to place order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Advanced Order
          </CardTitle>
          <Badge variant={isDemo ? "secondary" : "default"} className={isDemo ? "" : "bg-green-500"}>
            {isDemo ? 'Demo' : 'Live'} • 1:{leverage}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Symbol Selector */}
        <StockSelector symbol={symbol} onSymbolChange={setSymbol} />

        {/* Current Price */}
        <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Current Price</span>
          <span className="text-xl font-bold">
            ${isPriceLoading ? '...' : currentPrice?.toFixed(2)}
          </span>
        </div>

        {/* Buy/Sell Tabs */}
        <Tabs value={side} onValueChange={(v) => setSide(v as "buy" | "sell")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
              <TrendingUp className="h-4 w-4 mr-2" />
              Buy / Long
            </TabsTrigger>
            <TabsTrigger value="sell" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
              <TrendingDown className="h-4 w-4 mr-2" />
              Sell / Short
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Order Type */}
        <div className="space-y-2">
          <Label>Order Type</Label>
          <Select value={orderType} onValueChange={(v) => setOrderType(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="market">Market Order</SelectItem>
              <SelectItem value="limit">Limit Order</SelectItem>
              <SelectItem value="stop">Stop Order</SelectItem>
              <SelectItem value="stop_limit">Stop Limit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <Label>Quantity (Shares)</Label>
          <Input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
          />
        </div>

        {/* Limit Price */}
        {(orderType === 'limit' || orderType === 'stop_limit') && (
          <div className="space-y-2">
            <Label>Limit Price</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                step="0.01"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder={currentPrice?.toFixed(2)}
                className="pl-7"
              />
            </div>
          </div>
        )}

        {/* Stop Price */}
        {(orderType === 'stop' || orderType === 'stop_limit') && (
          <div className="space-y-2">
            <Label>Stop Price</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                step="0.01"
                value={stopPrice}
                onChange={(e) => setStopPrice(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>
        )}

        {/* Time in Force */}
        <div className="space-y-2">
          <Label>Time in Force</Label>
          <Select value={timeInForce} onValueChange={(v) => setTimeInForce(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day (Expires EOD)</SelectItem>
              <SelectItem value="gtc">GTC (Good Till Canceled)</SelectItem>
              <SelectItem value="ioc">IOC (Immediate or Cancel)</SelectItem>
              <SelectItem value="fok">FOK (Fill or Kill)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Advanced Orders Toggle */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div>
            <p className="font-medium text-sm">Take Profit / Stop Loss</p>
            <p className="text-xs text-muted-foreground">Set exit levels</p>
          </div>
          <Switch
            checked={useAdvancedOrders}
            onCheckedChange={setUseAdvancedOrders}
          />
        </div>

        {/* TP/SL Inputs */}
        {useAdvancedOrders && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-green-500">Take Profit</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-red-500">Stop Loss</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="p-3 bg-muted/50 rounded-lg space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Order Value:</span>
            <span className="font-medium">${orderValue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Margin Required:</span>
            <span className={`font-medium ${canAfford ? 'text-green-500' : 'text-red-500'}`}>
              ${marginRequired.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Available:</span>
            <span className="font-medium">${availableBalance.toLocaleString()}</span>
          </div>
        </div>

        {/* Warnings */}
        {!canAfford && side === 'buy' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Insufficient margin. Reduce quantity or deposit more funds.
            </AlertDescription>
          </Alert>
        )}

        {!isDemo && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-500">
              You are trading with real money!
            </AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || (!canAfford && side === 'buy')}
          className={`w-full ${side === 'buy' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {side === 'buy' ? 'Buy' : 'Sell'} {symbol}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdvancedTradingForm;
