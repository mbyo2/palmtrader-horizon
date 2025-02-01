import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BankAccountVerification {
  accountNumber: string;
  bankName: string;
  accountName: string;
}

interface FundTransfer {
  amount: number;
  bankAccountId: string;
  direction: 'deposit' | 'withdrawal';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, data } = await req.json()

    switch (action) {
      case 'verifyAccount':
        return await handleAccountVerification(data as BankAccountVerification, supabaseClient)
      case 'processTransfer':
        return await handleFundTransfer(data as FundTransfer, supabaseClient)
      default:
        throw new Error('Invalid action')
    }
  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function handleAccountVerification(data: BankAccountVerification, supabaseClient: any) {
  console.log('Verifying account:', data)
  
  // TODO: Integrate with DPO Group API for real verification
  // For now, simulate verification
  const isValid = data.accountNumber.length >= 8

  if (!isValid) {
    throw new Error('Invalid account details')
  }

  return new Response(
    JSON.stringify({ 
      success: true,
      verified: true,
      accountName: data.accountName 
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function handleFundTransfer(data: FundTransfer, supabaseClient: any) {
  console.log('Processing transfer:', data)

  // Get bank account details
  const { data: bankAccount, error: bankError } = await supabaseClient
    .from('bank_accounts')
    .select('*')
    .eq('id', data.bankAccountId)
    .single()

  if (bankError) throw new Error('Bank account not found')

  // TODO: Integrate with DPO Group API for real transfer
  // For now, create a pending transfer record
  const { data: transfer, error: transferError } = await supabaseClient
    .from('fund_transfers')
    .insert({
      bank_account_id: data.bankAccountId,
      amount: data.amount,
      direction: data.direction,
      status: 'pending',
      transaction_ref: `TR${Date.now()}`,
    })
    .select()
    .single()

  if (transferError) throw new Error('Failed to create transfer record')

  return new Response(
    JSON.stringify({ 
      success: true,
      transfer 
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}