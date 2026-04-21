import { finnhubSocket } from '@/utils/finnhubSocket';
import { supabase } from '@/integrations/supabase/client';

interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
  source?: 'alpaca' | 'finnhub' | 'demo' | 'cached';
  isDemo?: boolean;
}

type PriceCallback = (data: PriceData) => void;

// Realistic base prices for popular stocks
const STOCK_BASE_PRICES: Record<string, number> = {
  AAPL: 178.72, MSFT: 415.50, GOOGL: 141.80, AMZN: 178.25,
  NVDA: 875.30, META: 505.75, TSLA: 175.20, JPM: 198.40,
  V: 280.15, WMT: 165.30, JNJ: 152.80, PG: 160.45,
  UNH: 520.10, HD: 365.20, MA: 460.50, BAC: 35.80,
  XOM: 105.60, PFE: 27.15, KO: 60.20, PEP: 170.80,
  NFLX: 625.40, DIS: 112.30, INTC: 31.50, AMD: 165.20,
  CRM: 275.60, CSCO: 50.40, ORCL: 125.80, ADBE: 575.30,
};

class UnifiedPriceService {
  private static instance: UnifiedPriceService;
  private subscribers = new Map<string, Set<PriceCallback>>();
  private priceCache = new Map<string, PriceData>();
  private unsubscribeFromSocket: (() => void) | null = null;
  private initialized = false;
  private simulationIntervals = new Map<string, ReturnType<typeof setInterval>>();

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
      if (data.price <= 0) return; // Ignore zero prices
      
      const priceData: PriceData = {
        symbol: data.symbol,
        price: data.price,
        change: data.change || 0,
        changePercent: data.changePercent || 0,
        timestamp: data.timestamp
      };
      
      this.priceCache.set(data.symbol, priceData);
      this.notifySubscribers(data.symbol, priceData);
      
      // Stop simulation for this symbol since we have real data
      this.stopSimulation(data.symbol);
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
    if (cached && cached.price > 0) {
      setTimeout(() => callback(cached), 0);
    } else {
      // Fetch initial price, then start simulation as fallback
      this.fetchInitialPrice(symbol).then(data => {
        if (data && data.price > 0) {
          callback(data);
        } else {
          // Start with realistic demo price immediately
          const demoData = this.getRealisticPrice(symbol);
          callback(demoData);
          this.startSimulation(symbol);
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
          this.stopSimulation(symbol);
        }
      }
    };
  }

  private startSimulation(symbol: string): void {
    if (this.simulationIntervals.has(symbol)) return;
    
    const interval = setInterval(() => {
      const cached = this.priceCache.get(symbol);
      const basePrice = cached?.price || STOCK_BASE_PRICES[symbol] || 100;
      
      // Small random walk
      const change = basePrice * (Math.random() - 0.5) * 0.002; // ±0.1%
      const newPrice = parseFloat((basePrice + change).toFixed(2));
      const totalChange = newPrice - (STOCK_BASE_PRICES[symbol] || 100);
      const totalChangePercent = ((totalChange / (STOCK_BASE_PRICES[symbol] || 100)) * 100);
      
      const priceData: PriceData = {
        symbol,
        price: newPrice,
        change: parseFloat(totalChange.toFixed(2)),
        changePercent: parseFloat(totalChangePercent.toFixed(2)),
        timestamp: Date.now()
      };
      
      this.priceCache.set(symbol, priceData);
      this.notifySubscribers(symbol, priceData);
    }, 3000 + Math.random() * 2000); // Every 3-5 seconds
    
    this.simulationIntervals.set(symbol, interval);
  }

  private stopSimulation(symbol: string): void {
    const interval = this.simulationIntervals.get(symbol);
    if (interval) {
      clearInterval(interval);
      this.simulationIntervals.delete(symbol);
    }
  }

  private async fetchInitialPrice(symbol: string): Promise<PriceData | null> {
    // 1) Alpaca first
    try {
      const { data, error } = await supabase.functions.invoke('alpaca-market-data', {
        body: { action: 'get_quote', symbol },
      });
      if (!error && data && data.price > 0 && !data.error) {
        const priceData: PriceData = {
          symbol: data.symbol || symbol,
          price: data.price,
          change: data.change || 0,
          changePercent: data.changePercent || 0,
          timestamp: data.timestamp || Date.now(),
          source: 'alpaca',
          isDemo: false,
        };
        this.priceCache.set(symbol, priceData);
        return priceData;
      }
    } catch {
      // fall through to Finnhub
    }

    // 2) Finnhub fallback
    try {
      const { data, error } = await supabase.functions.invoke('finnhub-websocket', {
        body: { action: 'get_quote', symbol },
      });
      if (!error && data && data.price && data.price > 0) {
        const priceData: PriceData = {
          symbol: data.symbol || symbol,
          price: data.price,
          change: data.change || 0,
          changePercent: data.changePercent || 0,
          timestamp: data.timestamp || Date.now(),
          source: data.isDemo ? 'demo' : 'finnhub',
          isDemo: !!data.isDemo,
        };
        this.priceCache.set(symbol, priceData);
        return priceData;
      }
      return null;
    } catch (error) {
      console.warn(`Failed to fetch initial price for ${symbol}`);
      return null;
    }
  }

  private getRealisticPrice(symbol: string): PriceData {
    const basePrice = STOCK_BASE_PRICES[symbol] || (50 + Math.random() * 200);
    const variation = basePrice * (Math.random() - 0.5) * 0.02; // ±1% from base
    const price = parseFloat((basePrice + variation).toFixed(2));
    const change = parseFloat(variation.toFixed(2));
    const changePercent = parseFloat(((variation / basePrice) * 100).toFixed(2));
    
    const priceData: PriceData = {
      symbol,
      price,
      change,
      changePercent,
      timestamp: Date.now()
    };
    
    this.priceCache.set(symbol, priceData);
    return priceData;
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
    this.simulationIntervals.forEach(interval => clearInterval(interval));
    this.simulationIntervals.clear();
    this.subscribers.clear();
    this.priceCache.clear();
    this.initialized = false;
  }
}

export const unifiedPriceService = UnifiedPriceService.getInstance();
