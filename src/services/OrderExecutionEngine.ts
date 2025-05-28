
import { supabase } from "@/integrations/supabase/client";
import { RealMarketDataService } from "./RealMarketDataService";
import { PortfolioService } from "./PortfolioService";
import { toast } from "sonner";

export interface OrderRequest {
  userId: string;
  symbol: string;
  type: "buy" | "sell";
  shares: number;
  price: number;
  orderType: "market" | "limit" | "stop" | "stop_limit" | "trailing_stop";
  limitPrice?: number;
  stopPrice?: number;
  trailingPercent?: number;
  timeInForce?: "DAY" | "GTC" | "IOC" | "FOK";
  isFractional?: boolean;
  ocoLinkId?: string;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  executedPrice?: number;
  executedShares?: number;
  error?: string;
  warnings?: string[];
}

export interface RiskLimits {
  maxOrderValue: number;
  maxDailyTradingVolume: number;
  maxPositionSize: number;
  allowedOrderTypes: string[];
  marginRequirement: number;
}

export class OrderExecutionEngine {
  private static readonly DEFAULT_RISK_LIMITS: RiskLimits = {
    maxOrderValue: 50000,
    maxDailyTradingVolume: 100000,
    maxPositionSize: 25000,
    allowedOrderTypes: ["market", "limit", "stop", "stop_limit"],
    marginRequirement: 0.5
  };

  static async executeOrder(order: OrderRequest): Promise<OrderResult> {
    console.log('Executing order:', order);
    
    try {
      // Step 1: Validate order
      const validation = await this.validateOrder(order);
      if (!validation.valid) {
        return { success: false, error: validation.error, warnings: validation.warnings };
      }

      // Step 2: Check risk limits
      const riskCheck = await this.checkRiskLimits(order);
      if (!riskCheck.passed) {
        return { success: false, error: riskCheck.error };
      }

      // Step 3: Execute based on order type
      switch (order.orderType) {
        case "market":
          return await this.executeMarketOrder(order);
        case "limit":
          return await this.createLimitOrder(order);
        case "stop":
          return await this.createStopOrder(order);
        case "stop_limit":
          return await this.createStopLimitOrder(order);
        case "trailing_stop":
          return await this.createTrailingStopOrder(order);
        default:
          return { success: false, error: "Unsupported order type" };
      }
    } catch (error) {
      console.error("Order execution error:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown execution error"
      };
    }
  }

  private static async validateOrder(order: OrderRequest): Promise<{ 
    valid: boolean; 
    error?: string; 
    warnings?: string[] 
  }> {
    const warnings: string[] = [];

    // Basic validation
    if (order.shares <= 0) {
      return { valid: false, error: "Share quantity must be positive" };
    }

    if (order.price <= 0) {
      return { valid: false, error: "Price must be positive" };
    }

    // Fractional shares validation
    if (order.isFractional && order.shares < 0.001) {
      return { valid: false, error: "Minimum fractional share quantity is 0.001" };
    }

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

    // Market hours validation
    if (!this.isMarketOpen() && order.orderType === "market") {
      warnings.push("Market is closed. Order will be queued for next market open.");
    }

    // Price validation for limit orders
    if (order.orderType === "limit" && order.limitPrice) {
      const currentPrice = await this.getCurrentMarketPrice(order.symbol);
      const priceDeviation = Math.abs(order.limitPrice - currentPrice) / currentPrice;
      
      if (priceDeviation > 0.1) { // 10% deviation warning
        warnings.push(`Limit price deviates significantly from current market price (${priceDeviation.toFixed(2)}%)`);
      }
    }

    return { valid: true, warnings };
  }

  private static async checkRiskLimits(order: OrderRequest): Promise<{ 
    passed: boolean; 
    error?: string 
  }> {
    const limits = this.DEFAULT_RISK_LIMITS; // In production, get user-specific limits
    
    const orderValue = order.shares * order.price;
    
    // Check max order value
    if (orderValue > limits.maxOrderValue) {
      return { 
        passed: false, 
        error: `Order value ($${orderValue.toFixed(2)}) exceeds maximum allowed ($${limits.maxOrderValue})` 
      };
    }

    // Check daily trading volume
    const dailyVolume = await this.getDailyTradingVolume(order.userId);
    if (dailyVolume + orderValue > limits.maxDailyTradingVolume) {
      return { 
        passed: false, 
        error: "Daily trading volume limit exceeded" 
      };
    }

    // Check position size limits
    if (order.type === "buy") {
      const currentPosition = await PortfolioService.getPosition(order.userId, order.symbol);
      const newPositionValue = (currentPosition?.currentValue || 0) + orderValue;
      
      if (newPositionValue > limits.maxPositionSize) {
        return { 
          passed: false, 
          error: "Position size limit exceeded" 
        };
      }
    }

    return { passed: true };
  }

