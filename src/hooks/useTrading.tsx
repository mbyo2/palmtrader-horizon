
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MarketDataService } from "@/services/MarketDataService";
import { TradingService, OrderType } from "@/services/TradingService";
import { toast } from "sonner";

export const useTrading = (initialSymbol = "AAPL") => {
  const { user } = useAuth();
  const [symbol, setSymbol] = useState(initialSymbol);
  const [orderAction, setOrderAction] = useState<"buy" | "sell">("buy");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  
  const { data: stockPrice, isLoading: isPriceLoading } = useQuery({
    queryKey: ["stockPrice", symbol],
    queryFn: async () => await MarketDataService.fetchLatestPrice(symbol),
    refetchInterval: 10000,
  });
  
  const { data: historicalData, isLoading: isHistoricalLoading } = useQuery({
    queryKey: ["historicalData", symbol],
    queryFn: async () => await MarketDataService.fetchHistoricalData(symbol, 30),
  });
  
  const { data: userPosition } = useQuery({
    queryKey: ["position", user?.id, symbol],
    queryFn: async () => {
      if (!user) return null;
      
      const { data } = await supabase
        .from("portfolio")
        .select("shares")
        .eq("user_id", user.id)
        .eq("symbol", symbol)
        .maybeSingle();
        
      return data;
    },
    enabled: !!user && orderAction === "sell",
  });

  const handleSubmitOrder = async () => {
    if (!user || !stockPrice) return;
    
    // Access the form data from the window object (set by the OrderForm component)
    const formData = (window as any).formData;
    if (!formData) return;
    
    const { orderType, shares, limitPrice, stopPrice, isFractional } = formData;
    
    setIsSubmitting(true);
    
    try {
      const price = orderType === "market" ? 
        stockPrice.price : 
        orderType === "limit" ? 
          (limitPrice || stockPrice.price) : 
          (stopPrice || stockPrice.price);
      
      const { success, orderId, error } = await TradingService.executeOrder({
        userId: user.id,
        symbol: symbol,
        type: orderAction,
        shares: Number(shares),
        price: price,
        orderType: orderType,
        limitPrice: limitPrice,
        stopPrice: stopPrice,
        isFractional: isFractional,
      });
      
      if (!success) throw new Error(error);
      
      if (orderId) setOrderId(orderId);
      
      if (orderType === "market") {
        toast.success(`${orderAction === 'buy' ? 'Bought' : 'Sold'} ${shares} shares of ${symbol} at $${price.toFixed(2)}`);
      } else {
        toast.success(`${orderAction === 'buy' ? 'Buy' : 'Sell'} order for ${shares} shares of ${symbol} placed successfully`);
      }
      
      if (orderType !== "market") {
        toast.info("Your order will be executed when conditions are met. Check Order History for updates.");
        TradingService.processPendingOrders(user.id);
      }
    } catch (error) {
      console.error("Error submitting order:", error);
      toast.error(error instanceof Error ? error.message : "Failed to submit order. Please try again.");
    } finally {
      setIsSubmitting(false);
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
    isSubmitting,
    handleSubmitOrder
  };
};
