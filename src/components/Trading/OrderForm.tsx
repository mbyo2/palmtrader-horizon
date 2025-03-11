
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { OrderType } from "@/services/TradingService";

interface OrderFormProps {
  symbol: string;
  stockPrice: { price: number } | undefined;
  orderAction: "buy" | "sell";
  userPosition?: { shares: number } | null;
  isSubmitting: boolean;
  onOrderActionChange: (value: "buy" | "sell") => void;
  onSubmitOrder: () => void;
}

const OrderForm = ({
  symbol,
  stockPrice,
  orderAction,
  userPosition,
  isSubmitting,
  onOrderActionChange,
  onSubmitOrder
}: OrderFormProps) => {
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [shares, setShares] = useState<number | "">("");
  const [limitPrice, setLimitPrice] = useState<number | "">("");
  const [stopPrice, setStopPrice] = useState<number | "">("");
  const [isAdvancedOrder, setIsAdvancedOrder] = useState(false);
  const [isFractional, setIsFractional] = useState(false);

  const handleOrderTypeChange = (value: OrderType) => {
    setOrderType(value);
    if (value === "market") {
      setLimitPrice("");
      setStopPrice("");
    }
  };

  const calculateOrderValue = () => {
    if (!shares || !stockPrice) return 0;
    
    const price = orderType === "market" ? 
      stockPrice.price : 
      orderType === "limit" ? 
        (limitPrice || stockPrice.price) : 
        (stopPrice || stockPrice.price);
    
    return Number(shares) * price;
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

  const orderValue = calculateOrderValue();

  return (
    <div className="space-y-4">
      <Tabs defaultValue="buy" onValueChange={(value) => onOrderActionChange(value as "buy" | "sell")}>
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

      <Button 
        onClick={() => {
          // Pass the form data to the parent through the provided onSubmitOrder
          // Set the form data in the parent's state first
          window.formData = {
            orderType,
            shares: Number(shares),
            limitPrice: limitPrice ? Number(limitPrice) : null,
            stopPrice: stopPrice ? Number(stopPrice) : null,
            isFractional
          };
          onSubmitOrder();
        }} 
        className="w-full" 
        disabled={isSubmitting || !isFormValid() || !stockPrice}
        variant={orderAction === "buy" ? "default" : "destructive"}
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {orderAction === "buy" ? "Buy" : "Sell"} {symbol}
      </Button>
    </div>
  );
};

export default OrderForm;
