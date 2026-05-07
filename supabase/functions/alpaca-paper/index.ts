// Alpaca Paper Trading API integration (shared paper account for demo users)
// Docs: https://docs.alpaca.markets/reference/getaccount
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const PAPER_KEY = Deno.env.get('ALPACA_PAPER_API_KEY') ?? '';
const PAPER_SECRET = Deno.env.get('ALPACA_PAPER_API_SECRET') ?? '';
const PAPER_BASE = 'https://paper-api.alpaca.markets';
const DATA_BASE = 'https://data.alpaca.markets';

function alpacaHeaders() {
  return {
    'APCA-API-KEY-ID': PAPER_KEY,
    'APCA-API-SECRET-KEY': PAPER_SECRET,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
}

async function paperFetch(path: string, init: RequestInit = {}, base = PAPER_BASE) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...alpacaHeaders(), ...(init.headers ?? {}) },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
  if (!res.ok) {
    throw new Error(`Alpaca paper ${res.status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
  }
  return body;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!PAPER_KEY || !PAPER_SECRET) {
      return jsonResponse({ error: 'Alpaca paper credentials not configured' }, 500);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return jsonResponse({ error: 'Unauthorized' }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !userData?.user) return jsonResponse({ error: 'Invalid token' }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const action: string = body.action ?? '';

    switch (action) {
      case 'get_account': {
        const account = await paperFetch('/v2/account');
        return jsonResponse({ ok: true, account });
      }

      case 'get_positions': {
        const positions = await paperFetch('/v2/positions');
        // Filter to only show this user's mirrored positions
        const { data: mirrored } = await adminClient
          .from('trades')
          .select('symbol')
          .eq('user_id', userId)
          .eq('broker', 'alpaca_paper');
        const userSymbols = new Set((mirrored ?? []).map((t: any) => t.symbol));
        const userPositions = userSymbols.size > 0
          ? (positions as any[]).filter((p) => userSymbols.has(p.symbol))
          : [];
        return jsonResponse({ ok: true, positions: userPositions, all_positions: positions });
      }

      case 'get_orders': {
        const status = body.status ?? 'all';
        const limit = Math.min(Number(body.limit ?? 50), 500);
        // Pull this user's mirrored orders from local DB
        const { data: localOrders } = await adminClient
          .from('trades')
          .select('*')
          .eq('user_id', userId)
          .eq('broker', 'alpaca_paper')
          .order('created_at', { ascending: false })
          .limit(limit);
        return jsonResponse({ ok: true, orders: localOrders ?? [], status });
      }

      case 'place_order': {
        const { symbol, qty, side, type = 'market', time_in_force = 'day', limit_price, stop_price } = body;
        if (!symbol || !qty || !side) {
          return jsonResponse({ error: 'symbol, qty and side are required' }, 400);
        }

        const payload: Record<string, unknown> = {
          symbol: String(symbol).toUpperCase(),
          qty: String(qty),
          side,
          type,
          time_in_force,
        };
        if (limit_price != null) payload.limit_price = String(limit_price);
        if (stop_price != null) payload.stop_price = String(stop_price);

        const order = await paperFetch('/v2/orders', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        const filledPrice = Number(order.filled_avg_price ?? limit_price ?? 0);
        const filledQty = Number(order.filled_qty ?? qty);

        // Mirror into trades for UI history
        await adminClient.from('trades').insert({
          user_id: userId,
          symbol: payload.symbol,
          type: side,
          shares: Number(qty),
          price: filledPrice || Number(limit_price ?? 0),
          total_amount: (filledPrice || Number(limit_price ?? 0)) * Number(qty),
          status: order.status === 'filled' ? 'completed' : (order.status ?? 'pending'),
          order_type: type,
          broker: 'alpaca_paper',
          alpaca_order_id: order.id,
        } as any);

        return jsonResponse({ ok: true, order });
      }

      case 'cancel_order': {
        const { order_id } = body;
        if (!order_id) return jsonResponse({ error: 'order_id required' }, 400);
        await paperFetch(`/v2/orders/${order_id}`, { method: 'DELETE' });
        await adminClient.from('trades').update({ status: 'cancelled' }).eq('alpaca_order_id', order_id).eq('user_id', userId);
        return jsonResponse({ ok: true });
      }

      case 'get_quote': {
        const { symbol } = body;
        if (!symbol) return jsonResponse({ error: 'symbol required' }, 400);
        const data = await paperFetch(`/v2/stocks/${encodeURIComponent(symbol)}/quotes/latest?feed=iex`, {}, DATA_BASE);
        return jsonResponse({ ok: true, quote: data });
      }

      case 'get_clock': {
        const clock = await paperFetch('/v2/clock');
        return jsonResponse({ ok: true, clock });
      }

      case 'get_portfolio_history': {
        const period = String(body.period ?? '1M'); // 1D, 1W, 1M, 3M, 1A
        const timeframe = String(body.timeframe ?? (period === '1D' ? '5Min' : period === '1W' ? '1H' : '1D'));
        const qs = new URLSearchParams({ period, timeframe, extended_hours: 'true' });
        const history = await paperFetch(`/v2/account/portfolio/history?${qs.toString()}`);
        return jsonResponse({ ok: true, history });
      }

      case 'get_realized_pl': {
        // Compute realized P&L (FIFO) from this user's mirrored paper trades
        const { data: trades } = await adminClient
          .from('trades')
          .select('symbol, type, shares, price, created_at, status')
          .eq('user_id', userId)
          .eq('broker', 'alpaca_paper')
          .in('status', ['completed', 'filled'])
          .order('created_at', { ascending: true });

        const lots: Record<string, Array<{ qty: number; price: number }>> = {};
        const realizedBySymbol: Record<string, number> = {};
        let realizedTotal = 0;

        for (const t of (trades ?? []) as any[]) {
          const sym = t.symbol;
          const qty = Number(t.shares);
          const price = Number(t.price);
          if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price)) continue;
          if (!lots[sym]) lots[sym] = [];

          if (t.type === 'buy') {
            lots[sym].push({ qty, price });
          } else if (t.type === 'sell') {
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

        return jsonResponse({ ok: true, realized_total: realizedTotal, realized_by_symbol: realizedBySymbol });
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error('alpaca-paper error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});
