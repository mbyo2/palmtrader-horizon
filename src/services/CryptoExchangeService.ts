
import { supabase } from "@/integrations/supabase/client";

export interface CryptoOrderRequest {
  userId: string;
  symbol: string;
  type: "buy" | "sell";
  amount: number;
  price?: number;
  orderType: "market" | "limit";
}

export interface CryptoOrderResult {
  success: boolean;
  orderId?: string;
  executedPrice?: number;
  executedAmount?: number;
  error?: string;
  fees?: number;
}

export class CryptoExchangeService {
  private static readonly TRADING_FEE_PERCENTAGE = 0.001; // 0.1% trading fee

  static async executeCryptoOrder(order: CryptoOrderRequest): Promise<CryptoOrderResult> {
    try {
      // Get current market price
      const marketPrice = await this.getCurrentCryptoPrice(order.symbol);
      if (!marketPrice) {
        return { success: false, error: "Unable to fetch current price" };
      }

      const executedPrice = order.orderType === "market" ? marketPrice : (order.price || marketPrice);
      const executedAmount = order.amount / executedPrice;
      const fees = order.amount * this.TRADING_FEE_PERCENTAGE;

      // Validate order
      const validation = await this.validateCryptoOrder(order, executedPrice, fees);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Execute through exchange simulation
      const exchangeResult = await this.executeOnExchange(order, executedPrice, executedAmount);
      if (!exchangeResult.success) {
        return { success: false, error: exchangeResult.error };
      }

      // Record trade in database
      const { data, error } = await supabase.from("trades").insert({
        user_id: order.userId,
        symbol: order.symbol,
        type: order.type,
        shares: executedAmount,
        price: executedPrice,
        total_amount: order.amount,
        status: "completed",
        order_type: order.orderType,
        is_fractional: true
      }).select("id").single();

      if (error) throw error;

      // Update crypto portfolio
      await this.updateCryptoPortfolio(order.userId, order.symbol, order.type, executedAmount, executedPrice);

      return {
        success: true,
        orderId: data.id,
        executedPrice,
        executedAmount,
        fees
      };
    } catch (error) {
      console.error("Crypto execution error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Crypto order failed"
      };
    }
  }

  private static async getCurrentCryptoPrice(symbol: string): Promise<number | null> {
    try {
      // Map ticker to CoinGecko ID
      const cryptoMap: Record<string, string> = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'SOL': 'solana',
        'XRP': 'ripple',
        'ADA': 'cardano',
        'DOT': 'polkadot'
      };

      const coinId = cryptoMap[symbol];
      if (!coinId) return null;

      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data[coinId]?.usd || null;
    } catch (error) {
      console.error("Error fetching crypto price:", error);
      return null;
    }
  }

  private static async validateCryptoOrder(
    order: CryptoOrderRequest, 
    executedPrice: number, 
    fees: number
  ): Promise<{ valid: boolean; error?: string }> {
    if (order.amount <= 0) {
      return { valid: false, error: "Order amount must be positive" };
    }

    if (order.type === "buy") {
      const requiredAmount = order.amount + fees;
      const hasBalance = await this.checkCryptoBalance(order.userId, requiredAmount);
      if (!hasBalance) {
        return { valid: false, error: "Insufficient USD balance" };
      }
    } else {
      const requiredCrypto = order.amount / executedPrice;
      const hasCrypto = await this.checkCryptoHoldings(order.userId, order.symbol, requiredCrypto);
      if (!hasCrypto) {
        return { valid: false, error: `Insufficient ${order.symbol} balance` };
      }
    }

    return { valid: true };
  }

  private static async executeOnExchange(
    order: CryptoOrderRequest, 
    price: number, 
    amount: number
  ): Promise<{ success: boolean; error?: string }> {
    // Simulate exchange execution with slippage
    const slippage = Math.random() * 0.002; // 0-0.2% slippage
    const actualPrice = order.type === "buy" ? price * (1 + slippage) : price * (1 - slippage);
    
    // Simulate potential execution failure (1% chance)
    if (Math.random() < 0.01) {
      return { success: false, error: "Exchange execution failed" };
    }

    return { success: true };
  }

  private static async checkCryptoBalance(userId: string, requiredAmount: number): Promise<boolean> {
    // In production, check actual USD balance
    return true;
  }

  private static async checkCryptoHoldings(userId: string, symbol: string, requiredAmount: number): Promise<boolean> {
    try {
      const { data } = await supabase
        .from("portfolio")
        .select("shares")
        .eq("user_id", userId)
        .eq("symbol", symbol)
        .single();

      return data ? data.shares >= requiredAmount : false;
    } catch (error) {
      return false;
    }
  }

  private static async updateCryptoPortfolio(
    userId: string, 
    symbol: string, 
    type: "buy" | "sell", 
    amount: number, 
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
        const newShares = existing.shares + amount;
        const newAveragePrice = (existing.shares * existing.average_price + amount * price) / newShares;

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
          shares: amount,
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
        const newShares = position.shares - amount;
        if (newShares <= 0) {
          await supabase.from("portfolio").delete().eq("id", position.id);
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
}
