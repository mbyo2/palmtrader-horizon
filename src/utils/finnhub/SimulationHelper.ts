
export class SimulationHelper {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private messageQueue: any;

  constructor(messageQueue: any) {
    this.messageQueue = messageQueue;
  }

  public simulateMarketData(symbol: string, basePrice: number = 100): () => void {
    if (this.intervals.has(symbol)) {
      return this.stopSimulation.bind(this, symbol);
    }

    const interval = setInterval(() => {
      const changePercent = (Math.random() - 0.5) * 0.01;
      const newPrice = basePrice * (1 + changePercent);
      
      const data = {
        symbol,
        price: parseFloat(newPrice.toFixed(2)),
        timestamp: Date.now(),
        volume: Math.round(Math.random() * 1000)
      };
      
      this.messageQueue.addMessage(data);
    }, 5000);
    
    this.intervals.set(symbol, interval);
    
    return () => this.stopSimulation(symbol);
  }

  private stopSimulation(symbol: string) {
    const interval = this.intervals.get(symbol);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(symbol);
    }
  }

  public stopAllSimulations() {
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals.clear();
  }
}
