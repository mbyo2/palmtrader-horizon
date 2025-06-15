
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle } from "lucide-react";
import { OrderExecutionRequest, OrderExecutionResponse } from "@/services/BrokerageIntegration";
import StockSelector from "./StockSelector";
import { useQuery } from "@tanstack/react-query";
import { MarketDataService } from "@/services/MarketDataService";

interface EnhancedOrderFormProps {
  canTrade: boolean;
  tradingLimits: {
    dailyLimit: number;
    monthlyLimit: number;
    positionLimit: number;
  };
  isExecutingOrder: boolean;
  onExecuteOrder: (order: Omit<OrderExecutionRequest, 'accountId'>) => Promise<OrderExecutionResponse>;
}

const EnhancedOrderForm = ({ canTrade, tradingLimits, isExecutingOrder, onExecuteOrder }: EnhancedOrderFormProps) => {
  const [symbol, setSymbol] = useState("AAPL");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState<number>(1);
  const [orderType, setOrderType] = useState<"market" | "limit" | "stop" | "stop_limit">("market");
  const [timeInForce, setTimeInForce] = useState<"day" | "gtc" | "ioc" | "fok">("day");
  const [limitPrice, setLimitPrice] = useState<number | undefined>();
  const [stopPrice, setStopPrice] = useState<number | undefined>();

  // Get current market price
  const { data: currentPrice } = useQuery({
    queryKey: ['currentPrice', symbol],
    queryFn: async () => {
      const data = await MarketDataService.fetchLatestPrice(symbol);
      return data?.price || 0;
    },
    refetchInterval: 5000,
    enabled: !!symbol
  });

  const calculateOrderValue = () => {
    if (!currentPrice || !quantity) return 0;
    const price = orderType === "limit" ? (limitPrice || currentPrice) : currentPrice;
    return quantity * price;
  };

  const orderValue = calculateOrderValue();
  const exceedsLimit = orderValue > tradingLimits.dailyLimit;

  const handleSubmit = async () => {
    if (!canTrade || exceedsLimit || isExecutingOrder) return;

    const order: Omit<OrderExecutionRequest, 'accountId'> = {
      symbol,
      side,
      quantity,
      orderType,
      timeInForce,
      limitPrice,
      stopPrice
    };

    await onExecuteOrder(order);
  };

  const isFormValid = () => {
    return symbol && quantity > 0 && 
           (orderType !== "limit" || limitPrice) && 
           (orderType !== "stop" || stopPrice) &&
           (orderType !== "stop_limit" || (limitPrice && stopPrice));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Place Order</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canTrade && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Complete KYC verification to enable trading
            </AlertDescription>
          </Alert>
        )}

        <StockSelector symbol={symbol} onSymbolChange={setSymbol} />

        {currentPrice && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Current Price</span>
              <span className="font-semibold">${currentPrice.toFixed(2)}</span>
            </div>
          </div>
        )}

        <Tabs value={side} onValueChange={(value) => setSide(value as "buy" | "sell")}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="buy">Buy</TabsTrigger>
            <TabsTrigger value="sell">Sell</TabsTrigger>
          </TabsList>
        </Tabs>

        <div>
          <Label htmlFor="orderType">Order Type</Label>
          <Select value={orderType} onValueChange={(value) => setOrderType(value as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="market">Market</SelectItem>
              <SelectItem value="limit">Limit</SelectItem>
              <SelectItem value="stop">Stop</SelectItem>
              <SelectItem value="stop_limit">Stop Limit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </div>

        {(orderType === "limit" || orderType === "stop_limit") && (
          <div>
            <Label htmlFor="limitPrice">Limit Price</Label>
            <Input
              id="limitPrice"
              type="number"
              step="0.01"
              value={limitPrice || ''}
              onChange={(e) => setLimitPrice(Number(e.target.value))}
            />
          </div>
        )}

        {(orderType === "stop" || orderType === "stop_limit") && (
          <div>
            <Label htmlFor="stopPrice">Stop Price</Label>
            <Input
              id="stopPrice"
              type="number"
              step="0.01"
              value={stopPrice || ''}
              onChange={(e) => setStopPrice(Number(e.target.value))}
            />
          </div>
        )}

        <div>
          <Label htmlFor="timeInForce">Time in Force</Label>
          <Select value={timeInForce} onValueChange={(value) => setTimeInForce(value as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="gtc">Good Till Canceled</SelectItem>
              <SelectItem value="ioc">Immediate or Cancel</SelectItem>
              <SelectItem value="fok">Fill or Kill</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="p-3 bg-muted rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Estimated Value:</span>
            <span className="font-medium">${orderValue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Daily Limit:</span>
            <span>${tradingLimits.dailyLimit.toLocaleString()}</span>
          </div>
          {exceedsLimit && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Order value exceeds daily trading limit
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!canTrade || !isFormValid() || exceedsLimit || isExecutingOrder}
          className="w-full"
          variant={side === "buy" ? "default" : "destructive"}
        >
          {isExecutingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {side === "buy" ? "Buy" : "Sell"} {symbol}
        </Button>
      </CardContent>
    </Card>
  );
};

export default EnhancedOrderForm;
