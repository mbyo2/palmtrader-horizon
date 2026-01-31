import { supabase } from "@/integrations/supabase/client";

export interface LaunchpadProject {
  id: string;
  name: string;
  symbol: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  whitepaper_url?: string;
  total_tokens: number;
  price_per_token: number;
  payment_currency: string;
  min_purchase: number;
  max_purchase: number;
  tokens_sold: number;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  start_time: string;
  end_time: string;
  distribution_time?: string;
  created_at: string;
  updated_at: string;
}

export interface LaunchpadSubscription {
  id: string;
  user_id: string;
  project_id: string;
  committed_amount: number;
  tokens_allocated: number;
  payment_status: 'pending' | 'paid' | 'refunded';
  tokens_claimed: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  project?: LaunchpadProject;
}

export class LaunchpadService {
  static async getProjects(status?: 'upcoming' | 'active' | 'completed'): Promise<LaunchpadProject[]> {
    let query = supabase
      .from('launchpad_projects')
      .select('*')
      .order('start_time', { ascending: true });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(p => ({
      ...p,
      total_tokens: Number(p.total_tokens),
      price_per_token: Number(p.price_per_token),
      min_purchase: Number(p.min_purchase),
      max_purchase: Number(p.max_purchase),
      tokens_sold: Number(p.tokens_sold)
    }));
  }

  static async getProject(projectId: string): Promise<LaunchpadProject | null> {
    const { data, error } = await supabase
      .from('launchpad_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) return null;

    return {
      ...data,
      total_tokens: Number(data.total_tokens),
      price_per_token: Number(data.price_per_token),
      min_purchase: Number(data.min_purchase),
      max_purchase: Number(data.max_purchase),
      tokens_sold: Number(data.tokens_sold)
    };
  }

  static async getMySubscriptions(userId: string): Promise<LaunchpadSubscription[]> {
    const { data, error } = await supabase
      .from('launchpad_subscriptions')
      .select(`
        *,
        project:launchpad_projects(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(sub => ({
      ...sub,
      payment_status: sub.payment_status as 'pending' | 'paid' | 'refunded',
      committed_amount: Number(sub.committed_amount),
      tokens_allocated: Number(sub.tokens_allocated),
      project: sub.project ? {
        ...sub.project,
        status: sub.project.status as 'upcoming' | 'active' | 'completed' | 'cancelled',
        total_tokens: Number(sub.project.total_tokens),
        price_per_token: Number(sub.project.price_per_token),
        min_purchase: Number(sub.project.min_purchase),
        max_purchase: Number(sub.project.max_purchase),
        tokens_sold: Number(sub.project.tokens_sold)
      } : undefined
    }));
  }

  static async subscribe(userId: string, projectId: string, amount: number): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
    try {
      // Check if project is active
      const project = await this.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      if (project.status !== 'active') {
        return { success: false, error: 'Project is not currently accepting subscriptions' };
      }

      if (amount < project.min_purchase || amount > project.max_purchase) {
        return { success: false, error: `Amount must be between ${project.min_purchase} and ${project.max_purchase}` };
      }

      // Check if already subscribed
      const { data: existing } = await supabase
        .from('launchpad_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .single();

      if (existing) {
        return { success: false, error: 'You have already subscribed to this project' };
      }

      const tokensAllocated = amount / project.price_per_token;

      const { data, error } = await supabase
        .from('launchpad_subscriptions')
        .insert({
          user_id: userId,
          project_id: projectId,
          committed_amount: amount,
          tokens_allocated: tokensAllocated
        })
        .select('id')
        .single();

      if (error) throw error;

      // Update tokens sold
      await supabase
        .from('launchpad_projects')
        .update({
          tokens_sold: project.tokens_sold + tokensAllocated,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      return { success: true, subscriptionId: data.id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to subscribe' };
    }
  }

  static async claimTokens(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: subscription, error: fetchError } = await supabase
        .from('launchpad_subscriptions')
        .select('*, project:launchpad_projects(*)')
        .eq('id', subscriptionId)
        .single();

      if (fetchError) throw fetchError;

      if (subscription.tokens_claimed) {
        return { success: false, error: 'Tokens already claimed' };
      }

      if (subscription.project.status !== 'completed') {
        return { success: false, error: 'Project distribution has not started yet' };
      }

      const { error } = await supabase
        .from('launchpad_subscriptions')
        .update({
          tokens_claimed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to claim tokens' };
    }
  }

  static getProgress(project: LaunchpadProject): number {
    return (project.tokens_sold / project.total_tokens) * 100;
  }

  static getTimeRemaining(project: LaunchpadProject): string {
    const now = new Date();
    const end = new Date(project.end_time);
    const start = new Date(project.start_time);

    if (now < start) {
      const diff = start.getTime() - now.getTime();
      return this.formatTimeDiff(diff) + ' until start';
    }

    if (now > end) {
      return 'Ended';
    }

    const diff = end.getTime() - now.getTime();
    return this.formatTimeDiff(diff) + ' remaining';
  }

  private static formatTimeDiff(ms: number): string {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
}
