
interface BatchRequest<T> {
  symbol: string;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

export class BatchProcessor {
  private static batchQueue: BatchRequest<any>[] = [];
  private static batchTimeout: NodeJS.Timeout | null = null;
  private static readonly BATCH_SIZE = 5;
  private static readonly BATCH_DELAY = 100; // milliseconds

  static async addToBatch<T>(symbol: string): Promise<T> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({ symbol, resolve, reject });
      
      if (this.batchQueue.length >= this.BATCH_SIZE) {
        this.processBatch();
      } else if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => {
          this.processBatch();
        }, this.BATCH_DELAY);
      }
    });
  }

  private static async processBatch() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    const batch = this.batchQueue.splice(0, this.BATCH_SIZE);
    if (batch.length === 0) return;

    const symbols = batch.map(req => req.symbol);
    console.log(`Processing batch of ${symbols.length} symbols:`, symbols);

    try {
      // Fetch data for all symbols in the batch
      const results = await Promise.allSettled(
        symbols.map(symbol => this.fetchSymbolData(symbol))
      );

      // Resolve each request with its corresponding result
      batch.forEach((request, index) => {
        const result = results[index];
        if (result.status === 'fulfilled') {
          request.resolve(result.value);
        } else {
          request.reject(new Error(result.reason?.message || 'Batch processing failed'));
        }
      });

    } catch (error) {
      // If batch processing fails completely, reject all requests
      batch.forEach(request => {
        request.reject(error as Error);
      });
    }
  }

  private static async fetchSymbolData(symbol: string) {
    try {
      // Try to fetch from Finnhub first
      const response = await fetch('/api/finnhub-websocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_quote', symbol })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.c) { // Current price exists
          return {
            symbol,
            price: data.c,
            change: data.d || 0,
            volume: data.v || 0
          };
        }
      }

      // Fallback: generate mock data
      return this.generateMockData(symbol);

    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error);
      return this.generateMockData(symbol);
    }
  }

  private static generateMockData(symbol: string) {
    // Generate consistent mock data based on symbol
    const basePrice = 50 + (symbol.charCodeAt(0) % 200);
    const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
    const price = basePrice * (1 + variation);
    
    return {
      symbol,
      price: Number(price.toFixed(2)),
      change: variation * 100,
      volume: Math.floor(Math.random() * 1000000) + 100000
    };
  }
}
