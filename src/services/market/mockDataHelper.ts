
import { MarketData } from "./types";

export class MockDataHelper {
  private static cache = new Map<string, MarketData[]>();
  private static priceCache = new Map<string, number>();

  static generateMockData(symbol: string, days: number = 30): MarketData[] {
    const cacheKey = `${symbol}-${days}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    console.log(`Generating ${days} days of mock data for ${symbol}`);
    
    const data: MarketData[] = [];
    const basePrice = 50 + (symbol.charCodeAt(0) % 200); // Consistent base price per symbol
    let currentPrice = basePrice;
    
    const endDate = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      
      // Generate realistic price movement (±3% daily max)
      const change = (Math.random() - 0.5) * 0.06; // -3% to +3%
      currentPrice = currentPrice * (1 + change);
      
      // Ensure price doesn't go below $1
      currentPrice = Math.max(1, currentPrice);
      
      const high = currentPrice * (1 + Math.random() * 0.02);
      const low = currentPrice * (1 - Math.random() * 0.02);
      const open = i === days - 1 ? basePrice : data[data.length - 1]?.close || currentPrice;
      
      data.push({
        symbol,
        timestamp: date.getTime().toString(),
        price: Number(currentPrice.toFixed(2)),
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(currentPrice.toFixed(2)),
        volume: Math.floor(Math.random() * 2000000) + 500000,
        type: 'stock'
      });
    }
    
    this.cache.set(cacheKey, data);
    this.priceCache.set(symbol, currentPrice);
    
    return data;
  }

  static generateMockDataPoint(symbol: string): { symbol: string; price: number; change?: number; volume?: number } {
    const basePrice = this.priceCache.get(symbol) || (50 + (symbol.charCodeAt(0) % 200));
    const change = (Math.random() - 0.5) * 0.04; // ±2%
    const newPrice = basePrice * (1 + change);
    
    this.priceCache.set(symbol, newPrice);
    
    return {
      symbol,
      price: Number(newPrice.toFixed(2)),
      change: change * 100,
      volume: Math.floor(Math.random() * 1000000) + 100000
    };
  }

  static clearCache(): void {
    this.cache.clear();
  }

  static clearSymbolCache(symbol: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.startsWith(symbol)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
    this.priceCache.delete(symbol);
  }
}
