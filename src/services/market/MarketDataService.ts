
import { MarketData, MarketDataCallback } from './types';
import { MockDataHelper } from './mockDataHelper';
import { DataFetchService } from './dataFetchService';
import { SubscriptionService } from './subscriptionService';
import { toast } from 'sonner';

export const MarketDataService = {
  async fetchHistoricalData(symbol: string, days: number = 30): Promise<MarketData[]> {
    if (!symbol) {
      console.error('Symbol is required for fetchHistoricalData');
      return MockDataHelper.generateMockData('AAPL', days);
    }
    
    const formattedSymbol = symbol.toUpperCase();
    // First try to get cached data from Supabase
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    try {
      console.log(`Fetching historical data for ${formattedSymbol} for the last ${days} days`);
      
      const cachedData = await DataFetchService.fetchCachedData(formattedSymbol, startDate);

      // If we have recent data, return it
      if (cachedData && cachedData.length > 0) {
        const latestDataPoint = new Date(cachedData[cachedData.length - 1].timestamp);
        const now = new Date();
        const hoursSinceLastUpdate = (now.getTime() - latestDataPoint.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastUpdate < 24) {
          console.log(`Using cached data for ${formattedSymbol}, ${cachedData.length} records`);
          return cachedData;
        }
      }

      // If no recent data, fetch from Alpha Vantage via Supabase function
      console.log(`Refreshing market data for ${formattedSymbol}`);
      const refreshSuccess = await DataFetchService.refreshMarketData(formattedSymbol);
      
      if (!refreshSuccess) {
        console.warn(`Failed to refresh data for ${formattedSymbol}, returning any available cached data`);
        // Return whatever cached data we have, even if it's old
        if (cachedData && cachedData.length > 0) {
          toast.info(`Using cached data for ${formattedSymbol}`);
          return cachedData;
        }
        
        // If no cached data at all, return mock data for demonstration
        toast.info(`Using simulated data for ${formattedSymbol}`);
        return MockDataHelper.generateMockData(formattedSymbol, days);
      }

      // Get the updated data from Supabase
      const updatedData = await DataFetchService.fetchCachedData(formattedSymbol, startDate);

      if (updatedData && updatedData.length > 0) {
        toast.success(`Loaded ${updatedData.length} data points for ${formattedSymbol}`);
        return updatedData;
      } else {
        toast.info(`No data available for ${formattedSymbol}, using simulated data`);
        return MockDataHelper.generateMockData(formattedSymbol, days);
      }
    } catch (error) {
      console.error(`Error in fetchHistoricalData for ${formattedSymbol}:`, error);
      toast.error(`Error loading data for ${formattedSymbol}`);
      return MockDataHelper.generateMockData(formattedSymbol, days);
    }
  },

  async fetchLatestPrice(symbol: string): Promise<MarketData | null> {
    if (!symbol) {
      console.error('Symbol is required for fetchLatestPrice');
      return MockDataHelper.generateMockDataPoint('AAPL');
    }

    const formattedSymbol = symbol.toUpperCase();
    try {
      console.log(`Fetching latest price for ${formattedSymbol}`);
      
      // First try to get cached data from Supabase
      const cachedData = await DataFetchService.fetchLatestCachedData(formattedSymbol);

      if (cachedData) {
        const latestDataPoint = new Date(cachedData.timestamp);
        const now = new Date();
        const hoursSinceLastUpdate = (now.getTime() - latestDataPoint.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastUpdate < 24) {
          console.log(`Using cached latest price for ${formattedSymbol}`);
          return cachedData;
        }
      }

      // If no recent data, fetch from Alpha Vantage
      console.log(`Refreshing latest price for ${formattedSymbol}`);
      const refreshSuccess = await DataFetchService.refreshMarketData(formattedSymbol);
      
      if (!refreshSuccess) {
        console.warn(`Failed to refresh price for ${formattedSymbol}, returning any available cached data`);
        // Return whatever cached data we have, even if it's old
        if (cachedData) {
          toast.info(`Using cached data for ${formattedSymbol}`);
          return cachedData;
        }
        
        // If no cached data, return a mock data point
        toast.info(`Using simulated data for ${formattedSymbol}`);
        return MockDataHelper.generateMockDataPoint(formattedSymbol);
      }

      // Get the updated data from Supabase
      const updatedData = await DataFetchService.fetchLatestCachedData(formattedSymbol);

      if (updatedData) {
        toast.success(`Updated price data for ${formattedSymbol}`);
        return updatedData;
      } else {
        toast.info(`No data available for ${formattedSymbol}, using simulated data`);
        return MockDataHelper.generateMockDataPoint(formattedSymbol);
      }
    } catch (error) {
      console.error(`Error in fetchLatestPrice for ${formattedSymbol}:`, error);
      toast.error(`Error loading price for ${formattedSymbol}`);
      return MockDataHelper.generateMockDataPoint(formattedSymbol);
    }
  },

  refreshMarketData: DataFetchService.refreshMarketData,
  subscribeToUpdates: SubscriptionService.subscribeToUpdates,
  
  // Re-export helper methods
  generateMockData: MockDataHelper.generateMockData,
  generateMockDataPoint: MockDataHelper.generateMockDataPoint,
  getBasePrice: MockDataHelper.getBasePrice
};
