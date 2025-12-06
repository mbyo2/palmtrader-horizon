import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type OrderType = "market" | "limit" | "stop";

export interface OrderFormData {
  orderType: OrderType;
  shares: number;
  limitPrice: number | null;
  stopPrice: number | null;
  isFractional: boolean;
}

interface OrderFormProps {
  symbol: string;
  stockPrice: { price: number } | undefined;
  orderAction: "buy" | "sell";
  userPosition?: { shares: number } | null;
  isSubmitting: boolean;
  onOrderActionChange: (value: "buy" | "sell") => void;
  onSubmitOrder: (formData: OrderFormData) => void;
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
  const [shares, setShares] = useState<string>("");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [stopPrice, setStopPrice] = useState<string>("");
  const [isAdvancedOrder, setIsAdvancedOrder] = useState(false);
  const [isFractional, setIsFractional] = useState(false);

  const handleOrderTypeChange = (value: OrderType) => {
    setOrderType(value);
    if (value === "market") {
      setLimitPrice("");
      setStopPrice("");
    }
  };

  const calculateOrderValue = useCallback(() => {
    if (!shares || !stockPrice) return 0;
    
    const sharesNum = parseFloat(shares);
    if (isNaN(sharesNum)) return 0;
    
    const price = orderType === "market" ? 
      stockPrice.price : 
      orderType === "limit" ? 
        (parseFloat(limitPrice) || stockPrice.price) : 
        (parseFloat(stopPrice) || stockPrice.price);
    
    return sharesNum * price;
  }, [shares, stockPrice, orderType, limitPrice, stopPrice]);

  const isFormValid = useCallback(() => {
    const sharesNum = parseFloat(shares);
    if (!shares || isNaN(sharesNum) || sharesNum <= 0) return false;
    if (!isFractional && !Number.isInteger(sharesNum)) return false;
    
    if (orderType === "limit") {
      const limitNum = parseFloat(limitPrice);
      if (!limitPrice || isNaN(limitNum) || limitNum <= 0) return false;
    }
    if (orderType === "stop") {
      const stopNum = parseFloat(stopPrice);
      if (!stopPrice || isNaN(stopNum) || stopNum <= 0) return false;
    }
    
    if (orderAction === "sell" && userPosition) {
      return sharesNum <= userPosition.shares;
    }
    
    return true;
  }, [shares, orderType, limitPrice, stopPrice, orderAction, userPosition, isFractional]);

  const handleSubmit = () => {
    const formData: OrderFormData = {
      orderType,
      shares: parseFloat(shares),
      limitPrice: limitPrice ? parseFloat(limitPrice) : null,
      stopPrice: stopPrice ? parseFloat(stopPrice) : null,
      isFractional
    };
    onSubmitOrder(formData);
    
    // Reset form after submission
    setShares("");
    setLimitPrice("");
    setStopPrice("");
  };

  const orderValue = calculateOrderValue();

  return (
    <div className="space-y-4">
      <Tabs value={orderAction} onValueChange={(value) => onOrderActionChange(value as "buy" | "sell")}>
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="buy" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">Buy</TabsTrigger>
          <TabsTrigger value="sell" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">Sell</TabsTrigger>
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
          onChange={(e) => setShares(e.target.value)}
          placeholder={isFractional ? "0.5" : "1"}
          className="mt-1"
        />
        {stockPrice && shares && (
          <p className="text-sm text-muted-foreground mt-1">
            Current price: ${stockPrice.price.toFixed(2)}
          </p>
        )}
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
            onChange={(e) => setLimitPrice(e.target.value)}
            placeholder={stockPrice ? stockPrice.price.toFixed(2) : "0.00"}
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
            onChange={(e) => setStopPrice(e.target.value)}
            placeholder={stockPrice ? stockPrice.price.toFixed(2) : "0.00"}
            className="mt-1"
          />
        </div>
      )}

      <div className="border-t pt-4">
        <div className="flex justify-between mb-2">
          <span className="text-muted-foreground">Estimated Total:</span>
          <span className="font-semibold text-lg">
            ${orderValue.toFixed(2)}
          </span>
        </div>
        {orderAction === "sell" && userPosition && parseFloat(shares) > userPosition.shares && (
          <p className="text-sm text-destructive mb-2">
            You don't have enough shares. You own {userPosition.shares.toFixed(4)} shares.
          </p>
        )}
        {userPosition && orderAction === "sell" && (
          <p className="text-sm text-muted-foreground mb-2">
            Available to sell: {userPosition.shares.toFixed(4)} shares
          </p>
        )}
      </div>

      <Button 
        onClick={handleSubmit} 
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
