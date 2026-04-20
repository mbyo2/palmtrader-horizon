// Alpaca Broker API integration (sandbox)
// Docs: https://docs.alpaca.markets/reference/broker-api
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const ALPACA_KEY = Deno.env.get('ALPACA_BROKER_API_KEY') ?? '';
const ALPACA_SECRET = Deno.env.get('ALPACA_BROKER_API_SECRET') ?? '';
const ALPACA_BASE = (Deno.env.get('ALPACA_BROKER_BASE_URL') ?? 'https://broker-api.sandbox.alpaca.markets').replace(/\/+$/, '');

function basicAuthHeader() {
  // Alpaca Broker API uses HTTP Basic auth: base64(KEY:SECRET)
  const token = btoa(`${ALPACA_KEY}:${ALPACA_SECRET}`);
  return `Basic ${token}`;
}

async function alpacaFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${ALPACA_BASE}${path}`, {
    ...init,
    headers: {
      'Authorization': basicAuthHeader(),
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
  if (!res.ok) {
    throw new Error(`Alpaca ${res.status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
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
    if (!ALPACA_KEY || !ALPACA_SECRET) {
      return jsonResponse({ error: 'Alpaca Broker credentials not configured' }, 500);
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

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
    if (authErr || !claims?.claims) return jsonResponse({ error: 'Invalid token' }, 401);
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const action: string = body.action ?? '';

    // Helper: get or fetch the user's linked alpaca account row
    async function getLinkedAccount() {
      const { data } = await adminClient
        .from('trading_accounts')
        .select('id, alpaca_account_id, alpaca_account_status, alpaca_account_number, account_type, balance')
        .eq('user_id', userId)
        .not('alpaca_account_id', 'is', null)
        .maybeSingle();
      return data;
    }

    switch (action) {
      case 'create_account': {
        // Onboard end-user as Alpaca sub-account.
        // Required fields per Alpaca Broker API.
        const { contact, identity, disclosures, agreements } = body;
        if (!contact || !identity || !disclosures || !agreements) {
          return jsonResponse({ error: 'Missing required onboarding fields (contact, identity, disclosures, agreements)' }, 400);
        }
        const created = await alpacaFetch('/v1/accounts', {
          method: 'POST',
          body: JSON.stringify({ contact, identity, disclosures, agreements, enabled_assets: ['us_equity'] }),
        });

        // Persist link on user's existing trading account, or create a "live" trading_account row.
        const { data: existing } = await adminClient
          .from('trading_accounts')
          .select('id')
          .eq('user_id', userId)
          .neq('account_type', 'demo')
          .maybeSingle();

        if (existing) {
          await adminClient.from('trading_accounts')
            .update({
              alpaca_account_id: created.id,
              alpaca_account_status: created.status,
              alpaca_account_number: created.account_number,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await adminClient.from('trading_accounts').insert({
            user_id: userId,
            account_type: 'live',
            account_name: 'Alpaca Live',
            currency: 'USD',
            balance: 0,
            available_balance: 0,
            is_active: true,
            alpaca_account_id: created.id,
            alpaca_account_status: created.status,
            alpaca_account_number: created.account_number,
          });
        }

        return jsonResponse({ ok: true, alpaca_account: created });
      }

      case 'get_account': {
        const linked = await getLinkedAccount();
        if (!linked?.alpaca_account_id) return jsonResponse({ ok: true, linked: false });

        const account = await alpacaFetch(`/v1/trading/accounts/${linked.alpaca_account_id}/account`);
        // Sync balance back to local trading_accounts
        const cash = Number(account.cash ?? 0);
        const buyingPower = Number(account.buying_power ?? cash);
        await adminClient.from('trading_accounts')
          .update({
            balance: cash,
            available_balance: buyingPower,
            alpaca_account_status: account.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', linked.id);
        return jsonResponse({ ok: true, linked: true, account });
      }

      case 'get_positions': {
        const linked = await getLinkedAccount();
        if (!linked?.alpaca_account_id) return jsonResponse({ ok: true, linked: false, positions: [] });
        const positions = await alpacaFetch(`/v1/trading/accounts/${linked.alpaca_account_id}/positions`);
        return jsonResponse({ ok: true, linked: true, positions });
      }

      case 'get_orders': {
        const linked = await getLinkedAccount();
        if (!linked?.alpaca_account_id) return jsonResponse({ ok: true, linked: false, orders: [] });
        const status = body.status ?? 'all';
        const limit = Math.min(Number(body.limit ?? 50), 500);
        const orders = await alpacaFetch(
          `/v1/trading/accounts/${linked.alpaca_account_id}/orders?status=${encodeURIComponent(status)}&limit=${limit}`,
        );
        return jsonResponse({ ok: true, linked: true, orders });
      }

      case 'place_order': {
        const linked = await getLinkedAccount();
        if (!linked?.alpaca_account_id) return jsonResponse({ error: 'No linked Alpaca account' }, 400);

        const { symbol, qty, side, type = 'market', time_in_force = 'day', limit_price, stop_price } = body;
        if (!symbol || !qty || !side) return jsonResponse({ error: 'symbol, qty and side are required' }, 400);

        const payload: Record<string, unknown> = {
          symbol,
          qty: String(qty),
          side,
          type,
          time_in_force,
        };
        if (limit_price != null) payload.limit_price = String(limit_price);
        if (stop_price != null) payload.stop_price = String(stop_price);

        const order = await alpacaFetch(
          `/v1/trading/accounts/${linked.alpaca_account_id}/orders`,
          { method: 'POST', body: JSON.stringify(payload) },
        );

        // Mirror the order locally for the UI
        await adminClient.from('orders').insert({
          user_id: userId,
          symbol,
          order_type: type,
          side,
          quantity: Number(qty),
          limit_price: limit_price != null ? Number(limit_price) : null,
          stop_price: stop_price != null ? Number(stop_price) : null,
          time_in_force,
          status: order.status ?? 'pending',
          alpaca_order_id: order.id,
          broker: 'alpaca',
        });

        return jsonResponse({ ok: true, order });
      }

      case 'cancel_order': {
        const linked = await getLinkedAccount();
        if (!linked?.alpaca_account_id) return jsonResponse({ error: 'No linked Alpaca account' }, 400);
        const { order_id } = body;
        if (!order_id) return jsonResponse({ error: 'order_id required' }, 400);
        await alpacaFetch(
          `/v1/trading/accounts/${linked.alpaca_account_id}/orders/${order_id}`,
          { method: 'DELETE' },
        );
        await adminClient.from('orders').update({ status: 'cancelled' }).eq('alpaca_order_id', order_id);
        return jsonResponse({ ok: true });
      }

      case 'get_quote': {
        const { symbol } = body;
        if (!symbol) return jsonResponse({ error: 'symbol required' }, 400);
        const data = await alpacaFetch(
          `/v1/marketdata/stocks/${encodeURIComponent(symbol)}/quotes/latest`,
        );
        return jsonResponse({ ok: true, quote: data });
      }

      case 'create_ach_relationship': {
        const linked = await getLinkedAccount();
        if (!linked?.alpaca_account_id) return jsonResponse({ error: 'No linked Alpaca account' }, 400);
        const { account_owner_name, bank_account_type, bank_account_number, bank_routing_number } = body;
        const ach = await alpacaFetch(
          `/v1/accounts/${linked.alpaca_account_id}/ach_relationships`,
          { method: 'POST', body: JSON.stringify({ account_owner_name, bank_account_type, bank_account_number, bank_routing_number }) },
        );
        return jsonResponse({ ok: true, ach });
      }

      case 'create_transfer': {
        const linked = await getLinkedAccount();
        if (!linked?.alpaca_account_id) return jsonResponse({ error: 'No linked Alpaca account' }, 400);
        const { relationship_id, amount, direction = 'INCOMING' } = body;
        const transfer = await alpacaFetch(
          `/v1/accounts/${linked.alpaca_account_id}/transfers`,
          { method: 'POST', body: JSON.stringify({ transfer_type: 'ach', relationship_id, amount: String(amount), direction }) },
        );
        return jsonResponse({ ok: true, transfer });
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error('alpaca-broker error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});
