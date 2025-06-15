
import { MarketData } from './types';

export const generateMockData = (symbol: string, days: number = 30): MarketData[] => {
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
      type: 'mock'
    });
  }
  
  return data;
};

export const generateMockPrice = (symbol: string): MarketData => {
  const price = Math.random() * 100 + 50;
  return {
    symbol,
    price,
    change: (Math.random() - 0.5) * 10,
    changePercent: (Math.random() - 0.5) * 5,
    volume: Math.floor(Math.random() * 1000000),
    timestamp: Date.now(),
    open: price * (0.98 + Math.random() * 0.04),
    high: price * (1.01 + Math.random() * 0.02),
    low: price * (0.97 + Math.random() * 0.02),
    close: price,
    type: 'mock'
  };
};
