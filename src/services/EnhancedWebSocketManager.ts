
import { toast } from "sonner";
import { devConsole } from "@/utils/consoleCleanup";

interface WebSocketConnection {
  url: string;
  socket: WebSocket | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  isConnecting: boolean;
  subscriptions: Set<string>;
}

interface ConnectionState {
  connected: boolean;
  connecting: boolean;
  lastError?: string;
  reconnectAttempts: number;
}

export class EnhancedWebSocketManager {
  private connections: Map<string, WebSocketConnection> = new Map();
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private globalErrorHandler?: (error: Error) => void;

  async initialize(): Promise<void> {
    devConsole.log('Enhanced WebSocket Manager initialized');
  }

  connect(url: string, options: { maxReconnectAttempts?: number; reconnectDelay?: number } = {}): void {
    const connectionId = this.getConnectionId(url);
    
    if (this.connections.has(connectionId)) {
      devConsole.log(`Connection ${connectionId} already exists`);
      return;
    }

    const connection: WebSocketConnection = {
      url,
      socket: null,
      reconnectAttempts: 0,
      maxReconnectAttempts: options.maxReconnectAttempts || 5,
      reconnectDelay: options.reconnectDelay || 1000,
      isConnecting: false,
      subscriptions: new Set()
    };

    this.connections.set(connectionId, connection);
    this.connectWebSocket(connectionId);
  }

  private connectWebSocket(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.isConnecting) return;

    connection.isConnecting = true;

    try {
      connection.socket = new WebSocket(connection.url);

      connection.socket.onopen = () => {
        devConsole.log(`WebSocket connected: ${connectionId}`);
        connection.isConnecting = false;
        connection.reconnectAttempts = 0;
        
        // Resubscribe to all topics
        connection.subscriptions.forEach(topic => {
          this.sendMessage(connectionId, { type: 'subscribe', symbol: topic });
        });
      };

      connection.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(connectionId, data);
        } catch (error) {
          devConsole.error('Failed to parse WebSocket message:', error);
        }
      };

      connection.socket.onclose = (event) => {
        devConsole.log(`WebSocket closed: ${connectionId}`, event.code, event.reason);
        connection.isConnecting = false;
        connection.socket = null;
        
        if (connection.reconnectAttempts < connection.maxReconnectAttempts) {
          this.scheduleReconnect(connectionId);
        } else {
          devConsole.error(`Max reconnect attempts reached for ${connectionId}`);
          toast.error(`Lost connection to market data`);
        }
      };

      connection.socket.onerror = (error) => {
        devConsole.error(`WebSocket error: ${connectionId}`, error);
        connection.isConnecting = false;
        
        if (this.globalErrorHandler) {
          this.globalErrorHandler(new Error(`WebSocket error: ${connectionId}`));
        }
      };

    } catch (error) {
      devConsole.error(`Failed to create WebSocket connection: ${connectionId}`, error);
      connection.isConnecting = false;
      this.scheduleReconnect(connectionId);
    }
  }

  private scheduleReconnect(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.reconnectAttempts++;
    const delay = connection.reconnectDelay * Math.pow(2, connection.reconnectAttempts - 1);

    devConsole.log(`Scheduling reconnect for ${connectionId} in ${delay}ms (attempt ${connection.reconnectAttempts})`);

    setTimeout(() => {
      this.connectWebSocket(connectionId);
    }, delay);
  }

  private handleMessage(connectionId: string, data: any): void {
    // Handle different message types
    if (data.type === 'trade' && data.data) {
      data.data.forEach((trade: any) => {
        const handler = this.messageHandlers.get('trade');
        if (handler) {
          handler({
            symbol: trade.s,
            price: trade.p,
            volume: trade.v,
            timestamp: trade.t
          });
        }
      });
    }
  }

  sendMessage(connectionId: string, message: any): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.socket || connection.socket.readyState !== WebSocket.OPEN) {
      devConsole.warn(`Cannot send message - connection ${connectionId} not ready`);
      return false;
    }

    try {
      connection.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      devConsole.error(`Failed to send message to ${connectionId}:`, error);
      return false;
    }
  }

  subscribe(topic: string, url?: string): void {
    const connectionId = url ? this.getConnectionId(url) : this.getDefaultConnectionId();
    const connection = this.connections.get(connectionId);
    
    if (!connection) {
      devConsole.warn(`No connection found for ${connectionId}`);
      return;
    }

    connection.subscriptions.add(topic);
    
    if (connection.socket && connection.socket.readyState === WebSocket.OPEN) {
      this.sendMessage(connectionId, { type: 'subscribe', symbol: topic });
    }
  }

  unsubscribe(topic: string, url?: string): void {
    const connectionId = url ? this.getConnectionId(url) : this.getDefaultConnectionId();
    const connection = this.connections.get(connectionId);
    
    if (!connection) return;

    connection.subscriptions.delete(topic);
    
    if (connection.socket && connection.socket.readyState === WebSocket.OPEN) {
      this.sendMessage(connectionId, { type: 'unsubscribe', symbol: topic });
    }
  }

  onMessage(type: string, handler: (data: any) => void): void {
    this.messageHandlers.set(type, handler);
  }

  onError(handler: (error: Error) => void): void {
    this.globalErrorHandler = handler;
  }

  getConnectionState(url?: string): ConnectionState {
    const connectionId = url ? this.getConnectionId(url) : this.getDefaultConnectionId();
    const connection = this.connections.get(connectionId);
    
    if (!connection) {
      return { connected: false, connecting: false, reconnectAttempts: 0 };
    }

    return {
      connected: connection.socket?.readyState === WebSocket.OPEN,
      connecting: connection.isConnecting,
      reconnectAttempts: connection.reconnectAttempts,
      lastError: undefined
    };
  }

  disconnect(url?: string): void {
    const connectionId = url ? this.getConnectionId(url) : this.getDefaultConnectionId();
    const connection = this.connections.get(connectionId);
    
    if (connection) {
      if (connection.socket) {
        connection.socket.close();
      }
      this.connections.delete(connectionId);
    }
  }

  destroy(): void {
    this.connections.forEach((connection, connectionId) => {
      if (connection.socket) {
        connection.socket.close();
      }
    });
    this.connections.clear();
    this.messageHandlers.clear();
  }

  private getConnectionId(url: string): string {
    return url.replace(/^wss?:\/\//, '').replace(/[\/\:]/g, '_');
  }

  private getDefaultConnectionId(): string {
    return this.connections.keys().next().value || 'default';
  }
}

export const enhancedWSManager = new EnhancedWebSocketManager();
