
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

export type OrderType = "market" | "limit" | "stop" | "stop_limit" | "trailing_stop";

export interface OrderRequest {
  userId: string;
  symbol: string;
  type: "buy" | "sell";
  shares: number;
  price: number;
  orderType: OrderType;
  limitPrice?: number;
  stopPrice?: number;
  isFractional?: boolean;
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

  static async executeOrder(orderRequest: OrderRequest): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      const orderData = {
        user_id: orderRequest.userId,
        symbol: orderRequest.symbol,
        type: orderRequest.type,
        order_type: orderRequest.orderType,
        shares: orderRequest.shares,
        price: orderRequest.price,
        limit_price: orderRequest.limitPrice,
        stop_price: orderRequest.stopPrice,
        status: orderRequest.orderType === "market" ? "completed" : "pending" as const,
        total_amount: orderRequest.shares * orderRequest.price
      };

      return await this.createOrder(orderData);
    } catch (error) {
      console.error("Error executing order:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to execute order"
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
        type: trade.type as "buy" | "sell",
        order_type: trade.order_type as OrderType,
        shares: trade.shares,
        price: trade.price,
        limit_price: trade.limit_price,
        stop_price: trade.stop_price,
        trailing_percent: trade.trailing_percent,
        status: trade.status as "pending" | "completed" | "cancelled" | "failed",
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

  static async processPendingOrders(userId: string): Promise<void> {
    try {
      const pendingOrders = await this.getOrderHistory(userId);
      const pendingOnly = pendingOrders.filter(order => order.status === "pending");
      
      for (const order of pendingOnly) {
        // Simple order processing logic - in a real system this would check market conditions
        if (order.order_type === "market") {
          await this.updateOrderStatus(order.id, "completed");
        }
        // For limit/stop orders, you would check if conditions are met
      }
    } catch (error) {
      console.error("Error processing pending orders:", error);
    }
  }
}
