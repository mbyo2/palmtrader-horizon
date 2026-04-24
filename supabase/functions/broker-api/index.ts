import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const brokerApiKey = Deno.env.get('BROKER_API_KEY');
    const brokerApiUrl = Deno.env.get('BROKER_API_URL');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { 
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { action, ...params } = await req.json();

    // Check if broker API is configured
    if (!brokerApiKey || !brokerApiUrl) {
      console.log('Broker API not configured - running in simulation mode');
      
      if (action === 'execute_order') {
        const { symbol, side, quantity, price, orderType } = params;
        
        // Simulate execution with slight slippage
        const slippage = price * (Math.random() * 0.001);
        const fillPrice = side === 'buy' ? price + slippage : price - slippage;
        
        // Record the trade in database
        const { data: trade, error: tradeError } = await supabase.from('trades').insert({
          user_id: user.id,
          symbol,
          type: side,
          shares: quantity,
          price: fillPrice,
          status: 'completed',
          order_type: orderType || 'market',
        }).select().single();

        if (tradeError) throw tradeError;

        return new Response(JSON.stringify({
          orderId: trade.id,
          status: 'filled',
          fillPrice,
          fillQuantity: quantity,
          execution: 'simulated',
          message: 'Order executed in simulation mode. Configure BROKER_API_KEY for live execution.',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (action === 'get_quote') {
        return new Response(JSON.stringify({
          mode: 'simulation',
          message: 'Configure BROKER_API_KEY and BROKER_API_URL for live market data',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (action === 'get_account') {
        const { data: account } = await supabase
          .from('trading_accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        return new Response(JSON.stringify({
          account,
          mode: 'simulation',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // === Production Broker API Integration ===
    // Supports: Interactive Brokers, cTrader, or custom broker API
    
    async function brokerRequest(method: string, path: string, body?: any) {
      const response = await fetch(`${brokerApiUrl}${path}`, {
        method,
        headers: {
          'Authorization': `Bearer ${brokerApiKey}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return response.json();
    }

    if (action === 'execute_order') {
      const { symbol, side, quantity, price, orderType } = params;

      // Validate order before sending to broker
      const { data: account } = await supabase
        .from('trading_accounts')
        .select('balance, account_type')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!account) {
        return new Response(JSON.stringify({ error: 'No active trading account' }), { 
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Check sufficient funds for buy orders
      if (side === 'buy' && account.balance < price * quantity) {
        return new Response(JSON.stringify({ error: 'Insufficient funds' }), { 
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Send to broker
      const brokerResult = await brokerRequest('POST', '/orders', {
        symbol,
        side,
        quantity,
        price,
        type: orderType,
        accountId: user.id,
      });

      // Record in database
      await supabase.from('trades').insert({
        user_id: user.id,
        symbol,
        type: side,
        shares: quantity,
        price: brokerResult.fillPrice || price,
        status: brokerResult.status === 'filled' ? 'completed' : 'pending',
        order_type: orderType,
      });

      return new Response(JSON.stringify(brokerResult), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (action === 'get_positions') {
      const positions = await brokerRequest('GET', `/positions/${user.id}`);
      return new Response(JSON.stringify(positions), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { 
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Broker API error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
