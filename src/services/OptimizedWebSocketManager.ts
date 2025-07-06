import { toast } from "sonner";

interface ConnectionPool {
  connections: Map<string, WebSocket>;
  subscriptions: Map<string, Set<string>>;
  messageQueue: Map<string, any[]>;
  reconnectAttempts: Map<string, number>;
  lastHeartbeat: Map<string, number>;
}

export class OptimizedWebSocketManager {
  private static instance: OptimizedWebSocketManager;
  private connectionPool: ConnectionPool;
  private maxConnectionsPerPool = 5;
  private maxReconnectAttempts = 3;
  private heartbeatInterval = 30000; // 30 seconds
  private messageBuffer: Map<string, any[]> = new Map();
  private batchSize = 50;
  private flushInterval: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  private constructor() {
    this.connectionPool = {
      connections: new Map(),
      subscriptions: new Map(),
      messageQueue: new Map(),
      reconnectAttempts: new Map(),
      lastHeartbeat: new Map()
    };
    this.initializeOptimizedConnections();
    this.startHeartbeat();
    this.startMessageBatching();
  }

  static getInstance(): OptimizedWebSocketManager {
    if (!OptimizedWebSocketManager.instance) {
      OptimizedWebSocketManager.instance = new OptimizedWebSocketManager();
    }
    return OptimizedWebSocketManager.instance;
  }

  private initializeOptimizedConnections() {
    // Create optimized connection pools
    const urls = [
      'wss://ws.finnhub.io?token=demo',
      'wss://ws.finnhub.io?token=demo',
      'wss://ws.finnhub.io?token=demo'
    ];

    urls.forEach((url, index) => {
      this.createConnection(`pool_${index}`, url);
    });
  }

  private createConnection(poolId: string, url: string) {
    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        this.connectionPool.connections.set(poolId, ws);
        this.connectionPool.reconnectAttempts.set(poolId, 0);
        this.connectionPool.lastHeartbeat.set(poolId, Date.now());
        
        // Resubscribe to symbols for this pool
        const subscriptions = this.connectionPool.subscriptions.get(poolId);
        if (subscriptions) {
          subscriptions.forEach(symbol => {
            this.sendSubscription(poolId, symbol);
          });
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleOptimizedMessage(poolId, data);
          this.connectionPool.lastHeartbeat.set(poolId, Date.now());
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      ws.onclose = () => {
        this.handleConnectionClose(poolId, url);
      };

      ws.onerror = (error) => {
        console.error(`WebSocket error for ${poolId}:`, error);
      };

    } catch (error) {
      console.error(`Failed to create connection ${poolId}:`, error);
      this.scheduleReconnect(poolId, url);
    }
  }

  private handleOptimizedMessage(poolId: string, data: any) {
    if (data.type === 'trade' && data.data) {
      // Batch process trade data for efficiency
      data.data.forEach((trade: any) => {
        const symbol = trade.s;
        const price = trade.p;
        const volume = trade.v;
        const timestamp = trade.t;

        // Add to message buffer for batching
        if (!this.messageBuffer.has(symbol)) {
          this.messageBuffer.set(symbol, []);
        }
        
        this.messageBuffer.get(symbol)!.push({
          symbol,
          price,
          volume,
          timestamp
        });

        // Notify listeners immediately for critical updates
        const listeners = this.listeners.get(symbol);
        if (listeners) {
          listeners.forEach(callback => {
            try {
              callback({ symbol, price, volume, timestamp });
            } catch (error) {
              console.error('Listener callback error:', error);
            }
          });
        }
      });
    }
  }

  private startMessageBatching() {
    this.flushInterval = setInterval(() => {
      this.flushMessageBuffer();
    }, 100); // Flush every 100ms for real-time feel
  }

  private flushMessageBuffer() {
    if (this.messageBuffer.size === 0) return;

    // Process batched messages
    for (const [symbol, messages] of this.messageBuffer.entries()) {
      if (messages.length > 0) {
        // Get latest price from batch
        const latestMessage = messages[messages.length - 1];
        
        // Clear buffer for this symbol
        this.messageBuffer.set(symbol, []);
      }
    }
  }

