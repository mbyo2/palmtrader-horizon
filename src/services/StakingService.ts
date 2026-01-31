import { supabase } from "@/integrations/supabase/client";

export interface StakingProduct {
  id: string;
  currency: string;
  name: string;
  type: 'flexible' | 'locked';
  apy: number;
  min_amount: number;
  max_amount?: number;
  lock_period_days?: number;
  total_pool: number;
  remaining_pool?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StakingPosition {
  id: string;
  user_id: string;
  product_id: string;
  amount: number;
  accrued_interest: number;
  status: 'active' | 'completed' | 'withdrawn';
  start_date: string;
  end_date?: string;
  last_interest_date: string;
  auto_restake: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  product?: StakingProduct;
}

export class StakingService {
  static async getProducts(): Promise<StakingProduct[]> {
    const { data, error } = await supabase
      .from('staking_products')
      .select('*')
      .eq('is_active', true)
      .order('apy', { ascending: false });

    if (error) throw error;
    return (data || []).map(p => ({
      ...p,
      type: p.type as 'flexible' | 'locked',
      apy: Number(p.apy),
      min_amount: Number(p.min_amount),
      max_amount: p.max_amount ? Number(p.max_amount) : undefined,
      total_pool: Number(p.total_pool),
      remaining_pool: p.remaining_pool ? Number(p.remaining_pool) : undefined
    }));
  }

  static async getProductsByCurrency(currency: string): Promise<StakingProduct[]> {
    const { data, error } = await supabase
      .from('staking_products')
      .select('*')
      .eq('currency', currency)
      .eq('is_active', true)
      .order('apy', { ascending: false });

    if (error) throw error;
    return (data || []).map(p => ({
      ...p,
      type: p.type as 'flexible' | 'locked',
      apy: Number(p.apy),
      min_amount: Number(p.min_amount),
      max_amount: p.max_amount ? Number(p.max_amount) : undefined,
      total_pool: Number(p.total_pool),
      remaining_pool: p.remaining_pool ? Number(p.remaining_pool) : undefined
    }));
  }

  static async getMyPositions(userId: string): Promise<StakingPosition[]> {
    const { data, error } = await supabase
      .from('staking_positions')
      .select(`
        *,
        product:staking_products(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(pos => ({
      ...pos,
      amount: Number(pos.amount),
      accrued_interest: Number(pos.accrued_interest),
      product: pos.product ? {
        ...pos.product,
        type: pos.product.type as 'flexible' | 'locked',
        apy: Number(pos.product.apy),
        min_amount: Number(pos.product.min_amount),
        max_amount: pos.product.max_amount ? Number(pos.product.max_amount) : undefined,
        total_pool: Number(pos.product.total_pool),
        remaining_pool: pos.product.remaining_pool ? Number(pos.product.remaining_pool) : undefined
      } : undefined
    }));
  }

  static async stake(userId: string, productId: string, amount: number, autoRestake: boolean = false): Promise<{ success: boolean; positionId?: string; error?: string }> {
    try {
      // Get product to calculate end date
      const { data: product, error: productError } = await supabase
        .from('staking_products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError) throw productError;

      const endDate = product.lock_period_days
        ? new Date(Date.now() + product.lock_period_days * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      const { data, error } = await supabase
        .from('staking_positions')
        .insert({
          user_id: userId,
          product_id: productId,
          amount,
          auto_restake: autoRestake,
          end_date: endDate
        })
        .select('id')
        .single();

      if (error) throw error;
      return { success: true, positionId: data.id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to stake' };
    }
  }

  static async unstake(positionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: position, error: fetchError } = await supabase
        .from('staking_positions')
        .select('*, product:staking_products(*)')
        .eq('id', positionId)
        .single();

      if (fetchError) throw fetchError;

      // Check if locked period has ended
      if (position.end_date && new Date(position.end_date) > new Date()) {
        return { success: false, error: 'Lock period has not ended yet' };
      }

      const { error } = await supabase
        .from('staking_positions')
        .update({
          status: 'withdrawn',
          updated_at: new Date().toISOString()
        })
        .eq('id', positionId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to unstake' };
    }
  }

  static async claimInterest(positionId: string): Promise<{ success: boolean; amount?: number; error?: string }> {
    try {
      const { data: position, error: fetchError } = await supabase
        .from('staking_positions')
        .select('*')
        .eq('id', positionId)
        .single();

      if (fetchError) throw fetchError;

      const interest = Number(position.accrued_interest);
      
      if (interest <= 0) {
        return { success: false, error: 'No interest to claim' };
      }

      const { error } = await supabase
        .from('staking_positions')
        .update({
          accrued_interest: 0,
          last_interest_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', positionId);

      if (error) throw error;
      return { success: true, amount: interest };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to claim interest' };
    }
  }

  static calculateDailyInterest(amount: number, apy: number): number {
    return (amount * (apy / 100)) / 365;
  }

  static getTotalStaked(positions: StakingPosition[]): number {
    return positions
      .filter(p => p.status === 'active')
      .reduce((sum, p) => sum + p.amount, 0);
  }

  static getTotalEarned(positions: StakingPosition[]): number {
    return positions.reduce((sum, p) => sum + p.accrued_interest, 0);
  }
}
