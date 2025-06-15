
import { useState, useEffect } from "react";
import { BrokerageIntegration, OrderExecutionRequest, OrderExecutionResponse } from "@/services/BrokerageIntegration";
import { RealTimePortfolioManager, PortfolioSummary } from "@/services/RealTimePortfolioManager";
import { KYCVerificationService, KYCStatus } from "@/services/KYCVerificationService";
import { enhancedWSManager } from "@/services/EnhancedWebSocketManager";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export const useEnhancedTrading = () => {
  const { user } = useAuth();
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecutingOrder, setIsExecutingOrder] = useState(false);

  useEffect(() => {
    if (user) {
      initializeServices();
    }
    
    return () => {
      // Cleanup when component unmounts
      RealTimePortfolioManager.getInstance().destroy();
      enhancedWSManager.destroy();
    };
  }, [user]);

  const initializeServices = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Initialize enhanced WebSocket manager
      await enhancedWSManager.initialize();

      // Initialize real-time portfolio manager
      const portfolioManager = RealTimePortfolioManager.getInstance();
      await portfolioManager.initialize(user.id);

      // Subscribe to portfolio updates
      const unsubscribe = portfolioManager.subscribe((summary) => {
        setPortfolioSummary(summary);
      });

      // Get KYC status
      const kyc = await KYCVerificationService.getKYCStatus(user.id);
      setKycStatus(kyc);

      setIsLoading(false);

      // Return cleanup function
      return unsubscribe;
    } catch (error) {
      console.error('Error initializing trading services:', error);
      toast.error('Failed to initialize trading services');
      setIsLoading(false);
    }
  };

  const executeOrder = async (orderRequest: Omit<OrderExecutionRequest, 'accountId'>): Promise<OrderExecutionResponse> => {
    if (!user) {
      return {
        success: false,
        status: 'rejected',
        error: 'User not authenticated',
        timestamp: Date.now()
      };
    }

    if (!kycStatus || kycStatus.level === 'none') {
      return {
        success: false,
        status: 'rejected',
        error: 'KYC verification required before trading',
        timestamp: Date.now()
      };
    }

    // Check trading limits
    const orderValue = orderRequest.quantity * (orderRequest.limitPrice || 0);
    if (orderValue > kycStatus.tradingLimits.dailyLimit) {
      return {
        success: false,
        status: 'rejected',
        error: `Order exceeds daily trading limit of $${kycStatus.tradingLimits.dailyLimit.toLocaleString()}`,
        timestamp: Date.now()
      };
    }

    setIsExecutingOrder(true);

    try {
      // Get user's brokerage account
      const account = await BrokerageIntegration.getAccountInfo(user.id);
      if (!account) {
        return {
          success: false,
          status: 'rejected',
          error: 'No active brokerage account found',
          timestamp: Date.now()
        };
      }

      // Execute the order
      const result = await BrokerageIntegration.executeOrder({
        ...orderRequest,
        accountId: account.id
      });

      if (result.success) {
        // Update portfolio if order was filled
        if (result.status === 'filled' && result.executedPrice && result.executedQuantity) {
          const portfolioManager = RealTimePortfolioManager.getInstance();
          
          if (orderRequest.side === 'buy') {
            await portfolioManager.addPosition(
              orderRequest.symbol,
              result.executedQuantity,
              result.executedPrice
            );
          } else {
            // For sell orders, the portfolio will be updated via database triggers
            // or we could implement position reduction logic here
          }
        }

        // Show success message
        const actionText = orderRequest.side === 'buy' ? 'Bought' : 'Sold';
        const statusText = result.status === 'filled' ? 'executed' : 'placed';
        
        toast.success(
          `${actionText} order ${statusText}: ${result.executedQuantity || orderRequest.quantity} shares of ${orderRequest.symbol}` +
          (result.executedPrice ? ` at $${result.executedPrice.toFixed(2)}` : '')
        );
      } else {
        toast.error(`Order failed: ${result.error}`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Order execution failed: ${errorMessage}`);
      
      return {
        success: false,
        status: 'rejected',
        error: errorMessage,
        timestamp: Date.now()
      };
    } finally {
      setIsExecutingOrder(false);
    }
  };

  const canTrade = (): boolean => {
    return kycStatus !== null && kycStatus.level !== 'none';
  };

  const getTradingLimits = () => {
    return kycStatus?.tradingLimits || { dailyLimit: 0, monthlyLimit: 0, positionLimit: 0 };
  };

  const refreshKYCStatus = async () => {
    if (!user) return;
    
    try {
      const kyc = await KYCVerificationService.getKYCStatus(user.id);
      setKycStatus(kyc);
    } catch (error) {
      console.error('Error refreshing KYC status:', error);
    }
  };

  const getConnectionStatus = () => {
    return enhancedWSManager.getConnectionState();
  };

  return {
    portfolioSummary,
    kycStatus,
    isLoading,
    isExecutingOrder,
    canTrade: canTrade(),
    tradingLimits: getTradingLimits(),
    executeOrder,
    refreshKYCStatus,
    getConnectionStatus
  };
};
