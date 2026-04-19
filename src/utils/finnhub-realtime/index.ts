import { ConnectionManager } from './ConnectionManager';
import { MessageHandler } from './MessageHandler';
import { fetchFinnhubApiKey } from './ApiKeyFetcher';
import type { MarketDataCallback, ConnectionStatus } from './types';

export type { MarketData, MarketDataCallback, ConnectionStatus } from './types';

class RealTimeFinnhubSocket {
  private connection: ConnectionManager;
  private messages = new MessageHandler();
  private subscribers: Set<string> = new Set();
  private pendingSubscriptions: Set<string> = new Set();

  constructor() {
    this.connection = new ConnectionManager({
      onOpen: () => this.resubscribeAll(),
      onMessage: (raw) => {
        const { shouldPong } = this.messages.handle(raw);
        if (shouldPong) this.connection.send({ type: 'pong' });
      },
      onClose: () => {
        // ConnectionManager handles reconnect scheduling.
      },
    });
    this.init();
  }

  private async init(): Promise<void> {
    const key = await fetchFinnhubApiKey();
    this.connection.setApiKey(key);
    this.connection.connect();
  }

  private resubscribeAll(): void {
    const all = new Set([...this.subscribers, ...this.pendingSubscriptions]);
    all.forEach((symbol) => this.sendSubscription(symbol));
    this.pendingSubscriptions.clear();
  }

  private sendSubscription(symbol: string): void {
    if (this.connection.isOpen()) {
      this.connection.send({ type: 'subscribe', symbol });
      this.subscribers.add(symbol);
      this.pendingSubscriptions.delete(symbol);
    } else {
      this.pendingSubscriptions.add(symbol);
    }
  }

  subscribe(symbol: string): void {
    if (!symbol || this.subscribers.has(symbol)) return;

    if (this.connection.isOpen()) {
      this.sendSubscription(symbol);
    } else {
      this.pendingSubscriptions.add(symbol);
      if (this.connection.getStatus() === 'disconnected') {
        this.connection.connect();
      }
    }
  }

  unsubscribe(symbol: string): void {
    if (!symbol) return;
    this.subscribers.delete(symbol);
    this.pendingSubscriptions.delete(symbol);
    if (this.connection.isOpen()) {
      this.connection.send({ type: 'unsubscribe', symbol });
    }
  }

  onMarketData(callback: MarketDataCallback): () => void {
    return this.messages.addListener(callback);
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connection.getStatus();
  }

  close(): void {
    this.connection.close();
    this.subscribers.clear();
    this.pendingSubscriptions.clear();
    this.messages.clearListeners();
  }
}

export const finnhubSocket = new RealTimeFinnhubSocket();
