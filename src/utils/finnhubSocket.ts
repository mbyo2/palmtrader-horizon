
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
  private invalidSymbols: Set<string> = new Set();
  private connecting: boolean = false;
  private lastApiCallTime: number = 0;
  private apiRateLimitDelay: number = 1000; // 1 second between API calls to avoid rate limiting
  
  // Add a mapping for standard symbol formats
  private symbolMapping: Record<string, string> = {
    // Map Zambian stock symbols to their US equivalents or other tradable symbols
    // This helps when the original symbols aren't recognized by Finnhub
    'ZCCM.ZM': 'AAPL', // Example mapping
    'CEC.ZM': 'MSFT',
    'ZSUG.ZM': 'AMZN',
    'PUMA.ZM': 'GOOGL',
    'REIZ.ZM': 'NVDA',
    'PRIMA.ZM': 'META',
    'BATZ.ZM': 'TSLA',
    'ZNCO.ZM': 'V',
    'AECI.ZM': 'WMT',
    'LAFZ.ZM': 'JPM',
    'SHOP.ZM': 'NFLX',
    'MCEL.ZM': 'INTC'
  };

  constructor() {
    console.log("Initializing Finnhub WebSocket");
    this.initialize();
  }

  private async initialize() {
    try {
      if (this.connecting) return;
      this.connecting = true;
      
      // Get the API key from our Edge Function
      const { data, error } = await supabase.functions.invoke('finnhub-websocket', {
        method: 'POST'
      });

      if (error) {
        console.error('Error fetching Finnhub API key:', error);
        toast.error('Failed to initialize market data connection');
        this.useMockData = true;
        this.setupMockDataSimulation();
        this.connecting = false;
        return;
      }

      if (!data?.apiKey) {
        console.error('No API key returned from Edge Function');
        toast.error('Market data configuration error');
        this.useMockData = true;
        this.setupMockDataSimulation();
        this.connecting = false;
        return;
      }

      this.apiKey = data.apiKey;
      this.connect();
      this.connecting = false;
    } catch (error) {
      console.error('Error initializing Finnhub socket:', error);
      toast.error('Failed to initialize market data connection');
      this.useMockData = true;
      this.setupMockDataSimulation();
      this.connecting = false;
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
          if (!this.invalidSymbols.has(symbol)) {
            console.log("Resubscribing to symbol:", symbol);
            this.subscribe(symbol);
          }
        });
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'error') {
            console.error("Finnhub error:", data.msg);
            if (data.msg?.includes("Invalid symbol")) {
              // If symbol is invalid, mark it and use mock data for that symbol
              const symbolMatch = data.msg.match(/Invalid symbol (\w+)/);
              const symbol = symbolMatch ? symbolMatch[1] : null;
              
              if (symbol) {
                console.log(`Marking symbol as invalid: ${symbol}`);
                this.invalidSymbols.add(symbol);
                this.simulateMockDataForSymbol(symbol);
              }
            }
            return;
          }
          
          if (data.type === 'trade' && Array.isArray(data.data) && data.data.length > 0) {
            const trades = data.data.map(item => ({
              symbol: item.s,
              price: item.p,
              timestamp: item.t,
            }));
            
            // Process the most recent trade for each symbol
            const symbolPrices = new Map();
            
            for (const trade of trades) {
              const currentTrade = symbolPrices.get(trade.symbol);
              
              if (!currentTrade || trade.timestamp > currentTrade.timestamp) {
                symbolPrices.set(trade.symbol, trade);
              }
            }
            
            // Notify with the latest price for each symbol
            symbolPrices.forEach(trade => {
              console.log("Processing trade data:", trade);
              
              // Map the received symbol back to the original symbol if needed
              let originalSymbol = trade.symbol;
              for (const [original, mapped] of Object.entries(this.symbolMapping)) {
                if (mapped === trade.symbol) {
                  originalSymbol = original;
                  break;
                }
              }
              
              // Notify callbacks with the original symbol
              const tradeWithOriginalSymbol = {
                ...trade,
                symbol: originalSymbol
              };
              
              this.onDataCallbacks.forEach(callback => callback(tradeWithOriginalSymbol));
            });
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
    if (!symbol) return;
    
    const formattedSymbol = symbol.toUpperCase();
    console.log("Subscribing to symbol:", formattedSymbol);
    this.subscriptions.add(formattedSymbol);
    
    // If known invalid symbol, use mock data immediately
    if (this.invalidSymbols.has(formattedSymbol)) {
      console.log(`${formattedSymbol} is a known invalid symbol, using mock data`);
      this.simulateMockDataForSymbol(formattedSymbol);
      return;
    }
    
    if (this.useMockData) {
      this.simulateMockDataForSymbol(formattedSymbol);
      return;
    }
    
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.log("Socket not ready, queuing subscription:", formattedSymbol);
      return;
    }

    // Check if we need to map this symbol to a standard format
    const mappedSymbol = this.symbolMapping[formattedSymbol] || formattedSymbol;
    
    // Subscribe using the mapped symbol
    this.socket.send(JSON.stringify({ type: 'subscribe', symbol: mappedSymbol }));
  }

  unsubscribe(symbol: string) {
    if (!symbol) return;
    
    const formattedSymbol = symbol.toUpperCase();
    console.log("Unsubscribing from symbol:", formattedSymbol);
    this.subscriptions.delete(formattedSymbol);
    this.invalidSymbols.delete(formattedSymbol);
    
    if (this.useMockData) return;
    
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    
    // Check if we need to map this symbol to a standard format
    const mappedSymbol = this.symbolMapping[formattedSymbol] || formattedSymbol;
    
    // Unsubscribe using the mapped symbol
    this.socket.send(JSON.stringify({ type: 'unsubscribe', symbol: mappedSymbol }));
  }

  onMarketData(callback: MarketDataCallback) {
    console.log("Adding market data callback");
    this.onDataCallbacks.push(callback);
    return () => {
      console.log("Removing market data callback");
      this.onDataCallbacks = this.onDataCallbacks.filter(cb => cb !== callback);
    };
  }

  resetInvalidSymbols() {
    console.log("Resetting invalid symbols list");
    this.invalidSymbols.clear();
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
    this.invalidSymbols.clear();
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
    if (!symbol) return;
    
    // Get a base price for the symbol
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
      'JPM': 190.25,
      'ZCCM.ZM': 24.50,
      'CEC.ZM': 12.75,
      'ZSUG.ZM': 8.90,
      'PUMA.ZM': 15.30,
      'REIZ.ZM': 5.45,
      'PRIMA.ZM': 2.80,
      'BATZ.ZM': 22.15,
      'ZNCO.ZM': 1.95,
      'AECI.ZM': 18.40,
      'LAFZ.ZM': 4.75,
      'SHOP.ZM': 45.60,
      'MCEL.ZM': 3.15
    };
    
    return prices[symbol] || 100.00 + Math.random() * 100;
  }
}

export const finnhubSocket = new FinnhubSocket();
