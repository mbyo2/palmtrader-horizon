import { supabase } from "@/integrations/supabase/client";
import { nanoid } from "nanoid";

export interface ApiKey {
  id: string;
  key_name: string;
  api_key: string;
  permissions: string[];
  ip_whitelist: string[];
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

export class ApiKeyService {
  static async getApiKeys(userId: string): Promise<ApiKey[]> {
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, key_name, api_key, permissions, ip_whitelist, is_active, last_used_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async createApiKey(userId: string, keyName: string, permissions: string[]): Promise<{ apiKey: string; apiSecret: string }> {
    const apiKey = `pc_${nanoid(32)}`;
    const apiSecret = `ps_${nanoid(48)}`;

    const { error } = await supabase.from('api_keys').insert({
      user_id: userId,
      key_name: keyName,
      api_key: apiKey,
      api_secret: apiSecret,
      permissions,
    });

    if (error) throw error;
    return { apiKey, apiSecret };
  }

  static async deleteApiKey(keyId: string): Promise<void> {
    const { error } = await supabase.from('api_keys').delete().eq('id', keyId);
    if (error) throw error;
  }

  static async toggleApiKey(keyId: string, isActive: boolean): Promise<void> {
    const { error } = await supabase.from('api_keys').update({ is_active: isActive }).eq('id', keyId);
    if (error) throw error;
  }

  static async updateIpWhitelist(keyId: string, ips: string[]): Promise<void> {
    const { error } = await supabase.from('api_keys').update({ ip_whitelist: ips }).eq('id', keyId);
    if (error) throw error;
  }
}
