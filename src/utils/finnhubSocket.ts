
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
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 5000;

  constructor() {
    console.log("Initializing Finnhub WebSocket");
    this.connect();
  }

  private connect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      toast.error("Unable to connect to market data. Please refresh the page.");
      return;
    }

    const apiKey = import.meta.env.VITE_FINNHUB_API_KEY;
    console.log("Attempting to connect with API key present:", !!apiKey);
    
    if (!apiKey) {
      console.error("Finnhub API key not found");
      toast.error("Market data configuration error - API key missing");
      return;
    }

    try {
      console.log("Creating WebSocket connection to Finnhub...");
      this.socket = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);

      this.socket.onopen = () => {
        console.log("Finnhub WebSocket connected successfully");
        this.reconnectAttempts = 0;
        toast.success("Market data connection established");
        
        // Resubscribe to existing symbols
        this.subscriptions.forEach(symbol => {
          console.log("Resubscribing to symbol:", symbol);
          this.subscribe(symbol);
        });
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received market data:", data);
          
          if (data.type === 'trade' && Array.isArray(data.data) && data.data.length > 0) {
            const trade = {
              symbol: data.data[0].s,
              price: data.data[0].p,
              timestamp: data.data[0].t,
            };
            console.log("Processing trade data:", trade);
            this.onDataCallbacks.forEach(callback => callback(trade));
          }
        } catch (error) {
          console.error("Error processing market data:", error);
        }
      };

      this.socket.onerror = (error) => {
        console.error("Finnhub WebSocket error:", error);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts === 1) {
          toast.error("Market data connection error. Retrying...");
        }
      };

      this.socket.onclose = () => {
        console.log("Finnhub WebSocket closed. Attempting to reconnect...");
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => this.connect(), this.reconnectDelay);
        }
      };
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), this.reconnectDelay);
    }
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
    console.log("Adding market data callback");
    this.onDataCallbacks.push(callback);
    return () => {
      console.log("Removing market data callback");
      this.onDataCallbacks = this.onDataCallbacks.filter(cb => cb !== callback);
    };
  }

  disconnect() {
    console.log("Disconnecting Finnhub WebSocket");
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.reconnectAttempts = 0;
    this.subscriptions.clear();
    this.onDataCallbacks = [];
  }
}

export const finnhubSocket = new FinnhubSocket();
