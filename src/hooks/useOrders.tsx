import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { isDemo } from '@/services/demo/DemoBackend';
import { DemoStockTrading } from '@/services/demo/demoStocks';

export interface Order {
  id: string;
  user_id: string;
  symbol: string;
  order_type: 'market' | 'limit' | 'stop' | 'stop_limit';
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  limit_price?: number;
  stop_price?: number;
  time_in_force: 'day' | 'gtc' | 'ioc' | 'fok';
  status: 'pending' | 'filled' | 'cancelled' | 'rejected' | 'partial';
  filled_quantity: number;
  average_fill_price?: number;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

export const useOrders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { 
    data: orders = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ["orders", user?.id],
    queryFn: async () => {
      if (!user) return [];
      if (await isDemo()) return DemoStockTrading.getOrders(user.id) as unknown as Order[];
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!user,
    staleTime: 5 * 1000, // 5 seconds for real-time feel
  });

  const createOrder = async (orderData: Omit<Order, 'id' | 'user_id' | 'status' | 'filled_quantity' | 'created_at' | 'updated_at'>) => {
    if (!user) {
      toast.error("User not authenticated");
      return null;
    }
    if (await isDemo()) {
      const r = await DemoStockTrading.placeOrder(user.id, {
        symbol: orderData.symbol, side: orderData.side,
        orderType: orderData.order_type, quantity: orderData.quantity,
        limitPrice: orderData.limit_price ?? undefined, stopPrice: orderData.stop_price ?? undefined,
        timeInForce: orderData.time_in_force,
      });
      if (!r.success) { toast.error(r.error || "Failed to create order"); throw new Error(r.error || 'Order failed'); }
      await queryClient.invalidateQueries({ queryKey: ["orders", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["positions", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["portfolio", user.id] });
      toast.success("Order created successfully");
      return (await DemoStockTrading.getOrders(user.id)).find(o => o.id === r.orderId) as unknown as Order;
    }

    const { data, error } = await supabase
      .from('orders')
      .insert({
        ...orderData,
        user_id: user.id,
        status: 'pending',
        filled_quantity: 0
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create order");
      throw error;
    }

    await queryClient.invalidateQueries({ queryKey: ["orders", user.id] });
    toast.success("Order created successfully");
    return data;
  };

  const cancelOrder = async (orderId: string) => {
    if (!user) return;
    if (await isDemo()) {
      const r = await DemoStockTrading.cancelOrder(orderId);
      if (!r.success) { toast.error(r.error || "Failed to cancel order"); throw new Error(r.error || 'Cancel failed'); }
      await queryClient.invalidateQueries({ queryKey: ["orders", user.id] });
      toast.success("Order cancelled");
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .eq('user_id', user.id);

    if (error) {
      toast.error("Failed to cancel order");
      throw error;
    }

    await queryClient.invalidateQueries({ queryKey: ["orders", user.id] });
    toast.success("Order cancelled");
  };

  return {
    orders,
    isLoading,
    error,
    refetch,
    createOrder,
    cancelOrder
  };
};