export class SimulationHelper {
  private simulations: Map<string, NodeJS.Timeout> = new Map();
  private messageQueue: any;

  constructor(messageQueue: any) {
    this.messageQueue = messageQueue;
  }

  simulateMarketData(symbol: string, basePrice: number = 100): () => void {
    if (this.simulations.has(symbol)) {
      return () => this.stopSimulation(symbol);
    }

    let currentPrice = basePrice;
    
    const interval = setInterval(() => {
      // Simulate realistic price movements (±2% max change)
      const changePercent = (Math.random() - 0.5) * 0.04; // -2% to +2%
      currentPrice = currentPrice * (1 + changePercent);
      
      // Keep price reasonable (prevent it from going to 0 or infinity)
      currentPrice = Math.max(0.01, Math.min(currentPrice, basePrice * 10));
      
      const simulatedData = {
        symbol: symbol,
        price: Number(currentPrice.toFixed(2)),
        timestamp: Date.now(),
        volume: Math.floor(Math.random() * 1000000) + 100000,
        change: changePercent * 100
      };
      
      this.messageQueue.addMessage(simulatedData);
    }, 2000 + Math.random() * 3000); // Random interval between 2-5 seconds

    this.simulations.set(symbol, interval);
    
    console.log(`Started price simulation for ${symbol} at base price $${basePrice}`);
    
    return () => this.stopSimulation(symbol);
  }

  stopSimulation(symbol: string): void {
    const interval = this.simulations.get(symbol);
    if (interval) {
      clearInterval(interval);
      this.simulations.delete(symbol);
      console.log(`Stopped simulation for ${symbol}`);
    }
  }

  stopAllSimulations(): void {
    this.simulations.forEach((interval, symbol) => {
      clearInterval(interval);
      console.log(`Stopped simulation for ${symbol}`);
    });
    this.simulations.clear();
  }

  isSimulating(symbol: string): boolean {
    return this.simulations.has(symbol);
  }

  getActiveSimulations(): string[] {
    return Array.from(this.simulations.keys());
  }
}
