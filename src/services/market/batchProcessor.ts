
import { supabase } from "@/integrations/supabase/client";
import { MockDataHelper } from "./mockDataHelper";

type BatchQueueItem = {
  symbol: string;
  resolve: (value: any) => void;
};

// Settings for batching requests
const BATCH_INTERVAL = 50; // Reduced from 100ms to 50ms for faster response
const MAX_BATCH_SIZE = 20; // Maximum number of symbols to fetch in a single batch

// Queue for batch processing
let batchQueue: BatchQueueItem[] = [];
let batchTimeout: NodeJS.Timeout | null = null;

export const BatchProcessor = {
  /**
   * Add a request to the batch queue
   * @param symbol Stock symbol
   * @returns Promise that resolves with the data
   */
  addToBatch<T>(symbol: string): Promise<T> {
    return new Promise((resolve) => {
      // Add to batch queue
      batchQueue.push({ symbol, resolve });
      
      // Schedule batch processing if not already scheduled
      if (!batchTimeout) {
        batchTimeout = setTimeout(() => {
          processBatch();
        }, BATCH_INTERVAL);
      }
    });
  }
};

/**
 * Process the batch queue
 */
async function processBatch() {
  try {
    // Get items from the batch queue
    const items = [...batchQueue];
    batchQueue = [];
    batchTimeout = null;
    
    if (items.length === 0) return;
    
    const symbols = items.map(item => item.symbol);
    console.log(`Processing batch of ${symbols.length} symbols: ${symbols.join(', ')}`);
    
    // Split into smaller batches if necessary to avoid overwhelming the database
    for (let i = 0; i < symbols.length; i += MAX_BATCH_SIZE) {
      const batchSymbols = symbols.slice(i, i + MAX_BATCH_SIZE);
      const batchItems = items.slice(i, i + MAX_BATCH_SIZE);
      
      // Fetch data for this batch
      try {
        const { data, error } = await supabase
          .from('market_data')
          .select('*')
          .in('symbol', batchSymbols)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Create a map of symbols to results
        const results = new Map();
        if (data) {
          data.forEach(item => {
            if (!results.has(item.symbol)) {
              results.set(item.symbol, {
                symbol: item.symbol,
                price: item.price,
                change: 0,
                volume: 0
              });
            }
          });
        }
        
        // Resolve all promises with the data
        batchItems.forEach(item => {
          const result = results.get(item.symbol) || MockDataHelper.generateMockDataPoint(item.symbol);
          item.resolve(result);
        });
      } catch (error) {
        console.error(`Error processing batch for symbols ${batchSymbols.join(', ')}:`, error);
        
        // Resolve with mock data in case of error
        batchItems.forEach(item => {
          const mockData = MockDataHelper.generateMockDataPoint(item.symbol);
          item.resolve(mockData);
        });
      }
    }
  } catch (error) {
    console.error("Unexpected error in processBatch:", error);
    
    // Clear the batch queue and timeout in case of error
    batchQueue = [];
    if (batchTimeout) {
      clearTimeout(batchTimeout);
      batchTimeout = null;
    }
  }
}
