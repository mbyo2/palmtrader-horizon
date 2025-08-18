import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

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