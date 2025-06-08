
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface IPOListing {
  id: string;
  company_name: string;
  symbol: string;
  description: string | null;
  sector: string | null;
  issue_price_min: number;
  issue_price_max: number;
  total_shares: number;
  retail_allocation_percentage: number;
  subscription_start_date: string;
  subscription_end_date: string;
  listing_date: string | null;
  minimum_lot_size: number;
  status: 'upcoming' | 'open' | 'closed' | 'listed' | 'withdrawn';
  created_at: string;
  updated_at: string;
}

export interface IPOApplication {
  id: string;
  user_id: string;
  ipo_id: string;
  shares_applied: number;
  price_per_share: number;
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'allocated';
  payment_status: 'pending' | 'completed' | 'refunded';
  created_at: string;
  updated_at: string;
  ipo_listing?: IPOListing;
}

export interface IPOAllocation {
  id: string;
  application_id: string;
  shares_allocated: number;
  allocation_price: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export class IPOService {
  // Get all IPO listings
  static async getIPOListings(status?: string): Promise<IPOListing[]> {
    try {
      let query = supabase
        .from("ipo_listings")
        .select("*")
        .order("subscription_start_date", { ascending: true });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as IPOListing[];
    } catch (error) {
      console.error("Error fetching IPO listings:", error);
      return [];
    }
  }

  // Get IPO details by ID
  static async getIPODetails(ipoId: string): Promise<IPOListing | null> {
    try {
      const { data, error } = await supabase
        .from("ipo_listings")
        .select("*")
        .eq("id", ipoId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as IPOListing | null;
    } catch (error) {
      console.error("Error fetching IPO details:", error);
      return null;
    }
  }

  // Apply for IPO
  static async applyForIPO(application: {
    ipo_id: string;
    shares_applied: number;
    price_per_share: number;
  }): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const total_amount = application.shares_applied * application.price_per_share;

      const { error } = await supabase
        .from("ipo_applications")
        .insert({
          user_id: user.user.id,
          ipo_id: application.ipo_id,
          shares_applied: application.shares_applied,
          price_per_share: application.price_per_share,
          total_amount
        });

      if (error) throw error;

      toast.success("IPO application submitted successfully");
      return true;
    } catch (error) {
      console.error("Error applying for IPO:", error);
      toast.error("Failed to submit IPO application");
      return false;
    }
  }

  // Get user's IPO applications
  static async getUserIPOApplications(): Promise<IPOApplication[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from("ipo_applications")
        .select(`
          *,
          ipo_listings(*)
        `)
        .eq("user_id", user.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as IPOApplication[];
    } catch (error) {
      console.error("Error fetching user IPO applications:", error);
      return [];
    }
  }

  // Get IPO allocations for user
  static async getUserIPOAllocations(): Promise<IPOAllocation[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from("ipo_allocations")
        .select(`
          *,
          ipo_applications!inner(
            user_id,
            ipo_listings(*)
          )
        `)
        .eq("ipo_applications.user_id", user.user.id);

      if (error) throw error;
      return (data || []) as IPOAllocation[];
    } catch (error) {
      console.error("Error fetching IPO allocations:", error);
      return [];
    }
  }

  // Check if user has applied for an IPO
  static async hasUserApplied(ipoId: string): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;

      const { data, error } = await supabase
        .from("ipo_applications")
        .select("id")
        .eq("user_id", user.user.id)
        .eq("ipo_id", ipoId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return !!data;
    } catch (error) {
      console.error("Error checking IPO application:", error);
      return false;
    }
  }

  // Calculate IPO subscription ratio
  static async getIPOSubscriptionRatio(ipoId: string): Promise<number> {
    try {
      const { data: applications, error } = await supabase
        .from("ipo_applications")
        .select("shares_applied")
        .eq("ipo_id", ipoId);

      if (error) throw error;

      const { data: ipo, error: ipoError } = await supabase
        .from("ipo_listings")
        .select("total_shares, retail_allocation_percentage")
        .eq("id", ipoId)
        .single();

      if (ipoError) throw ipoError;

      const totalAppliedShares = applications?.reduce((sum, app) => sum + app.shares_applied, 0) || 0;
      const availableShares = ipo.total_shares * (ipo.retail_allocation_percentage / 100);

      return availableShares > 0 ? totalAppliedShares / availableShares : 0;
    } catch (error) {
      console.error("Error calculating subscription ratio:", error);
      return 0;
    }
  }
}
