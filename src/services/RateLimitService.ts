import { supabase } from "@/integrations/supabase/client";
import { devConsole } from "@/utils/consoleCleanup";

export interface RateLimitConfig {
  endpoint: string;
  maxRequests: number;
  windowMs: number;
  userSpecific?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  error?: string;
}

export class RateLimitService {
  private static readonly DEFAULT_CONFIGS: RateLimitConfig[] = [
    { endpoint: 'api_calls', maxRequests: 100, windowMs: 60000 }, // 100 per minute
    { endpoint: 'file_upload', maxRequests: 10, windowMs: 60000, userSpecific: true }, // 10 per minute per user
    { endpoint: 'payment_processing', maxRequests: 5, windowMs: 300000, userSpecific: true }, // 5 per 5 minutes per user
    { endpoint: 'market_data', maxRequests: 200, windowMs: 60000 }, // 200 per minute
    { endpoint: 'trading', maxRequests: 20, windowMs: 60000, userSpecific: true }, // 20 per minute per user
  ];

  static async checkRateLimit(
    endpoint: string, 
    userId?: string, 
    ipAddress?: string
  ): Promise<RateLimitResult> {
    try {
      const config = this.DEFAULT_CONFIGS.find(c => c.endpoint === endpoint);
      if (!config) {
        devConsole.warn(`No rate limit config found for endpoint: ${endpoint}`);
        return { allowed: true, remaining: 999, resetTime: new Date(Date.now() + 60000) };
      }

      const now = new Date();
      const windowStart = new Date(now.getTime() - config.windowMs);

      // Check existing rate limit entry
      let query = supabase
        .from('rate_limits')
        .select('*')
        .eq('endpoint', endpoint)
        .gte('window_start', windowStart.toISOString());

      if (config.userSpecific && userId) {
        query = query.eq('user_id', userId);
      } else if (ipAddress) {
        query = query.eq('ip_address', ipAddress);
      }

      const { data: existing, error: fetchError } = await query.single();

      if (fetchError && fetchError.code !== 'PGRST116') { // Not found is OK
        throw fetchError;
      }

      if (!existing) {
        // First request in window, create new entry
        const expiresAt = new Date(now.getTime() + config.windowMs);
        
        const { error: insertError } = await supabase
          .from('rate_limits')
          .insert({
            endpoint,
            user_id: config.userSpecific ? userId : null,
            ip_address: ipAddress || null,
            request_count: 1,
            window_start: now.toISOString(),
            expires_at: expiresAt.toISOString()
          });

        if (insertError) throw insertError;

        return {
          allowed: true,
          remaining: config.maxRequests - 1,
          resetTime: expiresAt
        };
      }

      // Check if limit exceeded
      if (existing.request_count >= config.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: new Date(existing.expires_at),
          error: `Rate limit exceeded for ${endpoint}`
        };
      }

      // Increment counter
      const { error: updateError } = await supabase
        .from('rate_limits')
        .update({ 
          request_count: existing.request_count + 1 
        })
        .eq('id', existing.id);

      if (updateError) throw updateError;

      return {
        allowed: true,
        remaining: config.maxRequests - (existing.request_count + 1),
        resetTime: new Date(existing.expires_at)
      };

    } catch (error) {
      devConsole.error('Rate limit check failed:', error);
      // Fail open - allow request if rate limiting fails
      return { 
        allowed: true, 
        remaining: 999, 
        resetTime: new Date(Date.now() + 60000),
        error: error instanceof Error ? error.message : 'Rate limit check failed'
      };
    }
  }

  static async createRateLimitMiddleware(endpoint: string) {
    return async (userId?: string, ipAddress?: string) => {
      const result = await this.checkRateLimit(endpoint, userId, ipAddress);
      
      if (!result.allowed) {
        throw new Error(result.error || 'Rate limit exceeded');
      }
      
      return result;
    };
  }

  static async getUsageStats(userId?: string): Promise<{
    endpoint: string;
    currentCount: number;
    maxRequests: number;
    resetTime: Date;
  }[]> {
    try {
      let query = supabase
        .from('rate_limits')
        .select('*')
        .gte('expires_at', new Date().toISOString());

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data?.map(limit => {
        const config = this.DEFAULT_CONFIGS.find(c => c.endpoint === limit.endpoint);
        return {
          endpoint: limit.endpoint,
          currentCount: limit.request_count,
          maxRequests: config?.maxRequests || 100,
          resetTime: new Date(limit.expires_at)
        };
      }) || [];

    } catch (error) {
      devConsole.error('Failed to get usage stats:', error);
      return [];
    }
  }

  static async clearExpiredLimits(): Promise<void> {
    try {
      const { error } = await supabase
        .from('rate_limits')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) throw error;
      devConsole.log('Cleared expired rate limits');
    } catch (error) {
      devConsole.error('Failed to clear expired rate limits:', error);
    }
  }
}