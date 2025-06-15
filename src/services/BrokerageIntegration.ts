
import { supabase } from "@/integrations/supabase/client";

export interface BrokerageAccount {
  id: string;
  userId: string;
  brokerName: string;
  accountNumber: string;
  accountType: 'cash' | 'margin' | 'retirement';
  status: 'active' | 'inactive' | 'pending';
  buyingPower: number;
  dayTradingBuyingPower: number;
  equity: number;
  maintenanceMargin: number;
  isPatternDayTrader: boolean;
}

export interface OrderExecutionRequest {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit';
  timeInForce: 'day' | 'gtc' | 'ioc' | 'fok';
  limitPrice?: number;
  stopPrice?: number;
  accountId: string;
}

export interface OrderExecutionResponse {
  success: boolean;
  orderId?: string;
  executedPrice?: number;
  executedQuantity?: number;
  remainingQuantity?: number;
  status: 'filled' | 'partial' | 'pending' | 'cancelled' | 'rejected';
  error?: string;
  timestamp: number;
}

export class BrokerageIntegration {
  private static readonly API_BASE_URL = '/api/brokerage';

  static async getAccountInfo(userId: string): Promise<BrokerageAccount | null> {
    try {
      const { data, error } = await supabase
        .from('brokerage_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching account info:', error);
      return null;
    }
  }

  static async executeOrder(request: OrderExecutionRequest): Promise<OrderExecutionResponse> {
    try {
      // Validate order before execution
      const validation = await this.validateOrder(request);
      if (!validation.valid) {
        return {
          success: false,
          status: 'rejected',
          error: validation.error,
          timestamp: Date.now()
        };
      }

      // Execute through broker API
      const response = await fetch(`${this.API_BASE_URL}/execute-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Order execution failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Record the order in our database
      await this.recordOrder(request, result);
      
      return {
        success: true,
        ...result,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Order execution error:', error);
      return {
        success: false,
        status: 'rejected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };
    }
  }

  private static async validateOrder(request: OrderExecutionRequest): Promise<{ valid: boolean; error?: string }> {
    // Check account status
    const account = await this.getAccountByOrderRequest(request);
    if (!account) {
      return { valid: false, error: 'Account not found or inactive' };
    }

    // Check buying power for buy orders
    if (request.side === 'buy') {
      const requiredBuyingPower = request.quantity * (request.limitPrice || await this.getCurrentPrice(request.symbol));
      if (requiredBuyingPower > account.buyingPower) {
        return { valid: false, error: 'Insufficient buying power' };
      }
    }

    // Check position for sell orders
    if (request.side === 'sell') {
      const position = await this.getPosition(request.accountId, request.symbol);
      if (!position || position.quantity < request.quantity) {
        return { valid: false, error: 'Insufficient shares to sell' };
      }
    }

    // Pattern day trader checks
    if (account.isPatternDayTrader && request.side === 'buy') {
      if (requiredBuyingPower > account.dayTradingBuyingPower) {
        return { valid: false, error: 'Insufficient day trading buying power' };
      }
    }

    return { valid: true };
  }

  private static async getCurrentPrice(symbol: string): Promise<number> {
    try {
      const response = await fetch(`/api/market-data/quote/${symbol}`);
      const data = await response.json();
      return data.price || 0;
    } catch (error) {
      console.error('Error fetching current price:', error);
      return 0;
    }
  }

  private static async getAccountByOrderRequest(request: OrderExecutionRequest): Promise<BrokerageAccount | null> {
    try {
      const { data, error } = await supabase
        .from('brokerage_accounts')
        .select('*')
        .eq('id', request.accountId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching account:', error);
      return null;
    }
  }

  private static async getPosition(accountId: string, symbol: string): Promise<{ quantity: number } | null> {
    try {
      const { data, error } = await supabase
        .from('portfolio')
        .select('shares')
        .eq('account_id', accountId)
        .eq('symbol', symbol)
        .single();

      if (error) return null;
      return { quantity: data.shares };
    } catch (error) {
      return null;
    }
  }

  private static async recordOrder(request: OrderExecutionRequest, result: any): Promise<void> {
    try {
      await supabase.from('trades').insert({
        symbol: request.symbol,
        type: request.side,
        shares: request.quantity,
        price: result.executedPrice || request.limitPrice || 0,
        status: result.status,
        order_type: request.orderType,
        account_id: request.accountId,
        external_order_id: result.orderId,
        total_amount: (result.executedPrice || 0) * (result.executedQuantity || 0)
      });
    } catch (error) {
      console.error('Error recording order:', error);
    }
  }
}
