
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MarketNews {
  id: string;
  title: string;
  summary: string | null;
  source: string;
  url: string;
  image_url: string | null;
  published_at: string;
  symbols: string[] | null;
  sentiment: 'positive' | 'negative' | 'neutral' | null;
  created_at: string;
}

export interface AnalystRating {
  id: string;
  symbol: string;
  analyst_firm: string;
  rating: 'buy' | 'hold' | 'sell' | 'strong_buy' | 'strong_sell';
  previous_rating: 'buy' | 'hold' | 'sell' | 'strong_buy' | 'strong_sell' | null;
  price_target: number | null;
  previous_price_target: number | null;
  rating_date: string;
  created_at: string;
}

export interface CompanyResearch {
  fundamentals: any;
  ratings: AnalystRating[];
  news: MarketNews[];
  technicalIndicators: any;
}

export class MarketResearchService {
  // Get comprehensive research data for a symbol
  static async getCompanyResearch(symbol: string): Promise<CompanyResearch> {
    try {
      const [fundamentals, ratings, news, technicalIndicators] = await Promise.all([
        this.getCompanyFundamentals(symbol),
        this.getAnalystRatings(symbol),
        this.getMarketNews(symbol),
        this.getTechnicalIndicators(symbol)
      ]);

      return {
        fundamentals,
        ratings,
        news,
        technicalIndicators
      };
    } catch (error) {
      console.error("Error fetching company research:", error);
      throw error;
    }
  }

  // Get company fundamentals
  static async getCompanyFundamentals(symbol: string) {
    try {
      const { data, error } = await supabase
        .from("company_fundamentals")
        .select("*")
        .eq("symbol", symbol)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    } catch (error) {
      console.error("Error fetching fundamentals:", error);
      return null;
    }
  }

  // Get analyst ratings for a symbol
  static async getAnalystRatings(symbol: string): Promise<AnalystRating[]> {
    try {
      const { data, error } = await supabase
        .from("analyst_ratings")
        .select("*")
        .eq("symbol", symbol)
        .order("rating_date", { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []) as AnalystRating[];
    } catch (error) {
      console.error("Error fetching analyst ratings:", error);
      return [];
    }
  }

  // Get market news for a symbol
  static async getMarketNews(symbol?: string, limit: number = 20): Promise<MarketNews[]> {
    try {
      let query = supabase
        .from("market_news")
        .select("*")
        .order("published_at", { ascending: false })
        .limit(limit);

      if (symbol) {
        query = query.contains("symbols", [symbol]);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as MarketNews[];
    } catch (error) {
      console.error("Error fetching market news:", error);
      return [];
    }
  }

  // Get technical indicators
  static async getTechnicalIndicators(symbol: string) {
    try {
      const { data, error } = await supabase
        .from("technical_indicators")
        .select("*")
        .eq("symbol", symbol)
        .order("timestamp", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Group by indicator type and return latest values
      const indicators = data?.reduce((acc: any, indicator: any) => {
        if (!acc[indicator.indicator_type]) {
          acc[indicator.indicator_type] = indicator;
        }
        return acc;
      }, {});

      return indicators || {};
    } catch (error) {
      console.error("Error fetching technical indicators:", error);
      return {};
    }
  }

  // Submit analyst rating (admin only)
  static async submitAnalystRating(rating: Omit<AnalystRating, 'id' | 'created_at'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("analyst_ratings")
        .insert(rating);

      if (error) throw error;

      toast.success("Analyst rating submitted successfully");
      return true;
    } catch (error) {
      console.error("Error submitting analyst rating:", error);
      toast.error("Failed to submit analyst rating");
      return false;
    }
  }

  // Add market news (admin only)
  static async addMarketNews(news: Omit<MarketNews, 'id' | 'created_at'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("market_news")
        .insert(news);

      if (error) throw error;

      toast.success("Market news added successfully");
      return true;
    } catch (error) {
      console.error("Error adding market news:", error);
      toast.error("Failed to add market news");
      return false;
    }
  }

  // Get market sentiment analysis
  static async getMarketSentiment(symbol?: string): Promise<{
    positive: number;
    negative: number;
    neutral: number;
  }> {
    try {
      let query = supabase
        .from("market_news")
        .select("sentiment");

      if (symbol) {
        query = query.contains("symbols", [symbol]);
      }

      const { data, error } = await query;

      if (error) throw error;

      const sentiment = { positive: 0, negative: 0, neutral: 0 };
      
      data?.forEach((item: any) => {
        if (item.sentiment === 'positive') sentiment.positive++;
        else if (item.sentiment === 'negative') sentiment.negative++;
        else sentiment.neutral++;
      });

      return sentiment;
    } catch (error) {
      console.error("Error fetching market sentiment:", error);
      return { positive: 0, negative: 0, neutral: 0 };
    }
  }
}
