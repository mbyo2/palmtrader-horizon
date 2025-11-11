
import { useState } from "react";
import { OrderExecutionEngine, OrderRequest, OrderResult } from "@/services/OrderExecutionEngine";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export const useOrderExecution = () => {
  const { user } = useAuth();
  const [isExecuting, setIsExecuting] = useState(false);

  const executeOrder = async (orderRequest: Omit<OrderRequest, "userId">): Promise<OrderResult> => {
    if (!user) {
      toast.error("Please log in to place orders");
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
            `${orderRequest.type === "buy" ? "Bought" : "Sold"} ${result.executedShares} shares of ${orderRequest.symbol} at $${result.executedPrice?.toFixed(2)}`,
            { duration: 4000 }
          );
        } else {
          toast.success(
            `${orderRequest.type === "buy" ? "Buy" : "Sell"} order placed for ${orderRequest.shares} shares of ${orderRequest.symbol}`,
            { duration: 4000 }
          );
        }
      } else {
        const userFriendlyError = getUserFriendlyError(result.error || "Order execution failed");
        toast.error(userFriendlyError, { duration: 5000 });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const userFriendlyError = getUserFriendlyError(errorMessage);
      console.error("Order execution error:", error);
      toast.error(userFriendlyError, { duration: 5000 });
      return { success: false, error: errorMessage };
    } finally {
      setIsExecuting(false);
    }
  };

  const getUserFriendlyError = (error: string): string => {
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('insufficient') || errorLower.includes('balance')) {
      return "Insufficient funds. Please add funds to your account.";
    }
    if (errorLower.includes('market closed') || errorLower.includes('trading hours')) {
      return "Market is currently closed. Orders will be processed when market opens.";
    }
    if (errorLower.includes('network') || errorLower.includes('timeout')) {
      return "Connection issue. Please check your internet and try again.";
    }
    if (errorLower.includes('invalid') || errorLower.includes('symbol')) {
      return "Invalid stock symbol. Please check and try again.";
    }
    if (errorLower.includes('limit') || errorLower.includes('exceeded')) {
      return "Trading limit exceeded. Please contact support.";
    }
    
    return `Order failed: ${error}`;
  };

  return {
    executeOrder,
    isExecuting
  };
};
