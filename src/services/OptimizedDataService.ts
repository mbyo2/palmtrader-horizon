import { supabase } from "@/integrations/supabase/client";
import { devConsole } from "@/utils/consoleCleanup";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

export class CacheManager {
  private static cache = new Map<string, CacheEntry<any>>();
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  static set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    };
    this.cache.set(key, entry);
  }

  static get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  static has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  static delete(key: string): void {
    this.cache.delete(key);
  }

  static clear(): void {
    this.cache.clear();
  }

  static getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  static cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  // Auto cleanup every 10 minutes
  static {
    setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }
}

export class OptimizedDataService {
  private static readonly BATCH_SIZE = 50;
  private static readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  private static readonly MAX_REQUESTS_PER_WINDOW = 100;

  private static requestCounts = new Map<string, { count: number; resetTime: number }>();

  static async getMarketData(symbols: string[]): Promise<any[]> {
    const cacheKey = `market_data_${symbols.sort().join(',')}_${Math.floor(Date.now() / 60000)}`;
    
    // Check cache first
    const cached = CacheManager.get<any[]>(cacheKey);
    if (cached) {
      devConsole.debug('Cache hit for market data:', symbols);
      return cached;
    }

    try {
      // Rate limiting check
      if (!this.checkRateLimit('market_data')) {
        throw new Error('Rate limit exceeded for market data requests');
      }

      // Batch request for multiple symbols
      const batches = this.createBatches(symbols, this.BATCH_SIZE);
      const results: any[] = [];

      for (const batch of batches) {
        const { data, error } = await supabase
          .from('market_data')
          .select('*')
          .in('symbol', batch)
          .order('timestamp', { ascending: false });

        if (error) throw error;
        if (data) results.push(...data);
      }

      // Cache for 1 minute
      CacheManager.set(cacheKey, results, 60 * 1000);
      
      return results;
    } catch (error) {
      devConsole.error('Error fetching market data:', error);
      throw error;
    }
  }

  static async getPortfolioSummary(userId: string): Promise<any> {
    const cacheKey = `portfolio_${userId}_${Math.floor(Date.now() / 30000)}`; // 30 second cache
    
    const cached = CacheManager.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      if (!this.checkRateLimit(`portfolio_${userId}`)) {
        throw new Error('Rate limit exceeded for portfolio requests');
      }

      const { data, error } = await supabase
        .from('portfolio')
        .select(`
          symbol,
          shares,
          average_price,
          market_data (
            price,
            timestamp
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      // Calculate portfolio metrics
      const summary = this.calculatePortfolioMetrics(data || []);
      
      CacheManager.set(cacheKey, summary, 30 * 1000);
      return summary;
    } catch (error) {
      devConsole.error('Error fetching portfolio summary:', error);
      throw error;
    }
  }

  static async getUserTrades(userId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    const cacheKey = `trades_${userId}_${limit}_${offset}_${Math.floor(Date.now() / 120000)}`; // 2 minute cache
    
    const cached = CacheManager.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      if (!this.checkRateLimit(`trades_${userId}`)) {
        throw new Error('Rate limit exceeded for trades requests');
      }

      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      CacheManager.set(cacheKey, data || [], 120 * 1000);
      return data || [];
    } catch (error) {
      devConsole.error('Error fetching user trades:', error);
      throw error;
    }
  }

  private static checkRateLimit(endpoint: string): boolean {
    const now = Date.now();
    const windowKey = `${endpoint}_${Math.floor(now / this.RATE_LIMIT_WINDOW)}`;
    
    const current = this.requestCounts.get(windowKey);
    if (!current) {
      this.requestCounts.set(windowKey, { count: 1, resetTime: now + this.RATE_LIMIT_WINDOW });
      return true;
    }

    if (current.count >= this.MAX_REQUESTS_PER_WINDOW) {
      devConsole.warn(`Rate limit exceeded for ${endpoint}`);
      return false;
    }

    current.count++;
    return true;
  }

  private static createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  private static calculatePortfolioMetrics(positions: any[]): any {
    let totalValue = 0;
    let totalCost = 0;
    let totalPnL = 0;

    for (const position of positions) {
      const currentPrice = position.market_data?.[0]?.price || 0;
      const marketValue = position.shares * currentPrice;
      const costBasis = position.shares * position.average_price;
      
      totalValue += marketValue;
      totalCost += costBasis;
      totalPnL += (marketValue - costBasis);
    }

    const totalReturn = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalPnL,
      totalReturn,
      positions: positions.length,
      lastUpdated: new Date().toISOString()
    };
  }

  // Cleanup old rate limit counters
  static {
    setInterval(() => {
      const now = Date.now();
      for (const [key, data] of this.requestCounts.entries()) {
        if (now > data.resetTime) {
          this.requestCounts.delete(key);
        }
      }
    }, this.RATE_LIMIT_WINDOW);
  }
}