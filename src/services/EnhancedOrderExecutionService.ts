import { supabase } from "@/integrations/supabase/client";
import { MarketDataService } from "./MarketDataService";

export interface OrderExecutionRequest {
  userId: string;
  symbol: string;
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit';
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  limitPrice?: number;
  stopPrice?: number;
  timeInForce?: 'day' | 'gtc' | 'ioc' | 'fok';
}

export interface OrderExecutionResult {
  success: boolean;
  orderId?: string;
  executedPrice?: number;
  executedQuantity?: number;
  status: 'filled' | 'partial' | 'pending' | 'rejected';
  error?: string;
}

export class EnhancedOrderExecutionService {
  static async executeOrder(request: OrderExecutionRequest): Promise<OrderExecutionResult> {
    try {
      // For market orders, execute immediately
      if (request.orderType === 'market') {
        const currentPrice = await MarketDataService.fetchLatestPrice(request.symbol);
        
        if (!currentPrice) {
          return {
            success: false,
            status: 'rejected',
            error: 'Unable to get current market price'
          };
        }

        // Execute the trade immediately
        const { data: trade, error: tradeError } = await supabase
          .from('trades')
          .insert({
            user_id: request.userId,
            symbol: request.symbol,
            type: request.side,
            shares: request.quantity,
            price: currentPrice.price,
            order_type: 'market',
            status: 'completed',
            total_amount: currentPrice.price * request.quantity,
            executed_at: new Date().toISOString()
          })
          .select()
          .single();

        if (tradeError) throw tradeError;

        return {
          success: true,
          orderId: trade.id,
          executedPrice: currentPrice.price,
          executedQuantity: request.quantity,
          status: 'filled'
        };
      } else {
        // For limit/stop orders, create pending order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: request.userId,
            symbol: request.symbol,
            order_type: request.orderType,
            side: request.side,
            quantity: request.quantity,
            price: request.price,
            limit_price: request.limitPrice,
            stop_price: request.stopPrice,
            time_in_force: request.timeInForce || 'day',
            status: 'pending'
          })
          .select()
          .single();

        if (orderError) throw orderError;

        return {
          success: true,
          orderId: order.id,
          status: 'pending'
        };
      }
    } catch (error) {
      console.error('Order execution error:', error);
      return {
        success: false,
        status: 'rejected',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async processLimitOrders(): Promise<void> {
    try {
      // Get all pending limit orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending')
        .in('order_type', ['limit', 'stop', 'stop_limit']);

      if (error) throw error;

      for (const order of orders || []) {
        const currentPrice = await MarketDataService.fetchLatestPrice(order.symbol);
        
        if (!currentPrice) continue;

        let shouldExecute = false;

        // Check execution conditions based on order type
        if (order.order_type === 'limit') {
          if (order.side === 'buy' && currentPrice.price <= (order.limit_price || order.price)) {
            shouldExecute = true;
          } else if (order.side === 'sell' && currentPrice.price >= (order.limit_price || order.price)) {
            shouldExecute = true;
          }
        } else if (order.order_type === 'stop') {
          if (order.side === 'buy' && currentPrice.price >= (order.stop_price || order.price)) {
            shouldExecute = true;
          } else if (order.side === 'sell' && currentPrice.price <= (order.stop_price || order.price)) {
            shouldExecute = true;
          }
        }

        if (shouldExecute) {
          // Execute the order
          await supabase.from('trades').insert({
            user_id: order.user_id,
            symbol: order.symbol,
            type: order.side,
            shares: order.quantity,
            price: currentPrice.price,
            order_type: order.order_type,
            status: 'completed',
            total_amount: currentPrice.price * order.quantity,
            executed_at: new Date().toISOString()
          });

          // Update order status
          await supabase
            .from('orders')
            .update({
              status: 'filled',
              filled_quantity: order.quantity,
              average_fill_price: currentPrice.price,
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id);

          // Add to order history
          await supabase.from('order_history').insert({
            order_id: order.id,
            user_id: order.user_id,
            symbol: order.symbol,
            order_type: order.order_type,
            side: order.side,
            quantity: order.quantity,
            price: order.price,
            filled_quantity: order.quantity,
            average_fill_price: currentPrice.price,
            status: 'filled'
          });
        }
      }
    } catch (error) {
      console.error('Error processing limit orders:', error);
    }
  }
}