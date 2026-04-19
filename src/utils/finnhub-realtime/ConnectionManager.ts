import type { ConnectionStatus } from './types';

interface ConnectionHandlers {
  onOpen: () => void;
  onMessage: (raw: string) => void;
  onClose: () => void;
}

export class ConnectionManager {
  private ws: WebSocket | null = null;
  private apiKey: string | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null;

  private readonly maxReconnectAttempts = 10;
  private readonly baseReconnectDelay = 1000;

  constructor(private handlers: ConnectionHandlers) {}

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) return;

    if (!this.apiKey) {
      setTimeout(() => this.connect(), 500);
      return;
    }

    this.isConnecting = true;
    this.clearConnectionTimeout();

    try {
      const wsUrl = `wss://ws.finnhub.io?token=${this.apiKey}`;
      this.ws = new WebSocket(wsUrl);

      this.connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.warn('Connection timeout, closing and retrying...');
          this.ws.close();
        }
      }, 10000);

      this.ws.onopen = () => {
        console.log('Finnhub WebSocket connected - Real-time data active');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.clearConnectionTimeout();
        this.startHeartbeat();
        this.handlers.onOpen();
      };

      this.ws.onmessage = (event) => this.handlers.onMessage(event.data);

      this.ws.onclose = (event) => {
        this.isConnecting = false;
        this.ws = null;
        this.stopHeartbeat();
        this.handlers.onClose();
        if (event.code !== 1000) this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
      };
    } catch (error) {
      console.warn('Failed to create WebSocket:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  send(data: object): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  isOpen(): boolean {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  getStatus(): ConnectionStatus {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return 'connected';
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) return 'connecting';
    return 'disconnected';
  }

  close(): void {
    this.stopHeartbeat();
    this.clearConnectionTimeout();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.isOpen()) this.send({ type: 'ping' });
    }, 25000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private clearConnectionTimeout(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Max reconnection attempts reached, will retry in 60s');
      setTimeout(() => {
        this.reconnectAttempts = 0;
        this.connect();
      }, 60000);
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1),
      30000
    );
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(), delay);
  }
}
