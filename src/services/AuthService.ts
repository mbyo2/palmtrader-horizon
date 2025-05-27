
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  date_of_birth: string | null;
  tax_id: string | null;
  role: 'basic' | 'premium' | 'admin';
  account_status: 'pending' | 'active' | 'restricted' | 'suspended';
  kyc_status: 'not_started' | 'pending' | 'approved' | 'rejected';
  onboarding_completed: boolean;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  market_updates: boolean;
  price_alerts: boolean;
  trade_confirmations: boolean;
  currency: string;
  two_factor_enabled: boolean;
}

export class AuthService {
  static async signUp(email: string, password: string, userData: {
    firstName: string;
    lastName: string;
    phoneNumber?: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            phone_number: userData.phoneNumber
          }
        }
      });

      if (error) throw error;

      return { success: true, user: data.user };
    } catch (error) {
      console.error("Sign up error:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Sign up failed"
      };
    }
  }

  static async signIn(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      return { success: true, user: data.user };
    } catch (error) {
      console.error("Sign in error:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Sign in failed"
      };
    }
  }

  static async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Sign out error:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Sign out failed"
      };
    }
  }

  static async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Password reset error:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Password reset failed"
      };
    }
  }

  static async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("account_details")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Profile update error:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Profile update failed"
      };
    }
  }

  static async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from("account_details")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
  }

  static async updatePreferences(userId: string, preferences: Partial<UserPreferences>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("user_preferences")
        .upsert({ 
          user_id: userId, 
          ...preferences, 
          updated_at: new Date().toISOString() 
        });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Preferences update error:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Preferences update failed"
      };
    }
  }

  static async getPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching preferences:", error);
      return null;
    }
  }

  static async verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Email verification error:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Email verification failed"
      };
    }
  }

  static async startKYCProcess(userId: string, documents: {
    idDocument: File;
    proofOfAddress: File;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Update KYC status to pending
      await this.updateProfile(userId, { kyc_status: 'pending' });

      // In a real implementation, you would upload documents to storage
      // and initiate the KYC verification process
      console.log("KYC process started for user:", userId);
      
      return { success: true };
    } catch (error) {
      console.error("KYC process error:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "KYC process failed"
      };
    }
  }
}
