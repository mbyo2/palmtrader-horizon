
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

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization header required')
    }

    // Create a client with the user's token to get their ID
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { action, data } = await req.json()

    switch (action) {
      case 'verifyAccount':
        return await handleAccountVerification(data as BankAccountVerification, supabaseClient)
      case 'processTransfer':
        return await handleFundTransfer(data as FundTransfer, supabaseClient, user.id)
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
  
  // Basic validation
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

async function handleFundTransfer(data: FundTransfer, supabaseClient: any, userId: string) {
  console.log('Processing transfer:', data, 'for user:', userId)

  // Validate amount
  if (data.amount <= 0) {
    throw new Error('Amount must be greater than 0')
  }

  // Get bank account details and verify ownership
  const { data: bankAccount, error: bankError } = await supabaseClient
    .from('bank_accounts')
    .select('*')
    .eq('id', data.bankAccountId)
    .eq('user_id', userId)
    .single()

  if (bankError || !bankAccount) {
    throw new Error('Bank account not found or unauthorized')
  }

  // Get or create wallet
  let wallet = null
  const { data: existingWallet, error: walletError } = await supabaseClient
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .eq('currency', 'USD')
    .single()

  if (walletError && walletError.code === 'PGRST116') {
    // Create wallet if it doesn't exist
    const { data: newWallet, error: createError } = await supabaseClient
      .from('wallets')
      .insert({
        user_id: userId,
        currency: 'USD',
        available_balance: 0,
        reserved_balance: 0
      })
      .select()
      .single()
    
    if (createError) throw new Error('Failed to create wallet')
    wallet = newWallet
  } else if (walletError) {
    throw new Error('Failed to fetch wallet')
  } else {
    wallet = existingWallet
  }

  // For withdrawals, check sufficient balance
  if (data.direction === 'withdrawal') {
    if (wallet.available_balance < data.amount) {
      throw new Error('Insufficient funds')
    }
  }

  // Calculate new balance
  const newBalance = data.direction === 'deposit' 
    ? wallet.available_balance + data.amount
    : wallet.available_balance - data.amount

  // Update wallet balance
  const { error: updateError } = await supabaseClient
    .from('wallets')
    .update({ 
      available_balance: newBalance,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('currency', 'USD')

  if (updateError) {
    throw new Error('Failed to update wallet balance')
  }

  // Create transfer record
  const { data: transfer, error: transferError } = await supabaseClient
    .from('fund_transfers')
    .insert({
      user_id: userId,
      bank_account_id: data.bankAccountId,
      amount: data.amount,
      direction: data.direction,
      status: data.direction === 'deposit' ? 'completed' : 'pending',
      transaction_ref: `TR${Date.now()}`,
    })
    .select()
    .single()

  if (transferError) throw new Error('Failed to create transfer record')

  // Create transaction record
  await supabaseClient
    .from('transactions')
    .insert({
      user_id: userId,
      transaction_type: data.direction,
      amount: data.direction === 'deposit' ? data.amount : -data.amount,
      currency: 'USD',
      status: data.direction === 'deposit' ? 'completed' : 'pending',
      description: `${data.direction === 'deposit' ? 'Deposit from' : 'Withdrawal to'} ${bankAccount.bank_name}`,
      reference_number: transfer.transaction_ref
    })

  return new Response(
    JSON.stringify({ 
      success: true,
      transfer,
      newBalance
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}
