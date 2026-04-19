import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-didit-signature, x-didit-timestamp',
};

const DIDIT_BASE_URL = 'https://verification.didit.me';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const diditApiKey = Deno.env.get('DIDIT_API_KEY');
    const diditWorkflowId = Deno.env.get('DIDIT_WORKFLOW_ID');
    const diditWebhookSecret = Deno.env.get('DIDIT_WEBHOOK_SECRET');

    const supabase = createClient(supabaseUrl, supabaseKey);
    const url = new URL(req.url);
    const isWebhook = url.pathname.endsWith('/webhook');

    // === Webhook handler (no auth required, verify HMAC instead) ===
    if (isWebhook) {
      const rawBody = await req.text();
      const signature = req.headers.get('x-didit-signature') || '';
      const timestamp = req.headers.get('x-didit-timestamp') || '';

      if (diditWebhookSecret) {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          'raw', encoder.encode(diditWebhookSecret),
          { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
        );
        const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
        const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
        if (computed !== signature) {
          console.warn('Didit webhook signature mismatch');
          return new Response(JSON.stringify({ error: 'Invalid signature' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      const event = JSON.parse(rawBody);
      const userId = event?.vendor_data; // we set vendor_data = user.id
      const status = event?.status || event?.decision?.status;

      if (userId && status) {
        const isApproved = status === 'Approved' || status === 'approved';
        const isRejected = status === 'Declined' || status === 'declined' || status === 'rejected';

        if (isApproved) {
          await supabase.from('kyc_verifications').upsert({
            user_id: userId,
            verification_level: 'verified',
            identity_verified: true,
            aml_status: 'clear',
            last_verification_date: new Date().toISOString(),
          });
          await supabase.from('account_details').update({ kyc_status: 'verified' }).eq('id', userId);
        } else if (isRejected) {
          await supabase.from('account_details').update({ kyc_status: 'rejected' }).eq('id', userId);
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // === Authenticated user actions ===
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

    const { action, callback_url } = await req.json();

    // Dev mode fallback
    if (!diditApiKey || !diditWorkflowId) {
      console.log('Didit credentials not configured, returning dev mode');
      if (action === 'create_session') {
        return new Response(JSON.stringify({
          sessionId: `dev-${user.id.substring(0, 8)}`,
          url: null,
          status: 'dev_mode',
          message: 'Didit not configured. Set DIDIT_API_KEY and DIDIT_WORKFLOW_ID secrets.',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (action === 'check_status') {
        return new Response(JSON.stringify({ status: 'dev_mode' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    async function diditRequest(method: string, path: string, body?: any) {
      const res = await fetch(`${DIDIT_BASE_URL}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': diditApiKey!,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
      if (!res.ok) {
        throw new Error(`Didit API ${res.status}: ${JSON.stringify(data)}`);
      }
      return data;
    }

    if (action === 'create_session') {
      const session = await diditRequest('POST', '/v3/session/', {
        workflow_id: diditWorkflowId,
        vendor_data: user.id,
        callback: callback_url || `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/onboarding`,
        contact_details: { email: user.email },
      });

      await supabase.from('kyc_verifications').upsert({
        user_id: user.id,
        verification_level: 'pending',
        aml_status: 'pending',
      });

      return new Response(JSON.stringify({
        sessionId: session.session_id || session.id,
        url: session.url || session.verification_url,
        status: 'created',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'check_status') {
      // Look up most recent session for this user via vendor_data
      // Didit doesn't expose a public lookup-by-vendor endpoint universally,
      // so we rely on stored session_id if available.
      const { data: kyc } = await supabase
        .from('kyc_verifications')
        .select('verification_notes')
        .eq('user_id', user.id)
        .maybeSingle();

      let sessionId: string | null = null;
      try {
        sessionId = kyc?.verification_notes ? JSON.parse(kyc.verification_notes).session_id : null;
      } catch { /* ignore */ }

      if (!sessionId) {
        return new Response(JSON.stringify({ status: 'not_started' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const session = await diditRequest('GET', `/v3/session/${sessionId}/`);
      const status = session?.status;
      const isApproved = status === 'Approved';
      const isRejected = status === 'Declined';

      if (isApproved) {
        await supabase.from('kyc_verifications').upsert({
          user_id: user.id,
          verification_level: 'verified',
          identity_verified: true,
          aml_status: 'clear',
          last_verification_date: new Date().toISOString(),
        });
        await supabase.from('account_details').update({ kyc_status: 'verified' }).eq('id', user.id);
      } else if (isRejected) {
        await supabase.from('account_details').update({ kyc_status: 'rejected' }).eq('id', user.id);
      }

      return new Response(JSON.stringify({
        status: isApproved ? 'approved' : isRejected ? 'rejected' : 'pending',
        session,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Didit KYC error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
