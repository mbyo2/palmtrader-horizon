
import { supabase } from "@/integrations/supabase/client";
import { MarketDataService } from "./MarketDataService";

export interface PortfolioPosition {
  id: string;
  symbol: string;
  shares: number;
  averagePrice: number;
  currentPrice?: number;
  currentValue?: number;
  totalGainLoss?: number;
  gainLossPercentage?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalGainLoss: number;
  gainLossPercentage: number;
  totalInvested: number;
  positionsCount: number;
}

export class PortfolioService {
  static async getPortfolio(userId: string): Promise<PortfolioPosition[]> {
    const { data, error } = await supabase
      .from("portfolio")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    // Enrich with current market data
    const enrichedPositions = await Promise.all(
      (data || []).map(async (position) => {
        try {
          const marketData = await MarketDataService.fetchLatestPrice(position.symbol);
          const currentPrice = marketData?.price || position.average_price;
          const currentValue = position.shares * currentPrice;
          const totalCost = position.shares * position.average_price;
          const totalGainLoss = currentValue - totalCost;
          const gainLossPercentage = (totalGainLoss / totalCost) * 100;

          return {
            id: position.id,
            symbol: position.symbol,
            shares: position.shares,
            averagePrice: position.average_price,
            currentPrice,
            currentValue,
            totalGainLoss,
            gainLossPercentage,
            createdAt: position.created_at,
            updatedAt: position.updated_at
          };
        } catch (error) {
          console.error(`Error fetching market data for ${position.symbol}:`, error);
          const currentValue = position.shares * position.average_price;
          return {
            id: position.id,
            symbol: position.symbol,
            shares: position.shares,
            averagePrice: position.average_price,
            currentPrice: position.average_price,
            currentValue,
            totalGainLoss: 0,
            gainLossPercentage: 0,
            createdAt: position.created_at,
            updatedAt: position.updated_at
          };
        }
      })
    );

    return enrichedPositions;
  }

  static async getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
    const positions = await this.getPortfolio(userId);

    const totalValue = positions.reduce((sum, pos) => sum + (pos.currentValue || 0), 0);
    const totalInvested = positions.reduce((sum, pos) => sum + (pos.shares * pos.averagePrice), 0);
    const totalGainLoss = totalValue - totalInvested;
    const gainLossPercentage = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

    return {
      totalValue,
      totalGainLoss,
      gainLossPercentage,
      totalInvested,
      positionsCount: positions.length
    };
  }

  static async getPosition(userId: string, symbol: string): Promise<PortfolioPosition | null> {
    const { data, error } = await supabase
      .from("portfolio")
      .select("*")
      .eq("user_id", userId)
      .eq("symbol", symbol)
      .single();

    if (error || !data) return null;

    try {
      const marketData = await MarketDataService.fetchLatestPrice(symbol);
      const currentPrice = marketData?.price || data.average_price;
      const currentValue = data.shares * currentPrice;
      const totalCost = data.shares * data.average_price;
      const totalGainLoss = currentValue - totalCost;
      const gainLossPercentage = (totalGainLoss / totalCost) * 100;

      return {
        id: data.id,
        symbol: data.symbol,
        shares: data.shares,
        averagePrice: data.average_price,
        currentPrice,
        currentValue,
        totalGainLoss,
        gainLossPercentage,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error(`Error fetching market data for ${symbol}:`, error);
      const currentValue = data.shares * data.average_price;
      return {
        id: data.id,
        symbol: data.symbol,
        shares: data.shares,
        averagePrice: data.average_price,
        currentPrice: data.average_price,
        currentValue,
        totalGainLoss: 0,
        gainLossPercentage: 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    }
  }

  static async refreshPortfolio(userId: string): Promise<void> {
    // This could trigger a background refresh of all portfolio positions
    // For now, we'll just update the updated_at timestamp
    await supabase
      .from("portfolio")
      .update({ updated_at: new Date().toISOString() })
      .eq("user_id", userId);
  }
}
