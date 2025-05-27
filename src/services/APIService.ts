
import { AuthService } from "./AuthService";
import { TradingService } from "./TradingService";
import { RealMarketDataService } from "./RealMarketDataService";
import { DataSyncService } from "./DataSyncService";
import { PortfolioService } from "./PortfolioService";
import { PositionService } from "./PositionService";

export class APIService {
  // Initialize all services and start data synchronization
  static async initialize(): Promise<void> {
    try {
      console.log("Initializing API services...");
      
      // Setup real-time subscriptions
      DataSyncService.setupRealtimeSubscriptions();
      
      // Start syncing market news
      await DataSyncService.syncMarketNews();
      
      console.log("API services initialized successfully");
    } catch (error) {
      console.error("Error initializing API services:", error);
    }
  }

  // Get all services as a unified interface
  static getServices() {
    return {
      auth: AuthService,
      trading: TradingService,
      marketData: RealMarketDataService,
      dataSync: DataSyncService,
      portfolio: PortfolioService,
      positions: PositionService
    };
  }

  // Health check for all external APIs
  static async healthCheck(): Promise<{
    finnhub: boolean;
    alphaVantage: boolean;
    database: boolean;
  }> {
    const results = {
      finnhub: false,
      alphaVantage: false,
      database: false
    };

    try {
      // Test Finnhub API
      const priceData = await RealMarketDataService.fetchRealTimePrice('AAPL');
      results.finnhub = priceData !== null;
    } catch (error) {
      console.error("Finnhub health check failed:", error);
    }

    try {
      // Test Alpha Vantage API
      const fundamentals = await RealMarketDataService.fetchCompanyFundamentals('AAPL');
      results.alphaVantage = fundamentals !== null;
    } catch (error) {
      console.error("Alpha Vantage health check failed:", error);
    }

    try {
      // Test database connectivity
      const profile = await AuthService.getProfile('test-user-id');
      results.database = true; // If no error thrown, database is accessible
    } catch (error) {
      console.error("Database health check failed:", error);
    }

    return results;
  }

  // Batch operations for efficiency
  static async batchSyncSymbols(symbols: string[]): Promise<void> {
    console.log(`Starting batch sync for ${symbols.length} symbols...`);
    
    // Start real-time sync for all symbols
    DataSyncService.startRealTimeSync(symbols);
    
    // Sync historical data for each symbol (with delay to avoid rate limits)
    for (const symbol of symbols) {
      await DataSyncService.syncHistoricalData(symbol);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Sync fundamentals for all symbols
    await DataSyncService.syncCompanyFundamentals(symbols);
    
    console.log("Batch sync completed");
  }

  // Get system status
  static async getSystemStatus(): Promise<{
    health: Awaited<ReturnType<typeof APIService.healthCheck>>;
    syncedSymbols: string[];
    lastSyncTime: string;
  }> {
    const health = await this.healthCheck();
    const syncedSymbols = DataSyncService.getSubscribedSymbols();
    
    return {
      health,
      syncedSymbols,
      lastSyncTime: new Date().toISOString()
    };
  }
}
