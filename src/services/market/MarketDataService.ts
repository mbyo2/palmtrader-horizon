
export interface MarketData {
  symbol: string;
  price: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  timestamp?: number;
}

export class MarketDataService {
  static async fetchLatestPrice(symbol: string): Promise<MarketData | null> {
    try {
      // For demo purposes, return mock data
      const mockPrice = Math.random() * 100 + 50; // Random price between 50-150
      
      return {
        symbol,
        price: mockPrice,
        change: (Math.random() - 0.5) * 10,
        changePercent: (Math.random() - 0.5) * 5,
        volume: Math.floor(Math.random() * 1000000),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      return null;
    }
  }

  static async fetchHistoricalData(symbol: string, days: number): Promise<MarketData[]> {
    try {
      // Generate mock historical data
      const data: MarketData[] = [];
      const basePrice = Math.random() * 100 + 50;
      
      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        data.push({
          symbol,
          price: basePrice + (Math.random() - 0.5) * 20,
          timestamp: date.getTime()
        });
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      return [];
    }
  }
}
