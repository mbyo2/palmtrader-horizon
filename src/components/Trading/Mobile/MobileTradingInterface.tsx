import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, Clock } from "lucide-react";
import { MobileOrderForm, type OrderData } from "./MobileOrderForm";
import { MobileOrderConfirmation } from "./MobileOrderConfirmation";
import { useHaptic } from "@/hooks/useHaptic";
import { toast } from "sonner";

interface MobileTradingInterfaceProps {
  symbol: string;
  companyName: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  availableBalance?: number;
  onOrderSubmit?: (order: OrderData) => Promise<void>;
}

export const MobileTradingInterface = ({
  symbol,
  companyName,
  currentPrice,
  priceChange,
  priceChangePercent,
  availableBalance = 10000,
  onOrderSubmit,
}: MobileTradingInterfaceProps) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<OrderData | null>(null);
  const { trigger } = useHaptic();

  const isPositive = priceChange >= 0;

  const handleOrderSubmit = (orderData: OrderData) => {
    trigger("medium");
    setPendingOrder(orderData);
    setShowConfirmation(true);
  };

  const handleOrderConfirm = async () => {
    if (!pendingOrder) return;

    try {
      if (onOrderSubmit) {
        await onOrderSubmit(pendingOrder);
      } else {
        // Simulate order execution
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      
      toast.success("Order placed successfully!");
    } catch (error) {
      toast.error("Failed to place order. Please try again.");
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Stock Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="p-4 space-y-3">
          <div>
            <h1 className="text-2xl font-bold">{symbol}</h1>
            <p className="text-sm text-muted-foreground">{companyName}</p>
          </div>
          
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-bold">${currentPrice.toFixed(2)}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={isPositive ? "default" : "destructive"}
                  className="gap-1"
                >
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {isPositive ? "+" : ""}
                  {priceChange.toFixed(2)} ({isPositive ? "+" : ""}
                  {priceChangePercent.toFixed(2)}%)
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trading Tabs */}
      <Tabs defaultValue="trade" className="w-full">
        <TabsList className="w-full h-12 grid grid-cols-3 sticky top-[120px] z-10 bg-background">
          <TabsTrigger value="trade" className="text-base">
            Trade
          </TabsTrigger>
          <TabsTrigger value="chart" className="text-base">
            <Activity className="h-4 w-4 mr-2" />
            Chart
          </TabsTrigger>
          <TabsTrigger value="orders" className="text-base">
            <Clock className="h-4 w-4 mr-2" />
            Orders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trade" className="mt-0 p-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Place Order</CardTitle>
            </CardHeader>
            <CardContent>
              <MobileOrderForm
                symbol={symbol}
                currentPrice={currentPrice}
                availableBalance={availableBalance}
                onSubmit={handleOrderSubmit}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chart" className="mt-0 p-4">
          <Card>
            <CardContent className="p-6">
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Chart view coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="mt-0 p-4">
          <Card>
            <CardContent className="p-6">
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Recent orders will appear here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Order Confirmation Bottom Sheet */}
      <MobileOrderConfirmation
        isOpen={showConfirmation}
        onClose={() => {
          setShowConfirmation(false);
          setPendingOrder(null);
        }}
        orderData={pendingOrder}
        symbol={symbol}
        currentPrice={currentPrice}
        onConfirm={handleOrderConfirm}
      />
    </div>
  );
};
