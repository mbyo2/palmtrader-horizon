
export class MessageQueue {
  private messageQueue: any[] = [];
  private queueInterval: NodeJS.Timeout | null = null;
  private listeners: Array<(data: any) => void> = [];
  private batchSize: number = 10;
  private processInterval: number = 100;

  constructor() {
    this.setupMessageQueue();
  }

  private setupMessageQueue() {
    this.queueInterval = setInterval(() => {
      if (this.messageQueue.length > 0) {
        const batch = this.messageQueue.splice(0, this.batchSize);
        batch.forEach(data => {
          this.notifyListeners(data);
        });
      }
    }, this.processInterval);
  }

  private notifyListeners(data: any) {
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error("Error in listener callback:", error);
      }
    });
  }

  public addMessage(data: any) {
    this.messageQueue.push(data);
  }

  public addListener(callback: (data: any) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  public destroy() {
    if (this.queueInterval) {
      clearInterval(this.queueInterval);
      this.queueInterval = null;
    }
    this.messageQueue = [];
    this.listeners = [];
  }
}
