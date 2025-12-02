
import { supabase } from '@/integrations/supabase/client';

interface MarketData {
  symbol: string;
  price: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  timestamp: number;
}

type MarketDataCallback = (data: MarketData) => void;

class RealTimeFinnhubSocket {
  private ws: WebSocket | null = null;
  private apiKey: string | null = null;
  private subscribers: Set<string> = new Set();
  private pendingSubscriptions: Set<string> = new Set();
  private listeners: Set<MarketDataCallback> = new Set();
  private previousPrices: Map<string, number> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000;
  private isConnecting: boolean = false;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.initConnection();
  }

  private async initConnection() {
    await this.fetchApiKey();
    this.connect();
  }

  private async fetchApiKey(): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('finnhub-websocket', {
        body: { action: 'get_api_key' }
      });
      
      if (!error && data?.apiKey) {
        this.apiKey = data.apiKey;
        console.log('Finnhub API key retrieved successfully');
      } else {
        console.warn('Could not retrieve Finnhub API key, using demo mode');
        this.apiKey = 'demo';
      }
    } catch (err) {
      console.warn('Error fetching API key:', err);
      this.apiKey = 'demo';
    }
  }

  private connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    if (!this.apiKey) {
      setTimeout(() => this.connect(), 500);
      return;
    }

    this.isConnecting = true;
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }

    try {
      const wsUrl = `wss://ws.finnhub.io?token=${this.apiKey}`;
      console.log('Connecting to Finnhub WebSocket for real-time data...');
      
      this.ws = new WebSocket(wsUrl);
      
      this.connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.warn('Connection timeout, closing and retrying...');
          this.ws.close();
        }
      }, 10000);

      this.ws.onopen = () => {
        console.log('Finnhub WebSocket connected - Real-time data active');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
        }
        
        this.startHeartbeat();
        this.resubscribeAll();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.ws.onclose = (event) => {
        console.log('Finnhub WebSocket closed:', event.code);
        this.isConnecting = false;
        this.ws = null;
        this.stopHeartbeat();
        
        if (event.code !== 1000) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        console.warn('Finnhub WebSocket error');
        this.isConnecting = false;
      };

    } catch (error) {
      console.warn('Failed to create WebSocket:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'trade' && data.data && data.data.length > 0) {
        for (const trade of data.data) {
          const symbol = trade.s;
          const price = trade.p;
          const volume = trade.v;
          const timestamp = trade.t;
          
          const previousPrice = this.previousPrices.get(symbol);
          let change = 0;
          let changePercent = 0;
          
          if (previousPrice && previousPrice > 0) {
            change = price - previousPrice;
            changePercent = (change / previousPrice) * 100;
          }
          
          this.previousPrices.set(symbol, price);
          
          const marketData: MarketData = {
            symbol,
            price,
            change,
            changePercent,
            volume,
            timestamp
          };
          
          this.notifyListeners(marketData);
        }
      } else if (data.type === 'ping') {
        this.send({ type: 'pong' });
      }
    } catch (error) {
      console.warn('Error processing message:', error);
    }
  }

  private notifyListeners(data: MarketData): void {
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (err) {
        console.warn('Error in market data listener:', err);
      }
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 25000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), 30000);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private resubscribeAll(): void {
    const allSymbols = new Set([...this.subscribers, ...this.pendingSubscriptions]);
    
    allSymbols.forEach(symbol => {
      this.sendSubscription(symbol);
    });
    
    this.pendingSubscriptions.clear();
  }

  private sendSubscription(symbol: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ type: 'subscribe', symbol });
      this.subscribers.add(symbol);
      this.pendingSubscriptions.delete(symbol);
    } else {
      this.pendingSubscriptions.add(symbol);
    }
  }

  private send(data: object): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  subscribe(symbol: string): void {
    if (!symbol) return;
    
    if (this.subscribers.has(symbol)) return;
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendSubscription(symbol);
    } else {
      this.pendingSubscriptions.add(symbol);
      if (!this.isConnecting && (!this.ws || this.ws.readyState === WebSocket.CLOSED)) {
        this.connect();
      }
    }
  }

  unsubscribe(symbol: string): void {
    if (!symbol) return;
    
    this.subscribers.delete(symbol);
    this.pendingSubscriptions.delete(symbol);
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ type: 'unsubscribe', symbol });
    }
  }

  onMarketData(callback: MarketDataCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return 'connected';
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) return 'connecting';
    return 'disconnected';
  }

  close(): void {
    this.stopHeartbeat();
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.subscribers.clear();
    this.pendingSubscriptions.clear();
    this.listeners.clear();
  }
}

export const finnhubSocket = new RealTimeFinnhubSocket();
