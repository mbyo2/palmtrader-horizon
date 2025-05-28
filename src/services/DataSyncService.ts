
import { supabase } from "@/integrations/supabase/client";
import { RealMarketDataService } from "./RealMarketDataService";
import { OrderExecutionEngine } from "./OrderExecutionEngine";

export class DataSyncService {
  private static syncInterval: NodeJS.Timeout | null = null;
  private static isRunning = false;
  private static subscribedSymbols = new Set<string>();
  private static lastSyncTime = new Map<string, number>();
  private static readonly SYNC_INTERVAL = 30000; // 30 seconds
  private static readonly ERROR_RETRY_DELAY = 5000; // 5 seconds

  static startRealTimeSync(symbols: string[]): void {
    if (this.isRunning) {
      this.stopRealTimeSync();
    }

    symbols.forEach(symbol => this.subscribedSymbols.add(symbol));
    this.isRunning = true;

    console.log('Starting real-time data sync for symbols:', Array.from(this.subscribedSymbols));

    // Initial sync
    this.syncMarketData();

    // Set up periodic sync
    this.syncInterval = setInterval(async () => {
      await this.syncMarketData();
      await this.processScheduledTasks();
    }, this.SYNC_INTERVAL);

    // Set up real-time subscriptions
    this.setupRealtimeSubscriptions();
  }

