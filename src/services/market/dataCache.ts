
export class DataCache {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private static priceCache = new Map<string, { price: number; timestamp: number }>();

  // More aggressive TTL for better real-time accuracy
  static getDynamicTTL(type: 'price' | 'historical' = 'price'): number {
    const now = new Date();
    const hour = now.getHours();
    const isMarketHours = hour >= 9 && hour <= 16; // NYSE hours (9:30 AM - 4:00 PM EST)
    
    if (type === 'price') {
      return isMarketHours ? 10000 : 30000; // 10s during market hours, 30s after hours (reduced from 15s/60s)
    } else {
      return isMarketHours ? 120000 : 300000; // 2min during market hours, 5min after hours (reduced from 3min/10min)
    }
  }

  static set<T>(key: string, data: T, ttl?: number): void {
    const actualTTL = ttl || this.getDynamicTTL('historical');
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: actualTTL
    });
  }

  static get<T>(key: string, maxAge?: number): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const age = Date.now() - item.timestamp;
    const ttl = maxAge || item.ttl;

    if (age > ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  static setPrice(symbol: string, price: number): void {
    this.priceCache.set(symbol, {
      price,
      timestamp: Date.now()
    });
  }

  static getPrice(symbol: string, maxAge?: number): number | null {
    const item = this.priceCache.get(symbol);
    if (!item) return null;

    const age = Date.now() - item.timestamp;
    const ttl = maxAge || this.getDynamicTTL('price');
    
    if (age > ttl) {
      this.priceCache.delete(symbol);
      return null;
    }

    return item.price;
  }

  static clearSymbol(symbol: string): void {
    // Clear all cache entries related to this symbol
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(symbol)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
    this.priceCache.delete(symbol);
  }

  static clearAll(): void {
    this.cache.clear();
    this.priceCache.clear();
  }

  static getStats(): { totalEntries: number; priceEntries: number } {
    return {
      totalEntries: this.cache.size,
      priceEntries: this.priceCache.size
    };
  }

  // New method to get cache metadata
  static getCacheInfo(symbol: string): { age: number; source: 'cache' | 'none' } {
    const item = this.priceCache.get(symbol);
    if (!item) return { age: 0, source: 'none' };
    
    return {
      age: Date.now() - item.timestamp,
      source: 'cache'
    };
  }
}
