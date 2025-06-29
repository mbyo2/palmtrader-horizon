
import { supabase } from "@/integrations/supabase/client";
import { MarketData } from "./types";

// Function to generate mock historical data for a symbol
function generateMockHistoricalData(symbol: string, days: number): MarketData[] {
  console.log(`Generating mock historical data for ${symbol}`);
  const data: MarketData[] = [];
  const endDate = new Date();
  let currentDate = new Date();
  currentDate.setDate(currentDate.getDate() - days);
  
  // Generate a random starting price between $10 and $500
  let price = Math.random() * 490 + 10;
  
  while (currentDate <= endDate) {
    // Generate random price movement (-5% to +5%)
    const priceChange = price * (Math.random() * 0.1 - 0.05);
    price += priceChange;
    price = Math.max(1, price); // Ensure price doesn't go below $1
    
    const open = price - (Math.random() * 2);
    const close = price + (Math.random() * 2);
    const high = Math.max(open, close) + (Math.random() * 3);
    const low = Math.min(open, close) - (Math.random() * 3);
    
    data.push({
      symbol,
      timestamp: currentDate.getTime(),
      price,
      open,
      high,
      low,
      close,
      change: priceChange,
      changePercent: (priceChange / price) * 100,
      volume: Math.floor(Math.random() * 1000000) + 100000,
      type: 'stock',
    });
    
    // Move to the next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return data;
}

// Function to generate mock latest price for a symbol
function generateMockLatestPrice(symbol: string): { symbol: string; price: number } {
  // Generate a price between $10 and $500
  const price = Math.round((Math.random() * 490 + 10) * 100) / 100;
  return { symbol, price };
}

export async function fetchHistoricalData(symbol: string, days: number): Promise<MarketData[]> {
  console.log(`Fetching historical data for ${symbol} for last ${days} days`);
  
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabase
      .from("market_data")
      .select("*")
      .eq("symbol", symbol)
      .gte("timestamp", startDate.getTime())
      .lte("timestamp", endDate.getTime())
      .order("timestamp", { ascending: true });
    
    if (error) {
      console.error("Error fetching historical data:", error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log(`No data found for ${symbol}, generating mock data`);
      return generateMockHistoricalData(symbol, days);
    }
    
    console.log(`Fetched ${data.length} historical data points for ${symbol}`);
    
    // Convert to MarketData format and ensure all required properties exist
    return data.map(item => ({
      symbol: item.symbol,
      timestamp: item.timestamp,
      price: item.price,
      open: item.open || item.price,
      high: item.high || item.price,
      low: item.low || item.price,
      close: item.close || item.price,
      change: 0, // Calculate or set default
      changePercent: 0, // Calculate or set default
      volume: 0, // Set default or use actual volume if available
      type: item.type || 'stock'
    })) as MarketData[];
  } catch (error) {
    console.error("Error in fetchHistoricalData:", error);
    return generateMockHistoricalData(symbol, days);
  }
}

export async function fetchLatestPrice(symbol: string): Promise<{ symbol: string; price: number }> {
  console.log(`Fetching latest price for ${symbol}`);
  
  // Mock data for demonstration
  return generateMockLatestPrice(symbol);
}

export async function fetchMultipleLatestPrices(symbols: string[]): Promise<{ symbol: string; price: number }[]> {
  console.log(`Fetching latest prices for multiple symbols: ${symbols.join(', ')}`);
  
  // Mock data for demonstration
  return symbols.map(symbol => generateMockLatestPrice(symbol));
}
