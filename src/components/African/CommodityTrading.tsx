import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Coins, Wheat, Mountain } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Commodity {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  unit: string;
  icon: any;
  category: string;
}

const commodities: Commodity[] = [
  {
    symbol: "COPPER",
    name: "Copper",
    price: 8425.50,
    change: 125.30,
    changePercent: 1.51,
    unit: "USD/ton",
    icon: Mountain,
    category: "metals"
  },
  {
    symbol: "GOLD",
    name: "Gold",
    price: 2045.80,
    change: -12.40,
    changePercent: -0.60,
    unit: "USD/oz",
    icon: Coins,
    category: "metals"
  },
  {
    symbol: "MAIZE",
    name: "Maize",
    price: 485.25,
    change: 8.75,
    changePercent: 1.84,
    unit: "USD/ton",
    icon: Wheat,
    category: "agriculture"
  },
  {
    symbol: "COFFEE",
    name: "Coffee",
    price: 1654.00,
    change: -25.50,
    changePercent: -1.52,
    unit: "USD/ton",
    icon: Wheat,
    category: "agriculture"
  }
];

const CommodityTrading = () => {
  const [selectedCommodity, setSelectedCommodity] = useState<string>("");
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const { toast } = useToast();

  const handleTrade = () => {
    if (!selectedCommodity || !quantity || !price) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields to place a commodity order",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Commodity Order Placed",
      description: `${orderType.toUpperCase()} order for ${quantity} units of ${selectedCommodity} at ${price}`,
    });

    // Reset form
    setSelectedCommodity("");
    setQuantity("");
    setPrice("");
  };

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {commodities.map((commodity) => (
          <Card key={commodity.symbol} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedCommodity(commodity.symbol)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <commodity.icon className="h-5 w-5 text-primary" />
                  <span className="font-semibold">{commodity.name}</span>
                </div>
                <Badge variant={commodity.category === "metals" ? "default" : "secondary"}>
                  {commodity.category}
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold">${commodity.price.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">{commodity.unit}</div>
                <div className={`flex items-center gap-1 text-sm ${
                  commodity.change >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {commodity.change >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {commodity.change >= 0 ? "+" : ""}{commodity.change} ({commodity.changePercent}%)
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trading Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Commodity Trading</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Commodity</label>
              <Select value={selectedCommodity} onValueChange={setSelectedCommodity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select commodity" />
                </SelectTrigger>
                <SelectContent>
                  {commodities.map((commodity) => (
                    <SelectItem key={commodity.symbol} value={commodity.symbol}>
                      {commodity.name} ({commodity.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Order Type</label>
              <Select value={orderType} onValueChange={(value: "buy" | "sell") => setOrderType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Quantity (tons)</label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Price (USD)</label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Enter price per unit"
              />
            </div>
          </div>

          <Button 
            onClick={handleTrade}
            className="w-full"
            variant={orderType === "buy" ? "default" : "destructive"}
          >
            Place {orderType.toUpperCase()} Order
          </Button>
        </CardContent>
      </Card>

      {/* Market Information */}
      <Card>
        <CardHeader>
          <CardTitle>Market Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Trading Hours</h4>
              <p className="text-sm text-muted-foreground">
                Monday - Friday: 08:00 - 17:00 CAT<br/>
                Saturday: 08:00 - 12:00 CAT<br/>
                Sunday: Closed
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Settlement</h4>
              <p className="text-sm text-muted-foreground">
                Physical delivery available<br/>
                Cash settlement option<br/>
                T+2 settlement cycle
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommodityTrading;