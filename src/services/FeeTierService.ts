import { supabase } from "@/integrations/supabase/client";

export interface FeeTier {
  id: string;
  tier_name: string;
  tier_level: number;
  min_30d_volume: number;
  maker_fee: number;
  taker_fee: number;
  withdrawal_limit_daily: number;
  api_rate_limit: number;
}

export interface UserVolume {
  volume_30d: number;
  volume_all_time: number;
  trades_count_30d: number;
  current_tier: FeeTier | null;
}

export class FeeTierService {
  static async getFeeTiers(): Promise<FeeTier[]> {
    const { data, error } = await (supabase as any)
      .from('fee_tiers')
      .select('*')
      .order('tier_level');
    if (error) throw error;
    return (data || []).map((t: any) => ({
      ...t,
      min_30d_volume: Number(t.min_30d_volume),
      maker_fee: Number(t.maker_fee),
      taker_fee: Number(t.taker_fee),
      withdrawal_limit_daily: Number(t.withdrawal_limit_daily),
    }));
  }

  static async getUserVolume(userId: string): Promise<UserVolume> {
    const { data } = await (supabase as any)
      .from('user_trading_volumes')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!data) {
      return { volume_30d: 0, volume_all_time: 0, trades_count_30d: 0, current_tier: null };
    }

    const tiers = await this.getFeeTiers();
    const currentTier = tiers
      .filter(t => Number(data.volume_30d) >= t.min_30d_volume)
      .sort((a, b) => b.tier_level - a.tier_level)[0] || null;

    return {
      volume_30d: Number(data.volume_30d),
      volume_all_time: Number(data.volume_all_time),
      trades_count_30d: data.trades_count_30d,
      current_tier: currentTier,
    };
  }
}
