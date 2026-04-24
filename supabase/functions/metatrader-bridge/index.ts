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
    const mtApiToken = Deno.env.get('METATRADER_API_TOKEN');
    const mtManagerUrl = Deno.env.get('METATRADER_MANAGER_URL');
    
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

    if (!mtApiToken || !mtManagerUrl) {
      console.log('MetaTrader not configured');
      
      if (action === 'create_account') {
        return new Response(JSON.stringify({
          status: 'not_configured',
          message: 'MetaTrader integration requires METATRADER_API_TOKEN and METATRADER_MANAGER_URL. Contact your MT4/MT5 broker to obtain Manager API credentials.',
          supportedBrokers: [
            'MetaQuotes (MT5)',
            'Any MT4/MT5 White Label broker',
            'cTrader (via Open API)',
          ],
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (action === 'get_status') {
        return new Response(JSON.stringify({
          configured: false,
          mt4: false,
          mt5: false,
          message: 'Set up MetaTrader Manager API credentials to enable MT4/MT5 trading.',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({
        error: 'MetaTrader not configured',
        setup_guide: {
          step1: 'Obtain MT4/MT5 broker license or white-label agreement',
          step2: 'Get Manager API credentials from your broker',
          step3: 'Set METATRADER_API_TOKEN and METATRADER_MANAGER_URL as Supabase secrets',
          step4: 'Users can then link their MT accounts to Palm Cacia',
        },
      }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // === Production MetaTrader Manager API ===
    async function mtRequest(method: string, path: string, body?: any) {
      const response = await fetch(`${mtManagerUrl}${path}`, {
        method,
        headers: {
          'Authorization': `Bearer ${mtApiToken}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return response.json();
    }

    if (action === 'create_account') {
      const { accountType, leverage, currency } = params;
      
      const mtAccount = await mtRequest('POST', '/accounts', {
        group: accountType === 'demo' ? 'demo\\standard' : 'real\\standard',
        leverage: leverage || 100,
        currency: currency || 'USD',
        name: user.email,
        email: user.email,
      });

      // Store MT account link in our database
      await supabase.from('trading_accounts').update({
        mt_account_id: mtAccount.login,
        mt_server: mtManagerUrl,
      }).eq('user_id', user.id).eq('is_active', true);

      return new Response(JSON.stringify({
        login: mtAccount.login,
        password: mtAccount.password,
        server: mtAccount.server,
        platform: mtAccount.platform || 'MT5',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'get_positions') {
      const { data: account } = await supabase
        .from('trading_accounts')
        .select('mt_account_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!account?.mt_account_id) {
        return new Response(JSON.stringify({ error: 'No MT account linked' }), { 
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const positions = await mtRequest('GET', `/accounts/${account.mt_account_id}/positions`);
      return new Response(JSON.stringify(positions), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (action === 'execute_trade') {
      const { data: account } = await supabase
        .from('trading_accounts')
        .select('mt_account_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!account?.mt_account_id) {
        return new Response(JSON.stringify({ error: 'No MT account linked' }), { 
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const { symbol, side, volume, price, sl, tp } = params;
      const trade = await mtRequest('POST', `/accounts/${account.mt_account_id}/trade`, {
        symbol, action: side === 'buy' ? 0 : 1,
        volume, price, sl, tp,
        comment: 'PalmCacia',
      });

      return new Response(JSON.stringify(trade), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { 
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('MetaTrader bridge error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
