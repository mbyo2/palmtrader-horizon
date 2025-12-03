
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { MarketDataService } from "@/services/MarketDataService";
import { useOrderExecution } from "@/hooks/useOrderExecution";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useRealTimePrice } from "@/hooks/useRealTimePrice";
import { toast } from "sonner";

export const useTrading = (initialSymbol = "AAPL") => {
  const { user } = useAuth();
  const [symbol, setSymbol] = useState(initialSymbol);
  const [orderAction, setOrderAction] = useState<"buy" | "sell">("buy");
  
  const { executeOrder, isExecuting } = useOrderExecution();
  const { getPosition, refetchPortfolio } = usePortfolio();
  const queryClient = useQueryClient();
  
  // Use real-time price from WebSocket
  const { price: realTimePrice, change, changePercent, isLoading: isRealTimePriceLoading } = useRealTimePrice(symbol);
  
  // Fallback to API if WebSocket hasn't connected yet
  const { data: apiStockPrice, isLoading: isApiPriceLoading } = useQuery({
    queryKey: ["stockPrice", symbol],
    queryFn: async () => await MarketDataService.fetchLatestPrice(symbol),
    refetchInterval: 30000,
    enabled: realTimePrice === null, // Only fetch if no real-time price
  });

  // Combine real-time and API prices
  const stockPrice = realTimePrice !== null 
    ? { price: realTimePrice, change, changePercent, symbol } 
    : apiStockPrice;
  const isPriceLoading = isRealTimePriceLoading && isApiPriceLoading;
  
  const { data: historicalData, isLoading: isHistoricalLoading } = useQuery({
    queryKey: ["historicalData", symbol],
    queryFn: async () => await MarketDataService.fetchHistoricalData(symbol, 30),
  });
  
  // Get user position for the current symbol
  const userPosition = getPosition(symbol);

  const handleSubmitOrder = async () => {
    if (!user) {
      toast.error("Please log in to place orders", { duration: 4000 });
      return;
    }

    if (!stockPrice) {
      toast.error("Unable to fetch current price. Please try again.", { duration: 4000 });
      return;
    }
    
    // Access the form data from the window object (set by the OrderForm component)
    const formData = (window as any).formData;
    if (!formData) {
      toast.error("Order information is missing. Please fill out the form.", { duration: 4000 });
      return;
    }
    
    const { orderType, shares, limitPrice, stopPrice, isFractional } = formData;
    
    // Validate shares
    if (!shares || shares <= 0) {
      toast.error("Please enter a valid number of shares", { duration: 4000 });
      return;
    }
    
    try {
      const price = orderType === "market" ? 
        stockPrice.price : 
        orderType === "limit" ? 
          (limitPrice || stockPrice.price) : 
          (stopPrice || stockPrice.price);
      
      const result = await executeOrder({
        symbol: symbol,
        type: orderAction,
        shares: Number(shares),
        price: price,
        orderType: orderType,
        limitPrice: limitPrice,
        stopPrice: stopPrice,
        isFractional: isFractional,
      });
      
      if (result.success) {
        // Clear the form data
        delete (window as any).formData;
        
        // Refresh portfolio and wallet data
        await refetchPortfolio();
        queryClient.invalidateQueries({ queryKey: ["walletBalances"] });
        
        if (orderType !== "market") {
          toast.info("Your order will be executed when conditions are met. Check Order History for updates.", {
            duration: 5000
          });
        }
      }
    } catch (error) {
      console.error("Error submitting order:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to submit order: ${errorMessage}`, { duration: 5000 });
    }
  };
  
  return {
    symbol,
    setSymbol,
    orderAction,
    setOrderAction,
    stockPrice,
    isPriceLoading,
    historicalData,
    isHistoricalLoading,
    userPosition,
    isSubmitting: isExecuting,
    handleSubmitOrder
  };
};
