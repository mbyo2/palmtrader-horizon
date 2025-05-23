
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { finnhubSocket } from "@/utils/finnhubSocket";

// Order types
export type OrderType = "market" | "limit" | "stop" | "stop_limit" | "trailing_stop";
export type OrderAction = "buy" | "sell";

// Order interface
export interface TradeOrder {
  userId: string;
  symbol: string;
  type: OrderAction;
  shares: number;
  price: number;
  orderType: OrderType;
  limitPrice?: number | null;
  stopPrice?: number | null;
  trailingPercent?: number | null;
  isFractional?: boolean;
}

export class TradingService {
  // Execute a trade order
  static async executeOrder(order: TradeOrder): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      console.log("Executing order:", order);
      
      // For market orders, use real-time price if available
      if (order.orderType === "market") {
        try {
          const latestPrice = await this.fetchRealTimePrice(order.symbol);
          if (latestPrice) {
            order.price = latestPrice;
          }
        } catch (err) {
          console.error("Error getting real-time price, using provided price", err);
        }
      }
      
      // Calculate total amount
      const totalAmount = order.shares * order.price;
      
      // Insert trade record in database
      const { data, error } = await supabase.from("trades").insert({
        user_id: order.userId,
        symbol: order.symbol,
        type: order.type,
        shares: order.shares,
        price: order.price,
        total_amount: totalAmount,
        status: order.orderType === "market" ? "completed" : "pending",
        order_type: order.orderType,
        limit_price: order.limitPrice || null,
        stop_price: order.stopPrice || null,
        trailing_percent: order.trailingPercent || null,
        is_fractional: order.isFractional || false,
      }).select("id").single();
      
      if (error) throw error;
      
      // Send confirmation for completed orders
      if (order.orderType === "market") {
        const message = `${order.type === 'buy' ? 'Bought' : 'Sold'} ${order.shares} shares of ${order.symbol} at $${order.price.toFixed(2)}`;
        toast.success(message);
      } else {
        toast.success(`${order.type === 'buy' ? 'Buy' : 'Sell'} order placed successfully`);
        toast.info("Order will be executed when conditions are met");
      }
      
      return { 
        success: true, 
        orderId: data.id
      };
    } catch (error) {
      console.error("Error executing trade:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error executing trade"
      };
    }
  }
  
  // Get real-time price via socket
  static fetchRealTimePrice(symbol: string): Promise<number> {
    return new Promise((resolve, reject) => {
      let timeoutId: ReturnType<typeof setTimeout>;
      let resolved = false;
      
      // Subscribe to the symbol
      finnhubSocket.subscribe(symbol);
      
      // Set up a timeout in case we don't get data quickly
      timeoutId = setTimeout(() => {
        if (!resolved) {
          finnhubSocket.unsubscribe(symbol);
          reject(new Error("Timeout waiting for real-time price"));
        }
      }, 3000);
      
      // Listen for market data
      const unsubscribe = finnhubSocket.onMarketData((data) => {
        if (data.symbol === symbol && data.price) {
          resolved = true;
          clearTimeout(timeoutId);
          unsubscribe();
          finnhubSocket.unsubscribe(symbol);
          resolve(data.price);
        }
      });
    });
  }
  
  // Check order status
  static async checkOrderStatus(orderId: string): Promise<{ completed: boolean; status: string }> {
    try {
      const { data, error } = await supabase
        .from("trades")
        .select("status")
        .eq("id", orderId)
        .single();
        
      if (error) throw error;
      
      return {
        completed: data.status === "completed",
        status: data.status
      };
    } catch (error) {
      console.error("Error checking order status:", error);
      throw error;
    }
  }
  
  // Process pending orders (for limit and stop orders)
  static async processPendingOrders(userId: string): Promise<void> {
    try {
      // Get all pending orders
      const { data: pendingOrders, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "pending");
        
      if (error) throw error;
      
      // Process each pending order
      for (const order of pendingOrders || []) {
        // Get current price
        try {
          const currentPrice = await this.fetchRealTimePrice(order.symbol);
          
          let shouldExecute = false;
          let executionPrice = currentPrice;
          
          // Check if limit order should execute
          if (order.order_type === "limit") {
            if (order.type === "buy" && currentPrice <= order.limit_price) {
              shouldExecute = true;
              executionPrice = currentPrice;
            } else if (order.type === "sell" && currentPrice >= order.limit_price) {
              shouldExecute = true;
              executionPrice = currentPrice;
            }
          }
          
          // Check if stop order should execute
          else if (order.order_type === "stop") {
            if (order.type === "buy" && currentPrice >= order.stop_price) {
              shouldExecute = true;
              executionPrice = currentPrice;
            } else if (order.type === "sell" && currentPrice <= order.stop_price) {
              shouldExecute = true;
              executionPrice = currentPrice;
            }
          }
          
          // Check if stop-limit order should execute
          else if (order.order_type === "stop_limit") {
            if (order.type === "buy" && 
                currentPrice >= order.stop_price && 
                currentPrice <= order.limit_price) {
              shouldExecute = true;
              executionPrice = currentPrice;
            } else if (order.type === "sell" && 
                      currentPrice <= order.stop_price && 
                      currentPrice >= order.limit_price) {
              shouldExecute = true;
              executionPrice = currentPrice;
            }
          }
          
          // Check if trailing stop order should execute
          else if (order.order_type === "trailing_stop" && order.trailing_percent) {
            const trailingAmount = order.price * (order.trailing_percent / 100);
            if (order.type === "buy") {
              if (currentPrice >= order.price + trailingAmount) {
                shouldExecute = true;
                executionPrice = currentPrice;
              }
            } else { // sell
              if (currentPrice <= order.price - trailingAmount) {
                shouldExecute = true;
                executionPrice = currentPrice;
              }
            }
          }
          
          // Execute the order if conditions are met
          if (shouldExecute) {
            const { error: updateError } = await supabase
              .from("trades")
              .update({ 
                status: "completed",
                price: executionPrice,
                total_amount: order.shares * executionPrice
              })
              .eq("id", order.id);
              
            if (updateError) throw updateError;
            
            toast.success(`${order.type === 'buy' ? 'Buy' : 'Sell'} order for ${order.shares} shares of ${order.symbol} executed at $${executionPrice.toFixed(2)}`);
          }
        } catch (error) {
          console.error(`Error processing order ${order.id}:`, error);
        }
      }
    } catch (error) {
      console.error("Error processing pending orders:", error);
    }
  }
}
