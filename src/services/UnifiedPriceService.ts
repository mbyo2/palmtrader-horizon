import { finnhubSocket } from '@/utils/finnhubSocket';
import { supabase } from '@/integrations/supabase/client';

interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

type PriceCallback = (data: PriceData) => void;

class UnifiedPriceService {
  private static instance: UnifiedPriceService;
  private subscribers = new Map<string, Set<PriceCallback>>();
  private priceCache = new Map<string, PriceData>();
  private unsubscribeFromSocket: (() => void) | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): UnifiedPriceService {
    if (!UnifiedPriceService.instance) {
      UnifiedPriceService.instance = new UnifiedPriceService();
    }
    return UnifiedPriceService.instance;
  }

  initialize(): void {
    if (this.initialized) return;
    
    this.unsubscribeFromSocket = finnhubSocket.onMarketData((data) => {
      const priceData: PriceData = {
        symbol: data.symbol,
        price: data.price,
        change: data.change || 0,
        changePercent: data.changePercent || 0,
        timestamp: data.timestamp
      };
      
      this.priceCache.set(data.symbol, priceData);
      this.notifySubscribers(data.symbol, priceData);
    });
    
    this.initialized = true;
  }

  subscribe(symbol: string, callback: PriceCallback): () => void {
    if (!this.initialized) {
      this.initialize();
    }

    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
      finnhubSocket.subscribe(symbol);
    }
    
    this.subscribers.get(symbol)!.add(callback);
    
    // Send cached price immediately if available
    const cached = this.priceCache.get(symbol);
    if (cached) {
      setTimeout(() => callback(cached), 0);
    } else {
      // Fetch initial price from edge function
      this.fetchInitialPrice(symbol).then(data => {
        if (data) {
          callback(data);
        }
      });
    }

    return () => {
      const symbolSubscribers = this.subscribers.get(symbol);
      if (symbolSubscribers) {
        symbolSubscribers.delete(callback);
        if (symbolSubscribers.size === 0) {
          this.subscribers.delete(symbol);
          finnhubSocket.unsubscribe(symbol);
        }
      }
    };
  }

  private async fetchInitialPrice(symbol: string): Promise<PriceData | null> {
    try {
      const { data, error } = await supabase.functions.invoke('finnhub-websocket', {
        body: { action: 'get_quote', symbol }
      });

      if (error || !data) return null;

      const priceData: PriceData = {
        symbol: data.symbol,
        price: data.price,
        change: data.change || 0,
        changePercent: data.changePercent || 0,
        timestamp: data.timestamp || Date.now()
      };

      this.priceCache.set(symbol, priceData);
      return priceData;
    } catch (error) {
      console.warn(`Failed to fetch initial price for ${symbol}:`, error);
      return null;
    }
  }

  private notifySubscribers(symbol: string, data: PriceData): void {
    const callbacks = this.subscribers.get(symbol);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in price callback:', error);
        }
      });
    }
  }

  getCachedPrice(symbol: string): PriceData | undefined {
    return this.priceCache.get(symbol);
  }

  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    return finnhubSocket.getConnectionStatus();
  }

  destroy(): void {
    if (this.unsubscribeFromSocket) {
      this.unsubscribeFromSocket();
    }
    this.subscribers.clear();
    this.priceCache.clear();
    this.initialized = false;
  }
}

export const unifiedPriceService = UnifiedPriceService.getInstance();
