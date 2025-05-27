
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OrderRequest {
  userId: string;
  symbol: string;
  type: "buy" | "sell";
  shares: number;
  price: number;
  orderType: "market" | "limit" | "stop" | "stop_limit";
  limitPrice?: number;
  stopPrice?: number;
  isFractional?: boolean;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  executedPrice?: number;
  executedShares?: number;
  error?: string;
}

export class OrderExecutionEngine {
  static async executeOrder(order: OrderRequest): Promise<OrderResult> {
    try {
      // Validate order
      const validation = await this.validateOrder(order);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // For market orders, execute immediately
      if (order.orderType === "market") {
        return await this.executeMarketOrder(order);
      } else {
        // For non-market orders, create pending order
        return await this.createPendingOrder(order);
      }
    } catch (error) {
      console.error("Order execution error:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown execution error"
      };
    }
  }

  private static async validateOrder(order: OrderRequest): Promise<{ valid: boolean; error?: string }> {
    // Check if user has sufficient funds for buy orders
    if (order.type === "buy") {
      const requiredAmount = order.shares * order.price;
      const hasBalance = await this.checkUserBalance(order.userId, requiredAmount);
      if (!hasBalance) {
        return { valid: false, error: "Insufficient funds" };
      }
    }

    // Check if user has sufficient shares for sell orders
    if (order.type === "sell") {
      const hasShares = await this.checkUserShares(order.userId, order.symbol, order.shares);
      if (!hasShares) {
        return { valid: false, error: "Insufficient shares" };
      }
    }

    // Basic validation
    if (order.shares <= 0) {
      return { valid: false, error: "Invalid share quantity" };
    }

    if (order.price <= 0) {
      return { valid: false, error: "Invalid price" };
    }

    return { valid: true };
  }

  private static async executeMarketOrder(order: OrderRequest): Promise<OrderResult> {
    // Get current market price (in real implementation, this would be from live data)
    const currentPrice = await this.getCurrentMarketPrice(order.symbol);
    
    // Create the trade record
    const { data, error } = await supabase.from("trades").insert({
      user_id: order.userId,
      symbol: order.symbol,
      type: order.type,
      shares: order.shares,
      price: currentPrice,
      total_amount: order.shares * currentPrice,
      status: "completed",
      order_type: order.orderType,
      is_fractional: order.isFractional || false,
    }).select("id").single();

    if (error) throw error;

    // Update portfolio
    await this.updatePortfolio(order.userId, order.symbol, order.type, order.shares, currentPrice);

    return {
      success: true,
      orderId: data.id,
      executedPrice: currentPrice,
      executedShares: order.shares
    };
  }

  private static async createPendingOrder(order: OrderRequest): Promise<OrderResult> {
    const { data, error } = await supabase.from("trades").insert({
      user_id: order.userId,
      symbol: order.symbol,
      type: order.type,
      shares: order.shares,
      price: order.price,
      total_amount: order.shares * order.price,
      status: "pending",
      order_type: order.orderType,
      limit_price: order.limitPrice,
      stop_price: order.stopPrice,
      is_fractional: order.isFractional || false,
    }).select("id").single();

    if (error) throw error;

    return {
      success: true,
      orderId: data.id
    };
  }

  private static async updatePortfolio(
    userId: string, 
    symbol: string, 
    type: "buy" | "sell", 
    shares: number, 
    price: number
  ): Promise<void> {
    if (type === "buy") {
      // Check if user already has this stock
      const { data: existing } = await supabase
        .from("portfolio")
        .select("*")
        .eq("user_id", userId)
        .eq("symbol", symbol)
        .single();

      if (existing) {
        // Update existing position
        const newShares = existing.shares + shares;
        const newAveragePrice = 
          (existing.shares * existing.average_price + shares * price) / newShares;

        await supabase
          .from("portfolio")
          .update({
            shares: newShares,
            average_price: newAveragePrice,
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id);
      } else {
        // Create new position
        await supabase.from("portfolio").insert({
          user_id: userId,
          symbol: symbol,
          shares: shares,
          average_price: price
        });
      }
    } else {
      // Sell order - reduce shares
      const { data: position } = await supabase
        .from("portfolio")
        .select("*")
        .eq("user_id", userId)
        .eq("symbol", symbol)
        .single();

      if (position) {
        const newShares = position.shares - shares;
        if (newShares <= 0) {
          // Remove position if no shares left
          await supabase
            .from("portfolio")
            .delete()
            .eq("id", position.id);
        } else {
          // Update shares count
          await supabase
            .from("portfolio")
            .update({
              shares: newShares,
              updated_at: new Date().toISOString()
            })
            .eq("id", position.id);
        }
      }
    }
  }

  private static async getCurrentMarketPrice(symbol: string): Promise<number> {
    // In a real implementation, this would fetch from market data API
    // For now, return a simulated price based on symbol
    const basePrices: Record<string, number> = {
      "AAPL": 180,
      "MSFT": 350,
      "GOOGL": 140,
      "AMZN": 145,
      "NVDA": 450,
      "META": 330
    };
    
    const basePrice = basePrices[symbol] || 100;
    // Add some random variation (±2%)
    const variation = (Math.random() - 0.5) * 0.04;
    return parseFloat((basePrice * (1 + variation)).toFixed(2));
  }

  private static async checkUserBalance(userId: string, requiredAmount: number): Promise<boolean> {
    // In a real implementation, this would check actual account balance
    // For now, assume users have sufficient balance
    return true;
  }

  private static async checkUserShares(userId: string, symbol: string, requiredShares: number): Promise<boolean> {
    const { data } = await supabase
      .from("portfolio")
      .select("shares")
      .eq("user_id", userId)
      .eq("symbol", symbol)
      .single();

    return data ? data.shares >= requiredShares : false;
  }
}
