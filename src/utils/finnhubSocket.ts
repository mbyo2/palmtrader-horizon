
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  private apiKey: string | null = null;
  private mockDataInterval: ReturnType<typeof setInterval> | null = null;
  private useMockData: boolean = false;

  constructor() {
    console.log("Initializing Finnhub WebSocket");
    this.initialize();
  }

  private async initialize() {
    try {
      // Get the API key from our Edge Function
      const { data, error } = await supabase.functions.invoke('finnhub-websocket', {
        method: 'POST'
      });

      if (error) {
        console.error('Error fetching Finnhub API key:', error);
        toast.error('Failed to initialize market data connection');
        this.useMockData = true;
        this.setupMockDataSimulation();
        return;
      }

      if (!data?.apiKey) {
        console.error('No API key returned from Edge Function');
        toast.error('Market data configuration error');
        this.useMockData = true;
        this.setupMockDataSimulation();
        return;
      }

      this.apiKey = data.apiKey;
      this.connect();
    } catch (error) {
      console.error('Error initializing Finnhub socket:', error);
      toast.error('Failed to initialize market data connection');
      this.useMockData = true;
      this.setupMockDataSimulation();
    }
  }

  private connect() {
    if (!this.apiKey) {
      console.error('Cannot connect without API key');
      this.useMockData = true;
      this.setupMockDataSimulation();
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      toast.error("Unable to connect to market data. Using simulated data.");
      this.useMockData = true;
      this.setupMockDataSimulation();
      return;
    }

    try {
      console.log("Creating WebSocket connection to Finnhub...");
      this.socket = new WebSocket(`wss://ws.finnhub.io?token=${this.apiKey}`);

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
          
          if (data.type === 'error') {
            console.error("Finnhub error:", data.msg);
            if (data.msg?.includes("Invalid symbol")) {
              // If symbol is invalid, use mock data for that symbol
              const symbol = data.msg.split(" ")[2];
              this.simulateMockDataForSymbol(symbol);
            }
            return;
          }
          
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
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.useMockData = true;
          this.setupMockDataSimulation();
        }
      };

      this.socket.onclose = () => {
        console.log("Finnhub WebSocket closed. Attempting to reconnect...");
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => this.connect(), this.reconnectDelay);
        } else {
          this.useMockData = true;
          this.setupMockDataSimulation();
        }
      };
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.useMockData = true;
        this.setupMockDataSimulation();
      } else {
        setTimeout(() => this.connect(), this.reconnectDelay);
      }
    }
  }

  subscribe(symbol: string) {
    console.log("Subscribing to symbol:", symbol);
    this.subscriptions.add(symbol);
    
    if (this.useMockData) {
      this.simulateMockDataForSymbol(symbol);
      return;
    }
    
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.log("Socket not ready, queuing subscription:", symbol);
      return;
    }

    this.socket.send(JSON.stringify({ type: 'subscribe', symbol }));
  }

  unsubscribe(symbol: string) {
    console.log("Unsubscribing from symbol:", symbol);
    this.subscriptions.delete(symbol);
    
    if (this.useMockData) return;
    
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    
    this.socket.send(JSON.stringify({ type: 'unsubscribe', symbol }));
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
    
    if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
      this.mockDataInterval = null;
    }
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.reconnectAttempts = 0;
    this.subscriptions.clear();
    this.onDataCallbacks = [];
    this.useMockData = false;
  }
  
  private setupMockDataSimulation() {
    console.log("Setting up mock data simulation");
    toast.info("Using simulated market data for demonstration");
    
    if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
    }
    
    // Set up interval to simulate real-time updates
    this.mockDataInterval = setInterval(() => {
      this.subscriptions.forEach(symbol => this.simulateMockDataForSymbol(symbol));
    }, 5000); // Send updates every 5 seconds
  }
  
  private simulateMockDataForSymbol(symbol: string) {
    // Get a base price for the symbol (can be refined to use more realistic data)
    const basePrice = this.getBasePrice(symbol);
    
    // Simulate a small price movement (-1% to +1%)
    const movement = (Math.random() * 0.02) - 0.01;
    const newPrice = basePrice * (1 + movement);
    
    const mockTrade = {
      symbol: symbol,
      price: parseFloat(newPrice.toFixed(2)),
      timestamp: Date.now()
    };
    
    console.log(`Simulating trade data for ${symbol}:`, mockTrade);
    this.onDataCallbacks.forEach(callback => callback(mockTrade));
  }
  
  private getBasePrice(symbol: string): number {
    // Return realistic baseline prices for common stocks
    const prices: Record<string, number> = {
      'AAPL': 180.25,
      'MSFT': 350.50,
      'AMZN': 145.75,
      'GOOGL': 140.30,
      'NVDA': 450.20,
      'META': 330.15,
      'TSLA': 200.10,
      'V': 280.45,
      'WMT': 68.90,
      'JPM': 190.25
    };
    
    return prices[symbol] || 100.00 + Math.random() * 100;
  }
}

export const finnhubSocket = new FinnhubSocket();
