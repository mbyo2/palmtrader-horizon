import { supabase } from "@/integrations/supabase/client";

export interface IPOListing {
  id: string;
  company_name: string;
  symbol: string;
  issue_date: string;
  issue_size: number;
  price_range_low: number;
  price_range_high: number;
  status: 'upcoming' | 'live' | 'closed';
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
  amount_invested?: number;
  application_number?: string;
  allotted_shares?: number;
  refund_amount?: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'allotted' | 'rejected';
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
  updated_at: string;
}

export interface IPOAlert {
  id: string;
  user_id: string;
  ipo_id: string;
  alert_price: number;
  created_at: string;
}

export class IPOService {
  static async getIPOListings(): Promise<IPOListing[]> {
    try {
      const { data, error } = await supabase
        .from('ipo_listings')
        .select('*')
        .order('issue_date', { ascending: false });

      if (error) {
        console.error('Error fetching IPO listings:', error);
        throw error;
      }

      return data || [];
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

      return {
        ...data,
        amount_invested: data.total_amount,
        application_number: `IPO-${data.id.slice(-8).toUpperCase()}`,
        allotted_shares: 0,
        refund_amount: 0
      } as IPOApplication;
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

      return (data || []).map(app => ({
        ...app,
        amount_invested: app.total_amount,
        application_number: `IPO-${app.id.slice(-8).toUpperCase()}`,
        allotted_shares: 0,
        refund_amount: 0
      })) as IPOApplication[];
    } catch (error) {
      console.error('Error fetching user IPO applications:', error);
      throw error;
    }
  }

  static async getIPOAlerts(userId: string): Promise<IPOAlert[]> {
    try {
      const { data, error } = await supabase
        .from('ipo_alerts')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching IPO alerts:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getIPOAlerts:', error);
      throw error;
    }
  }

  static async createIPOAlert(userId: string, ipoId: string, alertPrice: number): Promise<IPOAlert> {
    try {
      const { data, error } = await supabase
        .from('ipo_alerts')
        .insert([{ user_id: userId, ipo_id: ipoId, alert_price: alertPrice }])
        .select()
        .single();

      if (error) {
        console.error('Error creating IPO alert:', error);
        throw error;
      }

      return data as IPOAlert;
    } catch (error) {
      console.error('Error in createIPOAlert:', error);
      throw error;
    }
  }

  static async deleteIPOAlert(alertId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('ipo_alerts')
        .delete()
        .eq('id', alertId);

      if (error) {
        console.error('Error deleting IPO alert:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteIPOAlert:', error);
      throw error;
    }
  }
}
