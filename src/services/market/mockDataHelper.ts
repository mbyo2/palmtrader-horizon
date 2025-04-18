
import { MarketData } from "./types";

// Cache for mock data to avoid regenerating it
const mockDataCache = new Map<string, MarketData[]>();
// Cache for the last price to ensure consistent data
const lastPriceCache = new Map<string, number>();

export class MockDataHelper {
  static generateMockData(symbol: string, days: number): MarketData[] {
    const cacheKey = `${symbol}-${days}`;
    
    // Return cached data if we have it
    if (mockDataCache.has(cacheKey)) {
      return mockDataCache.get(cacheKey)!;
    }
    
    console.log(`Generating mock historical data for ${symbol}`);
    const data: MarketData[] = [];
    const endDate = new Date();
    let currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - days);
    
    // Get the last known price or generate a new one
    let price = lastPriceCache.get(symbol) || Math.random() * 490 + 10;
    
    while (currentDate <= endDate) {
      // Generate random price movement (-5% to +5%)
      const priceChange = price * (Math.random() * 0.1 - 0.05);
      price += priceChange;
      price = Math.max(1, price); // Ensure price doesn't go below $1
      
      const open = price - (Math.random() * 2);
      const close = price + (Math.random() * 2);
      const high = Math.max(open, close) + (Math.random() * 3);
      const low = Math.min(open, close) - (Math.random() * 3);
      
      data.push({
        symbol,
        timestamp: String(currentDate.getTime()),
        price,
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 10000000),
        type: 'stock',
      });
      
      // Move to the next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Update the lastPriceCache with the final price
    if (data.length > 0) {
      lastPriceCache.set(symbol, data[data.length - 1].price);
    }
    
    // Cache the result
    mockDataCache.set(cacheKey, data);
    
    return data;
  }
  
  static generateMockDataPoint(symbol: string): MarketData {
    // Get the last known price or generate a new one
    let price = lastPriceCache.get(symbol) || Math.random() * 490 + 10;
    
    // Add some random movement if we already had a price
    if (lastPriceCache.has(symbol)) {
      const priceChange = price * (Math.random() * 0.02 - 0.01); // Smaller change for a point
      price += priceChange;
      price = Math.max(1, price); // Ensure price doesn't go below $1
    }
    
    // Update the cache
    lastPriceCache.set(symbol, price);
    
    return {
      symbol,
      timestamp: String(Date.now()),
      price,
      open: price * 0.99,
      high: price * 1.01,
      low: price * 0.98,
      close: price,
      volume: Math.floor(Math.random() * 1000000),
      type: 'stock',
    };
  }
  
  // Clear the cache to free up memory
  static clearCache(): void {
    mockDataCache.clear();
  }
  
  // Clear cache for a specific symbol
  static clearSymbolCache(symbol: string): void {
    // Remove all entries for this symbol
    for (const key of mockDataCache.keys()) {
      if (key.startsWith(`${symbol}-`)) {
        mockDataCache.delete(key);
      }
    }
  }
}
