// Utility to batch replace console statements across multiple files
// This helps maintain consistent logging practices

import { devConsole, performanceTimer } from './productionConsole';

// Re-export for convenient imports
export { devConsole, performanceTimer };

// Utility function for consistent error logging
export const logApiError = (operation: string, error: unknown, context?: Record<string, any>) => {
  devConsole.error(`API Error in ${operation}:`, error);
  if (context) {
    devConsole.error('Context:', context);
  }
};

// Utility function for performance monitoring
export const logPerformance = (operation: string, startTime: number) => {
  const duration = Date.now() - startTime;
  devConsole.debug(`Performance: ${operation} took ${duration}ms`);
};

// Utility for WebSocket connection logging
export const logWebSocketEvent = (event: string, symbol?: string, data?: any) => {
  devConsole.debug(`WebSocket ${event}${symbol ? ` for ${symbol}` : ''}`, data);
};

// Utility for subscription management logging
export const logSubscription = (action: 'subscribe' | 'unsubscribe', symbol: string, subscriberId?: string) => {
  devConsole.debug(`${action} ${symbol}${subscriberId ? ` (${subscriberId})` : ''}`);
};