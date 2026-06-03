import { supabase } from "@/integrations/supabase/client";

export interface LuseListing {
  id: string;
  symbol: string;
  company_name: string;
  sector: string | null;
  currency: string;
  last_price: number;
  previous_close: number;
  day_change_pct: number;
  market_cap: number | null;
  shares_outstanding: number | null;
  lot_size: number;
  tick_size: number;
  is_active: boolean;
}

export interface LuseAccount {
  cash_balance: number;
  reserved_balance: number;
  starting_balance: number;
  positions_value: number;
  equity: number;
  unrealized_pnl: number;
  realized_pnl: number;
  total_pnl: number;
  currency: "ZMW";
}

export interface LusePosition {
  id: string;
  symbol: string;
  company_name?: string;
  shares: number;
  average_price: number;
  realized_pnl: number;
  current_price: number;
  market_value: number;
  cost_basis: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
}

export interface LuseTrade {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  shares: number;
  price: number;
  gross_amount: number;
  brokerage_fee: number;
  sec_levy: number;
  vat: number;
  csd_fee: number;
  total_fees: number;
  net_amount: number;
  realized_pnl: number;
  status: string;
  trade_date: string;
  settlement_date: string;
  executed_at: string;
}

export interface PlaceOrderInput {
  symbol: string;
  side: "buy" | "sell";
  shares: number;
  force_after_hours?: boolean;
}

async function call<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("luse-paper", { body: { action, ...payload } });
  if (error) throw new Error(error.message);
  if (data && (data as any).error) throw new Error((data as any).error);
  return data as T;
}

export const LusePaperService = {
  getAccount: () => call<{ ok: boolean; account: LuseAccount; market: { open: boolean; reason?: string } }>("get_account"),
  getListings: () => call<{ ok: boolean; listings: LuseListing[] }>("get_listings"),
  getPositions: () => call<{ ok: boolean; positions: LusePosition[] }>("get_positions"),
  getTrades: (limit = 100) => call<{ ok: boolean; trades: LuseTrade[] }>("get_trades", { limit }),
  getQuote: (symbol: string) => call<{ ok: boolean; quote: LuseListing }>("get_quote", { symbol }),
  placeOrder: (input: PlaceOrderInput) =>
    call<{ ok: boolean; trade: LuseTrade; fees: any; new_cash: number }>("place_order", input as any),
  resetDemo: () => call<{ ok: boolean }>("reset_demo"),
  reconcile: () => call<{ ok: boolean; positions: any[] }>("reconcile"),
};

export const formatZMW = (n: number) =>
  new Intl.NumberFormat("en-ZM", { style: "currency", currency: "ZMW", maximumFractionDigits: 2 }).format(n);