  static stopRealTimeSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('Real-time data sync stopped');
  }

  static addSymbol(symbol: string): void {
    this.subscribedSymbols.add(symbol);
    if (!this.isRunning) {
      this.startRealTimeSync([symbol]);
    } else {
      // Immediate sync for new symbol
      this.syncSymbolData(symbol);
    }
  }

  static removeSymbol(symbol: string): void {
    this.subscribedSymbols.delete(symbol);
    this.lastSyncTime.delete(symbol);
    if (this.subscribedSymbols.size === 0) {
      this.stopRealTimeSync();
    }
  }

  private static async syncMarketData(): Promise<void> {
    if (this.subscribedSymbols.size === 0) return;

    console.log(`Syncing market data for ${this.subscribedSymbols.size} symbols`);
    
    try {
      const symbols = Array.from(this.subscribedSymbols);
      
      // Batch process symbols to avoid rate limits
      const batchSize = 5;
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        await Promise.all(batch.map(symbol => this.syncSymbolData(symbol)));
        
        // Small delay between batches
        if (i + batchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log('Market data sync completed');
    } catch (error) {
      console.error('Error in market data sync:', error);
      // Retry after delay
      setTimeout(() => this.syncMarketData(), this.ERROR_RETRY_DELAY);
    }
  }

  private static async syncSymbolData(symbol: string): Promise<void> {
    try {
      const lastSync = this.lastSyncTime.get(symbol) || 0;
      const now = Date.now();
      
      // Avoid too frequent syncs for the same symbol
      if (now - lastSync < 10000) { // 10 seconds minimum interval
        return;
      }

      // Fetch real-time price
      const priceData = await RealMarketDataService.fetchRealTimePrice(symbol);
      
      if (priceData) {
        // Store in database
        await this.storeRealTimePrice(priceData);
        
        // Update last sync time
        this.lastSyncTime.set(symbol, now);
        
        // Emit real-time update event
        this.emitPriceUpdate(priceData);
      }
    } catch (error) {
      console.error(`Error syncing data for ${symbol}:`, error);
    }
  }

  private static async storeRealTimePrice(priceData: any): Promise<void> {
    try {
      await supabase.from('market_data').upsert({
        symbol: priceData.symbol,
        price: priceData.price,
        timestamp: priceData.timestamp,
        type: 'realtime'
      });
    } catch (error) {
      console.error('Error storing real-time price:', error);
    }
  }

  private static emitPriceUpdate(priceData: any): void {
    // Emit custom event for components to listen to
    window.dispatchEvent(new CustomEvent('marketDataUpdate', { 
      detail: priceData 
    }));
  }

  static async syncHistoricalData(symbol: string, days: number = 90): Promise<void> {
    try {
      console.log(`Syncing ${days} days of historical data for ${symbol}`);
      
      const historicalData = await RealMarketDataService.fetchHistoricalData(symbol, days);
      
      if (historicalData.length > 0) {
        await RealMarketDataService.storeMarketData(historicalData);
        console.log(`Synced ${historicalData.length} historical records for ${symbol}`);
      }
    } catch (error) {
      console.error(`Error syncing historical data for ${symbol}:`, error);
    }
  }

  static async syncMarketNews(limit: number = 50): Promise<void> {
    try {
      console.log('Syncing market news');
      
      const news = await RealMarketDataService.fetchMarketNews(undefined, limit);
      
      if (news.length > 0) {
        await RealMarketDataService.storeNewsData(news);
        console.log(`Synced ${news.length} news articles`);
      }
    } catch (error) {
      console.error('Error syncing market news:', error);
    }
  }

  static async syncCompanyFundamentals(symbols: string[]): Promise<void> {
    try {
      console.log(`Syncing fundamentals for ${symbols.length} symbols`);
      
      // Process symbols with delays to avoid rate limits
      for (const symbol of symbols) {
        try {
          const fundamentals = await RealMarketDataService.fetchCompanyFundamentals(symbol);
          if (fundamentals) {
            await RealMarketDataService.storeFundamentals(fundamentals);
          }
        } catch (error) {
          console.error(`Error syncing fundamentals for ${symbol}:`, error);
        }
        
        // Rate limit delay
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      console.log(`Completed syncing fundamentals for ${symbols.length} symbols`);
    } catch (error) {
      console.error('Error syncing company fundamentals:', error);
    }
  }

  private static async processScheduledTasks(): Promise<void> {
    try {
      // Process pending orders
      await OrderExecutionEngine.processPendingOrders();
      
      // Check for data quality issues
      await this.validateDataQuality();
      
      // Clean up old data periodically
      if (Math.random() < 0.1) { // 10% chance each cycle
        await this.cleanupOldData();
      }
    } catch (error) {
      console.error('Error processing scheduled tasks:', error);
    }
  }

  private static async validateDataQuality(): Promise<void> {
    try {
      const symbols = Array.from(this.subscribedSymbols);
      
      for (const symbol of symbols) {
        const isValid = await RealMarketDataService.validateDataIntegrity(symbol);
        if (!isValid) {
          console.warn(`Data quality issue detected for ${symbol}, triggering resync`);
          await this.syncSymbolData(symbol);
        }
      }
    } catch (error) {
      console.error('Error validating data quality:', error);
    }
  }

  private static async cleanupOldData(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep 30 days of real-time data
      
      await supabase
        .from('market_data')
        .delete()
        .eq('type', 'realtime')
        .lt('created_at', cutoffDate.toISOString());
        
      console.log('Cleaned up old real-time data');
    } catch (error) {
      console.error('Error cleaning up old data:', error);
    }
  }

  static setupRealtimeSubscriptions(): void {
    // Subscribe to market data changes
    const marketDataChannel = supabase
      .channel('market-data-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_data'
        },
        (payload) => {
          console.log('Market data updated:', payload);
          window.dispatchEvent(new CustomEvent('marketDataUpdate', { 
            detail: payload 
          }));
        }
      )
      .subscribe();

    // Subscribe to order status changes
    const orderChannel = supabase
      .channel('order-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades'
        },
        (payload) => {
          console.log('Order updated:', payload);
          window.dispatchEvent(new CustomEvent('orderUpdate', { 
            detail: payload 
          }));
        }
      )
      .subscribe();

    // Subscribe to portfolio changes
    const portfolioChannel = supabase
      .channel('portfolio-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'portfolio'
        },
        (payload) => {
          console.log('Portfolio updated:', payload);
          window.dispatchEvent(new CustomEvent('portfolioUpdate', { 
            detail: payload 
          }));
        }
      )
      .subscribe();

    console.log('Real-time subscriptions established');
  }

  // Batch operations for efficiency
  static async batchSyncSymbols(symbols: string[]): Promise<void> {
    console.log(`Starting batch sync for ${symbols.length} symbols...`);
    
    try {
      // Start real-time sync for all symbols
      this.startRealTimeSync(symbols);
      
      // Sync historical data for each symbol (with delay to avoid rate limits)
      for (const symbol of symbols) {
        await this.syncHistoricalData(symbol);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Sync fundamentals for all symbols
      await this.syncCompanyFundamentals(symbols);
      
      // Sync market news
      await this.syncMarketNews();
      
      console.log("Batch sync completed successfully");
    } catch (error) {
      console.error("Error in batch sync:", error);
    }
  }

  static getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }

  static isSubscribed(symbol: string): boolean {
    return this.subscribedSymbols.has(symbol);
  }

  static getLastSyncTime(symbol: string): number | undefined {
    return this.lastSyncTime.get(symbol);
  }

  static getSyncStatus(): {
    isRunning: boolean;
    subscribedSymbols: string[];
    lastSyncTimes: Record<string, number>;
  } {
    return {
      isRunning: this.isRunning,
      subscribedSymbols: Array.from(this.subscribedSymbols),
      lastSyncTimes: Object.fromEntries(this.lastSyncTime)
    };
  }

  // Error handling and recovery
  static async handleSyncError(symbol: string, error: any): Promise<void> {
    console.error(`Sync error for ${symbol}:`, error);
    
    // Implement exponential backoff
    const retryDelay = Math.min(this.ERROR_RETRY_DELAY * Math.pow(2, this.getRetryCount(symbol)), 60000);
    
    setTimeout(() => {
      this.syncSymbolData(symbol);
    }, retryDelay);
  }

  private static getRetryCount(symbol: string): number {
    // Simple retry counter - in production, would use more sophisticated state management
    return 1;
  }

  // Health monitoring
  static async getSystemHealth(): Promise<{
    syncStatus: string;
    lastSuccessfulSync: number;
    errorCount: number;
    subscribedSymbols: number;
  }> {
    const now = Date.now();
    const lastSync = Math.max(...Array.from(this.lastSyncTime.values()), 0);
    const timeSinceLastSync = now - lastSync;
    
    return {
      syncStatus: timeSinceLastSync < 60000 ? 'healthy' : 'degraded',
      lastSuccessfulSync: lastSync,
      errorCount: 0, // Would track errors in production
      subscribedSymbols: this.subscribedSymbols.size
    };
  }
}
