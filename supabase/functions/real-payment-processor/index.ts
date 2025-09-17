import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  action: 'process_payment' | 'verify_bank' | 'create_wallet' | 'process_withdrawal';
  userId: string;
  amount?: number;
  currency?: string;
  paymentMethodId?: string;
  bankAccountId?: string;
  metadata?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await req.json();
    if (error) throw error;

    const request = data as PaymentRequest;

    switch (request.action) {
      case 'process_payment':
        return await processPayment(request, supabaseClient);
      case 'verify_bank':
        return await verifyBankAccount(request, supabaseClient);
      case 'create_wallet':
        return await createWallet(request, supabaseClient);
      case 'process_withdrawal':
        return await processWithdrawal(request, supabaseClient);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function processPayment(request: PaymentRequest, supabaseClient: any) {
  const { userId, amount, currency = 'USD', paymentMethodId, metadata } = request;

  try {
    // Get payment method details
    const { data: paymentMethod, error: pmError } = await supabaseClient
      .from('payment_methods')
      .select('*')
      .eq('id', paymentMethodId)
      .eq('user_id', userId)
      .single();

    if (pmError) throw pmError;

    // Process payment based on provider
    let paymentResult;
    switch (paymentMethod.provider) {
      case 'stripe':
        paymentResult = await processStripePayment(amount, currency, paymentMethod);
        break;
      case 'plaid':
        paymentResult = await processPlaidTransfer(amount, paymentMethod);
        break;
      default:
        paymentResult = await processGenericPayment(amount, currency, paymentMethod);
    }

    if (!paymentResult.success) {
      throw new Error(paymentResult.error || 'Payment processing failed');
    }

    // Record transaction
    const { data: transaction, error: txError } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: userId,
        payment_method_id: paymentMethodId,
        transaction_type: 'deposit',
        amount,
        currency,
        status: 'completed',
        external_transaction_id: paymentResult.transactionId,
        description: `Deposit via ${paymentMethod.provider}`,
        metadata: { ...metadata, providerResponse: paymentResult.providerData }
      })
      .select()
      .single();

    if (txError) throw txError;

    // Update wallet balance
    await updateWalletBalance(supabaseClient, userId, currency, amount);

    // Log system event
    await logSystemEvent(supabaseClient, 'info', 'payment', 
      `Payment processed: $${amount} ${currency} for user ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        transactionId: transaction.id,
        providerTransactionId: paymentResult.transactionId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    // Log error
    await logSystemEvent(supabaseClient, 'error', 'payment', 
      `Payment failed for user ${userId}: ${error.message}`);

    throw error;
  }
}

async function verifyBankAccount(request: PaymentRequest, supabaseClient: any) {
  const { userId, bankAccountId } = request;

  try {
    // Get bank account details
    const { data: bankAccount, error: baError } = await supabaseClient
      .from('bank_accounts')
      .select('*')
      .eq('id', bankAccountId)
      .eq('user_id', userId)
      .single();

    if (baError) throw baError;

    // Simulate bank verification (in production, use actual bank verification API)
    const verificationResult = await simulateBankVerification(bankAccount);

    // Update bank account verification status
    const { error: updateError } = await supabaseClient
      .from('bank_accounts')
      .update({ 
        is_verified: verificationResult.success,
        updated_at: new Date().toISOString()
      })
      .eq('id', bankAccountId);

    if (updateError) throw updateError;

    await logSystemEvent(supabaseClient, 'info', 'banking', 
      `Bank account verification ${verificationResult.success ? 'successful' : 'failed'} for user ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: verificationResult.success,
        verified: verificationResult.success,
        message: verificationResult.message
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    await logSystemEvent(supabaseClient, 'error', 'banking', 
      `Bank verification failed for user ${userId}: ${error.message}`);
    throw error;
  }
}

async function createWallet(request: PaymentRequest, supabaseClient: any) {
  const { userId, currency = 'USD' } = request;

  try {
    // Create or update wallet
    const { data: wallet, error: walletError } = await supabaseClient
      .from('wallets')
      .upsert({
        user_id: userId,
        currency,
        available_balance: 0
      }, {
        onConflict: 'user_id,currency'
      })
      .select()
      .single();

    if (walletError) throw walletError;

    await logSystemEvent(supabaseClient, 'info', 'wallet', 
      `Wallet created for user ${userId} in ${currency}`);

    return new Response(
      JSON.stringify({ success: true, wallet }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    await logSystemEvent(supabaseClient, 'error', 'wallet', 
      `Wallet creation failed for user ${userId}: ${error.message}`);
    throw error;
  }
}

async function processWithdrawal(request: PaymentRequest, supabaseClient: any) {
  const { userId, amount, currency = 'USD', bankAccountId } = request;

  try {
    // Check wallet balance
    const { data: wallet, error: walletError } = await supabaseClient
      .from('wallets')
      .select('available_balance')
      .eq('user_id', userId)
      .eq('currency', currency)
      .single();

    if (walletError) throw walletError;

    if (wallet.available_balance < amount) {
      throw new Error('Insufficient funds');
    }

    // Create withdrawal transaction
    const { data: transaction, error: txError } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: userId,
        transaction_type: 'withdrawal',
        amount: -amount,
        currency,
        status: 'pending',
        description: `Withdrawal to bank account`,
        metadata: { bankAccountId }
      })
      .select()
      .single();

    if (txError) throw txError;

    // Update wallet balance (reduce available funds)
    await updateWalletBalance(supabaseClient, userId, currency, -amount);

    await logSystemEvent(supabaseClient, 'info', 'payment', 
      `Withdrawal initiated: $${amount} ${currency} for user ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        transactionId: transaction.id,
        status: 'pending'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    await logSystemEvent(supabaseClient, 'error', 'payment', 
      `Withdrawal failed for user ${userId}: ${error.message}`);
    throw error;
  }
}

// Helper functions
async function processStripePayment(amount: number, currency: string, paymentMethod: any) {
  // Simulate Stripe payment processing
  return {
    success: true,
    transactionId: `stripe_${Date.now()}`,
    providerData: { stripe_payment_intent: `pi_${Date.now()}` }
  };
}

async function processPlaidTransfer(amount: number, paymentMethod: any) {
  // Simulate Plaid ACH transfer
  return {
    success: true,
    transactionId: `plaid_${Date.now()}`,
    providerData: { plaid_transfer_id: `transfer_${Date.now()}` }
  };
}

async function processGenericPayment(amount: number, currency: string, paymentMethod: any) {
  // Generic payment processing simulation
  return {
    success: Math.random() > 0.1, // 90% success rate
    transactionId: `generic_${Date.now()}`,
    providerData: { provider: paymentMethod.provider }
  };
}

async function simulateBankVerification(bankAccount: any) {
  // Simulate bank account verification
  return {
    success: Math.random() > 0.2, // 80% success rate
    message: 'Bank account verified successfully'
  };
}

async function updateWalletBalance(supabaseClient: any, userId: string, currency: string, amount: number) {
  const { error } = await supabaseClient
    .from('wallets')
    .update({
      available_balance: supabaseClient.sql`available_balance + ${amount}`,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('currency', currency);

  if (error) throw error;
}

async function logSystemEvent(supabaseClient: any, level: string, service: string, message: string) {
  await supabaseClient
    .from('system_logs')
    .insert({
      level,
      service,
      message,
      metadata: { timestamp: new Date().toISOString() }
    });
}