  private static async executeMarketOrder(order: OrderRequest): Promise<OrderResult> {
    const currentPrice = await this.getCurrentMarketPrice(order.symbol);
    const slippage = this.calculateSlippage(order.shares, order.symbol);
    const executedPrice = order.type === "buy" ? 
      currentPrice * (1 + slippage) : 
      currentPrice * (1 - slippage);

    // Create the trade record
    const { data, error } = await supabase.from("trades").insert({
      user_id: order.userId,
      symbol: order.symbol,
      type: order.type,
      shares: order.shares,
      price: executedPrice,
      total_amount: order.shares * executedPrice,
      status: "completed",
      order_type: order.orderType,
      is_fractional: order.isFractional || false,
    }).select("id").single();

    if (error) throw error;

    // Update portfolio
    await this.updatePortfolio(order.userId, order.symbol, order.type, order.shares, executedPrice);

    return {
      success: true,
      orderId: data.id,
      executedPrice: executedPrice,
      executedShares: order.shares
    };
  }

  private static async createLimitOrder(order: OrderRequest): Promise<OrderResult> {
    const { data, error } = await supabase.from("trades").insert({
      user_id: order.userId,
      symbol: order.symbol,
      type: order.type,
      shares: order.shares,
      price: order.price,
      limit_price: order.limitPrice,
      total_amount: order.shares * (order.limitPrice || order.price),
      status: "pending",
      order_type: order.orderType,
      is_fractional: order.isFractional || false,
    }).select("id").single();

    if (error) throw error;

    // Schedule order monitoring
    this.scheduleOrderMonitoring(data.id);

    return {
      success: true,
      orderId: data.id
    };
  }

  private static async createStopOrder(order: OrderRequest): Promise<OrderResult> {
    const { data, error } = await supabase.from("trades").insert({
      user_id: order.userId,
      symbol: order.symbol,
      type: order.type,
      shares: order.shares,
      price: order.price,
      stop_price: order.stopPrice,
      total_amount: order.shares * order.price,
      status: "pending",
      order_type: order.orderType,
      is_fractional: order.isFractional || false,
    }).select("id").single();

    if (error) throw error;

    this.scheduleOrderMonitoring(data.id);

    return {
      success: true,
      orderId: data.id
    };
  }

  private static async createStopLimitOrder(order: OrderRequest): Promise<OrderResult> {
    const { data, error } = await supabase.from("trades").insert({
      user_id: order.userId,
      symbol: order.symbol,
      type: order.type,
      shares: order.shares,
      price: order.price,
      limit_price: order.limitPrice,
      stop_price: order.stopPrice,
      total_amount: order.shares * (order.limitPrice || order.price),
      status: "pending",
      order_type: order.orderType,
      is_fractional: order.isFractional || false,
    }).select("id").single();

    if (error) throw error;

    this.scheduleOrderMonitoring(data.id);

    return {
      success: true,
      orderId: data.id
    };
  }

