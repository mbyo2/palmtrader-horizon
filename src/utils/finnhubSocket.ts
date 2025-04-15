
// Create a simple implementation of the finnhub socket
class FinnhubSocket {
  private socket: WebSocket | null = null;
  private subscriptions: Set<string> = new Set();
  private listeners: Array<(data: any) => void> = [];
  private reconnectInterval: number = 5000;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private apiKey: string = "demo"; // Replace with your Finnhub API key in a real app

  constructor() {
    this.connect();
  }

  private connect() {
    console.info("Creating WebSocket connection to Finnhub...");
    try {
      this.socket = new WebSocket(`wss://ws.finnhub.io?token=${this.apiKey}`);

      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      this.scheduleReconnect();
    }
  }

  private handleOpen() {
    console.info("Finnhub WebSocket connected successfully");
    this.reconnectAttempts = 0;
    
    // Re-subscribe to all symbols
    this.subscriptions.forEach(symbol => {
      this.sendSubscription(symbol);
    });
  }

  private handleClose(event: CloseEvent) {
    console.info("Finnhub WebSocket closed. Attempting to reconnect...");
    this.scheduleReconnect();
  }

  private handleError(event: Event) {
    console.error("Finnhub WebSocket error:", event);
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      
      // Only process trade data messages
      if (data.type === 'trade') {
        const processedData = {
          symbol: data.data?.[0]?.s,
          price: data.data?.[0]?.p,
          timestamp: data.data?.[0]?.t,
          volume: data.data?.[0]?.v
        };
        
        // Notify all listeners
        this.listeners.forEach(listener => listener(processedData));
      }
    } catch (error) {
      console.error("Error processing WebSocket message:", error);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), this.reconnectInterval);
    } else {
      console.error(`Failed to reconnect after ${this.maxReconnectAttempts} attempts.`);
    }
  }

  private sendSubscription(symbol: string) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'subscribe', symbol }));
    }
  }

  private sendUnsubscription(symbol: string) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'unsubscribe', symbol }));
    }
  }

  public subscribe(symbol: string) {
    this.subscriptions.add(symbol);
    this.sendSubscription(symbol);
  }

  public unsubscribe(symbol: string) {
    this.subscriptions.delete(symbol);
    this.sendUnsubscription(symbol);
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
    }
  }

  // For development/demo mode, we can simulate real-time data
  public simulateMarketData(symbol: string, basePrice: number = 100) {
    const interval = setInterval(() => {
      const changePercent = (Math.random() - 0.5) * 0.01;
      const newPrice = basePrice * (1 + changePercent);
      
      const data = {
        symbol,
        price: parseFloat(newPrice.toFixed(2)),
        timestamp: Date.now(),
        volume: Math.round(Math.random() * 1000)
      };
      
      this.listeners.forEach(listener => listener(data));
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
