
interface SocketManager {
  subscribe: (symbol: string) => void;
  unsubscribe: (symbol: string) => void;
  onMarketData: (callback: (data: any) => void) => void;
}

class FinnhubSocketManager implements SocketManager {
  private socket: WebSocket | null = null;
  private subscribers: Set<string> = new Set();
  private messageHandler: ((data: any) => void) | null = null;

  constructor() {
    this.connect();
  }

  private connect() {
    // For demo purposes, we'll simulate WebSocket connections
    console.log('Simulating Finnhub WebSocket connection');
    
    // Simulate periodic price updates
    setInterval(() => {
      if (this.messageHandler && this.subscribers.size > 0) {
        this.subscribers.forEach(symbol => {
          this.messageHandler({
            symbol,
            price: Math.random() * 100 + 50,
            volume: Math.floor(Math.random() * 1000000),
            timestamp: Date.now()
          });
        });
      }
    }, 5000); // Update every 5 seconds
  }

  subscribe(symbol: string): void {
    this.subscribers.add(symbol);
    console.log(`Subscribed to ${symbol}`);
  }

  unsubscribe(symbol: string): void {
    this.subscribers.delete(symbol);
    console.log(`Unsubscribed from ${symbol}`);
  }

  onMarketData(callback: (data: any) => void): void {
    this.messageHandler = callback;
  }
}

export const finnhubSocket = new FinnhubSocketManager();
