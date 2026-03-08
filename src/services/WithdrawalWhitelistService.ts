import { supabase } from "@/integrations/supabase/client";

export interface WhitelistAddress {
  id: string;
  address_label: string;
  currency: string;
  address: string;
  network: string | null;
  is_verified: boolean;
  created_at: string;
}

export class WithdrawalWhitelistService {
  static async getWhitelist(userId: string): Promise<WhitelistAddress[]> {
    const { data, error } = await (supabase as any)
      .from('withdrawal_whitelist')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async addAddress(userId: string, address: Omit<WhitelistAddress, 'id' | 'is_verified' | 'created_at'>): Promise<void> {
    const { error } = await (supabase as any).from('withdrawal_whitelist').insert({
      user_id: userId,
      ...address,
    });
    if (error) throw error;
  }

  static async removeAddress(id: string): Promise<void> {
    const { error } = await (supabase as any).from('withdrawal_whitelist').delete().eq('id', id);
    if (error) throw error;
  }

  static async getAntiPhishingCode(userId: string): Promise<string | null> {
    const { data } = await supabase
      .from('account_details')
      .select('anti_phishing_code' as any)
      .eq('id', userId)
      .single();
    return (data as any)?.anti_phishing_code || null;
  }

  static async setAntiPhishingCode(userId: string, code: string): Promise<void> {
    const { error } = await supabase
      .from('account_details')
      .update({ anti_phishing_code: code } as any)
      .eq('id', userId);
    if (error) throw error;
  }

  static async toggleWhitelistEnabled(userId: string, enabled: boolean): Promise<void> {
    const { error } = await supabase
      .from('account_details')
      .update({ withdrawal_whitelist_enabled: enabled } as any)
      .eq('id', userId);
    if (error) throw error;
  }
}
