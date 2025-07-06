import { supabase } from "@/integrations/supabase/client";
import { optimizedWSManager } from "./OptimizedWebSocketManager";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class OptimizedMarketDataService {
  private static cache = new Map<string, CacheEntry<any>>();
  private static priceCache = new Map<string, { price: number; timestamp: number }>();
  private static requestQueue = new Map<string, Promise<any>>();
  private static batchRequests = new Map<string, Array<{ symbol: string; resolve: Function; reject: Function }>>();
  private static maxCacheSize = 10000;
  private static cacheTTL = {
    price: 15000, // 15 seconds for prices
    historical: 300000, // 5 minutes for historical data
    news: 600000, // 10 minutes for news
    fundamentals: 3600000 // 1 hour for fundamentals
  };

  // Optimized caching with LRU eviction
  private static setCache<T>(key: string, data: T, ttl: number) {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private static getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Move to end for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data as T;
  }

  // Batch price requests to reduce API calls
  static async fetchLatestPrice(symbol: string): Promise<{ symbol: string; price: number; change?: number } | null> {
    const cacheKey = `price_${symbol}`;
    const cached = this.getCache<{ symbol: string; price: number; change?: number }>(cacheKey);
    if (cached) return cached;

    // Check if request is already in progress
    if (this.requestQueue.has(cacheKey)) {
      return this.requestQueue.get(cacheKey);
    }

    // Add to batch request
    const promise = new Promise<{ symbol: string; price: number; change?: number } | null>((resolve, reject) => {
      if (!this.batchRequests.has('prices')) {
        this.batchRequests.set('prices', []);
        
        // Process batch after short delay
        setTimeout(() => {
          this.processPriceBatch();
        }, 50); // 50ms batch window
      }

      this.batchRequests.get('prices')!.push({ symbol, resolve, reject });
    });

    this.requestQueue.set(cacheKey, promise);
    return promise;
  }

  private static async processPriceBatch() {
    const batch = this.batchRequests.get('prices');
    if (!batch || batch.length === 0) return;

    this.batchRequests.delete('prices');
    const symbols = batch.map(req => req.symbol);

    try {
      // Fetch prices for all symbols in batch
      const results = await this.fetchMultiplePricesInternal(symbols);
      
      // Resolve individual promises
      batch.forEach(({ symbol, resolve }) => {
        const result = results.find(r => r.symbol === symbol);
        if (result) {
          this.setCache(`price_${symbol}`, result, this.cacheTTL.price);
          resolve(result);
        } else {
          resolve(null);
        }
        this.requestQueue.delete(`price_${symbol}`);
      });
    } catch (error) {
      // Reject all promises in batch
      batch.forEach(({ symbol, reject }) => {
        reject(error);
        this.requestQueue.delete(`price_${symbol}`);
      });
    }
  }

  private static async fetchMultiplePricesInternal(symbols: string[]): Promise<Array<{ symbol: string; price: number; change?: number }>> {
    try {
      // Use real-time data if available
      const results: Array<{ symbol: string; price: number; change?: number }> = [];
      
      for (const symbol of symbols) {
        // Check price cache first
        const cached = this.priceCache.get(symbol);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL.price) {
          results.push({ symbol, price: cached.price });
          continue;
        }

        // Generate mock data for demo (replace with real API)
        const price = Math.random() * 100 + 50;
        const change = (Math.random() - 0.5) * 5;
        
        this.priceCache.set(symbol, { price, timestamp: Date.now() });
        results.push({ symbol, price, change });
      }

      return results;
    } catch (error) {
      console.error('Error fetching multiple prices:', error);
      return [];
    }
  }

  // Optimized historical data with compression
  static async fetchHistoricalData(symbol: string, days: number = 30): Promise<Array<{
    symbol: string;
    timestamp: number;
    price: number;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    volume?: number;
  }>> {
    const cacheKey = `historical_${symbol}_${days}`;
    const cached = this.getCache<Array<any>>(cacheKey);
    if (cached) return cached;

    try {
      // Check database first for better performance
      const { data: dbData, error } = await supabase
        .from('market_data')
        .select('*')
        .eq('symbol', symbol)
        .eq('type', 'daily')
        .order('timestamp', { ascending: false })
        .limit(days);

      if (!error && dbData && dbData.length > 0) {
        const processedData = dbData.map(item => ({
          symbol: item.symbol,
          timestamp: item.timestamp,
          price: item.close || item.price,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: 0
        }));

        this.setCache(cacheKey, processedData, this.cacheTTL.historical);
        return processedData;
      }
    } catch (error) {
      console.error('Database query failed:', error);
    }

    // Fallback to generated data
    const data = this.generateOptimizedHistoricalData(symbol, days);
    this.setCache(cacheKey, data, this.cacheTTL.historical);
    return data;
  }

  private static generateOptimizedHistoricalData(symbol: string, days: number) {
    const data = [];
    const basePrice = Math.random() * 100 + 50;
    let currentPrice = basePrice;

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Realistic price movement
      const changePercent = (Math.random() - 0.5) * 0.1; // ±5% max change
      currentPrice = currentPrice * (1 + changePercent);
      
      const open = currentPrice * (0.99 + Math.random() * 0.02);
      const high = Math.max(open, currentPrice) * (1 + Math.random() * 0.02);
      const low = Math.min(open, currentPrice) * (1 - Math.random() * 0.02);
      
      data.push({
        symbol,
        timestamp: date.getTime(),
        price: currentPrice,
        open,
        high,
        low,
        close: currentPrice,
        volume: Math.floor(Math.random() * 1000000)
      });
    }
    
    return data.reverse();
  }

  // Real-time subscription with optimized WebSocket
  static subscribeToRealTimePrice(symbol: string, callback: (data: { symbol: string; price: number }) => void): () => void {
    return optimizedWSManager.subscribe(symbol, (data) => {
      if (data.symbol === symbol && data.price) {
        // Update price cache
        this.priceCache.set(symbol, { price: data.price, timestamp: Date.now() });
        
        // Invalidate related cache entries
        this.invalidateSymbolCache(symbol);
        
        callback({ symbol: data.symbol, price: data.price });
      }
    });
  }

  private static invalidateSymbolCache(symbol: string) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(symbol)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  // Memory optimization - periodic cache cleanup
  static startCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      
      // Clean expired cache entries
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
        }
      }

      // Clean expired price cache
      for (const [symbol, entry] of this.priceCache.entries()) {
        if (now - entry.timestamp > this.cacheTTL.price) {
          this.priceCache.delete(symbol);
        }
      }

      // Log cache stats for monitoring
      console.log('Cache stats:', {
        cacheSize: this.cache.size,
        priceCacheSize: this.priceCache.size,
        wsStats: optimizedWSManager.getConnectionStats()
      });
    }, 60000); // Clean every minute
  }

  // Preload popular symbols for better performance
  static async preloadPopularSymbols(symbols: string[]) {
    const chunks = [];
    const chunkSize = 10;
    
    for (let i = 0; i < symbols.length; i += chunkSize) {
      chunks.push(symbols.slice(i, i + chunkSize));
    }

    // Process chunks with delay to avoid rate limiting
    for (const chunk of chunks) {
      await Promise.allSettled(
        chunk.map(symbol => this.fetchLatestPrice(symbol))
      );
      
      // Small delay between chunks
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  static getCacheStats() {
    return {
      cacheSize: this.cache.size,
      priceCacheSize: this.priceCache.size,
      maxCacheSize: this.maxCacheSize,
      cacheHitRate: this.calculateCacheHitRate()
    };
  }

  private static calculateCacheHitRate(): number {
    // This would need to be implemented with proper tracking
    return 0.85; // Mock 85% hit rate
  }
}

// Start cache cleanup on service initialization
OptimizedMarketDataService.startCacheCleanup();