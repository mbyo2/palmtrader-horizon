import type { MarketData, MarketDataCallback } from './types';

export class MessageHandler {
  private listeners: Set<MarketDataCallback> = new Set();
  private previousPrices: Map<string, number> = new Map();

  addListener(callback: MarketDataCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  clearListeners(): void {
    this.listeners.clear();
  }

  /**
   * Process a raw Finnhub message. Returns true if a pong should be sent in reply.
   */
  handle(raw: string): { shouldPong: boolean } {
    try {
      const data = JSON.parse(raw);

      if (data.type === 'trade' && Array.isArray(data.data)) {
        for (const trade of data.data) {
          this.processTrade(trade);
        }
        return { shouldPong: false };
      }

      if (data.type === 'ping') {
        return { shouldPong: true };
      }
    } catch (error) {
      console.warn('Error processing message:', error);
    }
    return { shouldPong: false };
  }

  private processTrade(trade: { s: string; p: number; v: number; t: number }): void {
    const symbol = trade.s;
    const price = trade.p;

    const previousPrice = this.previousPrices.get(symbol);
    let change = 0;
    let changePercent = 0;

    if (previousPrice && previousPrice > 0) {
      change = price - previousPrice;
      changePercent = (change / previousPrice) * 100;
    }
    this.previousPrices.set(symbol, price);

    const marketData: MarketData = {
      symbol,
      price,
      change,
      changePercent,
      volume: trade.v,
      timestamp: trade.t,
    };

    this.notify(marketData);
  }

  private notify(data: MarketData): void {
    this.listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (err) {
        console.warn('Error in market data listener:', err);
      }
    });
  }
}
