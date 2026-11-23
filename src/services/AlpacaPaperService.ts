import { supabase } from "@/integrations/supabase/client";

/**
 * Alpaca sandbox transport.
 *
 * Despite the historical file name, this service talks to the ALPACA BROKER
 * SANDBOX via the `alpaca-broker` edge function — that is the Alpaca sandbox
 * the CEO configured for this project ("Alpaca sandbox api for a broker",
 * 2026-11-23). The older `alpaca-paper` function's ALPACA_PAPER_* keys are
 * rejected by Alpaca (401 on every call, verified 2026-11-23), so the paper
 * function is no longer used as a transport. Response shapes are normalized
 * here to the shapes existing consumers already expect.
 *
 * Broker-model note: each user trades through their own linked Alpaca
 * sandbox sub-account. When no account is linked yet, getAccount returns
 * `account: null` and order placement fails with Alpaca's own
 * "No linked Alpaca account" error — surfaced honestly, never simulated.
 */
export interface PaperOrderInput {
  symbol: string;
  qty?: number;
  notional?: number;
  side: "buy" | "sell";
  type?: "market" | "limit" | "stop" | "stop_limit";
  time_in_force?: "day" | "gtc" | "ioc" | "fok";
  limit_price?: number;
  stop_price?: number;
}

async function call<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("alpaca-broker", {
    body: { action, ...payload },
  });
  if (error) {
    // Recover the edge function's own error message (e.g. Alpaca's
    // rejection reason) instead of supabase-js's generic non-2xx text.
    let message = error.message;
    try {
      const ctx = (error as any).context as Response | undefined;
      if (ctx && typeof ctx.clone === "function") {
        const body = await ctx.clone().json();
        if (body?.error) message = String(body.error);
      }
    } catch { /* keep the generic message */ }
    throw new Error(message);
  }
  if (data && (data as any).error) throw new Error((data as any).error);
  return data as T;
}

/** Raw Alpaca order (broker shape) → the mirror-row shape the mappers below consume. */
function normalizeBrokerOrder(o: any): AlpacaMirrorOrder {
  const qty = Number(o?.qty ?? 0);
  const price = Number(o?.limit_price ?? o?.filled_avg_price ?? 0);
  return {
    id: String(o?.id ?? ""),
    user_id: "",
    symbol: String(o?.symbol ?? "").toUpperCase(),
    type: o?.side === "sell" ? "sell" : "buy",
    shares: qty,
    price,
    total_amount: qty * price,
    status: String(o?.status ?? "pending"),
    order_type: String(o?.type ?? "market"),
    broker: "alpaca_broker",
    alpaca_order_id: o?.id ?? null,
    is_fractional: qty % 1 !== 0,
    created_at: o?.created_at ?? o?.submitted_at ?? new Date().toISOString(),
    updated_at: o?.updated_at ?? o?.created_at ?? undefined,
    alpaca_status: o?.status,
    filled_qty: Number(o?.filled_qty ?? 0),
    filled_avg_price: o?.filled_avg_price != null ? Number(o.filled_avg_price) : null,
    alpaca: o ?? null,
  };
}

