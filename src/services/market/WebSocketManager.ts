
import { finnhubSocket } from "@/utils/finnhubSocket";
import { toast } from "sonner";

class WebSocketManager {
  private static instance: WebSocketManager;
  private subscriptions: Map<string, Set<string>> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  private constructor() {
    this.setupErrorHandling();
  }

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  private setupErrorHandling() {
    window.addEventListener('online', () => this.handleReconnect());
    window.addEventListener('offline', () => {
      toast.error("Lost connection. Waiting for network...");
    });
  }

  private async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      toast.error("Failed to reconnect. Please refresh the page.");
      return;
    }

    try {
      this.reconnectAttempts++;
      toast.loading("Reconnecting...");
      
      // Resubscribe to all symbols
      for (const [symbol, subscribers] of this.subscriptions.entries()) {
        if (subscribers.size > 0) {
          await finnhubSocket.subscribe(symbol);
        }
      }

      toast.success("Reconnected successfully");
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error("Reconnection failed:", error);
      setTimeout(() => this.handleReconnect(), this.reconnectDelay * this.reconnectAttempts);
    }
  }

  public subscribe(symbol: string, subscriberId: string) {
    if (!this.subscriptions.has(symbol)) {
      this.subscriptions.set(symbol, new Set());
    }
    
    const subscribers = this.subscriptions.get(symbol)!;
    if (subscribers.size === 0) {
      finnhubSocket.subscribe(symbol);
    }
    subscribers.add(subscriberId);
  }

  public unsubscribe(symbol: string, subscriberId: string) {
    const subscribers = this.subscriptions.get(symbol);
    if (!subscribers) return;

    subscribers.delete(subscriberId);
    if (subscribers.size === 0) {
      finnhubSocket.unsubscribe(symbol);
      this.subscriptions.delete(symbol);
    }
  }

  public getSubscriberCount(symbol: string): number {
    return this.subscriptions.get(symbol)?.size || 0;
  }
}

export const wsManager = WebSocketManager.getInstance();
