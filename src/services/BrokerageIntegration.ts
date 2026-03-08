import { supabase } from "@/integrations/supabase/client";
import { unifiedPriceService } from "@/services/UnifiedPriceService";

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
      const [accountResult, walletResult] = await Promise.all([
        supabase.from('account_details').select('*').eq('id', userId).single(),
        supabase.from('wallets').select('available_balance, reserved_balance').eq('user_id', userId).eq('currency', 'USD').maybeSingle(),
      ]);

      if (accountResult.error) throw accountResult.error;
      const data = accountResult.data;
      const wallet = walletResult.data;
      
      const available = wallet?.available_balance ?? 0;
      const reserved = wallet?.reserved_balance ?? 0;
      const equity = available + reserved;

      return {
        id: data.id,
        userId: data.id,
        brokerName: 'PalmCacia',
        accountNumber: `ACC${data.id.slice(0, 8)}`,
        accountType: 'cash',
        status: data.account_status === 'active' ? 'active' : 'pending',
        buyingPower: available,
        dayTradingBuyingPower: available,
        equity,
        maintenanceMargin: reserved,
        isPatternDayTrader: false
      };
    } catch (error) {
      console.error('Error fetching account info:', error);
      return null;
    }
  }

  static async executeOrder(request: OrderExecutionRequest): Promise<OrderExecutionResponse> {
    try {
      const validation = await this.validateOrder(request);
      if (!validation.valid) {
        return {
          success: false,
          status: 'rejected',
          error: validation.error,
          timestamp: Date.now()
        };
      }

      const currentPrice = await this.getCurrentPrice(request.symbol);
      const executionPrice = request.limitPrice || currentPrice;
      
      await this.recordOrder(request, {
        orderId: `ORD_${Date.now()}`,
        executedPrice: executionPrice,
        executedQuantity: request.quantity,
        status: 'filled'
      });
      
      return {
        success: true,
        orderId: `ORD_${Date.now()}`,
        executedPrice: executionPrice,
        executedQuantity: request.quantity,
        remainingQuantity: 0,
        status: 'filled',
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
    const account = await this.getAccountByOrderRequest(request);
    if (!account) {
      return { valid: false, error: 'Account not found or inactive' };
    }

    if (request.side === 'buy') {
      const requiredBuyingPower = request.quantity * (request.limitPrice || await this.getCurrentPrice(request.symbol));
      if (requiredBuyingPower > account.buyingPower) {
        return { valid: false, error: 'Insufficient buying power' };
      }
    }

    if (request.side === 'sell') {
      const position = await this.getPosition(request.accountId, request.symbol);
      if (!position || position.quantity < request.quantity) {
        return { valid: false, error: 'Insufficient shares to sell' };
      }
    }

    return { valid: true };
  }

  private static async getCurrentPrice(symbol: string): Promise<number> {
    return new Promise<number>((resolve) => {
      let resolved = false;
      const unsub = unifiedPriceService.subscribe(symbol, (data) => {
        if (!resolved) {
          resolved = true;
          unsub();
          resolve(data.price);
        }
      });
      // Timeout after 5s — use 0 as fallback
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          unsub();
          resolve(0);
        }
      }, 5000);
    });
  }

  private static async getAccountByOrderRequest(request: OrderExecutionRequest): Promise<BrokerageAccount | null> {
    return await this.getAccountInfo(request.accountId);
  }

  private static async getPosition(accountId: string, symbol: string): Promise<{ quantity: number } | null> {
    try {
      const { data, error } = await supabase
        .from('portfolio')
        .select('shares')
        .eq('user_id', accountId)
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
        user_id: request.accountId,
        total_amount: (result.executedPrice || 0) * (result.executedQuantity || 0)
      });
    } catch (error) {
      console.error('Error recording order:', error);
    }
  }
}
