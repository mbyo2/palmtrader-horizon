import { supabase } from "@/integrations/supabase/client";
import { isDemo } from '@/services/demo/DemoBackend';
import { DemoSpot } from '@/services/demo/demoExchange';
import { ALPACA_CRYPTO_BASES, alpacaCryptoSymbol, isAlpacaCryptoSymbol } from '@/services/venueRouting';
import {
  AlpacaPaperService,
  mapMirrorOrderToUiOrder,
  type AlpacaMirrorOrder,
} from '@/services/AlpacaPaperService';

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
  /**
   * Execution venue for signed-in users (CEO directive 2026-11-23):
   * 'alpaca' pairs execute on Alpaca paper; 'simulated' pairs run on the
   * local PalmCacia simulated market (ZMW/USDT carve-outs). Undefined in
   * demo mode, where the whole surface is the demo layer.
   */
  venue?: 'alpaca' | 'simulated';
}

/** Catalogue bases that get a real Alpaca paper USD pair for signed-in users. */
const ALPACA_SPOT_BASES = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE'];

export const alpacaPairId = (base: string) => `alpaca:${base.toUpperCase()}-USD`;
export const isAlpacaPairId = (pairId: string) => pairId.startsWith('alpaca:');

function alpacaTradingPair(base: string): TradingPair {
  return {
    id: alpacaPairId(base),
    base_currency: base,
    quote_currency: 'USD',
    min_order_size: 0.0001,
    max_order_size: 100000,
    price_precision: 2,
    quantity_precision: 6,
    maker_fee: 0,
    taker_fee: 0,
    is_active: true,
    created_at: new Date(0).toISOString(),
    venue: 'alpaca',
  };
}

function alpacaTradingPairs(): TradingPair[] {
  return ALPACA_SPOT_BASES.filter((b) => ALPACA_CRYPTO_BASES.has(b)).map(alpacaTradingPair);
}

