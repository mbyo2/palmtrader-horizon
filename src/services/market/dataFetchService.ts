
import { supabase } from "@/integrations/supabase/client";
import { MarketData } from "./types";
import { generateMockHistoricalData, generateMockLatestPrice } from "@/services/market/mockDataHelper";

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
    
    // Convert to MarketData format and make sure timestamp is a string
    return data.map(item => ({
      ...item,
      timestamp: String(item.timestamp)
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
