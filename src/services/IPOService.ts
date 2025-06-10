
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface IPOListing {
  id: string;
  symbol: string;
  company_name: string;
  description: string | null;
  sector: string | null;
  issue_price_min: number;
  issue_price_max: number;
  total_shares: number;
  retail_allocation_percentage: number;
  minimum_lot_size: number;
  subscription_start_date: string;
  subscription_end_date: string;
  listing_date: string | null;
  status: 'upcoming' | 'open' | 'closed' | 'listed';
  prospectus_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface IPOApplication {
  id: string;
  ipo_id: string;
  user_id: string;
  shares_applied: number;
  amount_invested: number;
  application_number: string;
  status: 'pending' | 'confirmed' | 'allotted' | 'rejected';
  allotted_shares: number | null;
  refund_amount: number | null;
  created_at: string;
  updated_at: string;
}

export class IPOService {
  // Get all IPO listings
  static async getIPOListings(): Promise<IPOListing[]> {
    try {
      const { data, error } = await supabase
        .from("ipo_listings")
        .select("*")
        .order("created_at", { ascending: false });

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
  static async applyForIPO(
    ipoId: string,
    sharesApplied: number,
    amountInvested: number
  ): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      // Generate application number
      const applicationNumber = `IPO${Date.now()}${Math.floor(Math.random() * 1000)}`;

      const { error } = await supabase
        .from("ipo_applications")
        .insert({
          ipo_id: ipoId,
          user_id: user.user.id,
          shares_applied: sharesApplied,
          amount_invested: amountInvested,
          application_number: applicationNumber,
          status: 'pending'
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
        .select("*")
        .eq("user_id", user.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as IPOApplication[];
    } catch (error) {
      console.error("Error fetching user IPO applications:", error);
      return [];
    }
  }

  // Check if user has applied for specific IPO
  static async hasUserApplied(ipoId: string): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;

      const { data, error } = await supabase
        .from("ipo_applications")
        .select("id")
        .eq("ipo_id", ipoId)
        .eq("user_id", user.user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return !!data;
    } catch (error) {
      console.error("Error checking IPO application status:", error);
      return false;
    }
  }

  // Calculate IPO subscription details
  static calculateIPODetails(ipo: IPOListing, sharesApplied: number) {
    const minInvestment = sharesApplied * ipo.issue_price_min;
    const maxInvestment = sharesApplied * ipo.issue_price_max;
    const isValidApplication = sharesApplied >= ipo.minimum_lot_size;

    return {
      minInvestment,
      maxInvestment,
      isValidApplication,
      lotSize: ipo.minimum_lot_size
    };
  }
}
