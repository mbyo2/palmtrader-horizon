
import { finnhubSocket } from "@/utils/finnhubSocket";
import { toast } from "sonner";

interface ConnectionState {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastConnectTime: number;
  errors: string[];
}

interface RateLimitState {
  requestCount: number;
  windowStart: number;
  isThrottled: boolean;
}

export class EnhancedWebSocketManager {
  private static instance: EnhancedWebSocketManager;
  private connectionState: ConnectionState = {
    isConnected: false,
    isReconnecting: false,
    reconnectAttempts: 0,
    lastConnectTime: 0,
    errors: []
  };
  
  private rateLimitState: RateLimitState = {
    requestCount: 0,
    windowStart: Date.now(),
    isThrottled: false
  };

  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private readonly RECONNECT_DELAY_BASE = 1000; // 1 second
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly RATE_LIMIT_MAX_REQUESTS = 300; // 5 requests per second average
  
  private subscribers: Set<string> = new Set();
  private messageQueue: Array<{ symbol: string; timestamp: number }> = [];
  private healthCheckInterval: number | null = null;
  private reconnectTimeoutId: number | null = null;

  static getInstance(): EnhancedWebSocketManager {
    if (!EnhancedWebSocketManager.instance) {
      EnhancedWebSocketManager.instance = new EnhancedWebSocketManager();
    }
    return EnhancedWebSocketManager.instance;
  }

  async initialize(): Promise<void> {
    this.setupEventListeners();
    this.startHealthCheck();
    await this.connect();
  }