export const AlpacaPaperService = {
  /** Broker account for the signed-in user; `account` is null until onboarding links one. */
  getAccount: async (): Promise<{ ok: boolean; linked: boolean; account: any }> => {
    const res = await call<{ ok: boolean; linked: boolean; account?: any }>("get_account");
    return { ok: true, linked: !!res.linked, account: res.linked ? res.account : null };
  },

  getPositions: async (): Promise<{ ok: boolean; positions: any[]; all_positions: any[] }> => {
    const res = await call<{ ok: boolean; linked: boolean; positions: any[] }>("get_positions");
    const positions = res.positions ?? [];
    return { ok: true, positions, all_positions: positions };
  },

  /** Orders read back live from Alpaca (broker get_orders), normalized to mirror rows. */
  getOrders: async (limit = 50): Promise<{ ok: boolean; orders: AlpacaMirrorOrder[] }> => {
    const res = await call<{ ok: boolean; linked: boolean; orders: any[] }>("get_orders", {
      status: "all",
      limit,
    });
    return { ok: true, orders: (res.orders ?? []).map(normalizeBrokerOrder) };
  },

  placeOrder: async (input: PaperOrderInput): Promise<{ ok: boolean; order: any }> => {
    let qty = input.qty;
    if (qty == null && input.notional != null) {
      // The broker API takes quantities, not notionals — convert using the
      // latest Alpaca quote (ask for buys, bid for sells). If no quote is
      // available the order fails honestly rather than guessing a size.
      const quoteRes = await call<{ ok: boolean; quote: any }>("get_quote", { symbol: input.symbol });
      const q = quoteRes.quote?.quote ?? quoteRes.quote;
      const px = input.side === "buy" ? Number(q?.ap ?? q?.bp ?? 0) : Number(q?.bp ?? q?.ap ?? 0);
      if (!px || !Number.isFinite(px)) {
        throw new Error(`No live Alpaca quote available to size a $${input.notional} order for ${input.symbol}`);
      }
      qty = Number((input.notional / px).toFixed(6));
    }
    if (qty == null) throw new Error("qty or notional is required");
    return call<{ ok: boolean; order: any }>("place_order", {
      symbol: input.symbol,
      qty,
      side: input.side,
      type: input.type ?? "market",
      time_in_force: input.time_in_force ?? "day",
      limit_price: input.limit_price,
      stop_price: input.stop_price,
    });
  },

  cancelOrder: (order_id: string) => call("cancel_order", { order_id }),

  getQuote: (symbol: string) => call<{ ok: boolean; quote: any }>("get_quote", { symbol }),

  getClock: async (): Promise<{ ok: boolean; clock: { is_open: boolean; next_open: string; next_close: string } }> => {
    // The broker transport exposes no clock action; consumers catch this
    // and render market state as unknown rather than inventing it.
    throw new Error("Market clock is not available on the Alpaca broker sandbox transport");
  },

  getPortfolioHistory: async (
    _period: "1D" | "1W" | "1M" | "3M" | "1A" = "1M",
    _timeframe?: string,
  ): Promise<{ ok: boolean; history: { timestamp: number[]; equity: number[]; profit_loss: number[]; profit_loss_pct: number[]; base_value: number; timeframe: string } }> => {
    // The broker function exposes no portfolio-history action yet, so the
    // chart degrades to empty instead of erroring (or worse, faking a series).
    return {
      ok: true,
      history: { timestamp: [], equity: [], profit_loss: [], profit_loss_pct: [], base_value: 0, timeframe: "1D" },
    };
  },

  /** Realized P&L (FIFO) computed client-side from the user's filled Alpaca orders. */
  getRealizedPL: async (): Promise<{ ok: boolean; realized_total: number; realized_by_symbol: Record<string, number> }> => {
    const { orders } = await AlpacaPaperService.getOrders(500);
    const filled = orders
      .filter((o) => o.alpaca_status === "filled" || o.status === "filled")
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const lots: Record<string, Array<{ qty: number; price: number }>> = {};
    const realizedBySymbol: Record<string, number> = {};
    let realizedTotal = 0;
    for (const o of filled) {
      const sym = o.symbol;
      const qty = Number(o.filled_qty || o.shares);
      const price = Number(o.filled_avg_price ?? o.price);
      if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) continue;
      if (!lots[sym]) lots[sym] = [];
      if (o.type === "buy") {
        lots[sym].push({ qty, price });
      } else {
        let remaining = qty;
        while (remaining > 0 && lots[sym].length > 0) {
          const lot = lots[sym][0];
          const used = Math.min(lot.qty, remaining);
          const pnl = (price - lot.price) * used;
          realizedBySymbol[sym] = (realizedBySymbol[sym] ?? 0) + pnl;
          realizedTotal += pnl;
          lot.qty -= used;
          remaining -= used;
          if (lot.qty <= 0) lots[sym].shift();
        }
      }
    }
    return { ok: true, realized_total: realizedTotal, realized_by_symbol: realizedBySymbol };
  },
};