  private static async createTrailingStopOrder(order: OrderRequest): Promise<OrderResult> {
    const { data, error } = await supabase.from("trades").insert({
      user_id: order.userId,
      symbol: order.symbol,
      type: order.type,
      shares: order.shares,
      price: order.price,
      trailing_percent: order.trailingPercent,
      total_amount: order.shares * order.price,
      status: "pending",
      order_type: order.orderType,
      is_fractional: order.isFractional || false,
    }).select("id").single();

    if (error) throw error;

    this.scheduleOrderMonitoring(data.id);

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
      const { data: existing } = await supabase
        .from("portfolio")
        .select("*")
        .eq("user_id", userId)
        .eq("symbol", symbol)
        .single();

      if (existing) {
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
        await supabase.from("portfolio").insert({
          user_id: userId,
          symbol: symbol,
          shares: shares,
          average_price: price
        });
      }
    } else {
      const { data: position } = await supabase
        .from("portfolio")
        .select("*")
        .eq("user_id", userId)
        .eq("symbol", symbol)
        .single();

      if (position) {
        const newShares = position.shares - shares;
        if (newShares <= 0) {
          await supabase
            .from("portfolio")
            .delete()
            .eq("id", position.id);
        } else {
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
    try {
      const priceData = await RealMarketDataService.fetchRealTimePrice(symbol);
      if (priceData) {
        return priceData.price;
      }
    } catch (error) {
      console.error('Error fetching real-time price:', error);
    }

    // Fallback to mock data
    const basePrices: Record<string, number> = {
      "AAPL": 180,
      "MSFT": 350,
      "GOOGL": 140,
      "AMZN": 145,
      "NVDA": 450,
      "META": 330
    };
    
    const basePrice = basePrices[symbol] || 100;
    const variation = (Math.random() - 0.5) * 0.04;
    return parseFloat((basePrice * (1 + variation)).toFixed(2));
  }

  private static calculateSlippage(shares: number, symbol: string): number {
    // Simple slippage model - in production, use order book data
    const baseSlippage = 0.001; // 0.1%
    const volumeImpact = Math.min(shares / 10000, 0.01); // Max 1% for volume impact
    return baseSlippage + volumeImpact;
  }

  private static async checkUserBalance(userId: string, requiredAmount: number): Promise<boolean> {
    // In production, check actual account balance
    // For now, assume users have sufficient balance for demo purposes
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

  private static async getDailyTradingVolume(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from("trades")
      .select("total_amount")
      .eq("user_id", userId)
      .gte("created_at", today.toISOString());

    return data?.reduce((sum, trade) => sum + trade.total_amount, 0) || 0;
  }

  private static isMarketOpen(): boolean {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const timeInMinutes = hour * 60 + minute;

    // Market closed on weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;

    // Market hours: 9:30 AM - 4:00 PM EST (convert to user's timezone)
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 16 * 60; // 4:00 PM

    return timeInMinutes >= marketOpen && timeInMinutes < marketClose;
  }

  private static scheduleOrderMonitoring(orderId: string): void {
    // In production, this would integrate with a job queue or scheduler
    console.log(`Scheduled monitoring for order ${orderId}`);
  }

  // Order monitoring and execution methods
  static async processPendingOrders(): Promise<void> {
    const { data: pendingOrders } = await supabase
      .from("trades")
      .select("*")
      .eq("status", "pending");

    if (!pendingOrders) return;

    for (const order of pendingOrders) {
      try {
        await this.checkAndExecutePendingOrder(order);
      } catch (error) {
        console.error(`Error processing order ${order.id}:`, error);
      }
    }
  }

  private static async checkAndExecutePendingOrder(order: any): Promise<void> {
    const currentPrice = await this.getCurrentMarketPrice(order.symbol);

    let shouldExecute = false;

    switch (order.order_type) {
      case "limit":
        shouldExecute = (order.type === "buy" && currentPrice <= order.limit_price) ||
                       (order.type === "sell" && currentPrice >= order.limit_price);
        break;
      
      case "stop":
        shouldExecute = (order.type === "buy" && currentPrice >= order.stop_price) ||
                       (order.type === "sell" && currentPrice <= order.stop_price);
        break;
      
      case "stop_limit":
        if ((order.type === "buy" && currentPrice >= order.stop_price) ||
            (order.type === "sell" && currentPrice <= order.stop_price)) {
          // Convert to limit order
          await supabase
            .from("trades")
            .update({ order_type: "limit" })
            .eq("id", order.id);
        }
        break;
    }

    if (shouldExecute) {
      await supabase
        .from("trades")
        .update({ 
          status: "completed",
          price: currentPrice,
          total_amount: order.shares * currentPrice
        })
        .eq("id", order.id);

      await this.updatePortfolio(order.user_id, order.symbol, order.type, order.shares, currentPrice);
    }
  }

  static async cancelOrder(orderId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("trades")
        .update({ status: "cancelled" })
        .eq("id", orderId)
        .eq("user_id", userId)
        .eq("status", "pending");

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to cancel order"
      };
    }
  }
}
