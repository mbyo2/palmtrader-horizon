
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PaymentMethod {
  id: string;
  user_id: string;
  method_type: "bank_account" | "credit_card" | "debit_card" | "wire_transfer" | "ach";
  provider: string;
  provider_account_id?: string;
  account_mask: string;
  is_primary: boolean;
  is_verified: boolean;
  metadata?: any;
}

export interface TransactionRequest {
  userId: string;
  paymentMethodId: string;
  amount: number;
  currency?: string;
  transactionType: "deposit" | "withdrawal" | "trade" | "fee" | "dividend" | "interest";
  description?: string;
  metadata?: any;
}

export interface TransactionResult {
  success: boolean;
  transactionId?: string;
  externalTransactionId?: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  error?: string;
}

export class PaymentProcessingService {
  // Stripe-like payment processing
  static async processPayment(request: TransactionRequest): Promise<TransactionResult> {
    try {
      // Get payment method details
      const { data: paymentMethod, error: pmError } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("id", request.paymentMethodId)
        .single();

      if (pmError || !paymentMethod) {
        return { success: false, status: "failed", error: "Payment method not found" };
      }

      // Simulate different payment providers
      let providerResult;
      switch (paymentMethod.provider) {
        case "stripe":
          providerResult = await this.processStripePayment(paymentMethod, request);
          break;
        case "plaid":
          providerResult = await this.processPlaidTransfer(paymentMethod, request);
          break;
        case "wire":
          providerResult = await this.processWireTransfer(paymentMethod, request);
          break;
        default:
          providerResult = await this.processGenericPayment(paymentMethod, request);
      }

      // Create transaction record
      const { data: transaction, error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: request.userId,
          payment_method_id: request.paymentMethodId,
          transaction_type: request.transactionType,
          amount: request.amount,
          currency: request.currency || "USD",
          status: providerResult.status,
          external_transaction_id: providerResult.externalId,
          description: request.description,
          metadata: request.metadata,
          processed_at: providerResult.status === "completed" ? new Date().toISOString() : null
        })
        .select("id")
        .single();

      if (txError) throw txError;

      // Trigger compliance monitoring for large transactions
      if (request.amount > 10000) {
        await this.triggerComplianceCheck(request.userId, transaction.id, request.amount);
      }

      return {
        success: true,
        transactionId: transaction.id,
        externalTransactionId: providerResult.externalId,
        status: providerResult.status
      };
    } catch (error) {
      console.error("Payment processing error:", error);
      return {
        success: false,
        status: "failed",
        error: error instanceof Error ? error.message : "Payment processing failed"
      };
    }
  }

  private static async processStripePayment(paymentMethod: PaymentMethod, request: TransactionRequest) {
    // Simulate Stripe API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 95% success rate simulation
    const success = Math.random() > 0.05;
    
    return {
      status: success ? "completed" : "failed" as const,
      externalId: `pi_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  private static async processPlaidTransfer(paymentMethod: PaymentMethod, request: TransactionRequest) {
    // Simulate Plaid ACH transfer
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      status: "processing" as const, // ACH transfers are typically pending
      externalId: `ach_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  private static async processWireTransfer(paymentMethod: PaymentMethod, request: TransactionRequest) {
    // Wire transfers require manual processing
    return {
      status: "pending" as const,
      externalId: `wire_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  private static async processGenericPayment(paymentMethod: PaymentMethod, request: TransactionRequest) {
    // Generic payment processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      status: "completed" as const,
      externalId: `gen_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  private static async triggerComplianceCheck(userId: string, transactionId: string, amount: number) {
    try {
      await supabase.from("compliance_events").insert({
        user_id: userId,
        event_type: "large_transaction",
        event_data: { transaction_id: transactionId, amount },
        risk_level: amount > 50000 ? "high" : "medium"
      });
    } catch (error) {
      console.error("Failed to trigger compliance check:", error);
    }
  }

  // Add payment method with verification
  static async addPaymentMethod(userId: string, methodData: {
    methodType: PaymentMethod["method_type"];
    provider: string;
    accountDetails: any;
  }): Promise<{ success: boolean; paymentMethodId?: string; error?: string }> {
    try {
      // Verify the payment method with the provider
      const verification = await this.verifyPaymentMethod(methodData);
      
      if (!verification.verified) {
        return { success: false, error: verification.error };
      }

      const { data, error } = await supabase
        .from("payment_methods")
        .insert({
          user_id: userId,
          method_type: methodData.methodType,
          provider: methodData.provider,
          provider_account_id: verification.providerAccountId,
          account_mask: verification.accountMask,
          is_verified: verification.verified,
          metadata: methodData.accountDetails
        })
        .select("id")
        .single();

      if (error) throw error;

      return { success: true, paymentMethodId: data.id };
    } catch (error) {
      console.error("Error adding payment method:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to add payment method"
      };
    }
  }

  private static async verifyPaymentMethod(methodData: any) {
    // Simulate payment method verification
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock verification response
    return {
      verified: Math.random() > 0.1, // 90% success rate
      providerAccountId: `acc_${Math.random().toString(36).substr(2, 9)}`,
      accountMask: `****${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      error: Math.random() > 0.9 ? "Invalid account details" : undefined
    };
  }

  // Get user's payment methods
  static async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      return [];
    }
  }

  // Get transaction history
  static async getTransactionHistory(userId: string, limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          payment_methods:payment_method_id (provider, account_mask)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching transaction history:", error);
      return [];
    }
  }
}
