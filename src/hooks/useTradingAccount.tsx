import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { TradingAccountService, TradingAccount, TradingAccountType } from "@/services/TradingAccountService";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface TradingAccountContextType {
  accounts: TradingAccount[];
  activeAccount: TradingAccount | null;
  isLoading: boolean;
  isDemo: boolean;
  setActiveAccount: (account: TradingAccount) => void;
  switchToDemo: () => Promise<void>;
  switchToReal: () => Promise<void>;
  createAccount: (type: TradingAccountType, currency?: string, name?: string, deposit?: number) => Promise<TradingAccount | null>;
  refreshAccounts: () => Promise<void>;
  getAccountBalance: () => number;
  getAvailableBalance: () => number;
}

const TradingAccountContext = createContext<TradingAccountContextType | undefined>(undefined);

export const TradingAccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [activeAccount, setActiveAccountState] = useState<TradingAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAccounts = useCallback(async () => {
    if (!user) return;
    
    try {
      const data = await TradingAccountService.getUserAccounts();
      setAccounts(data);
      
      // If no active account, set the first one or create a demo account
      if (!activeAccount && data.length > 0) {
        // Prefer demo account for new users
        const demoAccount = data.find(a => a.account_type === 'demo');
        setActiveAccountState(demoAccount || data[0]);
      } else if (!activeAccount && data.length === 0) {
        // Auto-create demo account for new users
        const newDemo = await TradingAccountService.createAccount('demo', 'USD', 'Demo Account');
        if (newDemo) {
          setAccounts([newDemo]);
          setActiveAccountState(newDemo);
        }
      }
    } catch (error) {
      console.error("Error loading accounts:", error);
    }
  }, [user, activeAccount]);

  useEffect(() => {
    const initAccounts = async () => {
      setIsLoading(true);
      await refreshAccounts();
      setIsLoading(false);
    };
    
    if (user) {
      initAccounts();
    }
  }, [user, refreshAccounts]);

  const setActiveAccount = (account: TradingAccount) => {
    setActiveAccountState(account);
    toast.success(`Switched to ${account.account_name || account.account_type} account`);
  };

  const switchToDemo = async () => {
    const demoAccount = accounts.find(a => a.account_type === 'demo');
    if (demoAccount) {
      setActiveAccount(demoAccount);
    } else {
      // Create demo account if doesn't exist
      const newDemo = await TradingAccountService.createAccount('demo', 'USD', 'Demo Account');
      if (newDemo) {
        setAccounts(prev => [...prev, newDemo]);
        setActiveAccountState(newDemo);
        toast.success("Demo account created with $100,000 virtual funds");
      }
    }
  };

  const switchToReal = async () => {
    const realAccounts = accounts.filter(a => a.account_type !== 'demo');
    if (realAccounts.length > 0) {
      setActiveAccount(realAccounts[0]);
    } else {
      toast.info("No real trading account found. Please open a live account first.");
    }
  };

  const createAccount = async (
    type: TradingAccountType,
    currency = 'USD',
    name?: string,
    deposit = 0
  ): Promise<TradingAccount | null> => {
    try {
      const account = await TradingAccountService.createAccount(type, currency, name, deposit);
      if (account) {
        setAccounts(prev => [...prev, account]);
        toast.success(`${account.account_name} created successfully`);
        return account;
      }
      return null;
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
      return null;
    }
  };

  const getAccountBalance = () => activeAccount?.balance || 0;
  const getAvailableBalance = () => activeAccount?.available_balance || 0;
  const isDemo = activeAccount?.account_type === 'demo';

  return (
    <TradingAccountContext.Provider
      value={{
        accounts,
        activeAccount,
        isLoading,
        isDemo,
        setActiveAccount,
        switchToDemo,
        switchToReal,
        createAccount,
        refreshAccounts,
        getAccountBalance,
        getAvailableBalance,
      }}
    >
      {children}
    </TradingAccountContext.Provider>
  );
};

export const useTradingAccount = () => {
  const context = useContext(TradingAccountContext);
  if (!context) {
    throw new Error("useTradingAccount must be used within TradingAccountProvider");
  }
  return context;
};
