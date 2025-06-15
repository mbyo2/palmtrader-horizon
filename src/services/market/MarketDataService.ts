
export interface MarketData {
  symbol: string;
  price: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  timestamp?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  type?: string;
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
        timestamp: Date.now(),
        open: mockPrice * (0.98 + Math.random() * 0.04),
        high: mockPrice * (1.01 + Math.random() * 0.02),
        low: mockPrice * (0.97 + Math.random() * 0.02),
        close: mockPrice
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
        
        const price = basePrice + (Math.random() - 0.5) * 20;
        data.push({
          symbol,
          price,
          timestamp: date.getTime(),
          open: price * (0.98 + Math.random() * 0.04),
          high: price * (1.01 + Math.random() * 0.02),
          low: price * (0.97 + Math.random() * 0.02),
          close: price,
          volume: Math.floor(Math.random() * 1000000),
          type: 'historical'
        });
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      return [];
    }
  }

  static async fetchMultipleLatestPrices(symbols: string[]): Promise<Array<{ symbol: string; price: number; change?: number; volume?: number }>> {
    try {
      const results = await Promise.allSettled(
        symbols.map(symbol => this.fetchLatestPrice(symbol))
      );

      return results
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => {
          const data = (result as PromiseFulfilledResult<MarketData>).value;
          return {
            symbol: data.symbol,
            price: data.price,
            change: data.change,
            volume: data.volume
          };
        });
    } catch (error) {
      console.error('Error fetching multiple prices:', error);
      return [];
    }
  }
}
