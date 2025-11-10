
export class WebSocketConnection {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private isConnecting: boolean = false;
  private messageHandlers: Array<(event: MessageEvent) => void> = [];
  private openHandlers: Array<() => void> = [];
  private closeHandlers: Array<(event: CloseEvent) => void> = [];
  private errorHandlers: Array<(event: Event) => void> = [];

  constructor(apiKey: string = "demo") {
    this.apiKey = apiKey;
  }

  async connect(): Promise<void> {
    if (this.isConnecting || this.isOpen()) {
      return;
    }

    this.isConnecting = true;

    try {
      // Get API key from edge function if not provided
      if (this.apiKey === "demo") {
        try {
          const response = await fetch('/api/finnhub-websocket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_api_key' })
          });
          
          if (response.ok) {
            const data = await response.json();
            this.apiKey = data.apiKey;
          }
        } catch (fetchError) {
          console.warn('Could not fetch API key, using demo mode:', fetchError);
          // Continue with demo key
        }
      }

      const wsUrl = `wss://ws.finnhub.io?token=${this.apiKey}`;
      console.log('Connecting to Finnhub WebSocket...');
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('Finnhub WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.openHandlers.forEach(handler => {
          try {
            handler();
          } catch (err) {
            console.warn('Error in open handler:', err);
          }
        });
      };

      this.ws.onmessage = (event) => {
        this.messageHandlers.forEach(handler => {
          try {
            handler(event);
          } catch (err) {
            console.warn('Error in message handler:', err);
          }
        });
      };

      this.ws.onclose = (event) => {
        console.log('Finnhub WebSocket closed:', event.code, event.reason);
        this.isConnecting = false;
        this.ws = null;
        this.closeHandlers.forEach(handler => {
          try {
            handler(event);
          } catch (err) {
            console.warn('Error in close handler:', err);
          }
        });
        
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (event) => {
        console.warn('Finnhub WebSocket error:', event);
        this.isConnecting = false;
        this.errorHandlers.forEach(handler => {
          try {
            handler(event);
          } catch (err) {
            console.warn('Error in error handler:', err);
          }
        });
      };

    } catch (error) {
      console.warn('Failed to connect to Finnhub WebSocket:', error);
      this.isConnecting = false;
      // Don't throw - allow app to continue without real-time data
    }
  }

  private scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }

  send(data: string): boolean {
    if (this.isOpen()) {
      this.ws!.send(data);
      return true;
    }
    return false;
  }

  close() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  isConnected(): boolean {
    return this.ws !== null && !this.isConnecting;
  }

  onMessage(handler: (event: MessageEvent) => void) {
    this.messageHandlers.push(handler);
  }

  onOpen(handler: () => void) {
    this.openHandlers.push(handler);
  }

  onClose(handler: (event: CloseEvent) => void) {
    this.closeHandlers.push(handler);
  }

  onError(handler: (event: Event) => void) {
    this.errorHandlers.push(handler);
  }
}
