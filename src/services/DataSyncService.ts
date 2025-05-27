
import { supabase } from "@/integrations/supabase/client";
import { RealMarketDataService } from "./RealMarketDataService";

export class DataSyncService {
  private static syncInterval: NodeJS.Timeout | null = null;
  private static isRunning = false;
  private static subscribedSymbols = new Set<string>();

  static startRealTimeSync(symbols: string[]): void {
    if (this.isRunning) {
      this.stopRealTimeSync();
    }

    symbols.forEach(symbol => this.subscribedSymbols.add(symbol));
    this.isRunning = true;

    // Sync market data every 30 seconds
    this.syncInterval = setInterval(async () => {
      await this.syncMarketData();
    }, 30000);

    // Initial sync
    this.syncMarketData();

    console.log('Real-time data sync started for symbols:', Array.from(this.subscribedSymbols));
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
    }
  }

  static removeSymbol(symbol: string): void {
    this.subscribedSymbols.delete(symbol);
    if (this.subscribedSymbols.size === 0) {
      this.stopRealTimeSync();
    }
  }

  private static async syncMarketData(): Promise<void> {
    try {
      const symbols = Array.from(this.subscribedSymbols);
      
      // Fetch real-time prices for all subscribed symbols
      const pricePromises = symbols.map(symbol => 
        RealMarketDataService.fetchRealTimePrice(symbol)
      );

      const prices = await Promise.all(pricePromises);
      const validPrices = prices.filter(price => price !== null);

      if (validPrices.length > 0) {
        // Store current prices in market_data table
        const marketDataEntries = validPrices.map(price => ({
          symbol: price!.symbol,
          price: price!.price,
          timestamp: price!.timestamp,
          type: 'realtime'
        }));

        const { error } = await supabase
          .from('market_data')
          .upsert(marketDataEntries);

        if (error) {
          console.error('Error storing real-time market data:', error);
        } else {
          console.log(`Synced ${validPrices.length} price updates`);
        }
      }
    } catch (error) {
      console.error('Error in market data sync:', error);
    }
  }

  static async syncHistoricalData(symbol: string): Promise<void> {
    try {
      const historicalData = await RealMarketDataService.fetchHistoricalData(symbol, 90);
      if (historicalData.length > 0) {
        await RealMarketDataService.storeMarketData(historicalData);
        console.log(`Synced ${historicalData.length} historical records for ${symbol}`);
      }
    } catch (error) {
      console.error(`Error syncing historical data for ${symbol}:`, error);
    }
  }

  static async syncMarketNews(): Promise<void> {
    try {
      const news = await RealMarketDataService.fetchMarketNews(undefined, 50);
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
      for (const symbol of symbols) {
        const fundamentals = await RealMarketDataService.fetchCompanyFundamentals(symbol);
        if (fundamentals) {
          await RealMarketDataService.storeFundamentals(fundamentals);
        }
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      console.log(`Synced fundamentals for ${symbols.length} symbols`);
    } catch (error) {
      console.error('Error syncing company fundamentals:', error);
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
          // Emit custom event for components to listen to
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

    console.log('Real-time subscriptions established');
  }

  static getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }

  static isSubscribed(symbol: string): boolean {
    return this.subscribedSymbols.has(symbol);
  }
}
