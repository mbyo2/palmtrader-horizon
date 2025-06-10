
import { MarketData } from './types';

export class MarketDataService {
  static async fetchLatestPrice(symbol: string): Promise<MarketData> {
    // Mock implementation for now
    return {
      symbol,
      price: Math.random() * 100 + 50,
      change: (Math.random() - 0.5) * 10,
      changePercent: (Math.random() - 0.5) * 5,
      volume: Math.floor(Math.random() * 1000000),
      timestamp: new Date().toISOString()
    };
  }

  static async fetchHistoricalData(symbol: string, days: number = 30): Promise<MarketData[]> {
    // Mock implementation for now
    const data: MarketData[] = [];
    const basePrice = Math.random() * 100 + 50;
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const price = basePrice + (Math.random() - 0.5) * 20;
      const change = (Math.random() - 0.5) * 5;
      
      data.push({
        symbol,
        price: price,
        open: price * (0.98 + Math.random() * 0.04),
        high: price * (1 + Math.random() * 0.02),
        low: price * (1 - Math.random() * 0.02),
        close: price,
        change: change,
        changePercent: (change / price) * 100,
        volume: Math.floor(Math.random() * 1000000),
        timestamp: date.toISOString(),
        type: 'stock'
      });
    }
    
    return data.reverse();
  }

  static async fetchMultipleLatestPrices(symbols: string[]): Promise<Array<{ symbol: string; price: number; change?: number; volume?: number }>> {
    // Mock implementation for now
    return symbols.map(symbol => ({
      symbol,
      price: Math.random() * 100 + 50,
      change: (Math.random() - 0.5) * 5,
      volume: Math.floor(Math.random() * 1000000)
    }));
  }
}
