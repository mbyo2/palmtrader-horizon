import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { MarketDataService } from "@/services/MarketDataService";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AdvancedStockChart } from "../Research/AdvancedStockChart";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const POPULAR_STOCKS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corp." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "NVDA", name: "NVIDIA Corp." },
];

type OrderType = "market" | "limit" | "stop";

const TradingInterface = () => {
  const { user } = useAuth();
  const [symbol, setSymbol] = useState("AAPL");
  const [customSymbol, setCustomSymbol] = useState("");
  const [orderAction, setOrderAction] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [shares, setShares] = useState<number | "">("");
  const [limitPrice, setLimitPrice] = useState<number | "">("");
  const [stopPrice, setStopPrice] = useState<number | "">("");
  const [isAdvancedOrder, setIsAdvancedOrder] = useState(false);
  const [isFractional, setIsFractional] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: stockPrice, isLoading: isPriceLoading } = useQuery({
    queryKey: ["stockPrice", symbol],
    queryFn: async () => await MarketDataService.fetchLatestPrice(symbol),
    refetchInterval: 10000,
  });
  
  const { data: historicalData, isLoading: isHistoricalLoading } = useQuery({
    queryKey: ["historicalData", symbol],
    queryFn: async () => await MarketDataService.fetchHistoricalData(symbol, 30),
  });
  
  const { data: userPosition } = useQuery({
    queryKey: ["position", user?.id, symbol],
    queryFn: async () => {
      if (!user) return null;
      
      const { data } = await supabase
        .from("portfolio")
        .select("shares")
        .eq("user_id", user.id)
        .eq("symbol", symbol)
        .maybeSingle();
        
      return data;
    },
    enabled: !!user && orderAction === "sell",
  });
  
  const calculateOrderValue = () => {
    if (!shares || !stockPrice) return 0;
    
    const price = orderType === "market" ? 
      stockPrice.price : 
      orderType === "limit" ? 
        (limitPrice || stockPrice.price) : 
        (stopPrice || stockPrice.price);
    
    return Number(shares) * price;
  };
  
  const orderValue = calculateOrderValue();
  
  const handleSymbolChange = (value: string) => {
    setSymbol(value);
  };
  
  const handleCustomSymbolSubmit = () => {
    if (customSymbol) {
      setSymbol(customSymbol.toUpperCase());
      setCustomSymbol("");
    }
  };
  
  const handleOrderTypeChange = (value: OrderType) => {
    setOrderType(value);
    if (value === "market") {
      setLimitPrice("");
      setStopPrice("");
    }
  };
  
  const isFormValid = () => {
    if (!shares || Number(shares) <= 0) return false;
    if (!isFractional && !Number.isInteger(Number(shares))) return false;
    
    if (orderType === "limit" && (!limitPrice || Number(limitPrice) <= 0)) return false;
    if (orderType === "stop" && (!stopPrice || Number(stopPrice) <= 0)) return false;
    
    if (orderAction === "sell" && userPosition) {
      return Number(shares) <= userPosition.shares;
    }
    
    return true;
  };
  
  const handleSubmitOrder = async () => {
    if (!user || !isFormValid() || !stockPrice) return;
    
    setIsSubmitting(true);
    
    try {
      const price = orderType === "market" ? 
        stockPrice.price : 
        orderType === "limit" ? 
          (limitPrice || stockPrice.price) : 
          (stopPrice || stockPrice.price);
      
      const { error } = await supabase.from("trades").insert({
        user_id: user.id,
        symbol: symbol,
        type: orderAction,
        shares: Number(shares),
        price: price,
        total_amount: Number(shares) * price,
        status: orderType === "market" ? "completed" : "pending",
        order_type: orderType,
        limit_price: limitPrice || null,
        stop_price: stopPrice || null,
        is_fractional: isFractional,
      });
      
      if (error) throw error;
      
      toast.success(`${orderAction === 'buy' ? 'Bought' : 'Sold'} ${shares} shares of ${symbol} at $${price.toFixed(2)}`);
      
      setShares("");
      setLimitPrice("");
      setStopPrice("");
    } catch (error) {
      console.error("Error submitting order:", error);
      toast.error("Failed to submit order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Trade Stocks</CardTitle>
          <CardDescription>Buy and sell stocks with real-time pricing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="symbol-select">Select Stock</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {POPULAR_STOCKS.map((stock) => (
                  <Button
                    key={stock.symbol}
                    variant={symbol === stock.symbol ? "default" : "outline"}
                    onClick={() => handleSymbolChange(stock.symbol)}
                    className="w-full"
                  >
                    {stock.symbol}
                  </Button>
                ))}
                <div className="col-span-4 flex mt-2">
                  <Input
                    placeholder="Enter symbol..."
                    value={customSymbol}
                    onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
                    className="mr-2"
                  />
                  <Button onClick={handleCustomSymbolSubmit}>Go</Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border rounded-md p-3">
              <div>
                <h3 className="font-medium">{symbol}</h3>
                <p className="text-sm text-muted-foreground">
                  {POPULAR_STOCKS.find(s => s.symbol === symbol)?.name || "Stock"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">
                  {isPriceLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
                  ) : (
                    `$${stockPrice?.price.toFixed(2) || "N/A"}`
                  )}
                </p>
                {userPosition?.shares && orderAction === "sell" && (
                  <p className="text-sm text-muted-foreground">
                    You own: {userPosition.shares} shares
                  </p>
                )}
              </div>
            </div>

            <Tabs defaultValue="buy" onValueChange={(value) => setOrderAction(value as "buy" | "sell")}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="buy">Buy</TabsTrigger>
                <TabsTrigger value="sell">Sell</TabsTrigger>
              </TabsList>
            </Tabs>

            <div>
              <Label htmlFor="order-type">Order Type</Label>
              <Select 
                value={orderType} 
                onValueChange={(value) => handleOrderTypeChange(value as OrderType)}
              >
                <SelectTrigger id="order-type">
                  <SelectValue placeholder="Select order type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="market">Market Order</SelectItem>
                  <SelectItem value="limit">Limit Order</SelectItem>
                  <SelectItem value="stop">Stop Order</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                {orderType === "market" 
                  ? "Execute immediately at current market price" 
                  : orderType === "limit" 
                  ? "Set a maximum price for buy or minimum price for sell" 
                  : "Set a trigger price to execute a market order"}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch 
                id="advanced-order" 
                checked={isAdvancedOrder} 
                onCheckedChange={setIsAdvancedOrder} 
              />
              <Label htmlFor="advanced-order">Advanced Order Options</Label>
            </div>

            {isAdvancedOrder && (
              <div className="flex items-center space-x-2">
                <Switch 
                  id="fractional-shares" 
                  checked={isFractional} 
                  onCheckedChange={setIsFractional} 
                />
                <Label htmlFor="fractional-shares">Enable Fractional Shares</Label>
              </div>
            )}

            <div>
              <Label htmlFor="shares">Number of Shares</Label>
              <Input
                id="shares"
                type="number"
                min={isFractional ? "0.000001" : "1"}
                step={isFractional ? "0.000001" : "1"}
                value={shares}
                onChange={(e) => setShares(e.target.value ? Number(e.target.value) : "")}
                className="mt-1"
              />
            </div>

            {orderType === "limit" && (
              <div>
                <Label htmlFor="limit-price">Limit Price</Label>
                <Input
                  id="limit-price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value ? Number(e.target.value) : "")}
                  className="mt-1"
                />
              </div>
            )}

            {orderType === "stop" && (
              <div>
                <Label htmlFor="stop-price">Stop Price</Label>
                <Input
                  id="stop-price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={stopPrice}
                  onChange={(e) => setStopPrice(e.target.value ? Number(e.target.value) : "")}
                  className="mt-1"
                />
              </div>
            )}

            <div className="border-t pt-4">
              <div className="flex justify-between mb-2">
                <span>Estimated Total:</span>
                <span className="font-medium">
                  ${orderValue.toFixed(2)}
                </span>
              </div>
              {orderAction === "sell" && userPosition && Number(shares) > userPosition.shares && (
                <p className="text-sm text-destructive mb-2">
                  You don't have enough shares to sell. You own {userPosition.shares} shares.
                </p>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSubmitOrder} 
            className="w-full" 
            disabled={isSubmitting || !isFormValid() || isPriceLoading}
            variant={orderAction === "buy" ? "default" : "destructive"}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {orderAction === "buy" ? "Buy" : "Sell"} {symbol}
          </Button>
        </CardFooter>
      </Card>
      
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Stock Chart</CardTitle>
          <CardDescription>Real-time price and historical data</CardDescription>
        </CardHeader>
        <CardContent>
          {isHistoricalLoading ? (
            <div className="h-[400px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : historicalData && historicalData.length > 0 ? (
            <AdvancedStockChart symbol={symbol} data={historicalData} compact={true} />
          ) : (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              No historical data available for {symbol}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TradingInterface;
