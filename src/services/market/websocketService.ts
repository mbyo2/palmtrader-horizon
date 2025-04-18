
import { finnhubSocket } from "@/utils/finnhubSocket";

// Map to track which components are subscribed to which symbols
const subscriptionMap = new Map<string, Set<string>>();
// Map to cache the latest data for each symbol
const latestDataCache = new Map<string, any>();

export const WebSocketService = {
  /**
   * Subscribe to a symbol with a component ID
   * This allows tracking which components are using which symbols
   */
  subscribe: (symbol: string, componentId: string): void => {
    if (!symbol || !componentId) return;
    
    const formattedSymbol = symbol.toUpperCase();
    
    // Get or create the set of component IDs for this symbol
    const subscribers = subscriptionMap.get(formattedSymbol) || new Set<string>();
    subscribers.add(componentId);
    subscriptionMap.set(formattedSymbol, subscribers);
    
    // Only subscribe to the WebSocket if this is the first component subscribing
    if (subscribers.size === 1) {
      console.log(`WebSocketService: First subscriber for ${formattedSymbol}, creating subscription`);
      finnhubSocket.subscribe(formattedSymbol);
    } else {
      console.log(`WebSocketService: Additional subscriber for ${formattedSymbol}, reusing connection`);
    }
  },
  
  /**
   * Unsubscribe a component from a symbol
   */
  unsubscribe: (symbol: string, componentId: string): void => {
    if (!symbol || !componentId) return;
    
    const formattedSymbol = symbol.toUpperCase();
    const subscribers = subscriptionMap.get(formattedSymbol);
    
    if (!subscribers) return;
    
    subscribers.delete(componentId);
    
    // If there are no more components listening to this symbol, unsubscribe from the WebSocket
    if (subscribers.size === 0) {
      console.log(`WebSocketService: No more subscribers for ${formattedSymbol}, removing subscription`);
      subscriptionMap.delete(formattedSymbol);
      finnhubSocket.unsubscribe(formattedSymbol);
    } else {
      subscriptionMap.set(formattedSymbol, subscribers);
    }
  },
  
  /**
   * Get the latest cached data for a symbol
   */
  getLatestData: (symbol: string): any => {
    return latestDataCache.get(symbol?.toUpperCase());
  },
  
  /**
   * Set up a listener for market data updates
   */
  onMarketData: (callback: (data: any) => void): (() => void) => {
    const unsubscribe = finnhubSocket.onMarketData((data) => {
      if (data && data.symbol) {
        // Update the cache
        latestDataCache.set(data.symbol, data);
        // Call the callback
        callback(data);
      }
    });
    
    return unsubscribe;
  },
  
  /**
   * Clear all subscriptions for a component
   */
  clearComponentSubscriptions: (componentId: string): void => {
    subscriptionMap.forEach((subscribers, symbol) => {
      if (subscribers.has(componentId)) {
        WebSocketService.unsubscribe(symbol, componentId);
      }
    });
  }
};
