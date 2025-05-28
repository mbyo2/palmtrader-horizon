
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Calculator, Target, TrendingUp } from "lucide-react";

interface AdvancedOrderFormProps {
  symbol: string;
  currentPrice: number;
  onSubmitOrder: (orderData: any) => void;
}

const AdvancedOrderForm = ({ symbol, currentPrice, onSubmitOrder }: AdvancedOrderFormProps) => {
  const [orderType, setOrderType] = useState("market");
  const [orderSide, setOrderSide] = useState("buy");
  const [quantity, setQuantity] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [stopLimitPrice, setStopLimitPrice] = useState("");
  const [trailingAmount, setTrailingAmount] = useState("");
  const [trailingPercent, setTrailingPercent] = useState([2]);
  const [timeInForce, setTimeInForce] = useState("DAY");
  const [isIcebergOrder, setIsIcebergOrder] = useState(false);
  const [visibleQuantity, setVisibleQuantity] = useState("");
  const [isOCOOrder, setIsOCOOrder] = useState(false);
  const [ocoStopPrice, setOcoStopPrice] = useState("");
  const [ocoLimitPrice, setOcoLimitPrice] = useState("");

  const calculateOrderValue = () => {
    const qty = parseFloat(quantity) || 0;
    const price = orderType === "market" ? currentPrice : parseFloat(limitPrice) || currentPrice;
    return qty * price;
  };

  const getEstimatedFees = () => {
    return calculateOrderValue() * 0.001; // 0.1% fee
  };

  const handleSubmit = () => {
    const orderData = {
      symbol,
      type: orderSide,
      orderType,
      quantity: parseFloat(quantity),
      limitPrice: limitPrice ? parseFloat(limitPrice) : undefined,
      stopPrice: stopPrice ? parseFloat(stopPrice) : undefined,
      stopLimitPrice: stopLimitPrice ? parseFloat(stopLimitPrice) : undefined,
      trailingAmount: trailingAmount ? parseFloat(trailingAmount) : undefined,
      trailingPercent: trailingPercent[0],
      timeInForce,
      isIcebergOrder,
      visibleQuantity: visibleQuantity ? parseFloat(visibleQuantity) : undefined,
      isOCOOrder,
      ocoStopPrice: ocoStopPrice ? parseFloat(ocoStopPrice) : undefined,
      ocoLimitPrice: ocoLimitPrice ? parseFloat(ocoLimitPrice) : undefined,
    };
    onSubmitOrder(orderData);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Advanced Order - {symbol}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline">${currentPrice.toFixed(2)}</Badge>
          <Badge variant={orderSide === "buy" ? "default" : "destructive"}>
            {orderSide.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={orderSide} onValueChange={setOrderSide}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy">Buy</TabsTrigger>
            <TabsTrigger value="sell">Sell</TabsTrigger>
          </TabsList>
        </Tabs>

        <div>
          <Label>Order Type</Label>
          <Select value={orderType} onValueChange={setOrderType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="market">Market Order</SelectItem>
              <SelectItem value="limit">Limit Order</SelectItem>
              <SelectItem value="stop">Stop Order</SelectItem>
              <SelectItem value="stop_limit">Stop-Limit Order</SelectItem>
              <SelectItem value="trailing_stop">Trailing Stop</SelectItem>
              <SelectItem value="trailing_stop_limit">Trailing Stop-Limit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Quantity</Label>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Enter quantity"
          />
        </div>

        {(orderType === "limit" || orderType === "stop_limit" || orderType === "trailing_stop_limit") && (
          <div>
            <Label>Limit Price</Label>
            <Input
              type="number"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder="Enter limit price"
            />
          </div>
        )}

        {(orderType === "stop" || orderType === "stop_limit") && (
          <div>
            <Label>Stop Price</Label>
            <Input
              type="number"
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              placeholder="Enter stop price"
            />
          </div>
        )}

        {orderType.includes("trailing") && (
          <div className="space-y-2">
            <Label>Trailing Percent: {trailingPercent[0]}%</Label>
            <Slider
              value={trailingPercent}
              onValueChange={setTrailingPercent}
              max={10}
              min={0.1}
              step={0.1}
              className="w-full"
            />
          </div>
        )}

        <div>
          <Label>Time in Force</Label>
          <Select value={timeInForce} onValueChange={setTimeInForce}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAY">Day Order</SelectItem>
              <SelectItem value="GTC">Good Till Cancel</SelectItem>
              <SelectItem value="IOC">Immediate or Cancel</SelectItem>
              <SelectItem value="FOK">Fill or Kill</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Iceberg Order</Label>
            <Switch checked={isIcebergOrder} onCheckedChange={setIsIcebergOrder} />
          </div>
          
          {isIcebergOrder && (
            <div>
              <Label>Visible Quantity</Label>
              <Input
                type="number"
                value={visibleQuantity}
                onChange={(e) => setVisibleQuantity(e.target.value)}
                placeholder="Visible quantity"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label>OCO Order</Label>
            <Switch checked={isOCOOrder} onCheckedChange={setIsOCOOrder} />
          </div>

          {isOCOOrder && (
            <div className="space-y-2">
              <div>
                <Label>OCO Stop Price</Label>
                <Input
                  type="number"
                  value={ocoStopPrice}
                  onChange={(e) => setOcoStopPrice(e.target.value)}
                  placeholder="OCO stop price"
                />
              </div>
              <div>
                <Label>OCO Limit Price</Label>
                <Input
                  type="number"
                  value={ocoLimitPrice}
                  onChange={(e) => setOcoLimitPrice(e.target.value)}
                  placeholder="OCO limit price"
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Order Value:</span>
            <span className="font-medium">${calculateOrderValue().toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Estimated Fees:</span>
            <span className="font-medium">${getEstimatedFees().toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="font-semibold">Total:</span>
            <span className="font-semibold">${(calculateOrderValue() + getEstimatedFees()).toFixed(2)}</span>
          </div>
        </div>

        <Button 
          onClick={handleSubmit} 
          className="w-full"
          variant={orderSide === "buy" ? "default" : "destructive"}
          disabled={!quantity || parseFloat(quantity) <= 0}
        >
          <Calculator className="mr-2 h-4 w-4" />
          Place {orderSide.toUpperCase()} Order
        </Button>

        {orderType !== "market" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            This order will be placed in the order book and executed when conditions are met.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdvancedOrderForm;
