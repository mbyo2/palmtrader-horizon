import { supabase } from "@/integrations/supabase/client";
import { WalletService } from "./WalletService";
import { devConsole } from "@/utils/consoleCleanup";

export interface OrderValidationRequest {
  userId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  orderType: 'market' | 'limit' | 'stop';
}

export interface OrderValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  estimatedFees: number;
  requiredBalance: number;
  maxQuantity?: number;
}

export class EnhancedOrderValidationService {
  private static readonly MIN_ORDER_VALUE = 1; // $1 minimum
  private static readonly MAX_ORDER_VALUE = 1000000; // $1M maximum
  private static readonly TRADING_FEE_RATE = 0.001; // 0.1%

  static async validateOrder(request: OrderValidationRequest): Promise<OrderValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let estimatedFees = 0;
    let requiredBalance = 0;
    let maxQuantity: number | undefined;

    try {
      // Basic validation
      if (request.quantity <= 0) {
        errors.push("Quantity must be greater than zero");
      }

      if (request.price && request.price <= 0) {
        errors.push("Price must be greater than zero");
      }

      // Get current market price for validation
      const marketPrice = await this.getCurrentPrice(request.symbol);
      if (!marketPrice && request.orderType === 'market') {
        errors.push("Unable to fetch current market price");
        return {
          isValid: false,
          errors,
          warnings,
          estimatedFees: 0,
          requiredBalance: 0
        };
      }

      const executionPrice = request.orderType === 'market' ? marketPrice! : (request.price || marketPrice!);
      const orderValue = request.quantity * executionPrice;
      
      // Calculate fees
      estimatedFees = orderValue * this.TRADING_FEE_RATE;

      // Order value validation
      if (orderValue < this.MIN_ORDER_VALUE) {
        errors.push(`Order value must be at least $${this.MIN_ORDER_VALUE}`);
      }

      if (orderValue > this.MAX_ORDER_VALUE) {
        errors.push(`Order value cannot exceed $${this.MAX_ORDER_VALUE.toLocaleString()}`);
      }

      // Side-specific validation
      if (request.side === 'buy') {
        requiredBalance = orderValue + estimatedFees;
        const balanceCheck = await this.validateBuyingPower(request.userId, requiredBalance);
        
        if (!balanceCheck.sufficient) {
          errors.push("Insufficient buying power");
          maxQuantity = balanceCheck.maxAffordableQuantity;
        }

        // Warn about market volatility for large orders
        if (orderValue > 10000) {
          warnings.push("Large orders may experience slippage during execution");
        }
      } else {
        const positionCheck = await this.validateSellPosition(request.userId, request.symbol, request.quantity);
        
        if (!positionCheck.sufficient) {
          errors.push(`Insufficient ${request.symbol} position. Available: ${positionCheck.available}`);
          maxQuantity = positionCheck.available;
        }

        requiredBalance = 0; // No cash required for selling
      }

      // Market hours validation (simplified)
      const marketHours = this.validateMarketHours(request.symbol);
      if (!marketHours.isOpen) {
        warnings.push(marketHours.message);
      }

      // Price validation for limit orders
      if (request.orderType === 'limit' && request.price && marketPrice) {
        const priceDeviation = Math.abs(request.price - marketPrice) / marketPrice;
        if (priceDeviation > 0.1) {
          warnings.push("Limit price is more than 10% away from current market price");
        }
      }

      // Account status validation
      const accountCheck = await this.validateAccountStatus(request.userId);
      if (!accountCheck.canTrade) {
        errors.push(accountCheck.reason);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        estimatedFees,
        requiredBalance,
        maxQuantity
      };

    } catch (error) {
      devConsole.error("Order validation error:", error);
      return {
        isValid: false,
        errors: ["Validation service temporarily unavailable"],
        warnings: [],
        estimatedFees: 0,
        requiredBalance: 0
      };
    }
  }

  private static async validateBuyingPower(
    userId: string, 
    requiredAmount: number
  ): Promise<{ sufficient: boolean; maxAffordableQuantity?: number }> {
    const balances = await WalletService.getWalletBalances(userId);
    const usdBalance = balances.find(b => b.currency === 'USD');
    
    if (!usdBalance || usdBalance.available < requiredAmount) {
      const maxAffordable = usdBalance ? Math.floor(usdBalance.available * 0.95) : 0;
      return { 
        sufficient: false, 
        maxAffordableQuantity: maxAffordable 
      };
    }

    return { sufficient: true };
  }

  private static async validateSellPosition(
    userId: string, 
    symbol: string, 
    quantity: number
  ): Promise<{ sufficient: boolean; available: number }> {
    try {
      const { data: position } = await supabase
        .from("portfolio")
        .select("shares")
        .eq("user_id", userId)
        .eq("symbol", symbol)
        .single();

      const available = position?.shares || 0;
      
      return {
        sufficient: available >= quantity,
        available
      };
    } catch (error) {
      return { sufficient: false, available: 0 };
    }
  }

  private static async getCurrentPrice(symbol: string): Promise<number | null> {
    try {
      // Try to get from market data table first
      const { data } = await supabase
        .from("market_data")
        .select("price")
        .eq("symbol", symbol)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      return data?.price || null;
    } catch (error) {
      // Fallback to mock price
      return 100; // Mock price for testing
    }
  }

  private static validateMarketHours(symbol: string): { isOpen: boolean; message: string } {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();

    // Crypto markets are 24/7
    if (this.isCryptoSymbol(symbol)) {
      return { isOpen: true, message: "Crypto markets are open 24/7" };
    }

    // Stock markets: Monday-Friday, 9:30 AM - 4:00 PM EST
    if (day === 0 || day === 6) {
      return { isOpen: false, message: "Stock markets are closed on weekends" };
    }

    if (hour < 9 || hour >= 16) {
      return { isOpen: false, message: "Stock markets are closed. Trading hours: 9:30 AM - 4:00 PM EST" };
    }

    return { isOpen: true, message: "Markets are open" };
  }

  private static isCryptoSymbol(symbol: string): boolean {
    const cryptoSymbols = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOT'];
    return cryptoSymbols.includes(symbol);
  }

  private static async validateAccountStatus(userId: string): Promise<{ canTrade: boolean; reason: string }> {
    try {
      const { data: account } = await supabase
        .from("account_details")
        .select("account_status, kyc_status")
        .eq("id", userId)
        .single();

      if (!account) {
        return { canTrade: false, reason: "Account not found" };
      }

      if (account.account_status !== 'active') {
        return { canTrade: false, reason: "Account is not active" };
      }

      if (account.kyc_status !== 'approved') {
        return { canTrade: false, reason: "KYC verification required" };
      }

      return { canTrade: true, reason: "Account verified" };
    } catch (error) {
      return { canTrade: false, reason: "Unable to verify account status" };
    }
  }
}