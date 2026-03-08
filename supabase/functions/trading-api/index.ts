import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-api-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate via API key OR Bearer token
    const apiKey = req.headers.get('x-api-key');
    const apiSecret = req.headers.get('x-api-secret');
    const authHeader = req.headers.get('Authorization');
    
    let userId: string | null = null;
    let permissions: string[] = ['read'];

    if (apiKey && apiSecret) {
      // API key auth
      const { data: keyData } = await supabase
        .from('api_keys')
        .select('*')
        .eq('api_key', apiKey)
        .eq('api_secret', apiSecret)
        .eq('is_active', true)
        .single();

      if (!keyData) {
        return new Response(JSON.stringify({ error: 'Invalid API credentials' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check IP whitelist
      if (keyData.ip_whitelist?.length > 0) {
        const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
        if (!keyData.ip_whitelist.includes(clientIP)) {
          return new Response(JSON.stringify({ error: 'IP not whitelisted' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      userId = keyData.user_id;
      permissions = keyData.permissions;

      // Update last used
      await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyData.id);
    } else if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      userId = user.id;
      permissions = ['read', 'trade', 'withdraw'];
    } else {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(req.url);
    const path = url.pathname.split('/').filter(Boolean);
    const endpoint = path[path.length - 1] || '';

    // === PUBLIC ENDPOINTS ===
    if (req.method === 'GET' && endpoint === 'pairs') {
      const { data } = await supabase.from('trading_pairs').select('*').eq('is_active', true);
      return jsonResponse({ pairs: data });
    }

    if (req.method === 'GET' && endpoint === 'orderbook') {
      const pairId = url.searchParams.get('pair_id');
      if (!pairId) return jsonResponse({ error: 'pair_id required' }, 400);
      
      const { data: orders } = await supabase
        .from('spot_orders')
        .select('side, price, quantity, filled_quantity, remaining_quantity')
        .eq('pair_id', pairId)
        .in('status', ['open', 'partially_filled'])
        .eq('order_type', 'limit');

      const bids: Record<string, number> = {};
      const asks: Record<string, number> = {};
      (orders || []).forEach((o: any) => {
        const remaining = Number(o.remaining_quantity) || (Number(o.quantity) - Number(o.filled_quantity));
        const bucket = o.side === 'buy' ? bids : asks;
        bucket[o.price] = (bucket[o.price] || 0) + remaining;
      });

      return jsonResponse({
        bids: Object.entries(bids).map(([p, q]) => [Number(p), q]).sort((a: any, b: any) => b[0] - a[0]).slice(0, 20),
        asks: Object.entries(asks).map(([p, q]) => [Number(p), q]).sort((a: any, b: any) => a[0] - b[0]).slice(0, 20),
      });
    }

    if (req.method === 'GET' && endpoint === 'ticker') {
      const pairId = url.searchParams.get('pair_id');
      const { data: trades } = await supabase
        .from('spot_trades')
        .select('price, quantity, created_at')
        .eq('pair_id', pairId || '')
        .order('created_at', { ascending: false })
        .limit(1);

      return jsonResponse({ lastPrice: trades?.[0]?.price || 0 });
    }

    if (req.method === 'GET' && endpoint === 'fee-tiers') {
      const { data } = await supabase.from('fee_tiers').select('*').order('tier_level');
      return jsonResponse({ tiers: data });
    }

    // === AUTHENTICATED ENDPOINTS ===
    if (!permissions.includes('read') && req.method === 'GET') {
      return jsonResponse({ error: 'Insufficient permissions' }, 403);
    }

    if (req.method === 'GET' && endpoint === 'account') {
      const { data: volume } = await supabase
        .from('user_trading_volumes')
        .select('*, fee_tiers(*)')
        .eq('user_id', userId)
        .single();

      const { data: account } = await supabase
        .from('trading_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      return jsonResponse({ account, volume });
    }

    if (req.method === 'GET' && endpoint === 'orders') {
      const status = url.searchParams.get('status') || 'open';
      const { data } = await supabase
        .from('spot_orders')
        .select('*')
        .eq('user_id', userId)
        .in('status', status === 'open' ? ['open', 'partially_filled'] : [status])
        .order('created_at', { ascending: false })
        .limit(100);
      return jsonResponse({ orders: data });
    }

    // === TRADE ENDPOINTS ===
    if (req.method === 'POST' && endpoint === 'order') {
      if (!permissions.includes('trade')) {
        return jsonResponse({ error: 'Trade permission required' }, 403);
      }

      const body = await req.json();
      const { pair_id, side, order_type, quantity, price, time_in_force } = body;

      if (!pair_id || !side || !order_type || !quantity) {
        return jsonResponse({ error: 'Missing required fields: pair_id, side, order_type, quantity' }, 400);
      }

      const orderData: any = {
        user_id: userId,
        pair_id,
        side,
        order_type,
        quantity,
        filled_quantity: 0,
        remaining_quantity: quantity,
        time_in_force: time_in_force || 'GTC',
        status: 'open'
      };
      if (price) orderData.price = price;

      const { data, error } = await supabase
        .from('spot_orders')
        .insert(orderData)
        .select('id, status, created_at')
        .single();

      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ order: data }, 201);
    }

    if (req.method === 'DELETE' && endpoint === 'order') {
      if (!permissions.includes('trade')) {
        return jsonResponse({ error: 'Trade permission required' }, 403);
      }
      const orderId = url.searchParams.get('order_id');
      const { error } = await supabase
        .from('spot_orders')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('user_id', userId);

      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: 'Unknown endpoint', available: ['/pairs', '/orderbook', '/ticker', '/fee-tiers', '/account', '/orders', '/order'] }, 404);

  } catch (error: any) {
    console.error('Trading API error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-api-secret',
      'Content-Type': 'application/json'
    }
  });
}