function alpacaPairById(pairId: string): TradingPair | null {
  if (!isAlpacaPairId(pairId)) return null;
  const base = pairId.slice('alpaca:'.length).split('-')[0];
  return ALPACA_SPOT_BASES.includes(base) ? alpacaTradingPair(base) : null;
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
    if (await isDemo()) return DemoSpot.getTradingPairs();
    const { data, error } = await supabase
      .from('trading_pairs')
      .select('*')
      .eq('is_active', true)
      .order('base_currency');

    if (error) throw error;
    const dbPairs = (data || []).map(pair => ({
      ...pair,
      min_order_size: Number(pair.min_order_size),
      max_order_size: Number(pair.max_order_size),
      maker_fee: Number(pair.maker_fee),
      taker_fee: Number(pair.taker_fee),
      // DB pairs are USDT/ETH quoted — Alpaca lists none of them, so for
      // signed-in users they run on the PalmCacia simulated market.
      venue: 'simulated' as const
    }));
    // Alpaca paper USD pairs come first so the default selection is a real venue.
    return [...alpacaTradingPairs(), ...dbPairs];
  }

  static async getPairById(pairId: string): Promise<TradingPair | null> {
    if (await isDemo()) return DemoSpot.getPairById(pairId);
    const alpacaPair = alpacaPairById(pairId);
    if (alpacaPair) return alpacaPair;
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
      taker_fee: Number(data.taker_fee),
      venue: 'simulated' as const
    };
  }

  static async getOrderBook(pairId: string): Promise<OrderBook> {
    if (await isDemo()) return DemoSpot.getOrderBook(pairId);
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
  ): Promise<{ success: boolean; orderId?: string; error?: string; venue?: 'alpaca' | 'simulated' }> {
    if (await isDemo()) return DemoSpot.placeOrder(userId, pairId, side, orderType, quantity, price, stopPrice, timeInForce);

    // Alpaca-venue pairs execute on the Alpaca paper account as BASE/USD.
    // A rejection or outage is returned as an honest failure — the order is
    // never silently re-routed to the simulated market.
    const alpacaPair = alpacaPairById(pairId);
    if (alpacaPair) {
      try {
        const res = await AlpacaPaperService.placeOrder({
          symbol: alpacaCryptoSymbol(alpacaPair.base_currency),
          qty: quantity,
          side,
          type: orderType,
          time_in_force: 'gtc',
          limit_price: orderType !== 'market' ? price : undefined,
          stop_price: stopPrice,
        });
        return { success: true, orderId: `alpaca:${res.order.id}`, venue: 'alpaca' };
      } catch (error) {
        return {
          success: false,
          venue: 'alpaca',
          error: error instanceof Error ? `Alpaca Sandbox order failed: ${error.message}` : 'Alpaca Sandbox order failed',
        };
      }
    }

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

      return { success: true, orderId: data.id, venue: 'simulated' };
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

  /**
   * The user's Alpaca paper crypto orders, read back from Alpaca (via the
   * function's mirrored rows with live status overlay) in SpotOrder shape.
   * Order ids are prefixed `alpaca:` so cancel can route back to Alpaca.
   */
  private static async fetchAlpacaSpotOrders(userId: string): Promise<SpotOrder[]> {
    try {
      const res = await AlpacaPaperService.getOrders(100);
      return (res.orders as AlpacaMirrorOrder[])
        .filter((r) => isAlpacaCryptoSymbol(r.symbol))
        .map((r) => {
          const ui = mapMirrorOrderToUiOrder(r);
          const base = r.symbol.slice(0, -3);
          const status: SpotOrder['status'] =
            ui.status === 'filled' ? 'filled'
            : ui.status === 'partial' ? 'partially_filled'
            : ui.status === 'cancelled' || ui.status === 'rejected' ? 'cancelled'
            : 'open';
          return {
            id: `alpaca:${r.alpaca_order_id ?? r.id}`,
            user_id: userId,
            pair_id: alpacaPairId(base),
            side: ui.side,
            order_type: (ui.order_type === 'stop' ? 'stop_limit' : ui.order_type) as SpotOrder['order_type'],
            price: ui.limit_price ?? ui.average_fill_price,
            stop_price: ui.stop_price,
            quantity: ui.quantity,
            filled_quantity: ui.filled_quantity,
            remaining_quantity: Math.max(ui.quantity - ui.filled_quantity, 0),
            average_fill_price: ui.average_fill_price,
            status,
            time_in_force: 'GTC' as const,
            created_at: ui.created_at,
            updated_at: ui.updated_at,
          };
        });
    } catch (err) {
      console.error('Alpaca paper spot orders read-back failed:', err);
      return [];
    }
  }

  static async cancelOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    if (await isDemo()) return DemoSpot.cancelOrder(orderId);
    // Alpaca orders are cancelled on Alpaca, not in the local table.
    if (orderId.startsWith('alpaca:')) {
      try {
        await AlpacaPaperService.cancelOrder(orderId.slice('alpaca:'.length));
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? `Could not cancel on Alpaca Sandbox: ${error.message}` : 'Could not cancel on Alpaca Sandbox',
        };
      }
    }
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
    if (await isDemo()) return DemoSpot.getOpenOrders(userId, pairId);
    const wantAlpaca = !pairId || isAlpacaPairId(pairId);
    const wantLocal = !pairId || !isAlpacaPairId(pairId);

    let localOrders: SpotOrder[] = [];
    if (wantLocal) {
      let query = supabase
        .from('spot_orders')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['open', 'partially_filled'])
        .order('created_at', { ascending: false });

      if (pairId) query = query.eq('pair_id', pairId);

      const { data, error } = await query;
      if (error) throw error;
      localOrders = (data || []).map(order => ({
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

    let alpacaOrders: SpotOrder[] = [];
    if (wantAlpaca) {
      alpacaOrders = (await this.fetchAlpacaSpotOrders(userId))
        .filter((o) => o.status === 'open' || o.status === 'partially_filled');
      if (pairId) alpacaOrders = alpacaOrders.filter((o) => o.pair_id === pairId);
    }

    return [...alpacaOrders, ...localOrders]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  static async getOrderHistory(userId: string, limit: number = 50): Promise<SpotOrder[]> {
    if (await isDemo()) return DemoSpot.getOrderHistory(userId, limit);
    const { data, error } = await supabase
      .from('spot_orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const localOrders = (data || []).map(order => ({
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

    const alpacaOrders = await this.fetchAlpacaSpotOrders(userId);
    return [...alpacaOrders, ...localOrders]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
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
