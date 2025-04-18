
// Cache management for market data

// Cache for market data to reduce database queries
const dataCache = new Map<string, { data: any; timestamp: number }>();
const priceCache = new Map<string, { price: number; timestamp: number }>();

// Default cache settings
const DEFAULT_TTL = 60000; // 1 minute cache lifetime
const EXTENDED_TTL = 5 * 60 * 1000; // 5 minutes for less frequently changing data
const SHORT_TTL = 10000; // 10 seconds for frequently changing data

export const DataCache = {
  /**
   * Get data from cache
   * @param key Cache key
   * @param ttl Time to live in milliseconds
   * @returns Cached data or null if not found or expired
   */
  get<T>(key: string, ttl = DEFAULT_TTL): T | null {
    const now = Date.now();
    const cachedItem = dataCache.get(key);
    
    if (cachedItem && now - cachedItem.timestamp < ttl) {
      return cachedItem.data as T;
    }
    
    return null;
  },
  
  /**
   * Store data in cache
   * @param key Cache key
   * @param data Data to store
   */
  set<T>(key: string, data: T): void {
    dataCache.set(key, { 
      data, 
      timestamp: Date.now() 
    });
  },
  
  /**
   * Get price from cache
   * @param symbol Stock symbol
   * @param ttl Time to live in milliseconds
   * @returns Cached price or null if not found or expired
   */
  getPrice(symbol: string, ttl = DEFAULT_TTL): number | null {
    const now = Date.now();
    const cachedPrice = priceCache.get(symbol);
    
    if (cachedPrice && now - cachedPrice.timestamp < ttl) {
      return cachedPrice.price;
    }
    
    return null;
  },
  
  /**
   * Store price in cache
   * @param symbol Stock symbol
   * @param price Price to store
   */
  setPrice(symbol: string, price: number): void {
    priceCache.set(symbol, { 
      price, 
      timestamp: Date.now() 
    });
  },
  
  /**
   * Clear all caches
   */
  clearAll(): void {
    dataCache.clear();
    priceCache.clear();
  },
  
  /**
   * Clear cache for a specific symbol
   * @param symbol Stock symbol
   */
  clearSymbol(symbol: string): void {
    // Clear price cache
    priceCache.delete(symbol);
    
    // Clear data cache for any keys containing this symbol
    for (const key of dataCache.keys()) {
      if (key.includes(symbol)) {
        dataCache.delete(key);
      }
    }
  },
  
  /**
   * Clear expired cache entries
   */
  clearExpired(): void {
    const now = Date.now();
    
    // Clean up data cache
    for (const [key, item] of dataCache.entries()) {
      if (now - item.timestamp > EXTENDED_TTL) {
        dataCache.delete(key);
      }
    }
    
    // Clean up price cache
    for (const [key, item] of priceCache.entries()) {
      if (now - item.timestamp > DEFAULT_TTL) {
        priceCache.delete(key);
      }
    }
  }
};

// Automatic cache cleanup every 5 minutes
setInterval(() => {
  DataCache.clearExpired();
}, 5 * 60 * 1000);
