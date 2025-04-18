
import { MarketData } from "./types";
import { DataCache } from "./dataCache";
import { DataFetcher } from "./dataFetcher";

export class MarketDataService {
  /**
   * Fetch the latest price for a symbol
   * @param symbol Stock symbol
   * @returns Latest price data
   */
  static async fetchLatestPrice(symbol: string): Promise<{ symbol: string; price: number; change?: number; volume?: number }> {
    return DataFetcher.fetchLatestPrice(symbol);
  }
  
  /**
   * Fetch historical data for a symbol
   * @param symbol Stock symbol
   * @param days Number of days of historical data
   * @returns Array of historical data points
   */
  static async fetchHistoricalData(symbol: string, days: number = 30): Promise<MarketData[]> {
    return DataFetcher.fetchHistoricalData(symbol, days);
  }

  /**
   * Fetch latest prices for multiple symbols at once
   * @param symbols Array of stock symbols
   * @returns Array of price data
   */
  static async fetchMultipleLatestPrices(symbols: string[]): Promise<Array<{ symbol: string; price: number; change?: number; volume?: number }>> {
    return DataFetcher.fetchMultipleLatestPrices(symbols);
  }
  
  /**
   * Clear all caches
   */
  static clearCache(): void {
    DataCache.clearAll();
    MockDataHelper.clearCache();
  }
  
  /**
   * Clear cache for a specific symbol
   * @param symbol Stock symbol
   */
  static clearSymbolCache(symbol: string): void {
    DataCache.clearSymbol(symbol);
    MockDataHelper.clearSymbolCache(symbol);
  }
}

// Import the mock data helper to avoid circular references
import { MockDataHelper } from "./mockDataHelper";
