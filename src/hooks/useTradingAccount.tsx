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
  const [initialized, setInitialized] = useState(false);

  const refreshAccounts = useCallback(async () => {
    if (!user) {
      setAccounts([]);
      setActiveAccountState(null);
      setIsLoading(false);
      return;
    }
    
    try {
      const data = await TradingAccountService.getUserAccounts();
      setAccounts(data);
      
      // If we have an active account, update it with fresh data
      if (activeAccount) {
        const updatedActiveAccount = data.find(a => a.id === activeAccount.id);
        if (updatedActiveAccount) {
          setActiveAccountState(updatedActiveAccount);
        }
      }
      
      // If no active account but we have accounts, set one
      if (!activeAccount && data.length > 0) {
        const demoAccount = data.find(a => a.account_type === 'demo');
        setActiveAccountState(demoAccount || data[0]);
      }
    } catch (error) {
      console.error("Error refreshing accounts:", error);
    }
  }, [user, activeAccount]);

  const initializeAccounts = useCallback(async () => {
    if (!user || initialized) return;
    
    setIsLoading(true);
    try {
      const data = await TradingAccountService.getUserAccounts();
      setAccounts(data);
      
      if (data.length > 0) {
        // Prefer demo account for initial selection
        const demoAccount = data.find(a => a.account_type === 'demo');
        setActiveAccountState(demoAccount || data[0]);
      } else {
        // Auto-create demo account for new users
        try {
          const newDemo = await TradingAccountService.createAccount('demo', 'USD', 'Demo Account');
          if (newDemo) {
            setAccounts([newDemo]);
            setActiveAccountState(newDemo);
          }
        } catch (createError) {
          console.warn("Could not auto-create demo account:", createError);
        }
      }
      setInitialized(true);
    } catch (error) {
      console.error("Error initializing accounts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, initialized]);

  useEffect(() => {
    if (user) {
      initializeAccounts();
    } else {
      setAccounts([]);
      setActiveAccountState(null);
      setInitialized(false);
      setIsLoading(false);
    }
  }, [user, initializeAccounts]);

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
      try {
        const newDemo = await TradingAccountService.createAccount('demo', 'USD', 'Demo Account');
        if (newDemo) {
          setAccounts(prev => [...prev, newDemo]);
          setActiveAccountState(newDemo);
          toast.success("Demo account created with $100,000 virtual funds");
        }
      } catch (error) {
        console.error("Failed to create demo account:", error);
        toast.error("Failed to create demo account");
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
