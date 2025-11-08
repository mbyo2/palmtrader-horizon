import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { useHaptic } from "@/hooks/useHaptic";
import type { OrderData } from "./MobileOrderForm";

interface MobileOrderConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: OrderData | null;
  symbol: string;
  currentPrice: number;
  onConfirm: () => Promise<void>;
}

export const MobileOrderConfirmation = ({
  isOpen,
  onClose,
  orderData,
  symbol,
  currentPrice,
  onConfirm,
}: MobileOrderConfirmationProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const { trigger } = useHaptic();

  if (!orderData) return null;

  const estimatedTotal = orderData.orderType === "market"
    ? orderData.quantity * currentPrice
    : orderData.quantity * (orderData.limitPrice || currentPrice);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    trigger("medium");
    
    try {
      await onConfirm();
      setStatus("success");
      trigger("success");
      
      // Close after showing success for 1.5 seconds
      setTimeout(() => {
        onClose();
        setStatus("pending");
      }, 1500);
    } catch (error) {
      setStatus("error");
      trigger("error");
      
      // Reset after showing error for 2 seconds
      setTimeout(() => {
        setStatus("pending");
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    trigger("light");
    onClose();
    setStatus("pending");
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="space-y-3 pb-6">
          <SheetTitle className="text-2xl font-bold text-center">
            Confirm Order
          </SheetTitle>
          <SheetDescription className="text-center text-base">
            Please review your order details before confirming
          </SheetDescription>
        </SheetHeader>

        {status === "success" ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <CheckCircle2 className="h-20 w-20 text-green-500 animate-scale-in" />
            <h3 className="text-2xl font-bold">Order Placed!</h3>
            <p className="text-muted-foreground text-center">
              Your order has been successfully submitted
            </p>
          </div>
        ) : status === "error" ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <XCircle className="h-20 w-20 text-red-500 animate-scale-in" />
            <h3 className="text-2xl font-bold">Order Failed</h3>
            <p className="text-muted-foreground text-center">
              Something went wrong. Please try again.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Order Type Badge */}
            <div className="flex items-center justify-center">
              <div
                className={`flex items-center gap-2 px-6 py-3 rounded-full ${
                  orderData.type === "buy"
                    ? "bg-green-500/10 text-green-500"
                    : "bg-red-500/10 text-red-500"
                }`}
              >
                {orderData.type === "buy" ? (
                  <TrendingUp className="h-6 w-6" />
                ) : (
                  <TrendingDown className="h-6 w-6" />
                )}
                <span className="font-bold text-xl uppercase">
                  {orderData.type}
                </span>
              </div>
            </div>

            {/* Order Details */}
            <Card className="p-6 space-y-4 bg-muted/30">
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground text-base">Symbol</span>
                <span className="font-bold text-xl">{symbol}</span>
              </div>
              
              <div className="h-px bg-border" />
              
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground text-base">Order Type</span>
                <span className="font-semibold text-base capitalize">
                  {orderData.orderType}
                </span>
              </div>
              
              <div className="h-px bg-border" />
              
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground text-base">Quantity</span>
                <span className="font-semibold text-base">
                  {orderData.quantity}
                </span>
              </div>
              
              <div className="h-px bg-border" />
              
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground text-base">
                  {orderData.orderType === "market" ? "Current Price" : "Limit Price"}
                </span>
                <span className="font-semibold text-base">
                  ${(orderData.limitPrice || currentPrice).toFixed(2)}
                </span>
              </div>
              
              <div className="h-px bg-border" />
              
              <div className="flex items-center justify-between py-3">
                <span className="font-bold text-lg">Estimated Total</span>
                <span className={`font-bold text-2xl ${
                  orderData.type === "buy" ? "text-green-500" : "text-red-500"
                }`}>
                  ${estimatedTotal.toFixed(2)}
                </span>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <Button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className={`w-full h-14 text-base font-semibold ${
                  orderData.type === "buy"
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-red-500 hover:bg-red-600"
                } text-white`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Confirm ${orderData.type === "buy" ? "Purchase" : "Sale"}`
                )}
              </Button>
              
              <Button
                onClick={handleCancel}
                disabled={isSubmitting}
                variant="outline"
                className="w-full h-14 text-base font-semibold"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
