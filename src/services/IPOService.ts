
import { supabase } from "@/integrations/supabase/client";

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
}

export class IPOService {
  static async getIPOListings(): Promise<IPOListing[]> {
    try {
      const { data, error } = await supabase
        .from('ipo_listings')
        .select('*')
        .order('subscription_start_date', { ascending: false });

      if (error) {
        console.error('Error fetching IPO listings:', error);
        throw error;
      }

      // Cast the data to ensure proper typing
      return (data || []).map(item => ({
        ...item,
        status: item.status as IPOListing['status']
      })) as IPOListing[];
    } catch (error) {
      console.error('Error in getIPOListings:', error);
      throw error;
    }
  }

  static async applyForIPO(application: Omit<IPOApplication, 'id' | 'created_at' | 'updated_at'>): Promise<IPOApplication> {
    try {
      const { data, error } = await supabase
        .from('ipo_applications')
        .insert({
          user_id: application.user_id,
          ipo_id: application.ipo_id,
          shares_applied: application.shares_applied,
          price_per_share: application.price_per_share,
          total_amount: application.total_amount,
          status: application.status,
          payment_status: application.payment_status
        })
        .select()
        .single();

      if (error) throw error;

      return data as IPOApplication;
    } catch (error) {
      console.error('Error applying for IPO:', error);
      throw error;
    }
  }

  static async getUserIPOApplications(userId: string): Promise<IPOApplication[]> {
    try {
      const { data, error } = await supabase
        .from('ipo_applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data as IPOApplication[] || [];
    } catch (error) {
      console.error('Error fetching user IPO applications:', error);
      throw error;
    }
  }
}
