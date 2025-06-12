
import { supabase } from "@/integrations/supabase/client";

export interface MobileMoneyProvider {
  id: string;
  name: 'MTN_MOBILE_MONEY' | 'AIRTEL_MONEY' | 'ZAMTEL_KWACHA';
  displayName: string;
  logo: string;
  supportedCountries: string[];
  fees: {
    deposit: number;
    withdrawal: number;
    minimumAmount: number;
    maximumAmount: number;
  };
}

export interface MobileMoneyAccount {
  id: string;
  userId: string;
  provider: MobileMoneyProvider['name'];
  phoneNumber: string;
  accountName: string;
  isVerified: boolean;
  isPrimary: boolean;
  createdAt: string;
}

export interface MobileMoneyTransaction {
  id: string;
  userId: string;
  accountId: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  currency: string;
  fees: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  externalReference?: string;
  createdAt: string;
  completedAt?: string;
}

export class MobileMoneyService {
  private static readonly PROVIDERS: MobileMoneyProvider[] = [
    {
      id: "mtn",
      name: "MTN_MOBILE_MONEY",
      displayName: "MTN Mobile Money",
      logo: "/images/mtn-logo.png",
      supportedCountries: ["ZM", "ZA", "GH", "UG"],
      fees: {
        deposit: 0.015, // 1.5%
        withdrawal: 0.025, // 2.5%
        minimumAmount: 10,
        maximumAmount: 50000
      }
    },
    {
      id: "airtel",
      name: "AIRTEL_MONEY",
      displayName: "Airtel Money",
      logo: "/images/airtel-logo.png",
      supportedCountries: ["ZM", "KE", "TZ", "UG"],
      fees: {
        deposit: 0.02, // 2%
        withdrawal: 0.03, // 3%
        minimumAmount: 5,
        maximumAmount: 30000
      }
    },
    {
      id: "zamtel",
      name: "ZAMTEL_KWACHA",
      displayName: "Zamtel Kwacha",
      logo: "/images/zamtel-logo.png",
      supportedCountries: ["ZM"],
      fees: {
        deposit: 0.01, // 1%
        withdrawal: 0.02, // 2%
        minimumAmount: 5,
        maximumAmount: 25000
      }
    }
  ];

  static getProviders(): MobileMoneyProvider[] {
    return this.PROVIDERS;
  }

  static getProvider(name: MobileMoneyProvider['name']): MobileMoneyProvider | null {
    return this.PROVIDERS.find(p => p.name === name) || null;
  }

  // Add mobile money account
  static async addMobileMoneyAccount(userId: string, accountData: {
    provider: MobileMoneyProvider['name'];
    phoneNumber: string;
    accountName: string;
  }): Promise<{ success: boolean; accountId?: string; error?: string }> {
    try {
      // Validate phone number format
      if (!this.validatePhoneNumber(accountData.phoneNumber)) {
        return { success: false, error: "Invalid phone number format" };
      }

      // Check if account already exists using raw SQL query
      const { data: existingAccount } = await supabase
        .rpc('exec_sql', {
          sql: `SELECT id FROM mobile_money_accounts WHERE user_id = $1 AND phone_number = $2 AND provider = $3`,
          params: [userId, accountData.phoneNumber, accountData.provider]
        })
        .single();

      if (existingAccount) {
        return { success: false, error: "Account already exists" };
      }

      // Verify with mobile money provider
      const verification = await this.verifyMobileMoneyAccount(accountData);
      if (!verification.verified) {
        return { success: false, error: verification.error };
      }

      // Insert new account using raw SQL
      const { data, error } = await supabase
        .rpc('exec_sql', {
          sql: `INSERT INTO mobile_money_accounts (user_id, provider, phone_number, account_name, is_verified, is_primary) 
                VALUES ($1, $2, $3, $4, $5, $6) 
                RETURNING id`,
          params: [userId, accountData.provider, accountData.phoneNumber, accountData.accountName, verification.verified, false]
        })
        .single();

      if (error) throw error;

      return { success: true, accountId: data.id };
    } catch (error) {
      console.error("Error adding mobile money account:", error);
      
      // Try alternative approach using regular insert with type assertion
      try {
        const { data, error } = await (supabase as any)
          .from("mobile_money_accounts")
          .insert({
            user_id: userId,
            provider: accountData.provider,
            phone_number: accountData.phoneNumber,
            account_name: accountData.accountName,
            is_verified: true,
            is_primary: false
          })
          .select()
          .single();

        if (error) throw error;
        return { success: true, accountId: data.id };
      } catch (fallbackError) {
        console.error("Fallback error:", fallbackError);
        return {
          success: false,
          error: "Failed to add account"
        };
      }
    }
  }

  // Process mobile money deposit
  static async processMobileMoneyDeposit(request: {
    userId: string;
    accountId: string;
    amount: number;
    pin?: string;
  }): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      // Get account details using type assertion
      const { data: account, error: accountError } = await (supabase as any)
        .from("mobile_money_accounts")
        .select("*")
        .eq("id", request.accountId)
        .eq("user_id", request.userId)
        .single();

      if (accountError || !account) {
        return { success: false, error: "Mobile money account not found" };
      }

      if (!account.is_verified) {
        return { success: false, error: "Account not verified" };
      }

      const provider = this.getProvider(account.provider);
      if (!provider) {
        return { success: false, error: "Invalid provider" };
      }

