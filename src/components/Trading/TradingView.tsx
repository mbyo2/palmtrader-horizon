import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface StockPosition {
  symbol: string;
  shares: number;
  averagePrice: number;
}

const TradingView = () => {
  const [orderType, setOrderType] = useState<
    "market" | "limit" | "stop" | "trailing_stop" | "oco"
  >("market");
  const [shares, setShares] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [trailingPercent, setTrailingPercent] = useState("");
  const [symbol, setSymbol] = useState("");
  const [isFractional, setIsFractional] = useState(false);
  const [riskLevel, setRiskLevel] = useState<"low" | "medium" | "high">("medium");
  const { toast } = useToast();

  const [positions, setPositions] = useState<StockPosition[]>([
    { symbol: "AAPL", shares: 10, averagePrice: 150.5 },
    { symbol: "GOOGL", shares: 5, averagePrice: 2750.0 },
  ]);

  const handleTrade = async (action: "buy" | "sell") => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to place trades",
          variant: "destructive",
        });
        return;
      }

      const tradeData = {
        user_id: user.id,
        symbol: symbol.toUpperCase(),
        type: action,
        shares: parseFloat(shares),
        price: parseFloat(limitPrice) || 0, // Mock price for demo
        total_amount: parseFloat(shares) * (parseFloat(limitPrice) || 0),
        order_type: orderType,
        is_fractional: isFractional,
        trailing_percent: trailingPercent ? parseFloat(trailingPercent) : null,
        stop_price: stopPrice ? parseFloat(stopPrice) : null,
        limit_price: limitPrice ? parseFloat(limitPrice) : null,
        risk_level: riskLevel,
      };

      const { error } = await supabase.from("trades").insert(tradeData);

      if (error) throw error;

      toast({
        title: "Order Placed",
        description: `${action.toUpperCase()} order for ${shares} shares of ${symbol} placed successfully`,
      });

      // Reset form
      setShares("");
      setLimitPrice("");
      setStopPrice("");
      setTrailingPercent("");
      setSymbol("");
    } catch (error) {
      console.error("Error placing trade:", error);
      toast({
        title: "Error",
        description: "Failed to place trade",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 card-gradient">
        <h2 className="text-xl font-semibold mb-4">Place Order</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Symbol</label>
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="Enter stock symbol"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Order Type</label>
            <Select
              value={orderType}
              onValueChange={(value: typeof orderType) => setOrderType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select order type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="market">Market Order</SelectItem>
                <SelectItem value="limit">Limit Order</SelectItem>
                <SelectItem value="stop">Stop Order</SelectItem>
                <SelectItem value="trailing_stop">Trailing Stop</SelectItem>
                <SelectItem value="oco">OCO (One-Cancels-Other)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Shares
              <span className="text-xs text-muted-foreground ml-2">
                (Fractional trading available)
              </span>
            </label>
            <Input
              type="number"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              placeholder="Enter number of shares"
              step="0.01"
            />
            <div className="mt-1">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isFractional}
                  onChange={(e) => setIsFractional(e.target.checked)}
                  className="form-checkbox"
                />
                <span className="text-sm">Enable fractional shares</span>
              </label>
            </div>
          </div>

          {(orderType === "limit" || orderType === "oco") && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Limit Price
              </label>
              <Input
                type="number"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder="Enter limit price"
              />
            </div>
          )}

          {(orderType === "stop" || orderType === "oco") && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Stop Price
              </label>
              <Input
                type="number"
                value={stopPrice}
                onChange={(e) => setStopPrice(e.target.value)}
                placeholder="Enter stop price"
              />
            </div>
          )}

          {orderType === "trailing_stop" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Trailing Percent
              </label>
              <Input
                type="number"
                value={trailingPercent}
                onChange={(e) => setTrailingPercent(e.target.value)}
                placeholder="Enter trailing percentage"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Risk Level</label>
            <Select
              value={riskLevel}
              onValueChange={(value: "low" | "medium" | "high") =>
                setRiskLevel(value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select risk level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => handleTrade("buy")}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Buy
            </Button>
            <Button
              onClick={() => handleTrade("sell")}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              Sell
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 card-gradient">
        <h2 className="text-xl font-semibold mb-4">Current Positions</h2>
        <div className="space-y-4">
          {positions.map((position) => (
            <div
              key={position.symbol}
              className="flex justify-between items-center p-3 rounded-lg bg-background/50"
            >
              <div>
                <h3 className="font-semibold">{position.symbol}</h3>
                <p className="text-sm text-muted-foreground">
                  {position.shares} shares
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  ${position.averagePrice.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Avg Price</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default TradingView;