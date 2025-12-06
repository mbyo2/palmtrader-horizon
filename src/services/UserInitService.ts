import { supabase } from "@/integrations/supabase/client";

export class UserInitService {
  static async initializeUserWallet(userId: string): Promise<boolean> {
    try {
      // Check if wallet exists
      const { data: existingWallet, error: checkError } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", userId)
        .eq("currency", "USD")
        .maybeSingle();

      if (checkError) {
        console.error("Error checking wallet:", checkError);
        return false;
      }

      // Create wallet if it doesn't exist
      if (!existingWallet) {
        const { error: insertError } = await supabase
          .from("wallets")
          .insert({
            user_id: userId,
            currency: "USD",
            available_balance: 10000, // Demo starting balance
            reserved_balance: 0
          });

        if (insertError) {
          console.error("Error creating wallet:", insertError);
          return false;
        }
        
        console.log("Created wallet for user:", userId);
      }

      return true;
    } catch (error) {
      console.error("Error initializing wallet:", error);
      return false;
    }
  }

  static async initializeUserProfile(userId: string, metadata?: { first_name?: string; last_name?: string }): Promise<boolean> {
    try {
      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from("user_profiles")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking profile:", checkError);
        return false;
      }

      // Create profile if it doesn't exist
      if (!existingProfile) {
        const { error: insertError } = await supabase
          .from("user_profiles")
          .insert({
            user_id: userId,
            first_name: metadata?.first_name || null,
            last_name: metadata?.last_name || null,
            display_name: metadata?.first_name ? `${metadata.first_name} ${metadata.last_name || ''}`.trim() : null
          });

        if (insertError) {
          console.error("Error creating profile:", insertError);
          return false;
        }
        
        console.log("Created profile for user:", userId);
      }

      return true;
    } catch (error) {
      console.error("Error initializing profile:", error);
      return false;
    }
  }

  static async initializeNewUser(userId: string, metadata?: { first_name?: string; last_name?: string }): Promise<void> {
    await Promise.all([
      this.initializeUserWallet(userId),
      this.initializeUserProfile(userId, metadata)
    ]);
  }
}
