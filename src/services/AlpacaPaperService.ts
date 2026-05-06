import { supabase } from "@/integrations/supabase/client";

export interface PaperOrderInput {
  symbol: string;
  qty: number;
  side: "buy" | "sell";
  type?: "market" | "limit" | "stop" | "stop_limit";
  time_in_force?: "day" | "gtc" | "ioc" | "fok";
  limit_price?: number;
  stop_price?: number;
}

async function call<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("alpaca-paper", {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message);
  if (data && (data as any).error) throw new Error((data as any).error);
  return data as T;
}

export const AlpacaPaperService = {
  getAccount: () => call<{ ok: boolean; account: any }>("get_account"),
  getPositions: () => call<{ ok: boolean; positions: any[]; all_positions: any[] }>("get_positions"),
  getOrders: (limit = 50) => call<{ ok: boolean; orders: any[] }>("get_orders", { limit }),
  placeOrder: (input: PaperOrderInput) => call<{ ok: boolean; order: any }>("place_order", input as any),
  cancelOrder: (order_id: string) => call("cancel_order", { order_id }),
  getQuote: (symbol: string) => call<{ ok: boolean; quote: any }>("get_quote", { symbol }),
  getClock: () => call<{ ok: boolean; clock: { is_open: boolean; next_open: string; next_close: string } }>("get_clock"),
};