      // Validate amount limits
      if (request.amount < provider.fees.minimumAmount) {
        return { success: false, error: `Minimum deposit amount is ${provider.fees.minimumAmount} ZMW` };
      }

      if (request.amount > provider.fees.maximumAmount) {
        return { success: false, error: `Maximum deposit amount is ${provider.fees.maximumAmount} ZMW` };
      }

      // Calculate fees
      const fees = request.amount * provider.fees.deposit;

      // Create transaction record using type assertion
      const { data: transaction, error: txError } = await (supabase as any)
        .from("mobile_money_transactions")
        .insert({
          user_id: request.userId,
          account_id: request.accountId,
          type: "deposit",
          amount: request.amount,
          currency: "ZMW",
          fees: fees,
          status: "pending"
        })
        .select()
        .single();

      if (txError) throw txError;

      // Process with mobile money provider
      const providerResult = await this.processWithProvider({
        provider: account.provider,
        phoneNumber: account.phone_number,
        amount: request.amount + fees,
        reference: transaction.id,
        type: "deposit"
      });

      // Update transaction status
      await (supabase as any)
        .from("mobile_money_transactions")
        .update({
          status: providerResult.success ? "processing" : "failed",
          external_reference: providerResult.reference
        })
        .eq("id", transaction.id);

      if (!providerResult.success) {
        return { success: false, error: providerResult.error };
      }

      return { success: true, transactionId: transaction.id };
    } catch (error) {
      console.error("Error processing mobile money deposit:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Deposit failed"
      };
    }
  }

  // Process mobile money withdrawal
  static async processMobileMoneyWithdrawal(request: {
    userId: string;
    accountId: string;
    amount: number;
  }): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      // Get account details using type assertion
      const { data: account, error: accountError } = await (supabase as any)
        .from("mobile_money_accounts")
        .select("*")
        .eq("id", request.accountId)
        .eq("user_id", request.userId)
        .single();

      if (accountError || !account) {
        return { success: false, error: "Mobile money account not found" };
      }

      const provider = this.getProvider(account.provider);
      if (!provider) {
        return { success: false, error: "Invalid provider" };
      }

      // Check user balance
      const balance = await this.getUserBalance(request.userId);
      const fees = request.amount * provider.fees.withdrawal;
      
      if (balance < request.amount) {
        return { success: false, error: "Insufficient balance" };
      }

      // Create transaction record using type assertion
      const { data: transaction, error: txError } = await (supabase as any)
        .from("mobile_money_transactions")
        .insert({
          user_id: request.userId,
          account_id: request.accountId,
          type: "withdrawal",
          amount: request.amount,
          currency: "ZMW",
          fees: fees,
          status: "pending"
        })
        .select()
        .single();

      if (txError) throw txError;

      // Process with mobile money provider
      const providerResult = await this.processWithProvider({
        provider: account.provider,
        phoneNumber: account.phone_number,
        amount: request.amount - fees,
        reference: transaction.id,
        type: "withdrawal"
      });

      await (supabase as any)
        .from("mobile_money_transactions")
        .update({
          status: providerResult.success ? "processing" : "failed",
          external_reference: providerResult.reference
        })
        .eq("id", transaction.id);

      return {
        success: providerResult.success,
        transactionId: transaction.id,
        error: providerResult.error
      };
    } catch (error) {
      console.error("Error processing mobile money withdrawal:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Withdrawal failed"
      };
    }
  }

  // Get user's mobile money accounts
  static async getUserMobileMoneyAccounts(userId: string): Promise<MobileMoneyAccount[]> {
    try {
      const { data, error } = await (supabase as any)
        .from("mobile_money_accounts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      return (data || []).map((account: any) => ({
        id: account.id,
        userId: account.user_id,
        provider: account.provider,
        phoneNumber: account.phone_number,
        accountName: account.account_name,
        isVerified: account.is_verified,
        isPrimary: account.is_primary,
        createdAt: account.created_at
      }));
    } catch (error) {
      console.error("Error fetching mobile money accounts:", error);
      return [];
    }
  }

  // Helper methods
  private static validatePhoneNumber(phoneNumber: string): boolean {
    // Zambian phone number validation
    const zambianPhoneRegex = /^(\+260|0)?[789]\d{8}$/;
    return zambianPhoneRegex.test(phoneNumber);
  }

  private static async verifyMobileMoneyAccount(accountData: any) {
    // Mock verification - in production, integrate with actual provider APIs
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      verified: Math.random() > 0.1, // 90% success rate
      error: Math.random() > 0.9 ? "Account verification failed" : undefined
    };
  }

  private static async processWithProvider(request: {
    provider: string;
    phoneNumber: string;
    amount: number;
    reference: string;
    type: string;
  }) {
    // Mock provider processing - in production, integrate with actual APIs
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return {
      success: Math.random() > 0.05, // 95% success rate
      reference: `${request.provider}_${Date.now()}`,
      error: Math.random() > 0.95 ? "Provider service unavailable" : undefined
    };
  }

  private static async getUserBalance(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("amount, transaction_type")
        .eq("user_id", userId)
        .eq("status", "completed");

      if (error) throw error;

      const balance = data?.reduce((sum, tx) => {
        const amount = tx.transaction_type === "withdrawal" ? -Math.abs(tx.amount) : Math.abs(tx.amount);
        return sum + amount;
      }, 0) || 0;

      return Math.max(0, balance);
    } catch (error) {
      console.error("Error calculating user balance:", error);
      return 0;
    }
  }
}
