
import { fetchHistoricalData, fetchLatestPrice, fetchMultipleLatestPrices } from './dataFetchService';
import { SubscriptionService } from './subscriptionService';
import { MarketData } from './types';

// Export the service methods
export const MarketDataService = {
  fetchHistoricalData,
  fetchLatestPrice,
  fetchMultipleLatestPrices,
  subscribeToUpdates: SubscriptionService.subscribeToUpdates,
};

// Re-export the types
export type { MarketData };
