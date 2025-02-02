import { toast } from "sonner";

type MarketDataCallback = (data: {
  symbol: string;
  price: number;
  timestamp: number;
}) => void;

class FinnhubSocket {
  private socket: WebSocket | null = null;
  private subscriptions: Set<string> = new Set();
  private onDataCallbacks: MarketDataCallback[] = [];

  constructor() {
    console.log("Initializing Finnhub WebSocket");
    this.connect();
  }

  private connect() {
    this.socket = new WebSocket(`wss://ws.finnhub.io?token=${import.meta.env.VITE_FINNHUB_API_KEY}`);

    this.socket.onopen = () => {
      console.log("Finnhub WebSocket connected");
      // Resubscribe to existing symbols
      this.subscriptions.forEach(symbol => {
        this.subscribe(symbol);
      });
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'trade') {
        const trade = {
          symbol: data.data[0].s,
          price: data.data[0].p,
          timestamp: data.data[0].t,
        };
        this.onDataCallbacks.forEach(callback => callback(trade));
      }
    };

    this.socket.onerror = (error) => {
      console.error("Finnhub WebSocket error:", error);
      toast.error("Market data connection error. Retrying...");
    };

    this.socket.onclose = () => {
      console.log("Finnhub WebSocket closed. Reconnecting...");
      setTimeout(() => this.connect(), 5000);
    };
  }

  subscribe(symbol: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.log("Socket not ready, queuing subscription:", symbol);
      this.subscriptions.add(symbol);
      return;
    }

    console.log("Subscribing to symbol:", symbol);
    this.socket.send(JSON.stringify({ type: 'subscribe', symbol }));
    this.subscriptions.add(symbol);
  }

  unsubscribe(symbol: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    
    console.log("Unsubscribing from symbol:", symbol);
    this.socket.send(JSON.stringify({ type: 'unsubscribe', symbol }));
    this.subscriptions.delete(symbol);
  }

  onMarketData(callback: MarketDataCallback) {
    this.onDataCallbacks.push(callback);
    return () => {
      this.onDataCallbacks = this.onDataCallbacks.filter(cb => cb !== callback);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const finnhubSocket = new FinnhubSocket();