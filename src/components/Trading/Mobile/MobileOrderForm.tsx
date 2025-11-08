import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useHaptic } from "@/hooks/useHaptic";

interface MobileOrderFormProps {
  symbol: string;
  currentPrice: number;
  onSubmit: (order: OrderData) => void;
  availableBalance: number;
}

export interface OrderData {
  type: "buy" | "sell";
  orderType: "market" | "limit";
  quantity: number;
  limitPrice?: number;
}

export const MobileOrderForm = ({
  symbol,
  currentPrice,
  onSubmit,
  availableBalance,
}: MobileOrderFormProps) => {
  const [orderSide, setOrderSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [quantity, setQuantity] = useState<string>("");
  const [limitPrice, setLimitPrice] = useState<string>(currentPrice.toString());
  const { trigger } = useHaptic();

  const handleOrderSideChange = (value: string) => {
    trigger("selection");
    setOrderSide(value as "buy" | "sell");
  };

  const handleOrderTypeChange = (value: string) => {
    trigger("selection");
    setOrderType(value as "market" | "limit");
  };

  const estimatedTotal = orderType === "market" 
    ? parseFloat(quantity || "0") * currentPrice
    : parseFloat(quantity || "0") * parseFloat(limitPrice || "0");

  const maxQuantity = Math.floor(availableBalance / currentPrice);

  const handleSubmit = () => {
    if (!quantity || parseFloat(quantity) <= 0) {
      trigger("error");
      return;
    }

    trigger("medium");
    onSubmit({
      type: orderSide,
      orderType,
      quantity: parseFloat(quantity),
      limitPrice: orderType === "limit" ? parseFloat(limitPrice) : undefined,
    });
  };

  const handleMaxClick = () => {
    trigger("light");
    setQuantity(maxQuantity.toString());
  };

  return (
    <div className="space-y-6 pb-4">
      {/* Order Side Selector */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Action</Label>
        <Tabs value={orderSide} onValueChange={handleOrderSideChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-14">
            <TabsTrigger 
              value="buy" 
              className="text-base font-semibold data-[state=active]:bg-green-500 data-[state=active]:text-white h-12"
            >
              <TrendingUp className="mr-2 h-5 w-5" />
              Buy
            </TabsTrigger>
            <TabsTrigger 
              value="sell"
              className="text-base font-semibold data-[state=active]:bg-red-500 data-[state=active]:text-white h-12"
            >
              <TrendingDown className="mr-2 h-5 w-5" />
              Sell
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Order Type Selector */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Order Type</Label>
        <Tabs value={orderType} onValueChange={handleOrderTypeChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger value="market" className="text-base h-10">
              Market
            </TabsTrigger>
            <TabsTrigger value="limit" className="text-base h-10">
              Limit
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Limit Price Input (only for limit orders) */}
      {orderType === "limit" && (
        <div className="space-y-3">
          <Label htmlFor="limitPrice" className="text-base font-semibold">
            Limit Price
          </Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-base">
              $
            </span>
            <Input
              id="limitPrice"
              type="number"
              step="0.01"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              className="h-14 text-base pl-8 pr-4"
              placeholder="0.00"
            />
          </div>
        </div>
      )}

      {/* Quantity Input */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="quantity" className="text-base font-semibold">
            Quantity
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleMaxClick}
            className="h-8 text-primary font-medium"
          >
            Max: {maxQuantity}
          </Button>
        </div>
        <Input
          id="quantity"
          type="number"
          step="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="h-14 text-base"
          placeholder="0"
        />
      </div>

      {/* Order Summary Card */}
      <Card className="p-4 space-y-3 bg-muted/30">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Current Price</span>
          <span className="font-semibold">${currentPrice.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Available Balance</span>
          <span className="font-semibold">${availableBalance.toFixed(2)}</span>
        </div>
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between">
          <span className="font-semibold">Estimated Total</span>
          <span className={`font-bold text-lg ${orderSide === "buy" ? "text-green-500" : "text-red-500"}`}>
            ${estimatedTotal.toFixed(2)}
          </span>
        </div>
      </Card>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        className={`w-full h-14 text-base font-semibold ${
          orderSide === "buy"
            ? "bg-green-500 hover:bg-green-600 text-white"
            : "bg-red-500 hover:bg-red-600 text-white"
        }`}
        disabled={!quantity || parseFloat(quantity) <= 0}
      >
        {orderSide === "buy" ? "Buy" : "Sell"} {symbol}
      </Button>
    </div>
  );
};