  private handleConnectionClose(poolId: string, url: string) {
    this.connectionPool.connections.delete(poolId);
    
    const attempts = this.connectionPool.reconnectAttempts.get(poolId) || 0;
    if (attempts < this.maxReconnectAttempts) {
      this.scheduleReconnect(poolId, url);
    } else {
      console.error(`Max reconnection attempts reached for ${poolId}`);
      toast.error("Connection lost. Please refresh the page.");
    }
  }

  private scheduleReconnect(poolId: string, url: string) {
    const attempts = this.connectionPool.reconnectAttempts.get(poolId) || 0;
    this.connectionPool.reconnectAttempts.set(poolId, attempts + 1);
    
    const delay = Math.min(1000 * Math.pow(2, attempts), 30000); // Exponential backoff, max 30s
    
    setTimeout(() => {
      this.createConnection(poolId, url);
    }, delay);
  }

  private startHeartbeat() {
    setInterval(() => {
      this.connectionPool.connections.forEach((ws, poolId) => {
        const lastHeartbeat = this.connectionPool.lastHeartbeat.get(poolId) || 0;
        const now = Date.now();
        
        if (now - lastHeartbeat > this.heartbeatInterval * 2) {
          // Connection seems dead, close and reconnect
          ws.close();
        } else if (ws.readyState === WebSocket.OPEN) {
          // Send ping
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      });
    }, this.heartbeatInterval);
  }

  private getOptimalPool(): string | null {
    // Find pool with least subscriptions
    let optimalPool = null;
    let minSubscriptions = Infinity;

    this.connectionPool.connections.forEach((ws, poolId) => {
      if (ws.readyState === WebSocket.OPEN) {
        const subscriptionCount = this.connectionPool.subscriptions.get(poolId)?.size || 0;
        if (subscriptionCount < minSubscriptions) {
          minSubscriptions = subscriptionCount;
          optimalPool = poolId;
        }
      }
    });

    return optimalPool;
  }

  private sendSubscription(poolId: string, symbol: string) {
    const ws = this.connectionPool.connections.get(poolId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'subscribe', symbol }));
    }
  }

  public subscribe(symbol: string, callback: (data: any) => void): () => void {
    // Add listener
    if (!this.listeners.has(symbol)) {
      this.listeners.set(symbol, new Set());
    }
    this.listeners.get(symbol)!.add(callback);

    // Find optimal pool for subscription
    const poolId = this.getOptimalPool();
    if (!poolId) {
      console.warn('No available WebSocket connections');
      return () => {};
    }

    // Add to subscription tracking
    if (!this.connectionPool.subscriptions.has(poolId)) {
      this.connectionPool.subscriptions.set(poolId, new Set());
    }
    this.connectionPool.subscriptions.get(poolId)!.add(symbol);

    // Send subscription
    this.sendSubscription(poolId, symbol);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(symbol, callback);
    };
  }

  public unsubscribe(symbol: string, callback: (data: any) => void) {
    // Remove listener
    const listeners = this.listeners.get(symbol);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(symbol);
        
        // Remove from all pools if no more listeners
        this.connectionPool.subscriptions.forEach((subscriptions, poolId) => {
          if (subscriptions.has(symbol)) {
            subscriptions.delete(symbol);
            const ws = this.connectionPool.connections.get(poolId);
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'unsubscribe', symbol }));
            }
          }
        });
      }
    }
  }

  public getConnectionStats() {
    return {
      activeConnections: this.connectionPool.connections.size,
      totalSubscriptions: Array.from(this.connectionPool.subscriptions.values())
        .reduce((total, subs) => total + subs.size, 0),
      messageBufferSize: this.messageBuffer.size,
      listenerCount: this.listeners.size
    };
  }

  public destroy() {
    // Clean up all connections and intervals
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    this.connectionPool.connections.forEach(ws => ws.close());
    this.connectionPool.connections.clear();
    this.connectionPool.subscriptions.clear();
    this.messageBuffer.clear();
    this.listeners.clear();
  }
}

export const optimizedWSManager = OptimizedWebSocketManager.getInstance();