  private setupEventListeners(): void {
    // Network status monitoring
    window.addEventListener('online', () => {
      console.log('Network back online, attempting reconnection');
      this.handleReconnect();
    });

    window.addEventListener('offline', () => {
      console.log('Network offline detected');
      this.connectionState.isConnected = false;
      toast.error("Connection lost. Will reconnect when network is available.");
    });

    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !this.connectionState.isConnected) {
        console.log('Page became visible, checking connection');
        this.handleReconnect();
      }
    });
  }

  private async connect(): Promise<void> {
    if (this.connectionState.isReconnecting) {
      return;
    }

    try {
      this.connectionState.isReconnecting = true;
      
      // Connect to Finnhub WebSocket
      await finnhubSocket.connect();
      
      this.connectionState.isConnected = true;
      this.connectionState.isReconnecting = false;
      this.connectionState.reconnectAttempts = 0;
      this.connectionState.lastConnectTime = Date.now();
      
      console.log('WebSocket connected successfully');
      
      // Resubscribe to all symbols
      this.resubscribeAll();
      
      // Clear error state
      this.connectionState.errors = [];
      
      if (this.connectionState.reconnectAttempts > 0) {
        toast.success("Reconnected successfully");
      }
      
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.connectionState.isReconnecting = false;
      this.connectionState.isConnected = false;
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      this.connectionState.errors.push(errorMessage);
      
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.connectionState.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
      toast.error("Unable to reconnect. Please refresh the page.");
      return;
    }

    this.connectionState.reconnectAttempts++;
    
    // Exponential backoff with jitter
    const delay = Math.min(
      this.RECONNECT_DELAY_BASE * Math.pow(2, this.connectionState.reconnectAttempts - 1),
      30000 // Max 30 seconds
    ) + Math.random() * 1000; // Add jitter

    console.log(`Scheduling reconnect attempt ${this.connectionState.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimeoutId = window.setTimeout(() => {
      this.handleReconnect();
    }, delay);
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (!navigator.onLine) {
      console.log('Still offline, skipping reconnect attempt');
      return;
    }

    console.log('Attempting to reconnect...');
    await this.connect();
  }

  private resubscribeAll(): void {
    console.log(`Resubscribing to ${this.subscribers.size} symbols`);
    
    this.subscribers.forEach(symbol => {
      try {
        finnhubSocket.subscribe(symbol);
      } catch (error) {
        console.error(`Failed to resubscribe to ${symbol}:`, error);
      }
    });
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = window.setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Check every 30 seconds
  }

  private performHealthCheck(): void {
    if (!this.connectionState.isConnected) {
      return;
    }

    // Check if we've received data recently
    const now = Date.now();
    const recentMessages = this.messageQueue.filter(msg => now - msg.timestamp < 60000);
    
    if (this.subscribers.size > 0 && recentMessages.length === 0) {
      console.warn('No recent market data received, connection may be stale');
      this.handleReconnect();
    }

    // Clean old messages from queue
    this.messageQueue = this.messageQueue.filter(msg => now - msg.timestamp < 300000); // Keep 5 minutes
  }

  subscribe(symbol: string): boolean {
    if (!symbol) return false;

    // Rate limiting check
    if (!this.checkRateLimit()) {
      console.warn(`Rate limit exceeded, queueing subscription for ${symbol}`);
      setTimeout(() => this.subscribe(symbol), 1000);
      return false;
    }

    try {
      this.subscribers.add(symbol);
      
      if (this.connectionState.isConnected) {
        finnhubSocket.subscribe(symbol);
        console.log(`Subscribed to ${symbol}`);
      } else {
        console.log(`Queued subscription for ${symbol} (not connected)`);
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to subscribe to ${symbol}:`, error);
      return false;
    }
  }

  unsubscribe(symbol: string): boolean {
    if (!symbol) return false;

    try {
      this.subscribers.delete(symbol);
      
      if (this.connectionState.isConnected) {
        finnhubSocket.unsubscribe(symbol);
        console.log(`Unsubscribed from ${symbol}`);
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to unsubscribe from ${symbol}:`, error);
      return false;
    }
  }

  onMarketData(callback: (data: any) => void): () => void {
    const unsubscribe = finnhubSocket.onMarketData((data) => {
      if (data && data.symbol) {
        // Track message for health monitoring
        this.messageQueue.push({
          symbol: data.symbol,
          timestamp: Date.now()
        });

        // Validate data before passing to callback
        if (this.validateMarketData(data)) {
          callback(data);
        }
      }
    });

    return unsubscribe;
  }

  private validateMarketData(data: any): boolean {
    // Basic validation
    if (!data.symbol || typeof data.symbol !== 'string') {
      console.warn('Invalid market data: missing or invalid symbol');
      return false;
    }

    if (!data.price || typeof data.price !== 'number' || data.price <= 0) {
      console.warn(`Invalid market data for ${data.symbol}: invalid price`);
      return false;
    }

    // Check for reasonable price ranges (prevent obvious errors)
    if (data.price > 1000000 || data.price < 0.001) {
      console.warn(`Invalid market data for ${data.symbol}: price out of reasonable range`);
      return false;
    }

    return true;
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    
    // Reset window if needed
    if (now - this.rateLimitState.windowStart > this.RATE_LIMIT_WINDOW) {
      this.rateLimitState.windowStart = now;
      this.rateLimitState.requestCount = 0;
      this.rateLimitState.isThrottled = false;
    }

    // Check if we're at the limit
    if (this.rateLimitState.requestCount >= this.RATE_LIMIT_MAX_REQUESTS) {
      this.rateLimitState.isThrottled = true;
      return false;
    }

    // Increment request count
    this.rateLimitState.requestCount++;
    return true;
  }

  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  getRateLimitState(): RateLimitState {
    return { ...this.rateLimitState };
  }

  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  destroy(): void {
    console.log('Destroying WebSocket manager');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    // Unsubscribe from all symbols
    this.subscribers.forEach(symbol => {
      try {
        finnhubSocket.unsubscribe(symbol);
      } catch (error) {
        console.error(`Error unsubscribing from ${symbol}:`, error);
      }
    });

    this.subscribers.clear();
    this.messageQueue = [];
    
    // Close WebSocket connection
    try {
      finnhubSocket.close();
    } catch (error) {
      console.error('Error closing WebSocket:', error);
    }

    this.connectionState.isConnected = false;
    this.connectionState.isReconnecting = false;
  }
}

export const enhancedWSManager = EnhancedWebSocketManager.getInstance();