// ---------------------------------------------------------------------------
// Mappers — Alpaca paper payloads → the shapes the trade surfaces render.
// The alpaca-paper function's get_orders returns rows mirrored into the
// local `trades` table at placement time; the function overlays the live
// Alpaca status/fill fields (alpaca_status, filled_qty, filled_avg_price)
// onto each row, so Alpaca stays the source of truth for order state.
// ---------------------------------------------------------------------------

export interface AlpacaMirrorOrder {
  id: string;
  user_id: string;
  symbol: string;
  /** The mirror stores the side in `type`. */
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  total_amount: number;
  status: string;
  order_type: string;
  broker: string;
  alpaca_order_id: string | null;
  is_fractional?: boolean;
  created_at: string;
  updated_at?: string;
  /** Live overlay fields from Alpaca (present after the read-back upgrade). */
  alpaca_status?: string;
  filled_qty?: number;
  filled_avg_price?: number | null;
  alpaca?: Record<string, unknown> | null;
}

export type UiOrderStatus = 'pending' | 'filled' | 'cancelled' | 'rejected' | 'partial';

export function mapAlpacaStatus(raw: string | undefined | null): UiOrderStatus {
  switch ((raw ?? '').toLowerCase()) {
    case 'filled':
    case 'completed':
      return 'filled';
    case 'partially_filled':
    case 'partial':
      return 'partial';
    case 'canceled':
    case 'cancelled':
    case 'expired':
      return 'cancelled';
    case 'rejected':
      return 'rejected';
    default:
      return 'pending';
  }
}

export interface UiOrder {
  id: string;
  user_id: string;
  symbol: string;
  order_type: 'market' | 'limit' | 'stop' | 'stop_limit';
  side: 'buy' | 'sell';
  quantity: number;
  limit_price?: number;
  stop_price?: number;
  time_in_force: 'day' | 'gtc' | 'ioc' | 'fok';
  status: UiOrderStatus;
  filled_quantity: number;
  average_fill_price?: number;
  created_at: string;
  updated_at: string;
  venue: 'alpaca';
  alpaca_order_id: string | null;
}

/** Mirror row (with live overlay when available) → UI order shape. */
export function mapMirrorOrderToUiOrder(row: AlpacaMirrorOrder): UiOrder {
  const status = mapAlpacaStatus(row.alpaca_status ?? row.status);
  const filledQty = row.filled_qty != null
    ? Number(row.filled_qty)
    : status === 'filled'
      ? Number(row.shares)
      : 0;
  const orderType = (['market', 'limit', 'stop', 'stop_limit'].includes(row.order_type)
    ? row.order_type
    : 'market') as UiOrder['order_type'];
  return {
    id: row.id,
    user_id: row.user_id,
    symbol: row.symbol,
    order_type: orderType,
    side: row.type === 'sell' ? 'sell' : 'buy',
    quantity: Number(row.shares),
    limit_price: orderType === 'limit' || orderType === 'stop_limit' ? Number(row.price) || undefined : undefined,
    time_in_force: 'day',
    status,
    filled_quantity: filledQty,
    average_fill_price: row.filled_avg_price != null
      ? Number(row.filled_avg_price)
      : status === 'filled'
        ? Number(row.price) || undefined
        : undefined,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
    venue: 'alpaca',
    alpaca_order_id: row.alpaca_order_id,
  };
}

export interface UiPosition {
  id: string;
  user_id: string;
  symbol: string;
  quantity: number;
  average_cost: number;
  market_value?: number;
  unrealized_pnl?: number;
  realized_pnl: number;
  created_at: string;
  updated_at: string;
  venue: 'alpaca';
}

/** Raw Alpaca position → UI position shape. Crypto symbols stay in Alpaca form ('BTCUSD'). */
export function mapAlpacaPosition(p: any, userId: string): UiPosition {
  return {
    id: `alpaca-pos-${p.symbol}`,
    user_id: userId,
    symbol: String(p.symbol).toUpperCase(),
    quantity: Number(p.qty),
    average_cost: Number(p.avg_entry_price),
    market_value: p.market_value != null ? Number(p.market_value) : undefined,
    unrealized_pnl: p.unrealized_pl != null ? Number(p.unrealized_pl) : undefined,
    realized_pnl: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    venue: 'alpaca',
  };
}
