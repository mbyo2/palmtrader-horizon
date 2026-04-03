
import { supabase } from "@/integrations/supabase/client";

interface BatchRequest {
  symbol: string;
  resolve: (data: any) => void;
  reject: (error: Error) => void;
}

export class BatchProcessor {
  private static queue: BatchRequest[] = [];
  private static batchTimeout: ReturnType<typeof setTimeout> | null = null;
  private static readonly BATCH_SIZE = 10;
  private static readonly BATCH_DELAY = 100;

  static async addRequest(symbol: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ symbol, resolve, reject });

      if (this.queue.length >= this.BATCH_SIZE) {
        this.processBatch();
      } else if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => this.processBatch(), this.BATCH_DELAY);
      }
    });
  }

  private static async processBatch(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    const batch = this.queue.splice(0, this.BATCH_SIZE);
    if (batch.length === 0) return;

    try {
      const results = await Promise.allSettled(
        batch.map(request => this.fetchSymbolData(request.symbol))
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          batch[index].resolve(result.value);
        } else {
          batch[index].reject(result.reason);
        }
      });

    } catch (error) {
      batch.forEach(request => {
        request.reject(error as Error);
      });
    }
  }

  private static async fetchSymbolData(symbol: string) {
    try {
      const { data, error } = await supabase.functions.invoke('finnhub-websocket', {
        body: { action: 'get_quote', symbol }
      });

      if (!error && data?.c) {
        return {
          symbol,
          price: data.c,
          change: data.d || 0,
          volume: data.v || 0
        };
      }

      return null;

    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error);
      return null;
    }
  }
}
