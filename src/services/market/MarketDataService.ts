
import { DataFetcher } from './dataFetcher';
import { MarketData } from './types';

/**
 * Main service for fetching market data from real APIs
 */
export class MarketDataService {
  /**
   * Fetch the latest price for a stock symbol from real market APIs
   * @param symbol Stock symbol (e.g., 'AAPL', 'MSFT')
   * @returns Promise resolving to latest price data
   */
  static async fetchLatestPrice(symbol: string): Promise<{ symbol: string; price: number; change?: number; volume?: number }> {
    console.log(`MarketDataService: Fetching latest price for ${symbol}`);
    return DataFetcher.fetchLatestPrice(symbol);
  }

  /**
   * Fetch historical market data for a stock symbol
   * @param symbol Stock symbol
   * @param days Number of days of historical data (default: 30)
   * @returns Promise resolving to array of historical market data
   */
  static async fetchHistoricalData(symbol: string, days: number = 30): Promise<MarketData[]> {
    console.log(`MarketDataService: Fetching ${days} days of historical data for ${symbol}`);
    return DataFetcher.fetchHistoricalData(symbol, days);
  }

  /**
   * Fetch latest prices for multiple symbols
   * @param symbols Array of stock symbols
   * @returns Promise resolving to array of price data
   */
  static async fetchMultipleLatestPrices(symbols: string[]): Promise<Array<{ symbol: string; price: number; change?: number; volume?: number }>> {
    console.log(`MarketDataService: Fetching prices for ${symbols.length} symbols`);
    return DataFetcher.fetchMultipleLatestPrices(symbols);
  }

  /**
   * Validate that market data is recent and accurate
   * @param data Market data to validate
   * @returns boolean indicating if data is valid
   */
  static validateMarketData(data: any): boolean {
    if (!data || typeof data.price !== 'number' || data.price <= 0) {
      return false;
    }
    
    // Check if timestamp is recent (within last day for real-time data)
    if (data.timestamp) {
      const dataAge = Date.now() - (typeof data.timestamp === 'string' ? parseInt(data.timestamp) : data.timestamp);
      const oneDayMs = 24 * 60 * 60 * 1000;
      
      if (dataAge > oneDayMs) {
        console.warn(`Market data for ${data.symbol} is older than 1 day`);
        return false;
      }
    }
    
    return true;
  }
}
