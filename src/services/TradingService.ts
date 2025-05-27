
import { supabase } from "@/integrations/supabase/client";

export interface Order {
  id: string;
  user_id: string;
  symbol: string;
  type: "buy" | "sell";
  order_type: "market" | "limit" | "stop" | "stop_limit" | "trailing_stop";
  shares: number;
  price: number;
  limit_price?: number;
  stop_price?: number;
  trailing_percent?: number;
  status: "pending" | "completed" | "cancelled" | "failed";
  created_at: string;
  total_amount: number;
}

export class TradingService {
  static async createOrder(orderData: Omit<Order, "id" | "created_at">): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("trades")
        .insert([{
          user_id: orderData.user_id,
          symbol: orderData.symbol,
          type: orderData.type,
          order_type: orderData.order_type,
          shares: orderData.shares,
          price: orderData.price,
          limit_price: orderData.limit_price,
          stop_price: orderData.stop_price,
          trailing_percent: orderData.trailing_percent,
          status: orderData.status,
          total_amount: orderData.total_amount
        }])
        .select()
        .single();

      if (error) throw error;

      return { success: true, orderId: data.id };
    } catch (error) {
      console.error("Error creating order:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to create order"
      };
    }
  }

  static async getOrderHistory(userId: string, limit: number = 50): Promise<Order[]> {
    try {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map(trade => ({
        id: trade.id,
        user_id: trade.user_id,
        symbol: trade.symbol,
        type: trade.type,
        order_type: trade.order_type,
        shares: trade.shares,
        price: trade.price,
        limit_price: trade.limit_price,
        stop_price: trade.stop_price,
        trailing_percent: trade.trailing_percent,
        status: trade.status,
        created_at: trade.created_at,
        total_amount: trade.total_amount
      }));
    } catch (error) {
      console.error("Error fetching order history:", error);
      return [];
    }
  }

  static async updateOrderStatus(orderId: string, status: Order["status"]): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("trades")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error("Error updating order status:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to update order status"
      };
    }
  }

  static async cancelOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    return this.updateOrderStatus(orderId, "cancelled");
  }

  static async executeOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    return this.updateOrderStatus(orderId, "completed");
  }
}
