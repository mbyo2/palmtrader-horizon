
import { supabase } from "@/integrations/supabase/client";

export interface Position {
  id: string;
  userId: string;
  symbol: string;
  shares: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedPL: number;
  percentChange: number;
  riskLevel: number;
  lastUpdated: Date;
}

export interface PositionSummary {
  totalValue: number;
  totalCost: number;
  totalPL: number;
  totalPLPercent: number;
  positions: Position[];
}

export class PositionService {
  static async getUserPositions(userId: string): Promise<Position[]> {
    try {
      const { data: portfolioData, error } = await supabase
        .from('portfolio')
        .select('*')
        .eq('user_id', userId)
        .gt('shares', 0);

      if (error) throw error;

      // Transform portfolio data to positions
      const positions: Position[] = portfolioData.map(item => {
        const currentPrice = item.average_price * (0.95 + Math.random() * 0.1); // Mock current price
        const marketValue = item.shares * currentPrice;
        const costBasis = item.shares * item.average_price;
        const unrealizedPL = marketValue - costBasis;
        const percentChange = (unrealizedPL / costBasis) * 100;

        return {
          id: item.id,
          userId: item.user_id,
          symbol: item.symbol,
          shares: Number(item.shares),
          averagePrice: Number(item.average_price),
          currentPrice: currentPrice,
          marketValue: marketValue,
          costBasis: costBasis,
          unrealizedPL: unrealizedPL,
          percentChange: percentChange,
          riskLevel: Math.floor(Math.random() * 10) + 1, // Mock risk level
          lastUpdated: new Date(item.updated_at)
        };
      });

      return positions;
    } catch (error) {
      console.error('Error fetching user positions:', error);
      throw error;
    }
  }

  static async getPositionSummary(userId: string): Promise<PositionSummary> {
    try {
      const positions = await this.getUserPositions(userId);
      
      const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);
      const totalCost = positions.reduce((sum, pos) => sum + pos.costBasis, 0);
      const totalPL = totalValue - totalCost;
      const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

      return {
        totalValue,
        totalCost,
        totalPL,
        totalPLPercent,
        positions
      };
    } catch (error) {
      console.error('Error getting position summary:', error);
      throw error;
    }
  }

  static async updatePosition(positionId: string, updates: Partial<Position>): Promise<void> {
    try {
      const { error } = await supabase
        .from('portfolio')
        .update({
          shares: updates.shares,
          average_price: updates.averagePrice,
          updated_at: new Date().toISOString()
        })
        .eq('id', positionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating position:', error);
      throw error;
    }
  }

  static async closePosition(positionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('portfolio')
        .delete()
        .eq('id', positionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error closing position:', error);
      throw error;
    }
  }

  static calculateRiskMetrics(positions: Position[]): {
    portfolioRisk: number;
    diversificationScore: number;
    concentrationRisk: number;
  } {
    if (positions.length === 0) {
      return {
        portfolioRisk: 0,
        diversificationScore: 0,
        concentrationRisk: 0
      };
    }

    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);
    
    // Calculate portfolio risk (weighted average of position risks)
    const portfolioRisk = positions.reduce((sum, pos) => {
      const weight = pos.marketValue / totalValue;
      return sum + (weight * pos.riskLevel);
    }, 0);

    // Calculate diversification score (based on number of positions and their distribution)
    const diversificationScore = Math.min(100, (positions.length / 20) * 100);

    // Calculate concentration risk (largest position as percentage of portfolio)
    const largestPosition = Math.max(...positions.map(pos => pos.marketValue));
    const concentrationRisk = (largestPosition / totalValue) * 100;

    return {
      portfolioRisk,
      diversificationScore,
      concentrationRisk
    };
  }

  static async rebalancePortfolio(userId: string, targetAllocations: Record<string, number>): Promise<void> {
    try {
      const positions = await this.getUserPositions(userId);
      const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);

      // Calculate required trades for rebalancing
      const rebalanceTrades = [];

      for (const [symbol, targetPercent] of Object.entries(targetAllocations)) {
        const currentPosition = positions.find(pos => pos.symbol === symbol);
        const targetValue = totalValue * (targetPercent / 100);
        
        if (currentPosition) {
          const difference = targetValue - currentPosition.marketValue;
          if (Math.abs(difference) > 100) { // Only rebalance if difference > $100
            rebalanceTrades.push({
              symbol,
              action: difference > 0 ? 'buy' : 'sell',
              amount: Math.abs(difference)
            });
          }
        } else if (targetValue > 100) {
          rebalanceTrades.push({
            symbol,
            action: 'buy',
            amount: targetValue
          });
        }
      }

      // Execute rebalancing trades (this would integrate with OrderExecutionEngine)
      console.log('Rebalance trades to execute:', rebalanceTrades);
      
    } catch (error) {
      console.error('Error rebalancing portfolio:', error);
      throw error;
    }
  }
}
