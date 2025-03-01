
import { MarketData } from './types';

export const MockDataHelper = {
  getBasePrice(symbol: string): number {
    if (!symbol) return 100.00;
    
    // Return realistic baseline prices for common stocks
    const prices: Record<string, number> = {
      'AAPL': 180.25,
      'MSFT': 350.50,
      'AMZN': 145.75,
      'GOOGL': 140.30,
      'NVDA': 450.20,
      'META': 330.15,
      'TSLA': 200.10,
      'V': 280.45,
      'WMT': 68.90,
      'JPM': 190.25
    };
    
    return prices[symbol.toUpperCase()] || 100.00 + Math.random() * 100;
  },

  generateMockData(symbol: string, days: number): MarketData[] {
    if (!symbol) symbol = 'UNKNOWN';
    
    console.log(`Generating mock data for ${symbol} for demonstration purposes`);
    const mockData: MarketData[] = [];
    const basePrice = this.getBasePrice(symbol);
    const now = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(now.getDate() - i);
      
      // Create some random price movement
      const randomFactor = 0.98 + Math.random() * 0.04; // Random between 0.98 and 1.02
      const prevPrice = i === days ? basePrice : mockData[mockData.length - 1].price;
      const price = prevPrice * randomFactor;
      
      mockData.push({
        symbol: symbol.toUpperCase(),
        timestamp: date.toISOString(),
        price: parseFloat(price.toFixed(2)),
        open: parseFloat((price * 0.99).toFixed(2)),
        high: parseFloat((price * 1.01).toFixed(2)),
        low: parseFloat((price * 0.98).toFixed(2)),
        close: parseFloat(price.toFixed(2)),
        volume: Math.floor(Math.random() * 10000000),
        type: 'stock'
      });
    }
    
    return mockData;
  },
  
  generateMockDataPoint(symbol: string): MarketData {
    if (!symbol) symbol = 'UNKNOWN';
    
    console.log(`Generating mock data point for ${symbol} for demonstration purposes`);
    const basePrice = this.getBasePrice(symbol);
    
    return {
      symbol: symbol.toUpperCase(),
      timestamp: new Date().toISOString(),
      price: basePrice,
      open: parseFloat((basePrice * 0.99).toFixed(2)),
      high: parseFloat((basePrice * 1.01).toFixed(2)),
      low: parseFloat((basePrice * 0.98).toFixed(2)),
      close: basePrice,
      volume: Math.floor(Math.random() * 10000000),
      type: 'stock'
    };
  }
};
