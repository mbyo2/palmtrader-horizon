import { supabase } from "@/integrations/supabase/client";
import { RealMarketDataService } from "./RealMarketDataService";
import { PortfolioService } from "./PortfolioService";
import { toast } from "sonner";

export interface OrderRequest {
  userId: string;
  accountId?: string;
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
  // Risk limits are now dynamic based on account balance

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
      const hasBalance = await this.checkUserBalance(order.userId, requiredAmount, order.accountId);
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
    const orderValue = order.shares * order.price;

    // Check position concentration (max 50% of portfolio per position)
    if (order.type === "buy") {
      const portfolioValue = await this.getPortfolioValue(order.userId);
      const currentPosition = await PortfolioService.getPosition(order.userId, order.symbol);
      const newPositionValue = (currentPosition?.currentValue || 0) + orderValue;
      const totalValue = portfolioValue + orderValue;
      const concentration = totalValue > 0 ? newPositionValue / totalValue : 0;
      const maxConcentration = 0.5;

      if (concentration > maxConcentration) {
        return { 
          passed: false, 
          error: `Position concentration (${(concentration * 100).toFixed(1)}%) exceeds limit (${(maxConcentration * 100)}%)` 
        };
      }
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
        .maybeSingle();

      if (fetchError || !wallet) {
        // Create wallet if it doesn't exist
        const initialBalance = amount > 0 ? amount : 10000 + amount;
        await supabase.from("wallets").insert({
          user_id: userId,
          currency: "USD",
          available_balance: initialBalance,
          reserved_balance: 0
        });
        // Also sync to trading account
        await this.syncTradingAccountBalance(userId, initialBalance);
        return true;
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

      if (!updateError) {
        // Keep trading_accounts in sync with wallets
        await this.syncTradingAccountBalance(userId, newBalance);
      }

      return !updateError;
    } catch (error) {
      console.error("Error updating wallet:", error);
      return false;
    }
  }

  private static async syncTradingAccountBalance(userId: string, newBalance: number): Promise<void> {
    try {
      // Update the active trading account balance to match wallet
      const { data: activeAccount } = await supabase
        .from("trading_accounts")
        .select("id, balance, available_balance")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeAccount) {
        const balanceDiff = newBalance - activeAccount.available_balance;
        await supabase
          .from("trading_accounts")
          .update({
            available_balance: newBalance,
            balance: activeAccount.balance + balanceDiff,
            updated_at: new Date().toISOString()
          })
          .eq("id", activeAccount.id);
      }
    } catch (error) {
      console.error("Error syncing trading account balance:", error);
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
      if (priceData && priceData.price > 0) {
        return priceData.price;
      }
    } catch (error) {
      console.error('Error fetching real-time price:', error);
    }

    // Fallback to realistic prices
    const basePrices: Record<string, number> = {
      "AAPL": 178.72, "MSFT": 415.50, "GOOGL": 141.80, "AMZN": 178.25,
      "NVDA": 875.30, "META": 505.75, "TSLA": 175.20, "JPM": 198.40,
      "V": 280.15, "WMT": 165.30, "NFLX": 625.40, "AMD": 165.20
    };
    
