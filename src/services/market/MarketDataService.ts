
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

  static async fetchHistoricalData(symbol: string, days: number): Promise<MarketData[]> {
    // Mock implementation for now
    const data: MarketData[] = [];
    const basePrice = Math.random() * 100 + 50;
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      data.push({
        symbol,
        price: basePrice + (Math.random() - 0.5) * 20,
        change: (Math.random() - 0.5) * 5,
        changePercent: (Math.random() - 0.5) * 3,
        volume: Math.floor(Math.random() * 1000000),
        timestamp: date.toISOString()
      });
    }
    
    return data.reverse();
  }
}
