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
    const sumsubAppToken = Deno.env.get('SUMSUB_APP_TOKEN');
    const sumsubSecretKey = Deno.env.get('SUMSUB_SECRET_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get user from auth header
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

    const { action } = await req.json();

    if (!sumsubAppToken || !sumsubSecretKey) {
      // Return mock response for development
      console.log('Sumsub credentials not configured, returning dev mode');
      
      if (action === 'create_applicant') {
        return new Response(JSON.stringify({
          applicantId: `dev-${user.id.substring(0, 8)}`,
          inspectionId: `insp-${Date.now()}`,
          status: 'dev_mode',
          message: 'Sumsub not configured. Set SUMSUB_APP_TOKEN and SUMSUB_SECRET_KEY secrets.',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (action === 'get_access_token') {
        return new Response(JSON.stringify({
          token: 'dev-mode-token',
          userId: user.id,
          status: 'dev_mode',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // === Production Sumsub Integration ===
    const SUMSUB_BASE_URL = 'https://api.sumsub.com';

    async function sumsubRequest(method: string, path: string, body?: any) {
      const ts = Math.floor(Date.now() / 1000).toString();
      const bodyStr = body ? JSON.stringify(body) : '';
      
      // Create HMAC signature
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw', encoder.encode(sumsubSecretKey!),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
      );
      
      const signatureData = ts + method.toUpperCase() + path + bodyStr;
      const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signatureData));
      const signatureHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

      const response = await fetch(`${SUMSUB_BASE_URL}${path}`, {
        method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-App-Token': sumsubAppToken!,
          'X-App-Access-Ts': ts,
          'X-App-Access-Sig': signatureHex,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      return response.json();
    }

    if (action === 'create_applicant') {
      const applicant = await sumsubRequest('POST', '/resources/applicants?levelName=basic-kyc-level', {
        externalUserId: user.id,
        email: user.email,
      });

      // Update KYC status in database
      await supabase.from('kyc_verifications').upsert({
        user_id: user.id,
        verification_level: 'pending',
        aml_status: 'pending',
      });

      return new Response(JSON.stringify({
        applicantId: applicant.id,
        status: 'created',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'get_access_token') {
      const tokenData = await sumsubRequest('POST', `/resources/accessTokens?userId=${user.id}&levelName=basic-kyc-level`);

      return new Response(JSON.stringify({
        token: tokenData.token,
        userId: user.id,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'check_status') {
      const applicant = await sumsubRequest('GET', `/resources/applicants/-;externalUserId=${user.id}/one`);
      
      const isApproved = applicant?.review?.reviewResult?.reviewAnswer === 'GREEN';
      const isRejected = applicant?.review?.reviewResult?.reviewAnswer === 'RED';

      // Sync status to database
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
        applicant,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { 
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Sumsub KYC error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
