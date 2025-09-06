import { supabase } from "@/integrations/supabase/client";
import { devConsole } from "@/utils/consoleCleanup";

export interface WalletBalance {
  currency: string;
  available: number;
  reserved: number;
  total: number;
}

export interface WalletTransaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'trade' | 'fee';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  createdAt: string;
}

export class WalletService {
  static async getWalletBalances(userId: string): Promise<WalletBalance[]> {
    try {
      // Get portfolio positions for crypto balances
      const { data: positions } = await supabase
        .from("portfolio")
        .select("symbol, shares")
        .eq("user_id", userId);

      // Get pending orders to calculate reserved amounts
      const { data: pendingOrders } = await supabase
        .from("orders")
        .select("symbol, quantity, price, side")
        .eq("user_id", userId)
        .eq("status", "pending");

      const balances: WalletBalance[] = [];

      // Add USD balance (simulated for now)
      balances.push({
        currency: 'USD',
        available: 10000, // TODO: Get from actual wallet table
        reserved: 0,
        total: 10000
      });

      // Add crypto balances
      if (positions) {
        for (const position of positions) {
          const reserved = pendingOrders
            ?.filter(order => order.symbol === position.symbol && order.side === 'sell')
            .reduce((sum, order) => sum + order.quantity, 0) || 0;

          balances.push({
            currency: position.symbol,
            available: Math.max(0, position.shares - reserved),
            reserved,
            total: position.shares
          });
        }
      }

      return balances;
    } catch (error) {
      devConsole.error("Error fetching wallet balances:", error);
      return [];
    }
  }

  static async getTransactionHistory(
    userId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<WalletTransaction[]> {
    try {
      const { data: trades } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (!trades) return [];

      return trades.map(trade => ({
        id: trade.id,
        type: 'trade' as const,
        amount: trade.type === 'buy' ? -trade.total_amount : trade.total_amount,
        currency: trade.symbol.includes('USD') ? 'USD' : trade.symbol,
        status: trade.status === 'completed' ? 'completed' : 'pending',
        description: `${trade.type.toUpperCase()} ${trade.shares} ${trade.symbol} @ $${trade.price}`,
        createdAt: trade.created_at
      }));
    } catch (error) {
      devConsole.error("Error fetching transaction history:", error);
      return [];
    }
  }

  static async depositFunds(
    userId: string, 
    amount: number, 
    currency: string = 'USD'
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      // In production, integrate with payment processor
      const { data, error } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          transaction_type: 'deposit',
          amount,
          currency,
          status: 'completed',
          description: `Deposit ${amount} ${currency}`
        })
        .select("id")
        .single();

      if (error) throw error;

      return { success: true, transactionId: data.id };
    } catch (error) {
      devConsole.error("Error processing deposit:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Deposit failed' 
      };
    }
  }

  static async withdrawFunds(
    userId: string, 
    amount: number, 
    currency: string = 'USD'
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      // Check available balance first
      const balances = await this.getWalletBalances(userId);
      const balance = balances.find(b => b.currency === currency);
      
      if (!balance || balance.available < amount) {
        return { success: false, error: 'Insufficient funds' };
      }

      const { data, error } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          transaction_type: 'withdrawal',
          amount: -amount,
          currency,
          status: 'pending',
          description: `Withdraw ${amount} ${currency}`
        })
        .select("id")
        .single();

      if (error) throw error;

      return { success: true, transactionId: data.id };
    } catch (error) {
      devConsole.error("Error processing withdrawal:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Withdrawal failed' 
      };
    }
  }
}