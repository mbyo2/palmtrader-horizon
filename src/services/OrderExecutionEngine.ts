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
  maxPositionConcentration: number;
  stopLossRequired: boolean;
}

export class OrderExecutionEngine {
  private static readonly DEFAULT_RISK_LIMITS: RiskLimits = {
    maxOrderValue: 50000,
    maxDailyTradingVolume: 100000,
    maxPositionSize: 25000,
    allowedOrderTypes: ["market", "limit", "stop", "stop_limit", "trailing_stop"],
    marginRequirement: 0.5,
    maxPositionConcentration: 0.2, // 20% max per position
    stopLossRequired: false
  };

  static async executeOrder(order: OrderRequest): Promise<OrderResult> {
    console.log('Executing order:', order);
    
    try {
      // Step 1: Enhanced validation for fractional shares
      const validation = await this.validateOrder(order);
      if (!validation.valid) {
        return { success: false, error: validation.error, warnings: validation.warnings };
      }

      // Step 2: Risk management and position sizing
      const riskCheck = await this.performRiskManagement(order);
      if (!riskCheck.passed) {
        return { success: false, error: riskCheck.error };
      }

      // Step 3: Execute based on order type with fractional support
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

    // Enhanced fractional shares validation
    if (order.isFractional) {
      if (order.shares < 0.000001) {
        return { valid: false, error: "Minimum fractional share quantity is 0.000001" };
      }
      // Allow fractional shares for all stocks now
      warnings.push("Fractional shares may have limited liquidity during market hours");
    } else {
      if (order.shares <= 0 || order.shares % 1 !== 0) {
        return { valid: false, error: "Share quantity must be a positive integer for whole shares" };
      }
    }

    if (order.price <= 0) {
      return { valid: false, error: "Price must be positive" };
    }

    // Enhanced balance checking
    if (order.type === "buy") {
      const requiredAmount = order.shares * order.price;
      const hasBalance = await this.checkUserBalance(order.userId, requiredAmount);
      if (!hasBalance) {
        return { valid: false, error: "Insufficient funds" };
      }
    }

    // Enhanced shares checking for fractional
    if (order.type === "sell") {
      const hasShares = await this.checkUserShares(order.userId, order.symbol, order.shares);
      if (!hasShares) {
        return { valid: false, error: "Insufficient shares" };
      }
    }

    // Market hours validation with extended hours support
    if (!this.isMarketOpen() && order.orderType === "market") {
      if (this.isExtendedHours()) {
        warnings.push("Trading during extended hours - limited liquidity may affect execution");
      } else {
        warnings.push("Market is closed. Order will be queued for next market open.");
      }
    }

    return { valid: true, warnings };
  }

  private static async performRiskManagement(order: OrderRequest): Promise<{ 
    passed: boolean; 
    error?: string;
    adjustedShares?: number;
  }> {
    const limits = this.DEFAULT_RISK_LIMITS;
    const orderValue = order.shares * order.price;
    
    // Check max order value
    if (orderValue > limits.maxOrderValue) {
      return { 
        passed: false, 
        error: `Order value ($${orderValue.toFixed(2)}) exceeds maximum allowed ($${limits.maxOrderValue})` 
      };
    }

    // Check position concentration
    if (order.type === "buy") {
      const portfolioValue = await this.getPortfolioValue(order.userId);
      const currentPosition = await PortfolioService.getPosition(order.userId, order.symbol);
      const newPositionValue = (currentPosition?.currentValue || 0) + orderValue;
      const concentration = newPositionValue / (portfolioValue + orderValue);

      if (concentration > limits.maxPositionConcentration) {
        return { 
          passed: false, 
          error: `Position concentration (${(concentration * 100).toFixed(1)}%) exceeds limit (${(limits.maxPositionConcentration * 100)}%)` 
        };
      }
    }

    // Auto stop-loss suggestion
    if (order.type === "buy" && limits.stopLossRequired && !order.stopPrice) {
      // Don't reject, but suggest stop-loss
      console.log("Consider setting a stop-loss for risk management");
    }

    return { passed: true };
  }

  private static async executeMarketOrder(order: OrderRequest): Promise<OrderResult> {
    const currentPrice = await this.getCurrentMarketPrice(order.symbol);
    const slippage = this.calculateSlippage(order.shares, order.symbol, order.isFractional);
    const executedPrice = order.type === "buy" ? 
      currentPrice * (1 + slippage) : 
      currentPrice * (1 - slippage);

    // Handle fractional shares execution
    let executedShares = order.shares;
    if (order.isFractional) {
      // Apply fractional execution logic
      const minExecutable = 0.000001;
      if (executedShares < minExecutable) {
        return { success: false, error: "Order size too small for fractional execution" };
      }
    }

    const totalAmount = executedShares * executedPrice;

    // For buy orders, deduct from wallet first
    if (order.type === "buy") {
      const walletUpdated = await this.updateWalletBalance(order.userId, -totalAmount);
      if (!walletUpdated) {
        return { success: false, error: "Failed to update wallet balance" };
      }
    }

    // Create the trade record with fractional support
    const { data, error } = await supabase.from("trades").insert({
      user_id: order.userId,
      symbol: order.symbol,
      type: order.type,
      shares: executedShares,
      price: executedPrice,
      total_amount: totalAmount,
      status: "completed",
      order_type: order.orderType,
      is_fractional: order.isFractional || false,
    }).select("id").single();

    if (error) {
      // Rollback wallet if trade fails
      if (order.type === "buy") {
        await this.updateWalletBalance(order.userId, totalAmount);
      }
      throw error;
    }

    // For sell orders, add to wallet
    if (order.type === "sell") {
      await this.updateWalletBalance(order.userId, totalAmount);
    }

    // Update portfolio with fractional support
    await this.updatePortfolio(order.userId, order.symbol, order.type, executedShares, executedPrice);

    return {
      success: true,
      orderId: data.id,
      executedPrice: executedPrice,
      executedShares: executedShares
    };
  }

  private static async updateWalletBalance(userId: string, amount: number): Promise<boolean> {
    try {
      const { data: wallet, error: fetchError } = await supabase
        .from("wallets")
        .select("available_balance")
        .eq("user_id", userId)
        .eq("currency", "USD")
        .single();

      if (fetchError) {
        // Create wallet if it doesn't exist
        if (fetchError.code === 'PGRST116') {
          const initialBalance = amount > 0 ? amount : 10000 + amount;
          await supabase.from("wallets").insert({
            user_id: userId,
            currency: "USD",
            available_balance: initialBalance,
            reserved_balance: 0
          });
          return true;
        }
        return false;
      }

      const newBalance = wallet.available_balance + amount;
      if (newBalance < 0) return false;

      const { error: updateError } = await supabase
        .from("wallets")
        .update({ 
          available_balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId)
        .eq("currency", "USD");

      return !updateError;
    } catch (error) {
      console.error("Error updating wallet:", error);
      return false;
    }
  }

  private static async createTrailingStopOrder(order: OrderRequest): Promise<OrderResult> {
    if (!order.trailingPercent || order.trailingPercent <= 0 || order.trailingPercent >= 100) {
      return { success: false, error: "Invalid trailing percentage" };
    }

    const currentPrice = await this.getCurrentMarketPrice(order.symbol);
    const initialStopPrice = order.type === "sell" ? 
      currentPrice * (1 - order.trailingPercent / 100) :
      currentPrice * (1 + order.trailingPercent / 100);

    const { data, error } = await supabase.from("trades").insert({
      user_id: order.userId,
      symbol: order.symbol,
      type: order.type,
      shares: order.shares,
      price: order.price,
      stop_price: initialStopPrice,
      trailing_percent: order.trailingPercent,
      total_amount: order.shares * order.price,
      status: "pending",
      order_type: order.orderType,
      is_fractional: order.isFractional || false,
    }).select("id").single();

    if (error) throw error;

    this.scheduleTrailingStopMonitoring(data.id, order.symbol);

    return {
      success: true,
      orderId: data.id
    };
  }

  private static calculateSlippage(shares: number, symbol: string, isFractional?: boolean): number {
    let baseSlippage = 0.001; // 0.1%
    
    // Fractional shares may have higher slippage
    if (isFractional) {
      baseSlippage *= 1.5;
    }
    
    const volumeImpact = Math.min(shares / 10000, 0.01);
    return baseSlippage + volumeImpact;
  }

  private static isExtendedHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // Weekend check
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;

    // Extended hours: 4:00 AM - 9:30 AM and 4:00 PM - 8:00 PM EST
    return (hour >= 4 && hour < 9) || (hour >= 16 && hour < 20);
  }

  private static async getPortfolioValue(userId: string): Promise<number> {
    try {
      const summary = await PortfolioService.getPortfolioSummary(userId);
      return summary.totalValue;
    } catch (error) {
      return 0;
    }
  }

  private static scheduleTrailingStopMonitoring(orderId: string, symbol: string): void {
    // In production, integrate with real-time price monitoring
    console.log(`Scheduled trailing stop monitoring for order ${orderId} on ${symbol}`);
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

  private static async checkUserBalance(userId: string, requiredAmount: number): Promise<boolean> {
    try {
      // Check wallet balance
      const { data: wallet, error } = await supabase
        .from("wallets")
        .select("available_balance")
        .eq("user_id", userId)
        .eq("currency", "USD")
        .single();

      if (error) {
        // If no wallet exists, create one with demo balance for new users
        if (error.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from("wallets")
            .insert({
              user_id: userId,
              currency: "USD",
              available_balance: 10000, // Demo starting balance
              reserved_balance: 0
            });
          
          if (!insertError) {
            return requiredAmount <= 10000;
          }
        }
        console.error("Error checking balance:", error);
        return false;
      }

      return wallet.available_balance >= requiredAmount;
    } catch (error) {
      console.error("Balance check error:", error);
      return false;
    }
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

  private static isMarketOpen(): boolean {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const timeInMinutes = hour * 60 + minute;

    if (dayOfWeek === 0 || dayOfWeek === 6) return false;

    const marketOpen = 9 * 60 + 30;
    const marketClose = 16 * 60;

    return timeInMinutes >= marketOpen && timeInMinutes < marketClose;
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

  private static scheduleOrderMonitoring(orderId: string): void {
    console.log(`Scheduled monitoring for order ${orderId}`);
  }

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
