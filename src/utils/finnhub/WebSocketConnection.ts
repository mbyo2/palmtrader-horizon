
export class WebSocketConnection {
  private socket: WebSocket | null = null;
  private apiKey: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectInterval: number = 5000;
  private connectionPromise: Promise<void> | null = null;
  private connected: boolean = false;
  private onOpenCallback?: () => void;
  private onCloseCallback?: (event: CloseEvent) => void;
  private onErrorCallback?: (event: Event) => void;
  private onMessageCallback?: (event: MessageEvent) => void;

  constructor(apiKey: string = "demo") {
    this.apiKey = apiKey;
  }

  public connect(): Promise<void> {
    if (this.connectionPromise) return this.connectionPromise;

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(`wss://ws.finnhub.io?token=${this.apiKey}`);

        this.socket.onopen = () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          this.onOpenCallback?.();
          resolve();
        };
        
        this.socket.onclose = (event) => {
          this.connected = false;
          this.connectionPromise = null;
          this.onCloseCallback?.(event);
          this.scheduleReconnect();
        };
        
        this.socket.onerror = (event) => {
          this.onErrorCallback?.(event);
          reject(new Error("WebSocket connection failed"));
        };
        
        this.socket.onmessage = (event) => {
          this.onMessageCallback?.(event);
        };
      } catch (error) {
        this.scheduleReconnect();
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), this.reconnectInterval);
    }
  }

  public send(data: string) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(data);
      return true;
    }
    return false;
  }

  public close() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.connected = false;
      this.connectionPromise = null;
    }
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public isOpen(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  public onOpen(callback: () => void) {
    this.onOpenCallback = callback;
  }

  public onClose(callback: (event: CloseEvent) => void) {
    this.onCloseCallback = callback;
  }

  public onError(callback: (event: Event) => void) {
    this.onErrorCallback = callback;
  }

  public onMessage(callback: (event: MessageEvent) => void) {
    this.onMessageCallback = callback;
  }
}
