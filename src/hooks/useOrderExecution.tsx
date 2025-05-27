
import { useState } from "react";
import { OrderExecutionEngine, OrderRequest, OrderResult } from "@/services/OrderExecutionEngine";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export const useOrderExecution = () => {
  const { user } = useAuth();
  const [isExecuting, setIsExecuting] = useState(false);

  const executeOrder = async (orderRequest: Omit<OrderRequest, "userId">): Promise<OrderResult> => {
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    setIsExecuting(true);
    
    try {
      const result = await OrderExecutionEngine.executeOrder({
        ...orderRequest,
        userId: user.id
      });

      if (result.success) {
        if (orderRequest.orderType === "market") {
          toast.success(
            `${orderRequest.type === "buy" ? "Bought" : "Sold"} ${result.executedShares} shares of ${orderRequest.symbol} at $${result.executedPrice?.toFixed(2)}`
          );
        } else {
          toast.success(
            `${orderRequest.type === "buy" ? "Buy" : "Sell"} order placed for ${orderRequest.shares} shares of ${orderRequest.symbol}`
          );
        }
      } else {
        toast.error(result.error || "Order execution failed");
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Order execution failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setIsExecuting(false);
    }
  };

  return {
    executeOrder,
    isExecuting
  };
};
