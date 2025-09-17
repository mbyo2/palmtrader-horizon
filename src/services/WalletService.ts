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
      // Get real wallet balances
      const { data: wallets, error: walletsError } = await supabase
        .from("wallets")
        .select("currency, available_balance, reserved_balance, total_balance")
        .eq("user_id", userId);

      if (walletsError) throw walletsError;

      // Get portfolio positions for additional crypto balances
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

      // Add real wallet balances
      if (wallets) {
        for (const wallet of wallets) {
          balances.push({
            currency: wallet.currency,
            available: wallet.available_balance,
            reserved: wallet.reserved_balance,
            total: wallet.total_balance
          });
        }
      }

      // Add crypto balances from portfolio
      if (positions) {
        for (const position of positions) {
          // Skip if we already have this currency in wallets
          if (balances.find(b => b.currency === position.symbol)) continue;

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
      // Update wallet balance
      const { error: walletError } = await supabase
        .rpc('update_wallet_balance', {
          p_user_id: userId,
          p_currency: currency,
          p_amount: amount,
          p_operation: 'deposit'
        });

      if (walletError) throw walletError;

      // Record transaction
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

      // Update wallet balance (reduce available funds)
      const { error: walletError } = await supabase
        .rpc('update_wallet_balance', {
          p_user_id: userId,
          p_currency: currency,
          p_amount: -amount,
          p_operation: 'withdrawal'
        });

      if (walletError) throw walletError;

      // Record transaction
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