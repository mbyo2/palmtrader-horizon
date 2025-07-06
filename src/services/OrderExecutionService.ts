import { supabase } from "@/integrations/supabase/client";
import { RealMarketDataIntegration } from "./RealMarketDataIntegration";

export interface OrderRequest {
  userId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit';
  limitPrice?: number;
  stopPrice?: number;
  timeInForce: 'day' | 'gtc' | 'ioc' | 'fok';
}

export interface OrderResponse {
  success: boolean;
  orderId?: string;
  executedPrice?: number;
  executedQuantity?: number;
  status: 'pending' | 'filled' | 'partial' | 'rejected' | 'cancelled';
  message?: string;
  error?: string;
}

export interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
}

export class OrderExecutionService {
  // Main order execution method
  static async executeOrder(orderRequest: OrderRequest): Promise<OrderResponse> {
    try {
      // Pre-execution validation
      const validation = await this.validateOrder(orderRequest);
      if (!validation.valid) {
        return { success: false, status: 'rejected', error: validation.error };
      }

      // Get current market price
      const marketData = await RealMarketDataIntegration.fetchRealTimeData(orderRequest.symbol);
      if (!marketData) {
        return { success: false, status: 'rejected', error: 'Unable to get market data' };
      }

      // Create order record with required fields
      const { data: orderRecord, error: orderError } = await supabase
        .from('trades')
        .insert({
          user_id: orderRequest.userId,
          symbol: orderRequest.symbol,
          type: orderRequest.side,
          shares: orderRequest.quantity,
          price: 0, // Will be updated after execution
          total_amount: 0, // Will be updated after execution
          order_type: orderRequest.orderType,
          limit_price: orderRequest.limitPrice,
          stop_price: orderRequest.stopPrice,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Execute based on order type
      let executionResult: OrderResponse;
      
      switch (orderRequest.orderType) {
        case 'market':
          executionResult = await this.executeMarketOrder(orderRequest, marketData.price, orderRecord.id);
          break;
        case 'limit':
          executionResult = await this.executeLimitOrder(orderRequest, marketData.price, orderRecord.id);
          break;
        case 'stop':
          executionResult = await this.executeStopOrder(orderRequest, marketData.price, orderRecord.id);
          break;
        case 'stop_limit':
          executionResult = await this.executeStopLimitOrder(orderRequest, marketData.price, orderRecord.id);
          break;
        default:
          executionResult = { success: false, status: 'rejected', error: 'Invalid order type' };
      }

      // Update order record with execution result
      await supabase
        .from('trades')
        .update({
          status: executionResult.status,
          price: executionResult.executedPrice,
          total_amount: (executionResult.executedPrice || 0) * (executionResult.executedQuantity || 0)
        })
        .eq('id', orderRecord.id);

      // Update portfolio if order filled
      if (executionResult.status === 'filled') {
        await this.updatePortfolio(orderRequest, executionResult);
      }

      return { ...executionResult, orderId: orderRecord.id };
    } catch (error) {
      console.error('Order execution error:', error);
      return {
        success: false,
        status: 'rejected',
        error: error instanceof Error ? error.message : 'Order execution failed'
      };
    }
  }

  private static async validateOrder(order: OrderRequest): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check user account status
      const { data: accountDetails } = await supabase
        .from('account_details')
        .select('account_status, kyc_status')
        .eq('id', order.userId)
        .single();

      if (!accountDetails || accountDetails.account_status !== 'active') {
        return { valid: false, error: 'Account not active' };
      }

      if (accountDetails.kyc_status !== 'approved') {
        return { valid: false, error: 'KYC verification required' };
      }

      // Check buying power for buy orders
      if (order.side === 'buy') {
        const buyingPower = await this.calculateBuyingPower(order.userId);
        const estimatedCost = order.quantity * (order.limitPrice || 100); // Conservative estimate
        
        if (buyingPower < estimatedCost) {
          return { valid: false, error: 'Insufficient buying power' };
        }
      }

      // Check position for sell orders
      if (order.side === 'sell') {
        const position = await this.getPosition(order.userId, order.symbol);
        if (!position || position.quantity < order.quantity) {
          return { valid: false, error: 'Insufficient shares to sell' };
        }
      }

      // Check trading limits
      const limits = await this.checkTradingLimits(order.userId, order.quantity);
      if (!limits.valid) {
        return { valid: false, error: limits.error };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Validation failed' };
    }
  }

  private static async executeMarketOrder(order: OrderRequest, marketPrice: number, orderId: string): Promise<OrderResponse> {
    // Market orders execute immediately at current market price
    const executedPrice = marketPrice;
    const executedQuantity = order.quantity;

    // Add some realistic slippage (0.01% - 0.05%)
    const slippage = 1 + (Math.random() * 0.0004 - 0.0002);
    const finalPrice = executedPrice * (order.side === 'buy' ? slippage : (2 - slippage));

    return {
      success: true,
      orderId,
      executedPrice: parseFloat(finalPrice.toFixed(2)),
      executedQuantity,
      status: 'filled',
      message: `Market order filled at $${finalPrice.toFixed(2)}`
    };
  }

  private static async executeLimitOrder(order: OrderRequest, marketPrice: number, orderId: string): Promise<OrderResponse> {
    if (!order.limitPrice) {
      return { success: false, status: 'rejected', error: 'Limit price required' };
    }

    // Check if limit order can be filled immediately
    const canFill = order.side === 'buy' ? marketPrice <= order.limitPrice : marketPrice >= order.limitPrice;

    if (canFill) {
      return {
        success: true,
        orderId,
        executedPrice: order.limitPrice,
        executedQuantity: order.quantity,
        status: 'filled',
        message: `Limit order filled at $${order.limitPrice}`
      };
    } else {
      // Order goes to pending state
      return {
        success: true,
        orderId,
        status: 'pending',
        message: 'Limit order placed and pending execution'
      };
    }
  }

  private static async executeStopOrder(order: OrderRequest, marketPrice: number, orderId: string): Promise<OrderResponse> {
    if (!order.stopPrice) {
      return { success: false, status: 'rejected', error: 'Stop price required' };
    }

    // Stop orders remain pending until triggered
    return {
      success: true,
      orderId,
      status: 'pending',
      message: 'Stop order placed and monitoring market price'
    };
  }

  private static async executeStopLimitOrder(order: OrderRequest, marketPrice: number, orderId: string): Promise<OrderResponse> {
    if (!order.stopPrice || !order.limitPrice) {
      return { success: false, status: 'rejected', error: 'Stop price and limit price required' };
    }

    return {
      success: true,
      orderId,
      status: 'pending',
      message: 'Stop-limit order placed and monitoring market price'
    };
  }

  private static async updatePortfolio(order: OrderRequest, execution: OrderResponse) {
    try {
      if (order.side === 'buy') {
        // Add to portfolio
        const { data: existingPosition } = await supabase
          .from('portfolio')
          .select('*')
          .eq('user_id', order.userId)
          .eq('symbol', order.symbol)
          .single();

        if (existingPosition) {
          // Update existing position
          const newShares = existingPosition.shares + (execution.executedQuantity || 0);
          const newAvgPrice = ((existingPosition.shares * existingPosition.average_price) + 
                             ((execution.executedQuantity || 0) * (execution.executedPrice || 0))) / newShares;

          await supabase
            .from('portfolio')
            .update({
              shares: newShares,
              average_price: newAvgPrice,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingPosition.id);
        } else {
          // Create new position
          await supabase
            .from('portfolio')
            .insert({
              user_id: order.userId,
              symbol: order.symbol,
              shares: execution.executedQuantity || 0,
              average_price: execution.executedPrice || 0
            });
        }
      } else {
        // Sell from portfolio
        const { data: position } = await supabase
          .from('portfolio')
          .select('*')
          .eq('user_id', order.userId)
          .eq('symbol', order.symbol)
          .single();

        if (position) {
          const newShares = position.shares - (execution.executedQuantity || 0);
          
          if (newShares <= 0) {
            // Remove position if no shares left
            await supabase
              .from('portfolio')
              .delete()
              .eq('id', position.id);
          } else {
            // Update shares
            await supabase
              .from('portfolio')
              .update({
                shares: newShares,
                updated_at: new Date().toISOString()
              })
              .eq('id', position.id);
          }
        }
      }

      // Update account balance
      await this.updateAccountBalance(order, execution);
    } catch (error) {
      console.error('Portfolio update error:', error);
    }
  }

  private static async updateAccountBalance(order: OrderRequest, execution: OrderResponse) {
    try {
      const amount = (execution.executedPrice || 0) * (execution.executedQuantity || 0);
      const transactionAmount = order.side === 'buy' ? -amount : amount;

      await supabase
        .from('transactions')
        .insert({
          user_id: order.userId,
          transaction_type: 'trade',
          amount: transactionAmount,
          description: `${order.side.toUpperCase()} ${execution.executedQuantity} shares of ${order.symbol}`,
          status: 'completed',
          metadata: {
            symbol: order.symbol,
            quantity: execution.executedQuantity,
            price: execution.executedPrice,
            side: order.side
          }
        });
    } catch (error) {
      console.error('Balance update error:', error);
    }
  }

  private static async calculateBuyingPower(userId: string): Promise<number> {
    try {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, transaction_type')
        .eq('user_id', userId)
        .eq('status', 'completed');

      const balance = transactions?.reduce((sum, tx) => {
        return sum + tx.amount;
      }, 0) || 0;

      // Add margin if applicable (simplified)
      return Math.max(0, balance * 2); // 2:1 margin ratio
    } catch (error) {
      console.error('Error calculating buying power:', error);
      return 0;
    }
  }

  private static async getPosition(userId: string, symbol: string): Promise<Position | null> {
    try {
      const { data: position } = await supabase
        .from('portfolio')
        .select('*')
        .eq('user_id', userId)
        .eq('symbol', symbol)
        .single();

      if (!position) return null;

      // Get current price
      const marketData = await RealMarketDataIntegration.fetchRealTimeData(symbol);
      const currentPrice = marketData?.price || position.average_price;

      const marketValue = position.shares * currentPrice;
      const costBasis = position.shares * position.average_price;
      const unrealizedPL = marketValue - costBasis;
      const unrealizedPLPercent = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;

      return {
        symbol: position.symbol,
        quantity: position.shares,
        averagePrice: position.average_price,
        currentPrice,
        marketValue,
        unrealizedPL,
        unrealizedPLPercent
      };
    } catch (error) {
      console.error('Error getting position:', error);
      return null;
    }
  }

  private static async checkTradingLimits(userId: string, quantity: number): Promise<{ valid: boolean; error?: string }> {
    try {
      // Get user's trading limits based on KYC level
      const { data: kyc } = await supabase
        .from('kyc_verifications')
        .select('verification_level')
        .eq('user_id', userId)
        .single();

      const verificationLevel = kyc?.verification_level || 'none';
      
      let dailyLimit = 0;
      switch (verificationLevel) {
        case 'basic': dailyLimit = 10000; break;
        case 'enhanced': dailyLimit = 50000; break;
        case 'premium': dailyLimit = 250000; break;
        default: dailyLimit = 2500;
      }

      // Check today's trading volume
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todaysTrades } = await supabase
        .from('trades')
        .select('total_amount')
        .eq('user_id', userId)
        .gte('created_at', today.toISOString())
        .eq('status', 'filled');

      const todaysVolume = todaysTrades?.reduce((sum, trade) => sum + (trade.total_amount || 0), 0) || 0;

      if (todaysVolume >= dailyLimit) {
        return { valid: false, error: `Daily trading limit of $${dailyLimit.toLocaleString()} exceeded` };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Unable to validate trading limits' };
    }
  }

  // Get user's positions
  static async getUserPositions(userId: string): Promise<Position[]> {
    try {
      const { data: positions } = await supabase
        .from('portfolio')
        .select('*')
        .eq('user_id', userId);

      if (!positions) return [];

      const positionsWithPrices = await Promise.all(
        positions.map(async (position) => {
          const marketData = await RealMarketDataIntegration.fetchRealTimeData(position.symbol);
          const currentPrice = marketData?.price || position.average_price;
          
          const marketValue = position.shares * currentPrice;
          const costBasis = position.shares * position.average_price;
          const unrealizedPL = marketValue - costBasis;
          const unrealizedPLPercent = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;

          return {
            symbol: position.symbol,
            quantity: position.shares,
            averagePrice: position.average_price,
            currentPrice,
            marketValue,
            unrealizedPL,
            unrealizedPLPercent
          };
        })
      );

      return positionsWithPrices;
    } catch (error) {
      console.error('Error getting user positions:', error);
      return [];
    }
  }

  // Cancel pending order
  static async cancelOrder(userId: string, orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: order } = await supabase
        .from('trades')
        .select('*')
        .eq('id', orderId)
        .eq('user_id', userId)
        .single();

      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      if (order.status !== 'pending') {
        return { success: false, error: 'Order cannot be cancelled' };
      }

      await supabase
        .from('trades')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      return { success: true };
    } catch (error) {
      console.error('Error cancelling order:', error);
      return { success: false, error: 'Failed to cancel order' };
    }
  }
}