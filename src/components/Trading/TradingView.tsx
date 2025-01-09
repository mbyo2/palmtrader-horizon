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

interface StockPosition {
  symbol: string;
  shares: number;
  averagePrice: number;
}

const TradingView = () => {
  const [orderType, setOrderType] = useState<"market" | "limit" | "stop">("market");
  const [shares, setShares] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const { toast } = useToast();
  
  const [positions, setPositions] = useState<StockPosition[]>([
    { symbol: "AAPL", shares: 10, averagePrice: 150.50 },
    { symbol: "GOOGL", shares: 5, averagePrice: 2750.00 },
  ]);

  const handleTrade = (action: "buy" | "sell") => {
    // This is a mock implementation - in a real app, this would connect to a trading API
    toast({
      title: "Order Placed",
      description: `${action.toUpperCase()} ${shares} shares at ${orderType} order`,
    });
    
    console.log("Trade executed:", {
      action,
      shares,
      orderType,
      limitPrice,
      stopPrice,
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 card-gradient">
        <h2 className="text-xl font-semibold mb-4">Place Order</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Order Type</label>
            <Select
              value={orderType}
              onValueChange={(value: "market" | "limit" | "stop") => setOrderType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select order type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="market">Market Order</SelectItem>
                <SelectItem value="limit">Limit Order</SelectItem>
                <SelectItem value="stop">Stop Order</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Shares</label>
            <Input
              type="number"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              placeholder="Enter number of shares"
            />
          </div>

          {orderType === "limit" && (
            <div>
              <label className="block text-sm font-medium mb-1">Limit Price</label>
              <Input
                type="number"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder="Enter limit price"
              />
            </div>
          )}

          {orderType === "stop" && (
            <div>
              <label className="block text-sm font-medium mb-1">Stop Price</label>
              <Input
                type="number"
                value={stopPrice}
                onChange={(e) => setStopPrice(e.target.value)}
                placeholder="Enter stop price"
              />
            </div>
          )}

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
                <p className="text-sm text-muted-foreground">
                  Avg Price
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default TradingView;