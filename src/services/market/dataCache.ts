
export class DataCache {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private static priceCache = new Map<string, { price: number; timestamp: number }>();

  static set<T>(key: string, data: T, ttl: number = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
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

  static getPrice(symbol: string, maxAge: number = 30000): number | null {
    const item = this.priceCache.get(symbol);
    if (!item) return null;

    const age = Date.now() - item.timestamp;
    if (age > maxAge) {
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
}
