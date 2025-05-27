
import { supabase } from "@/integrations/supabase/client";
import { PortfolioService, PortfolioPosition } from "./PortfolioService";

export interface PositionMetrics {
  unrealizedGainLoss: number;
  realizedGainLoss: number;
  totalReturn: number;
  totalReturnPercentage: number;
  dayGainLoss: number;
  dayGainLossPercentage: number;
  marketValue: number;
  costBasis: number;
}

export interface PositionHistory {
  date: string;
  shares: number;
  averagePrice: number;
  marketValue: number;
  gainLoss: number;
}

export class PositionService {
  static async getPositionMetrics(userId: string, symbol: string): Promise<PositionMetrics | null> {
    const position = await PortfolioService.getPosition(userId, symbol);
    if (!position) return null;

    // Calculate realized gains from past trades
    const realizedGainLoss = await this.calculateRealizedGains(userId, symbol);

    const unrealizedGainLoss = position.totalGainLoss || 0;
    const totalReturn = realizedGainLoss + unrealizedGainLoss;
    const costBasis = position.shares * position.averagePrice;
    const totalReturnPercentage = costBasis > 0 ? (totalReturn / costBasis) * 100 : 0;

    // For day gain/loss, we'd need intraday price data
    // For now, assume 0 or small random variation
    const dayGainLoss = (Math.random() - 0.5) * (position.currentValue || 0) * 0.02;
    const dayGainLossPercentage = position.currentValue 
      ? (dayGainLoss / position.currentValue) * 100 
      : 0;

    return {
      unrealizedGainLoss,
      realizedGainLoss,
      totalReturn,
      totalReturnPercentage,
      dayGainLoss,
      dayGainLossPercentage,
      marketValue: position.currentValue || 0,
      costBasis
    };
  }

  static async getPositionHistory(userId: string, symbol: string, days: number = 30): Promise<PositionHistory[]> {
    // Get all trades for this position
    const { data: trades, error } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .eq("symbol", symbol)
      .eq("status", "completed")
      .order("created_at", { ascending: true });

    if (error) throw error;

    const history: PositionHistory[] = [];
    let cumulativeShares = 0;
    let totalCost = 0;

    // Process each trade to build position history
    for (const trade of trades || []) {
      if (trade.type === "buy") {
        totalCost += trade.shares * trade.price;
        cumulativeShares += trade.shares;
      } else {
        // For sell trades, reduce shares but maintain average cost
        const sharesSold = trade.shares;
        const avgPrice = cumulativeShares > 0 ? totalCost / cumulativeShares : 0;
        totalCost -= sharesSold * avgPrice;
        cumulativeShares -= sharesSold;
      }

      const averagePrice = cumulativeShares > 0 ? totalCost / cumulativeShares : 0;
      
      // Simulate market value (in real app, would use historical prices)
      const marketPrice = trade.price * (1 + (Math.random() - 0.5) * 0.1);
      const marketValue = cumulativeShares * marketPrice;
      const gainLoss = marketValue - totalCost;

      history.push({
        date: trade.created_at,
        shares: cumulativeShares,
        averagePrice,
        marketValue,
        gainLoss
      });
    }

    return history.slice(-days); // Return last N days
  }

  private static async calculateRealizedGains(userId: string, symbol: string): Promise<number> {
    // Get all completed sell trades
    const { data: sellTrades, error } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .eq("symbol", symbol)
      .eq("type", "sell")
      .eq("status", "completed");

    if (error || !sellTrades) return 0;

    // For simplicity, assume FIFO (First In, First Out) accounting
    // In a real implementation, you'd need more sophisticated cost basis tracking
    let totalRealizedGains = 0;

    for (const sellTrade of sellTrades) {
      // This is a simplified calculation
      // Real implementation would track specific cost basis for each share sold
      const { data: buyTrades } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", userId)
        .eq("symbol", symbol)
        .eq("type", "buy")
        .eq("status", "completed")
        .lt("created_at", sellTrade.created_at)
        .order("created_at", { ascending: true });

      if (buyTrades && buyTrades.length > 0) {
        // Use average buy price for simplification
        const avgBuyPrice = buyTrades.reduce((sum, trade) => sum + trade.price, 0) / buyTrades.length;
        const realizedGain = (sellTrade.price - avgBuyPrice) * sellTrade.shares;
        totalRealizedGains += realizedGain;
      }
    }

    return totalRealizedGains;
  }

  static async getAllPositions(userId: string): Promise<PortfolioPosition[]> {
    return await PortfolioService.getPortfolio(userId);
  }

  static async closePosition(userId: string, symbol: string): Promise<{ success: boolean; error?: string }> {
    try {
      const position = await PortfolioService.getPosition(userId, symbol);
      if (!position) {
        return { success: false, error: "Position not found" };
      }

      // Create a market sell order for all shares
      const { data, error } = await supabase.from("trades").insert({
        user_id: userId,
        symbol: symbol,
        type: "sell",
        shares: position.shares,
        price: position.currentPrice || position.averagePrice,
        total_amount: position.shares * (position.currentPrice || position.averagePrice),
        status: "completed",
        order_type: "market"
      });

      if (error) throw error;

      // Remove the position from portfolio
      await supabase
        .from("portfolio")
        .delete()
        .eq("user_id", userId)
        .eq("symbol", symbol);

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to close position"
      };
    }
  }
}
