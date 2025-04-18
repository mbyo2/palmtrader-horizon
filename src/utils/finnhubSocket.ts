
// Create a more efficient implementation of the finnhub socket
class FinnhubSocket {
  private socket: WebSocket | null = null;
  private subscriptions: Set<string> = new Set();
  private listeners: Array<(data: any) => void> = [];
  private reconnectInterval: number = 5000;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private apiKey: string = "demo"; // Replace with your Finnhub API key in a real app
  private connectionPromise: Promise<void> | null = null;
  private connected: boolean = false;
  private pendingSubscriptions: Set<string> = new Set();
  private messageQueue: any[] = [];
  private queueInterval: NodeJS.Timeout | null = null;
  private debug: boolean = false;

  constructor() {
    this.connect();
    this.setupMessageQueue();
  }

  private setupMessageQueue() {
    // Process messages in batches to avoid overwhelming subscribers
    this.queueInterval = setInterval(() => {
      if (this.messageQueue.length > 0) {
        const batch = this.messageQueue.splice(0, 10); // Process 10 messages at a time
        batch.forEach(data => {
          this.notifyListeners(data);
        });
      }
    }, 100); // Process every 100ms
  }

  private connect(): Promise<void> {
    if (this.connectionPromise) return this.connectionPromise;

    this.log("Creating WebSocket connection to Finnhub...");
    
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(`wss://ws.finnhub.io?token=${this.apiKey}`);

        this.socket.onopen = () => {
          this.handleOpen();
          resolve();
        };
        
        this.socket.onclose = this.handleClose.bind(this);
        this.socket.onerror = (e) => {
          this.handleError(e);
          reject(new Error("WebSocket connection failed"));
        };
        
        this.socket.onmessage = this.handleMessage.bind(this);
      } catch (error) {
        this.log("Error creating WebSocket:", error);
        this.scheduleReconnect();
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  private handleOpen() {
    this.log("Finnhub WebSocket connected successfully");
    this.reconnectAttempts = 0;
    this.connected = true;
    
    // Re-subscribe to all symbols in the pending subscriptions list
    this.pendingSubscriptions.forEach(symbol => {
      this.subscriptions.add(symbol);
      this.sendSubscription(symbol);
    });
    this.pendingSubscriptions.clear();
    
    // Re-subscribe to all symbols that were previously subscribed
    this.subscriptions.forEach(symbol => {
      this.sendSubscription(symbol);
    });
  }

  private handleClose(event: CloseEvent) {
    this.log("Finnhub WebSocket closed. Attempting to reconnect...");
    this.connected = false;
    this.connectionPromise = null;
    this.scheduleReconnect();
  }

  private handleError(event: Event) {
    this.log("Finnhub WebSocket error:", event);
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      
      // Only process trade data messages
      if (data.type === 'trade' && data.data && data.data.length > 0) {
        const processedData = {
          symbol: data.data[0].s,
          price: data.data[0].p,
          timestamp: data.data[0].t,
          volume: data.data[0].v
        };
        
        // Add to the message queue instead of notifying immediately
        this.messageQueue.push(processedData);
      }
    } catch (error) {
      this.log("Error processing WebSocket message:", error);
    }
  }

  private notifyListeners(data: any) {
    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        this.log("Error in listener callback:", error);
      }
    });
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), this.reconnectInterval);
    } else {
      this.log(`Failed to reconnect after ${this.maxReconnectAttempts} attempts.`);
    }
  }

  private async sendSubscription(symbol: string) {
    try {
      if (!this.connected) {
        this.pendingSubscriptions.add(symbol);
        await this.connect();
        return;
      }
      
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'subscribe', symbol }));
      } else {
        this.pendingSubscriptions.add(symbol);
      }
    } catch (error) {
      this.log(`Error subscribing to ${symbol}:`, error);
      this.pendingSubscriptions.add(symbol);
    }
  }

  private sendUnsubscription(symbol: string) {
    try {
      this.pendingSubscriptions.delete(symbol);
      
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'unsubscribe', symbol }));
      }
    } catch (error) {
      this.log(`Error unsubscribing from ${symbol}:`, error);
    }
  }

  public subscribe(symbol: string) {
    if (!symbol) return;
    
    const formattedSymbol = symbol.toUpperCase();
    if (this.subscriptions.has(formattedSymbol)) {
      // Already subscribed
      return;
    }
    
    this.subscriptions.add(formattedSymbol);
    this.sendSubscription(formattedSymbol);
  }

  public unsubscribe(symbol: string) {
    if (!symbol) return;
    
    const formattedSymbol = symbol.toUpperCase();
    this.subscriptions.delete(formattedSymbol);
    this.sendUnsubscription(formattedSymbol);
  }

  public onMarketData(callback: (data: any) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  public close() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.connected = false;
      this.connectionPromise = null;
    }
    
    if (this.queueInterval) {
      clearInterval(this.queueInterval);
      this.queueInterval = null;
    }
  }

  // Enable/disable debug logging
  public setDebug(enable: boolean) {
    this.debug = enable;
  }

  private log(...args: any[]) {
    if (this.debug) {
      console.log(...args);
    }
  }

  // For development/demo mode, we can simulate real-time data
  public simulateMarketData(symbol: string, basePrice: number = 100) {
    // Ensure we have the symbol in our subscription list
    this.subscriptions.add(symbol.toUpperCase());
    
    const interval = setInterval(() => {
      const changePercent = (Math.random() - 0.5) * 0.01;
      const newPrice = basePrice * (1 + changePercent);
      
      const data = {
        symbol,
        price: parseFloat(newPrice.toFixed(2)),
        timestamp: Date.now(),
        volume: Math.round(Math.random() * 1000)
      };
      
      this.messageQueue.push(data);
    }, 5000);
    
    return () => clearInterval(interval);
  }
}

// Create a singleton instance
export const finnhubSocket = new FinnhubSocket();

// For development, simulate some data
if (import.meta.env.DEV) {
  finnhubSocket.simulateMarketData('AAPL', 180);
  finnhubSocket.simulateMarketData('MSFT', 320);
  finnhubSocket.simulateMarketData('GOOGL', 140);
}
