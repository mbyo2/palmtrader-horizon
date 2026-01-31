import { supabase } from "@/integrations/supabase/client";

export type WalletType = 'spot' | 'funding' | 'earn';

export interface CryptoWallet {
  id: string;
  user_id: string;
  currency: string;
  wallet_type: WalletType;
  available_balance: number;
  locked_balance: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransferRequest {
  fromWallet: WalletType;
  toWallet: WalletType;
  currency: string;
  amount: number;
}

export class CryptoWalletService {
  static async getWallets(userId: string): Promise<CryptoWallet[]> {
    const { data, error } = await supabase
      .from('crypto_wallets')
      .select('*')
      .eq('user_id', userId)
      .order('currency');

    if (error) throw error;
    return (data || []).map(w => ({
      ...w,
      available_balance: Number(w.available_balance),
      locked_balance: Number(w.locked_balance)
    }));
  }

  static async getWalletsByType(userId: string, walletType: WalletType): Promise<CryptoWallet[]> {
    const { data, error } = await supabase
      .from('crypto_wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('wallet_type', walletType);

    if (error) throw error;
    return (data || []).map(w => ({
      ...w,
      available_balance: Number(w.available_balance),
      locked_balance: Number(w.locked_balance)
    }));
  }

  static async getOrCreateWallet(userId: string, currency: string, walletType: WalletType): Promise<CryptoWallet> {
    // Try to get existing wallet
    const { data: existing } = await supabase
      .from('crypto_wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('currency', currency)
      .eq('wallet_type', walletType)
      .single();

    if (existing) {
      return {
        ...existing,
        available_balance: Number(existing.available_balance),
        locked_balance: Number(existing.locked_balance)
      };
    }

    // Create new wallet
    const { data, error } = await supabase
      .from('crypto_wallets')
      .insert({
        user_id: userId,
        currency,
        wallet_type: walletType,
        available_balance: 0,
        locked_balance: 0
      })
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      available_balance: Number(data.available_balance),
      locked_balance: Number(data.locked_balance)
    };
  }

  static async transferBetweenWallets(userId: string, request: WalletTransferRequest): Promise<{ success: boolean; error?: string }> {
    try {
      const { fromWallet, toWallet, currency, amount } = request;

      if (amount <= 0) {
        return { success: false, error: 'Amount must be positive' };
      }

      // Get source wallet
      const sourceWallet = await this.getOrCreateWallet(userId, currency, fromWallet);
      
      if (sourceWallet.available_balance < amount) {
        return { success: false, error: 'Insufficient balance' };
      }

      // Ensure destination wallet exists
      await this.getOrCreateWallet(userId, currency, toWallet);

      // Deduct from source
      const { error: deductError } = await supabase
        .from('crypto_wallets')
        .update({ 
          available_balance: sourceWallet.available_balance - amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('currency', currency)
        .eq('wallet_type', fromWallet);

      if (deductError) throw deductError;

      // Add to destination
      const destWallet = await this.getOrCreateWallet(userId, currency, toWallet);
      const { error: addError } = await supabase
        .from('crypto_wallets')
        .update({ 
          available_balance: destWallet.available_balance + amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('currency', currency)
        .eq('wallet_type', toWallet);

      if (addError) throw addError;

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Transfer failed' 
      };
    }
  }

  static async depositToWallet(userId: string, currency: string, walletType: WalletType, amount: number): Promise<{ success: boolean; error?: string }> {
    try {
      const wallet = await this.getOrCreateWallet(userId, currency, walletType);
      
      const { error } = await supabase
        .from('crypto_wallets')
        .update({ 
          available_balance: wallet.available_balance + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Deposit failed' 
      };
    }
  }

  static async getTotalBalance(userId: string, currency: string): Promise<number> {
    const wallets = await this.getWallets(userId);
    return wallets
      .filter(w => w.currency === currency)
      .reduce((sum, w) => sum + w.available_balance + w.locked_balance, 0);
  }

  static async getOverviewBalances(userId: string): Promise<Record<string, { spot: number; funding: number; earn: number; total: number }>> {
    const wallets = await this.getWallets(userId);
    const result: Record<string, { spot: number; funding: number; earn: number; total: number }> = {};

    wallets.forEach(wallet => {
      if (!result[wallet.currency]) {
        result[wallet.currency] = { spot: 0, funding: 0, earn: 0, total: 0 };
      }
      const balance = wallet.available_balance + wallet.locked_balance;
      result[wallet.currency][wallet.wallet_type] = balance;
      result[wallet.currency].total += balance;
    });

    return result;
  }
}
