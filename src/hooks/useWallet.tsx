import { useState, useEffect } from 'react';
import { WalletService, WalletBalance, WalletTransaction } from '@/services/WalletService';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const useWallet = () => {
  const { user } = useAuth();
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshBalances = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const walletBalances = await WalletService.getWalletBalances(user.id);
      setBalances(walletBalances);
    } catch (error) {
      toast.error('Failed to fetch wallet balances');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTransactions = async () => {
    if (!user) return;
    
    try {
      const txHistory = await WalletService.getTransactionHistory(user.id);
      setTransactions(txHistory);
    } catch (error) {
      toast.error('Failed to fetch transaction history');
    }
  };

  const deposit = async (amount: number, currency: string = 'USD') => {
    if (!user) {
      toast.error('Please sign in to deposit funds');
      return { success: false };
    }

    setIsLoading(true);
    try {
      const result = await WalletService.depositFunds(user.id, amount, currency);
      
      if (result.success) {
        toast.success(`Successfully deposited $${amount} ${currency}`);
        await refreshBalances();
        await refreshTransactions();
      } else {
        toast.error(result.error || 'Deposit failed');
      }
      
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const withdraw = async (amount: number, currency: string = 'USD') => {
    if (!user) {
      toast.error('Please sign in to withdraw funds');
      return { success: false };
    }

    setIsLoading(true);
    try {
      const result = await WalletService.withdrawFunds(user.id, amount, currency);
      
      if (result.success) {
        toast.success(`Withdrawal request submitted for $${amount} ${currency}`);
        await refreshBalances();
        await refreshTransactions();
      } else {
        toast.error(result.error || 'Withdrawal failed');
      }
      
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const getBalance = (currency: string): WalletBalance | undefined => {
    return balances.find(balance => balance.currency === currency);
  };

  useEffect(() => {
    if (user) {
      refreshBalances();
      refreshTransactions();
    }
  }, [user]);

  return {
    balances,
    transactions,
    isLoading,
    refreshBalances,
    refreshTransactions,
    deposit,
    withdraw,
    getBalance
  };
};