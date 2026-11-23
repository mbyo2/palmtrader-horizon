import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { isDemo } from '@/services/demo/DemoBackend';
import { DemoStockTrading } from '@/services/demo/demoStocks';
import { resolveInstrument } from '@/services/venueRouting';
import {
  AlpacaPaperService,
  mapMirrorOrderToUiOrder,
  type AlpacaMirrorOrder,
} from '@/services/AlpacaPaperService';

export interface Order {
  id: string;
  user_id: string;
  symbol: string;
  order_type: 'market' | 'limit' | 'stop' | 'stop_limit';
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  limit_price?: number;
  stop_price?: number;
  time_in_force: 'day' | 'gtc' | 'ioc' | 'fok';
  status: 'pending' | 'filled' | 'cancelled' | 'rejected' | 'partial';
  filled_quantity: number;
  average_fill_price?: number;
  created_at: string;
  updated_at: string;
  /** Where this order actually executes: Alpaca paper, or the local engine (LuSE / ZMW carve-outs). */
  venue?: 'alpaca' | 'local';
  alpaca_order_id?: string | null;
}

export const useOrders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: orders = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["orders", user?.id],
    queryFn: async () => {
      if (!user) return [];
      if (await isDemo()) return DemoStockTrading.getOrders(user.id) as unknown as Order[];

      // Signed-in: Alpaca-venue orders are read back from Alpaca paper
      // (via the function's mirrored rows with live status overlay);
      // local rows are kept only for local-venue instruments (LuSE stocks,
      // ZMW pairs) — Alpaca is the source of truth for everything else.
      const [localRes, alpacaOrders] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        AlpacaPaperService.getOrders(100)
          .then((r) => (r.orders as AlpacaMirrorOrder[]).map(mapMirrorOrderToUiOrder) as unknown as Order[])
          .catch((err) => {
            console.error('Alpaca paper orders read-back failed:', err);
            return [] as Order[];
          }),
      ]);

      if (localRes.error) throw localRes.error;
      const localOrders = ((localRes.data ?? []) as Order[])
        .filter((o) => resolveInstrument(o.symbol).venue === 'local')
        .map((o) => ({ ...o, venue: 'local' as const }));

      return [...alpacaOrders, ...localOrders]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!user,
    staleTime: 5 * 1000, // 5 seconds for real-time feel
  });

  const invalidateTradingQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ["orders", user?.id] });
    await queryClient.invalidateQueries({ queryKey: ["positions", user?.id] });
    await queryClient.invalidateQueries({ queryKey: ["portfolio", user?.id] });
    await queryClient.invalidateQueries({ queryKey: ["alpaca-paper-account"] });
    await queryClient.invalidateQueries({ queryKey: ["paperPositions"] });
    await queryClient.invalidateQueries({ queryKey: ["paperOrders"] });
  };

  const createOrder = async (orderData: Omit<Order, 'id' | 'user_id' | 'status' | 'filled_quantity' | 'created_at' | 'updated_at'>) => {
    if (!user) {
      toast.error("User not authenticated");
      return null;
    }
    if (await isDemo()) {
      const r = await DemoStockTrading.placeOrder(user.id, {
        symbol: orderData.symbol, side: orderData.side,
        orderType: orderData.order_type, quantity: orderData.quantity,
        limitPrice: orderData.limit_price ?? undefined, stopPrice: orderData.stop_price ?? undefined,
        timeInForce: orderData.time_in_force,
      });
      if (!r.success) { toast.error(r.error || "Failed to create order"); throw new Error(r.error || 'Order failed'); }
      await queryClient.invalidateQueries({ queryKey: ["orders", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["positions", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["portfolio", user.id] });
      toast.success("Order created successfully");
      return (await DemoStockTrading.getOrders(user.id)).find(o => o.id === r.orderId) as unknown as Order;
    }

    const resolved = resolveInstrument(orderData.symbol);

    if (resolved.venue === 'alpaca' && resolved.alpacaSymbol) {
      // Alpaca paper is the execution venue. If Alpaca rejects the order or
      // is unreachable, surface that honestly — never fall back to a local
      // simulation and never pretend the order was placed.
      try {
        const res = await AlpacaPaperService.placeOrder({
          symbol: resolved.alpacaSymbol,
          qty: orderData.quantity,
          side: orderData.side,
          type: orderData.order_type,
          time_in_force: resolved.kind === 'crypto' ? 'gtc' : (orderData.time_in_force ?? 'day'),
          limit_price: orderData.limit_price ?? undefined,
          stop_price: orderData.stop_price ?? undefined,
        });
        await invalidateTradingQueries();
        toast.success(`Order placed on Alpaca Sandbox (${res.order.status})`);
        return {
          id: res.order.id,
          user_id: user.id,
          symbol: resolved.alpacaSymbol,
          order_type: orderData.order_type,
          side: orderData.side,
          quantity: orderData.quantity,
          limit_price: orderData.limit_price,
          stop_price: orderData.stop_price,
          time_in_force: orderData.time_in_force,
          status: 'pending',
          filled_quantity: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          venue: 'alpaca',
          alpaca_order_id: res.order.id,
        } as Order;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Alpaca Sandbox is unreachable';
        toast.error(`Alpaca Sandbox order failed: ${message}`);
        throw err instanceof Error ? err : new Error(message);
      }
    }

    // Local venue — LuSE stocks and ZMW/simulated pairs (CEO carve-outs).
    const { data, error } = await supabase
      .from('orders')
      .insert({
        ...orderData,
        user_id: user.id,
        status: 'pending',
        filled_quantity: 0
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create order");
      throw error;
    }

    await queryClient.invalidateQueries({ queryKey: ["orders", user.id] });
    toast.success("Order created successfully");
    return data;
  };

  const cancelOrder = async (orderId: string) => {
    if (!user) return;
    if (await isDemo()) {
      const r = await DemoStockTrading.cancelOrder(orderId);
      if (!r.success) { toast.error(r.error || "Failed to cancel order"); throw new Error(r.error || 'Cancel failed'); }
      await queryClient.invalidateQueries({ queryKey: ["orders", user.id] });
      toast.success("Order cancelled");
      return;
    }

    // Alpaca orders must be cancelled on Alpaca — the local row is only a mirror.
    const cached = queryClient.getQueryData<Order[]>(["orders", user.id]);
    const target = cached?.find((o) => o.id === orderId);
    if (target?.venue === 'alpaca' && target.alpaca_order_id) {
      try {
        await AlpacaPaperService.cancelOrder(target.alpaca_order_id);
        await invalidateTradingQueries();
        toast.success("Order cancelled on Alpaca Sandbox");
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Alpaca Sandbox is unreachable';
        toast.error(`Could not cancel on Alpaca Sandbox: ${message}`);
        throw err instanceof Error ? err : new Error(message);
      }
    }

    const { error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .eq('user_id', user.id);

    if (error) {
      toast.error("Failed to cancel order");
      throw error;
    }

    await queryClient.invalidateQueries({ queryKey: ["orders", user.id] });
    toast.success("Order cancelled");
  };

  return {
    orders,
    isLoading,
    error,
    refetch,
    createOrder,
    cancelOrder
  };
};
