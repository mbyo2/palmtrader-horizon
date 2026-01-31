import { supabase } from "@/integrations/supabase/client";

export interface TradingPair {
  id: string;
  base_currency: string;
  quote_currency: string;
  min_order_size: number;
  max_order_size: number;
  price_precision: number;
  quantity_precision: number;
  maker_fee: number;
  taker_fee: number;
  is_active: boolean;
  created_at: string;
}

export interface SpotOrder {
  id: string;
  user_id: string;
  pair_id: string;
  side: 'buy' | 'sell';
  order_type: 'market' | 'limit' | 'stop_limit';
  price?: number;
  stop_price?: number;
  quantity: number;
  filled_quantity: number;
  remaining_quantity?: number;
  average_fill_price?: number;
  status: 'open' | 'partially_filled' | 'filled' | 'cancelled';
  time_in_force: 'GTC' | 'IOC' | 'FOK';
  created_at: string;
  updated_at: string;
}

export interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
}

export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  lastPrice?: number;
  spread?: number;
}

export class SpotTradingService {
  static async getTradingPairs(): Promise<TradingPair[]> {
    const { data, error } = await supabase
      .from('trading_pairs')
      .select('*')
      .eq('is_active', true)
      .order('base_currency');

    if (error) throw error;
    return (data || []).map(pair => ({
      ...pair,
      min_order_size: Number(pair.min_order_size),
      max_order_size: Number(pair.max_order_size),
      maker_fee: Number(pair.maker_fee),
      taker_fee: Number(pair.taker_fee)
    }));
  }

  static async getPairById(pairId: string): Promise<TradingPair | null> {
    const { data, error } = await supabase
      .from('trading_pairs')
      .select('*')
      .eq('id', pairId)
      .single();

    if (error) return null;
    return {
      ...data,
      min_order_size: Number(data.min_order_size),
      max_order_size: Number(data.max_order_size),
      maker_fee: Number(data.maker_fee),
      taker_fee: Number(data.taker_fee)
    };
  }

  static async getOrderBook(pairId: string): Promise<OrderBook> {
    const { data: orders, error } = await supabase
      .from('spot_orders')
      .select('*')
      .eq('pair_id', pairId)
      .in('status', ['open', 'partially_filled'])
      .eq('order_type', 'limit');

    if (error) throw error;

    const bids: Record<number, number> = {};
    const asks: Record<number, number> = {};

    (orders || []).forEach(order => {
      const price = Number(order.price);
      const remaining = Number(order.remaining_quantity) || (Number(order.quantity) - Number(order.filled_quantity));
      
      if (order.side === 'buy') {
        bids[price] = (bids[price] || 0) + remaining;
      } else {
        asks[price] = (asks[price] || 0) + remaining;
      }
    });

    const sortedBids = Object.entries(bids)
      .map(([price, quantity]) => ({ 
        price: Number(price), 
        quantity, 
        total: Number(price) * quantity 
      }))
      .sort((a, b) => b.price - a.price)
      .slice(0, 20);

    const sortedAsks = Object.entries(asks)
      .map(([price, quantity]) => ({ 
        price: Number(price), 
        quantity, 
        total: Number(price) * quantity 
      }))
      .sort((a, b) => a.price - b.price)
      .slice(0, 20);

    const lowestAsk = sortedAsks[0]?.price;
    const highestBid = sortedBids[0]?.price;

    return {
      bids: sortedBids,
      asks: sortedAsks,
      lastPrice: highestBid,
      spread: lowestAsk && highestBid ? lowestAsk - highestBid : undefined
    };
  }

  static async placeOrder(
    userId: string,
    pairId: string,
    side: 'buy' | 'sell',
    orderType: 'market' | 'limit' | 'stop_limit',
    quantity: number,
    price?: number,
    stopPrice?: number,
    timeInForce: 'GTC' | 'IOC' | 'FOK' = 'GTC'
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      const orderData: any = {
        user_id: userId,
        pair_id: pairId,
        side,
        order_type: orderType,
        quantity,
        filled_quantity: 0,
        remaining_quantity: quantity,
        time_in_force: timeInForce,
        status: 'open'
      };

      if (price) orderData.price = price;
      if (stopPrice) orderData.stop_price = stopPrice;

      const { data, error } = await supabase
        .from('spot_orders')
        .insert(orderData)
        .select('id')
        .single();

      if (error) throw error;

      // For market orders, simulate immediate execution
      if (orderType === 'market') {
        await this.executeMarketOrder(data.id, pairId, side, quantity);
      }

      return { success: true, orderId: data.id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to place order' };
    }
  }

  private static async executeMarketOrder(orderId: string, pairId: string, side: 'buy' | 'sell', quantity: number): Promise<void> {
    // Get best available price from order book
    const orderBook = await this.getOrderBook(pairId);
    const bestPrice = side === 'buy' 
      ? orderBook.asks[0]?.price 
      : orderBook.bids[0]?.price;

    // If no orders in book, use a simulated price
    const executionPrice = bestPrice || 100;

    await supabase
      .from('spot_orders')
      .update({
        status: 'filled',
        filled_quantity: quantity,
        remaining_quantity: 0,
        average_fill_price: executionPrice,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
  }

  static async cancelOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('spot_orders')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to cancel order' };
    }
  }

  static async getOpenOrders(userId: string, pairId?: string): Promise<SpotOrder[]> {
    let query = supabase
      .from('spot_orders')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['open', 'partially_filled'])
      .order('created_at', { ascending: false });

    if (pairId) query = query.eq('pair_id', pairId);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(order => ({
      ...order,
      side: order.side as 'buy' | 'sell',
      order_type: order.order_type as 'market' | 'limit' | 'stop_limit',
      status: order.status as 'open' | 'partially_filled' | 'filled' | 'cancelled',
      time_in_force: order.time_in_force as 'GTC' | 'IOC' | 'FOK',
      price: order.price ? Number(order.price) : undefined,
      stop_price: order.stop_price ? Number(order.stop_price) : undefined,
      quantity: Number(order.quantity),
      filled_quantity: Number(order.filled_quantity),
      remaining_quantity: order.remaining_quantity ? Number(order.remaining_quantity) : undefined,
      average_fill_price: order.average_fill_price ? Number(order.average_fill_price) : undefined
    }));
  }

  static async getOrderHistory(userId: string, limit: number = 50): Promise<SpotOrder[]> {
    const { data, error } = await supabase
      .from('spot_orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(order => ({
      ...order,
      side: order.side as 'buy' | 'sell',
      order_type: order.order_type as 'market' | 'limit' | 'stop_limit',
      status: order.status as 'open' | 'partially_filled' | 'filled' | 'cancelled',
      time_in_force: order.time_in_force as 'GTC' | 'IOC' | 'FOK',
      price: order.price ? Number(order.price) : undefined,
      stop_price: order.stop_price ? Number(order.stop_price) : undefined,
      quantity: Number(order.quantity),
      filled_quantity: Number(order.filled_quantity),
      remaining_quantity: order.remaining_quantity ? Number(order.remaining_quantity) : undefined,
      average_fill_price: order.average_fill_price ? Number(order.average_fill_price) : undefined
    }));
  }

  static subscribeToOrderBook(pairId: string, callback: () => void) {
    return supabase
      .channel(`spot_orders:${pairId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'spot_orders',
        filter: `pair_id=eq.${pairId}`
      }, callback)
      .subscribe();
  }
}
