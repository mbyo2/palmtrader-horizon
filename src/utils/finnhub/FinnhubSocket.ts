
import { WebSocketConnection } from './WebSocketConnection';
import { MessageQueue } from './MessageQueue';
import { SubscriptionManager } from './SubscriptionManager';
import { SimulationHelper } from './SimulationHelper';

export class FinnhubSocket {
  private connection: WebSocketConnection;
  private messageQueue: MessageQueue;
  private subscriptionManager: SubscriptionManager;
  private simulationHelper: SimulationHelper;
  private debug: boolean = false;

  constructor(apiKey: string = "demo") {
    this.connection = new WebSocketConnection(apiKey);
    this.messageQueue = new MessageQueue();
    this.subscriptionManager = new SubscriptionManager();
    this.simulationHelper = new SimulationHelper(this.messageQueue);
    
    this.setupConnectionHandlers();
    this.connect();
  }

  private setupConnectionHandlers() {
    this.connection.onOpen(() => {
      this.log("Finnhub WebSocket connected successfully");
      this.resubscribeAll();
    });

    this.connection.onClose((event) => {
      this.log("Finnhub WebSocket closed. Attempting to reconnect...");
    });

    this.connection.onError((event) => {
      this.log("Finnhub WebSocket error:", event);
    });

    this.connection.onMessage((event) => {
      this.handleMessage(event);
    });
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'trade' && data.data && data.data.length > 0) {
        const processedData = {
          symbol: data.data[0].s,
          price: data.data[0].p,
          timestamp: data.data[0].t,
          volume: data.data[0].v
        };
        
        this.messageQueue.addMessage(processedData);
      }
    } catch (error) {
      this.log("Error processing WebSocket message:", error);
    }
  }

  private resubscribeAll() {
    const allSubscriptions = this.subscriptionManager.getAllSubscriptions();
    const pendingSubscriptions = this.subscriptionManager.getPendingSubscriptions();
    
    // Resubscribe to pending subscriptions
    pendingSubscriptions.forEach(symbol => {
      this.subscriptionManager.subscribe(symbol);
      this.sendSubscription(symbol);
    });
    
    // Resubscribe to all existing subscriptions
    allSubscriptions.forEach(symbol => {
      this.sendSubscription(symbol);
    });
  }

  private async sendSubscription(symbol: string) {
    try {
      if (!this.connection.isConnected()) {
        this.subscriptionManager.addToPending(symbol);
        await this.connection.connect();
        return;
      }
      
      if (this.connection.isOpen()) {
        const success = this.connection.send(JSON.stringify({ type: 'subscribe', symbol }));
        if (success) {
          this.subscriptionManager.removeFromPending(symbol);
        } else {
          this.subscriptionManager.addToPending(symbol);
        }
      } else {
        this.subscriptionManager.addToPending(symbol);
      }
    } catch (error) {
      this.log(`Error subscribing to ${symbol}:`, error);
      this.subscriptionManager.addToPending(symbol);
    }
  }

  private sendUnsubscription(symbol: string) {
    try {
      this.subscriptionManager.removeFromPending(symbol);
      
      if (this.connection.isOpen()) {
        this.connection.send(JSON.stringify({ type: 'unsubscribe', symbol }));
      }
    } catch (error) {
      this.log(`Error unsubscribing from ${symbol}:`, error);
    }
  }

  public async connect(): Promise<void> {
    return this.connection.connect();
  }

  public subscribe(symbol: string) {
    if (!symbol) return;
    
    const wasNew = this.subscriptionManager.subscribe(symbol);
    if (wasNew) {
      this.sendSubscription(symbol);
    }
  }

  public unsubscribe(symbol: string) {
    if (!symbol) return;
    
    const wasSubscribed = this.subscriptionManager.unsubscribe(symbol);
    if (wasSubscribed) {
      this.sendUnsubscription(symbol);
    }
  }

  public onMarketData(callback: (data: any) => void) {
    return this.messageQueue.addListener(callback);
  }

  public close() {
    this.connection.close();
    this.messageQueue.destroy();
    this.subscriptionManager.clear();
    this.simulationHelper.stopAllSimulations();
  }

  public setDebug(enable: boolean) {
    this.debug = enable;
  }

  private log(...args: any[]) {
    if (this.debug) {
      console.log(...args);
    }
  }

  public simulateMarketData(symbol: string, basePrice: number = 100) {
    this.subscriptionManager.subscribe(symbol);
    return this.simulationHelper.simulateMarketData(symbol, basePrice);
  }
}