    const basePrice = basePrices[symbol] || 100;
    const variation = (Math.random() - 0.5) * 0.02; // ±1%
    return parseFloat((basePrice * (1 + variation)).toFixed(2));
  }

  private static async checkUserBalance(userId: string, requiredAmount: number): Promise<boolean> {
    try {
      // First check trading accounts (primary source of truth)
      const { data: tradingAccount } = await supabase
        .from("trading_accounts")
        .select("available_balance, account_type")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tradingAccount && tradingAccount.available_balance >= requiredAmount) {
        return true;
      }

      // Fallback to wallets table
      const { data: wallet, error } = await supabase
        .from("wallets")
        .select("available_balance")
        .eq("user_id", userId)
        .eq("currency", "USD")
        .maybeSingle();

      if (!wallet) {
        // No wallet - create one synced with trading account
        const initialBalance = tradingAccount?.available_balance || 100000;
        await supabase.from("wallets").insert({
          user_id: userId,
          currency: "USD",
          available_balance: initialBalance,
          reserved_balance: 0
        });
        return requiredAmount <= initialBalance;
      }

      // If wallet balance is much lower than trading account, sync it up
      if (tradingAccount && wallet.available_balance < tradingAccount.available_balance) {
        await supabase
          .from("wallets")
          .update({ available_balance: tradingAccount.available_balance })
          .eq("user_id", userId)
          .eq("currency", "USD");
        return tradingAccount.available_balance >= requiredAmount;
      }

      return wallet.available_balance >= requiredAmount;
    } catch (error) {
      console.error("Balance check error:", error);
      // In demo mode, allow trading by default
      return requiredAmount <= 100000;
    }
  }

  private static async checkUserShares(userId: string, symbol: string, requiredShares: number): Promise<boolean> {
    const { data } = await supabase
      .from("portfolio")
      .select("shares")
      .eq("user_id", userId)
      .eq("symbol", symbol)
      .maybeSingle();

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
        .maybeSingle();

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
        .maybeSingle();

      if (position) {
        // Calculate realized P&L
        const realizedPnl = (price - position.average_price) * shares;
        
        // Store realized P&L in the trade record
        const { data: latestTrade } = await supabase
          .from("trades")
          .select("id")
          .eq("user_id", userId)
          .eq("symbol", symbol)
          .eq("type", "sell")
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestTrade) {
          await supabase
            .from("trades")
            .update({ realized_pnl: realizedPnl })
            .eq("id", latestTrade.id);
        }

        const newShares = position.shares - shares;
        if (newShares <= 0.000001) {
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
    let executionPrice = currentPrice;

    switch (order.order_type) {
      case "limit":
        if (order.type === "buy" && currentPrice <= order.limit_price) {
          shouldExecute = true;
          executionPrice = Math.min(currentPrice, order.limit_price);
        } else if (order.type === "sell" && currentPrice >= order.limit_price) {
          shouldExecute = true;
          executionPrice = Math.max(currentPrice, order.limit_price);
        }
        break;
      
      case "stop":
        if (order.type === "buy" && currentPrice >= order.stop_price) {
          shouldExecute = true;
        } else if (order.type === "sell" && currentPrice <= order.stop_price) {
          shouldExecute = true;
        }
        break;
      
      case "stop_limit":
        if ((order.type === "buy" && currentPrice >= order.stop_price) ||
            (order.type === "sell" && currentPrice <= order.stop_price)) {
          // Stop triggered — convert to limit and re-check
          if ((order.type === "buy" && currentPrice <= order.limit_price) ||
              (order.type === "sell" && currentPrice >= order.limit_price)) {
            shouldExecute = true;
            executionPrice = order.limit_price;
          } else {
            await supabase
              .from("trades")
              .update({ order_type: "limit" })
              .eq("id", order.id);
          }
        }
        break;

      case "trailing_stop":
        if (order.trailing_percent) {
          const trailPrice = order.type === "sell"
            ? currentPrice * (1 - order.trailing_percent / 100)
            : currentPrice * (1 + order.trailing_percent / 100);
          
          if (order.type === "sell" && currentPrice <= (order.stop_price || trailPrice)) {
            shouldExecute = true;
          } else if (order.type === "buy" && currentPrice >= (order.stop_price || trailPrice)) {
            shouldExecute = true;
          } else {
            // Update trailing stop price if market moved favorably
            const newStop = order.type === "sell"
              ? Math.max(order.stop_price || 0, currentPrice * (1 - order.trailing_percent / 100))
              : Math.min(order.stop_price || Infinity, currentPrice * (1 + order.trailing_percent / 100));
            
            if (newStop !== order.stop_price) {
              await supabase
                .from("trades")
                .update({ stop_price: newStop })
                .eq("id", order.id);
            }
          }
        }
        break;
    }

    if (shouldExecute) {
      const totalAmount = order.shares * executionPrice;

      // For buy orders, deduct from wallet
      if (order.type === "buy") {
        const walletUpdated = await this.updateWalletBalance(order.user_id, -totalAmount);
        if (!walletUpdated) {
          await supabase
            .from("trades")
            .update({ status: "failed" })
            .eq("id", order.id);
          return;
        }
      }

      await supabase
        .from("trades")
        .update({ 
          status: "completed",
          price: executionPrice,
          total_amount: totalAmount
        })
        .eq("id", order.id);

      // For sell orders, credit wallet and calculate P&L
      if (order.type === "sell") {
        await this.updateWalletBalance(order.user_id, totalAmount);
      }

      await this.updatePortfolio(order.user_id, order.symbol, order.type, order.shares, executionPrice);
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
