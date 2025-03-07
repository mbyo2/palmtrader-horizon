
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TechnicalIndicator {
  id?: string;
  symbol: string;
  name: string;
  value: number;
  signal: "buy" | "sell" | "hold" | "neutral";
  timeframe: string;
  timestamp: string;
}

export const TechnicalIndicatorService = {
  // Fetch technical indicators for a symbol
  async getIndicators(symbol: string): Promise<TechnicalIndicator[]> {
    try {
      const { data, error } = await supabase
        .from("technical_indicators")
        .select("*")
        .eq("symbol", symbol)
        .order("timestamp", { ascending: false });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        // Return mock data if no indicators exist
        return this.getMockIndicators(symbol);
      }
      
      return data as TechnicalIndicator[];
    } catch (error) {
      console.error("Error fetching technical indicators:", error);
      return this.getMockIndicators(symbol);
    }
  },
  
  // Create a new indicator
  async createIndicator(indicator: TechnicalIndicator): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("technical_indicators")
        .insert([
          { 
            ...indicator,
            timestamp: new Date().toISOString()
          }
        ]);
        
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error("Error creating indicator:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Generate mock indicators for demo purposes
  getMockIndicators(symbol: string): TechnicalIndicator[] {
    const now = new Date();
    
    return [
      {
        symbol,
        name: "RSI",
        value: Math.random() * 40 + 30, // Between 30-70
        signal: Math.random() > 0.7 ? "buy" : Math.random() > 0.5 ? "sell" : "neutral",
        timeframe: "1d",
        timestamp: now.toISOString()
      },
      {
        symbol,
        name: "MACD",
        value: Math.random() * 2 - 1, // Between -1 and 1
        signal: Math.random() > 0.6 ? "buy" : Math.random() > 0.4 ? "sell" : "neutral",
        timeframe: "1d",
        timestamp: now.toISOString()
      },
      {
        symbol,
        name: "Bollinger Bands",
        value: Math.random() * 0.5 + 0.75, // Width between 0.75 and 1.25
        signal: Math.random() > 0.5 ? "buy" : "sell",
        timeframe: "1d",
        timestamp: now.toISOString()
      },
      {
        symbol,
        name: "Moving Average (50)",
        value: Math.random() * 30 + 130, // Mock price around 130-160
        signal: Math.random() > 0.5 ? "buy" : "sell",
        timeframe: "1d",
        timestamp: now.toISOString()
      },
      {
        symbol,
        name: "Stochastic Oscillator",
        value: Math.random() * 60 + 20, // Between 20-80
        signal: Math.random() > 0.7 ? "buy" : Math.random() > 0.3 ? "sell" : "hold",
        timeframe: "1d",
        timestamp: now.toISOString()
      }
    ];
  }
};
