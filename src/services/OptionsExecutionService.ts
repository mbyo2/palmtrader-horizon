
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OptionsOrderRequest {
  userId: string;
  symbol: string;
  optionType: "CALL" | "PUT";
  strikePrice: number;
  expirationDate: string;
  contracts: number;
  premium: number;
  action: "buy" | "sell";
  orderType: "market" | "limit";
  limitPrice?: number;
}

export interface OptionsOrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
  totalCost?: number;
}

export class OptionsExecutionService {
  static async executeOptionsOrder(order: OptionsOrderRequest): Promise<OptionsOrderResult> {
    try {
      // Validate options order
      const validation = await this.validateOptionsOrder(order);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Calculate total cost
      const totalCost = order.contracts * order.premium * 100; // Options are priced per share, 100 shares per contract

      // Check user funds for buy orders
      if (order.action === "buy") {
        const hasBalance = await this.checkUserBalance(order.userId, totalCost);
        if (!hasBalance) {
          return { success: false, error: "Insufficient funds for options purchase" };
        }
      }

      // Create options trade record
      const { data, error } = await supabase.from("options_trades").insert({
        user_id: order.userId,
        symbol: order.symbol,
        option_type: order.optionType,
        strike_price: order.strikePrice,
        expiration_date: order.expirationDate,
        contracts: order.contracts,
        premium_per_contract: order.premium,
        total_premium: totalCost,
        status: order.orderType === "market" ? "completed" : "pending"
      }).select("id").single();

      if (error) throw error;

      // Update user portfolio for completed orders
      if (order.orderType === "market") {
        await this.updateOptionsPosition(order.userId, order, totalCost);
      }

      return {
        success: true,
        orderId: data.id,
        totalCost
      };
    } catch (error) {
      console.error("Options execution error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Options order failed"
      };
    }
  }

  private static async validateOptionsOrder(order: OptionsOrderRequest): Promise<{ valid: boolean; error?: string }> {
    // Check expiration date is in the future
    const expirationDate = new Date(order.expirationDate);
    const today = new Date();
    if (expirationDate <= today) {
      return { valid: false, error: "Expiration date must be in the future" };
    }

    // Validate strike price
    if (order.strikePrice <= 0) {
      return { valid: false, error: "Strike price must be positive" };
    }

    // Validate premium
    if (order.premium <= 0) {
      return { valid: false, error: "Premium must be positive" };
    }

    // Validate contracts
    if (order.contracts <= 0 || order.contracts % 1 !== 0) {
      return { valid: false, error: "Contracts must be a positive integer" };
    }

    return { valid: true };
  }

  private static async checkUserBalance(userId: string, requiredAmount: number): Promise<boolean> {
    // In production, check actual account balance
    // For demo purposes, assume sufficient balance
    return true;
  }

  private static async updateOptionsPosition(userId: string, order: OptionsOrderRequest, totalCost: number): Promise<void> {
    // Update user's cash balance and create options position
    // This would integrate with the portfolio system
    console.log(`Updated options position for user ${userId}: ${order.contracts} contracts of ${order.symbol}`);
  }

  static async getOptionsPositions(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("options_trades")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "completed");

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching options positions:", error);
      return [];
    }
  }
}
