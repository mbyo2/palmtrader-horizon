
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
      
      // Map database fields to our TechnicalIndicator interface
      const indicators: TechnicalIndicator[] = data.map(item => ({
        id: item.id,
        symbol: item.symbol,
        name: item.indicator_type,
        value: item.value,
        signal: this.calculateSignal(item.indicator_type, item.value), // Calculate signal based on indicator type and value
        timeframe: item.period ? `${item.period}d` : "1d",
        timestamp: item.timestamp
      }));
      
      return indicators;
    } catch (error) {
      console.error("Error fetching technical indicators:", error);
      return this.getMockIndicators(symbol);
    }
  },
  
  // Create a new indicator
  async createIndicator(indicator: TechnicalIndicator): Promise<{ success: boolean; error?: string }> {
    try {
      // Map our TechnicalIndicator interface to the database schema
      const dbIndicator = {
        symbol: indicator.symbol,
        indicator_type: indicator.name,
        value: indicator.value,
        period: parseInt(indicator.timeframe.replace('d', '')),
        timestamp: indicator.timestamp || new Date().toISOString()
      };
      
      const { error } = await supabase
        .from("technical_indicators")
        .insert([dbIndicator]);
        
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error("Error creating indicator:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Calculate trading signal based on indicator type and value
  calculateSignal(indicatorType: string, value: number): "buy" | "sell" | "hold" | "neutral" {
    switch (indicatorType.toUpperCase()) {
      case "RSI":
        if (value < 30) return "buy";
        if (value > 70) return "sell";
        return "neutral";
        
      case "MACD":
        if (value > 0.5) return "buy";
        if (value < -0.5) return "sell";
        return "neutral";
        
      case "BOLLINGER BANDS":
        if (value < 0.8) return "buy";
        if (value > 1.2) return "sell";
        return "neutral";
        
      case "MOVING AVERAGE":
      case "MOVING AVERAGE (50)":
      case "MOVING AVERAGE (200)":
        // This is a simple approximation - would need current price for proper signal
        if (value > 0) return "buy";
        if (value < 0) return "sell";
        return "neutral";
        
      case "STOCHASTIC OSCILLATOR":
        if (value < 20) return "buy";
        if (value > 80) return "sell";
        return "neutral";
        
      default:
        return "neutral";
    }
  },
  
  // Generate mock indicators for demo purposes
  getMockIndicators(symbol: string): TechnicalIndicator[] {
    const now = new Date();
    
    const mockIndicators = [
      {
        symbol,
        name: "RSI",
        value: Math.random() * 40 + 30, // Between 30-70
        signal: "neutral", // Will be calculated
        timeframe: "1d",
        timestamp: now.toISOString()
      },
      {
        symbol,
        name: "MACD",
        value: Math.random() * 2 - 1, // Between -1 and 1
        signal: "neutral", // Will be calculated
        timeframe: "1d",
        timestamp: now.toISOString()
      },
      {
        symbol,
        name: "Bollinger Bands",
        value: Math.random() * 0.5 + 0.75, // Width between 0.75 and 1.25
        signal: "neutral", // Will be calculated
        timeframe: "1d",
        timestamp: now.toISOString()
      },
      {
        symbol,
        name: "Moving Average (50)",
        value: Math.random() * 30 + 130, // Mock price around 130-160
        signal: "neutral", // Will be calculated
        timeframe: "1d",
        timestamp: now.toISOString()
      },
      {
        symbol,
        name: "Stochastic Oscillator",
        value: Math.random() * 60 + 20, // Between 20-80
        signal: "neutral", // Will be calculated
        timeframe: "1d",
        timestamp: now.toISOString()
      }
    ];
    
    // Calculate signals based on values
    return mockIndicators.map(indicator => ({
      ...indicator,
      signal: this.calculateSignal(indicator.name, indicator.value)
    }));
  }
};
