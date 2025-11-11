import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { useHaptic } from "@/hooks/useHaptic";
import { useOrderExecution } from "@/hooks/useOrderExecution";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "sonner";
import { TradingErrorBoundary } from "@/components/ErrorBoundary/TradingErrorBoundary";

interface QuickTradeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  companyName: string;
  currentPrice: number;
}

export const QuickTradeSheet = ({
  isOpen,
  onClose,
  symbol,
  companyName,
  currentPrice,
}: QuickTradeSheetProps) => {
  const [orderSide, setOrderSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState<string>("1");
  const { trigger } = useHaptic();
  const { executeOrder, isExecuting } = useOrderExecution();
  const { getBalance } = useWallet();

  const walletBalance = getBalance("USD");
  const availableBalance = walletBalance?.available || 0;
  const estimatedTotal = parseFloat(quantity || "0") * currentPrice;
  const canAfford = orderSide === "buy" ? estimatedTotal <= availableBalance : true;

  useEffect(() => {
    if (isOpen) {
      trigger("medium");
    }
  }, [isOpen, trigger]);

  const handleOrderSideChange = (side: "buy" | "sell") => {
    trigger("selection");
    setOrderSide(side);
  };

  const handleSubmit = async () => {
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      toast.error("Please enter a valid quantity", { duration: 4000 });
      return;
    }

    if (orderSide === "buy" && !canAfford) {
      toast.error("Insufficient balance. Please add funds to your account.", { duration: 4000 });
      return;
    }

    trigger("medium");

    try {
      const result = await executeOrder({
        symbol,
        type: orderSide,
        shares: qty,
        orderType: "market",
        price: currentPrice,
      });

      if (result.success) {
        trigger("success");
        onClose();
        setQuantity("1");
      } else {
        trigger("error");
      }
    } catch (error) {
      console.error("Quick trade error:", error);
      trigger("error");
      const errorMessage = error instanceof Error ? error.message : "Order failed";
      toast.error(errorMessage, { duration: 5000 });
    }
  };

  return (
    <TradingErrorBoundary>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="text-left pb-6">
            <SheetTitle className="text-2xl">{symbol}</SheetTitle>
            <SheetDescription className="text-base">{companyName}</SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            {/* Current Price */}
            <div className="bg-muted/50 rounded-2xl p-4">
              <p className="text-sm text-muted-foreground mb-1">Current Price</p>
              <p className="text-3xl font-bold">${currentPrice.toFixed(2)}</p>
            </div>

            {/* Buy/Sell Toggle */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                size="lg"
                variant={orderSide === "buy" ? "default" : "outline"}
                onClick={() => handleOrderSideChange("buy")}
                className="h-16 text-lg font-semibold rounded-2xl"
              >
                <TrendingUp className="mr-2 h-5 w-5" />
                Buy
              </Button>
              <Button
                size="lg"
                variant={orderSide === "sell" ? "destructive" : "outline"}
                onClick={() => handleOrderSideChange("sell")}
                className="h-16 text-lg font-semibold rounded-2xl"
              >
                <TrendingDown className="mr-2 h-5 w-5" />
                Sell
              </Button>
            </div>

            {/* Quantity Input */}
            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-base">
                Shares
              </Label>
              <Input
                id="quantity"
                type="number"
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity"
                className="h-14 text-lg rounded-xl"
                min="0.01"
                step="1"
              />
            </div>

            {/* Order Summary */}
            <div className="bg-muted/50 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Estimated Total</span>
                <span className="text-xl font-bold flex items-center gap-1">
                  <DollarSign className="h-5 w-5" />
                  {estimatedTotal.toFixed(2)}
                </span>
              </div>
              {orderSide === "buy" && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Available Balance</span>
                  <span className={canAfford ? "text-foreground" : "text-destructive"}>
                    ${availableBalance.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={isExecuting || !canAfford || !quantity || parseFloat(quantity) <= 0}
              className="w-full h-16 text-lg font-semibold rounded-2xl"
              variant={orderSide === "buy" ? "default" : "destructive"}
            >
              {isExecuting
                ? "Processing..."
                : `${orderSide === "buy" ? "Buy" : "Sell"} ${quantity || "0"} shares`}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </TradingErrorBoundary>
  );
};
