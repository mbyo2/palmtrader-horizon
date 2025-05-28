
import { supabase } from "@/integrations/supabase/client";
import { PortfolioService, PortfolioPosition } from "./PortfolioService";
import { RealMarketDataService } from "./RealMarketDataService";

export interface PositionMetrics {
  unrealizedGainLoss: number;
  realizedGainLoss: number;
  totalReturn: number;
  totalReturnPercentage: number;
  dayGainLoss: number;
  dayGainLossPercentage: number;
  marketValue: number;
  costBasis: number;
  averageCost: number;
  currentPrice: number;
  beta: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

export interface PositionHistory {
  date: string;
  shares: number;
  averagePrice: number;
  marketValue: number;
  gainLoss: number;
  dailyReturn: number;
  cumulativeReturn: number;
}

export interface PortfolioRebalanceRecommendation {
  symbol: string;
  currentWeight: number;
  targetWeight: number;
  recommendedAction: "buy" | "sell" | "hold";
  sharesToTrade: number;
  reasoning: string;
}

export interface RiskMetrics {
  portfolioValue: number;
  portfolioBeta: number;
  portfolioVolatility: number;
  valueAtRisk: number;
  sharpeRatio: number;
  maxDrawdown: number;
  concentrationRisk: number;
}

export class PositionService {
  static async getPositionMetrics(userId: string, symbol: string): Promise<PositionMetrics | null> {
    const position = await PortfolioService.getPosition(userId, symbol);
    if (!position) return null;

    // Get current market price
    const currentPrice = await this.getCurrentPrice(symbol);
    
    // Calculate basic metrics
    const costBasis = position.shares * position.averagePrice;
    const marketValue = position.shares * currentPrice;
    const unrealizedGainLoss = marketValue - costBasis;
    
    // Calculate realized gains from past trades
    const realizedGainLoss = await this.calculateRealizedGains(userId, symbol);
    
    const totalReturn = realizedGainLoss + unrealizedGainLoss;
    const totalReturnPercentage = costBasis > 0 ? (totalReturn / costBasis) * 100 : 0;

    // Calculate day gain/loss
    const { dayGainLoss, dayGainLossPercentage } = await this.calculateDayGainLoss(
      symbol, 
      position.shares, 
      currentPrice
    );

    // Calculate advanced metrics
    const beta = await this.calculateBeta(symbol);
    const sharpeRatio = await this.calculateSharpeRatio(symbol);
    const maxDrawdown = await this.calculateMaxDrawdown(userId, symbol);

    return {
      unrealizedGainLoss,
      realizedGainLoss,
      totalReturn,
      totalReturnPercentage,
      dayGainLoss,
      dayGainLossPercentage,
      marketValue,
      costBasis,
      averageCost: position.averagePrice,
      currentPrice,
      beta,
      sharpeRatio,
      maxDrawdown
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

    // Get historical prices
    const historicalPrices = await RealMarketDataService.fetchHistoricalData(symbol, days);
    const priceMap = new Map(
      historicalPrices.map(p => [new Date(p.timestamp).toDateString(), p.close])
    );

    const history: PositionHistory[] = [];
    let cumulativeShares = 0;
    let totalCost = 0;
    let previousValue = 0;

    // Process each trade to build position history
    const tradesByDate = new Map<string, any[]>();
    trades?.forEach(trade => {
      const date = new Date(trade.created_at).toDateString();
      if (!tradesByDate.has(date)) {
        tradesByDate.set(date, []);
      }
      tradesByDate.get(date)!.push(trade);
    });

    // Generate history for each day
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateString = currentDate.toDateString();

      // Process trades for this date
      const dayTrades = tradesByDate.get(dateString) || [];
      for (const trade of dayTrades) {
        if (trade.type === "buy") {
          totalCost += trade.shares * trade.price;
          cumulativeShares += trade.shares;
        } else {
          const sharesSold = trade.shares;
          const avgPrice = cumulativeShares > 0 ? totalCost / cumulativeShares : 0;
          totalCost -= sharesSold * avgPrice;
          cumulativeShares -= sharesSold;
        }
      }

      if (cumulativeShares > 0) {
        const averagePrice = totalCost / cumulativeShares;
        const marketPrice = priceMap.get(dateString) || averagePrice;
        const marketValue = cumulativeShares * marketPrice;
        const gainLoss = marketValue - totalCost;
        const dailyReturn = previousValue > 0 ? (marketValue - previousValue) / previousValue : 0;
        const cumulativeReturn = totalCost > 0 ? gainLoss / totalCost : 0;

        history.push({
          date: currentDate.toISOString(),
          shares: cumulativeShares,
          averagePrice,
          marketValue,
          gainLoss,
          dailyReturn,
          cumulativeReturn
        });

        previousValue = marketValue;
      }
    }

    return history;
  }

  static async calculatePortfolioRisk(userId: string): Promise<RiskMetrics> {
    const portfolio = await PortfolioService.getPortfolio(userId);
    const portfolioValue = portfolio.reduce((sum, pos) => sum + (pos.currentValue || 0), 0);

    if (portfolioValue === 0) {
      return {
        portfolioValue: 0,
        portfolioBeta: 0,
        portfolioVolatility: 0,
        valueAtRisk: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        concentrationRisk: 0
      };
    }

    // Calculate portfolio beta (weighted average of individual betas)
    let portfolioBeta = 0;
    for (const position of portfolio) {
      const weight = (position.currentValue || 0) / portfolioValue;
      const beta = await this.calculateBeta(position.symbol);
      portfolioBeta += weight * beta;
    }

    // Calculate portfolio volatility
    const portfolioVolatility = await this.calculatePortfolioVolatility(portfolio);

    // Calculate Value at Risk (95% confidence level)
    const valueAtRisk = portfolioValue * portfolioVolatility * 1.645; // 95% VaR

    // Calculate portfolio Sharpe ratio
    const portfolioSharpeRatio = await this.calculatePortfolioSharpeRatio(portfolio);

    // Calculate max drawdown
    const maxDrawdown = await this.calculatePortfolioMaxDrawdown(userId);

    // Calculate concentration risk (Herfindahl index)
    const concentrationRisk = portfolio.reduce((sum, pos) => {
      const weight = (pos.currentValue || 0) / portfolioValue;
      return sum + (weight * weight);
    }, 0);

    return {
      portfolioValue,
      portfolioBeta,
      portfolioVolatility,
      valueAtRisk,
      sharpeRatio: portfolioSharpeRatio,
      maxDrawdown,
      concentrationRisk
    };
  }

  static async generateRebalanceRecommendations(
    userId: string, 
    targetAllocation: Record<string, number>
  ): Promise<PortfolioRebalanceRecommendation[]> {
    const portfolio = await PortfolioService.getPortfolio(userId);
    const totalValue = portfolio.reduce((sum, pos) => sum + (pos.currentValue || 0), 0);

    const recommendations: PortfolioRebalanceRecommendation[] = [];

    // Calculate current weights
    const currentWeights: Record<string, number> = {};
    portfolio.forEach(position => {
      currentWeights[position.symbol] = (position.currentValue || 0) / totalValue;
    });

    // Generate recommendations for each target position
    for (const [symbol, targetWeight] of Object.entries(targetAllocation)) {
      const currentWeight = currentWeights[symbol] || 0;
      const weightDifference = targetWeight - currentWeight;
      const dollarDifference = weightDifference * totalValue;

      let recommendedAction: "buy" | "sell" | "hold" = "hold";
      let sharesToTrade = 0;
      let reasoning = "";

      if (Math.abs(weightDifference) > 0.05) { // 5% threshold
        const currentPrice = await this.getCurrentPrice(symbol);
        sharesToTrade = Math.abs(dollarDifference) / currentPrice;

        if (weightDifference > 0) {
          recommendedAction = "buy";
          reasoning = `Underweight by ${(weightDifference * 100).toFixed(1)}%. Consider buying ${sharesToTrade.toFixed(0)} shares.`;
        } else {
          recommendedAction = "sell";
          reasoning = `Overweight by ${(Math.abs(weightDifference) * 100).toFixed(1)}%. Consider selling ${sharesToTrade.toFixed(0)} shares.`;
        }
      } else {
        reasoning = "Position is within target range.";
      }

      recommendations.push({
        symbol,
        currentWeight,
        targetWeight,
        recommendedAction,
        sharesToTrade,
        reasoning
      });
    }

    return recommendations;
  }

  private static async calculateRealizedGains(userId: string, symbol: string): Promise<number> {
    // Get all completed sell trades
    const { data: sellTrades, error } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .eq("symbol", symbol)
      .eq("type", "sell")
      .eq("status", "completed")
      .order("created_at", { ascending: true });

    if (error || !sellTrades) return 0;

    // Get all buy trades to calculate cost basis
    const { data: buyTrades } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .eq("symbol", symbol)
      .eq("type", "buy")
      .eq("status", "completed")
      .order("created_at", { ascending: true });

    if (!buyTrades) return 0;

    // FIFO (First In, First Out) accounting
    let totalRealizedGains = 0;
    let remainingBuyTrades = [...buyTrades];

    for (const sellTrade of sellTrades) {
      let sharesToSell = sellTrade.shares;
      let sellPrice = sellTrade.price;

      while (sharesToSell > 0 && remainingBuyTrades.length > 0) {
        const oldestBuy = remainingBuyTrades[0];
        const sharesToUse = Math.min(sharesToSell, oldestBuy.shares);
        
        const gainOnThisLot = (sellPrice - oldestBuy.price) * sharesToUse;
        totalRealizedGains += gainOnThisLot;

        sharesToSell -= sharesToUse;
        oldestBuy.shares -= sharesToUse;

        if (oldestBuy.shares <= 0) {
          remainingBuyTrades.shift();
        }
      }
    }

    return totalRealizedGains;
  }

  private static async calculateDayGainLoss(
    symbol: string, 
    shares: number, 
    currentPrice: number
  ): Promise<{ dayGainLoss: number; dayGainLossPercentage: number }> {
    try {
      // Get yesterday's closing price
      const historicalData = await RealMarketDataService.fetchHistoricalData(symbol, 2);
      if (historicalData.length < 2) {
        return { dayGainLoss: 0, dayGainLossPercentage: 0 };
      }

      const yesterdayClose = historicalData[historicalData.length - 2].close;
      const priceChange = currentPrice - yesterdayClose;
      const dayGainLoss = priceChange * shares;
      const dayGainLossPercentage = (priceChange / yesterdayClose) * 100;

      return { dayGainLoss, dayGainLossPercentage };
    } catch (error) {
      console.error('Error calculating day gain/loss:', error);
      return { dayGainLoss: 0, dayGainLossPercentage: 0 };
    }
  }

  private static async calculateBeta(symbol: string): Promise<number> {
    try {
      // Simplified beta calculation using correlation with market (SPY)
      const stockData = await RealMarketDataService.fetchHistoricalData(symbol, 252); // 1 year
      const marketData = await RealMarketDataService.fetchHistoricalData("SPY", 252);

      if (stockData.length < 50 || marketData.length < 50) {
        return 1.0; // Default beta
      }

      // Calculate returns
      const stockReturns = this.calculateReturns(stockData.map(d => d.close));
      const marketReturns = this.calculateReturns(marketData.map(d => d.close));

      // Calculate beta using covariance and variance
      const covariance = this.calculateCovariance(stockReturns, marketReturns);
      const marketVariance = this.calculateVariance(marketReturns);

      return marketVariance > 0 ? covariance / marketVariance : 1.0;
    } catch (error) {
      console.error('Error calculating beta:', error);
      return 1.0;
    }
  }

  private static async calculateSharpeRatio(symbol: string): Promise<number> {
    try {
      const historicalData = await RealMarketDataService.fetchHistoricalData(symbol, 252);
      if (historicalData.length < 50) return 0;

      const returns = this.calculateReturns(historicalData.map(d => d.close));
      const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const volatility = Math.sqrt(this.calculateVariance(returns));
      
      const riskFreeRate = 0.02 / 252; // Assume 2% annual risk-free rate
      
      return volatility > 0 ? (avgReturn - riskFreeRate) / volatility : 0;
    } catch (error) {
      console.error('Error calculating Sharpe ratio:', error);
      return 0;
    }
  }

  private static async calculateMaxDrawdown(userId: string, symbol: string): Promise<number> {
    const history = await this.getPositionHistory(userId, symbol, 252);
    if (history.length < 2) return 0;

    let maxDrawdown = 0;
    let peak = history[0].marketValue;

    for (const point of history) {
      if (point.marketValue > peak) {
        peak = point.marketValue;
      }
      
      const drawdown = (peak - point.marketValue) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  private static async getCurrentPrice(symbol: string): Promise<number> {
    try {
      const priceData = await RealMarketDataService.fetchRealTimePrice(symbol);
      return priceData?.price || 100; // Fallback price
    } catch (error) {
      console.error('Error getting current price:', error);
      return 100;
    }
  }

  private static calculateReturns(prices: number[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    return returns;
  }

  private static calculateCovariance(x: number[], y: number[]): number {
    const minLength = Math.min(x.length, y.length);
    const xMean = x.slice(0, minLength).reduce((sum, val) => sum + val, 0) / minLength;
    const yMean = y.slice(0, minLength).reduce((sum, val) => sum + val, 0) / minLength;

    let covariance = 0;
    for (let i = 0; i < minLength; i++) {
      covariance += (x[i] - xMean) * (y[i] - yMean);
    }

    return covariance / (minLength - 1);
  }

  private static calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
    return variance;
  }

  private static async calculatePortfolioVolatility(portfolio: PortfolioPosition[]): Promise<number> {
    // Simplified portfolio volatility calculation
    // In production, would use full covariance matrix
    let portfolioVolatility = 0;
    const totalValue = portfolio.reduce((sum, pos) => sum + (pos.currentValue || 0), 0);

    for (const position of portfolio) {
      const weight = (position.currentValue || 0) / totalValue;
      const stockVolatility = await this.calculateStockVolatility(position.symbol);
      portfolioVolatility += weight * weight * stockVolatility * stockVolatility;
    }

    return Math.sqrt(portfolioVolatility);
  }

  private static async calculateStockVolatility(symbol: string): Promise<number> {
    try {
      const historicalData = await RealMarketDataService.fetchHistoricalData(symbol, 30);
      if (historicalData.length < 10) return 0.2; // Default 20% volatility

      const returns = this.calculateReturns(historicalData.map(d => d.close));
      return Math.sqrt(this.calculateVariance(returns)) * Math.sqrt(252); // Annualized
    } catch (error) {
      console.error('Error calculating stock volatility:', error);
      return 0.2;
    }
  }

  private static async calculatePortfolioSharpeRatio(portfolio: PortfolioPosition[]): Promise<number> {
    const totalValue = portfolio.reduce((sum, pos) => sum + (pos.currentValue || 0), 0);
    let weightedSharpeRatio = 0;

    for (const position of portfolio) {
      const weight = (position.currentValue || 0) / totalValue;
      const sharpeRatio = await this.calculateSharpeRatio(position.symbol);
      weightedSharpeRatio += weight * sharpeRatio;
    }

    return weightedSharpeRatio;
  }

  private static async calculatePortfolioMaxDrawdown(userId: string): Promise<number> {
    // Get all portfolio value history
    const { data: trades } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("created_at", { ascending: true });

    if (!trades || trades.length < 2) return 0;

    // This is a simplified calculation
    // In production, would calculate daily portfolio values
    return 0.1; // Placeholder 10% max drawdown
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

      const currentPrice = await this.getCurrentPrice(symbol);

      // Create a market sell order for all shares
      const { data, error } = await supabase.from("trades").insert({
        user_id: userId,
        symbol: symbol,
        type: "sell",
        shares: position.shares,
        price: currentPrice,
        total_amount: position.shares * currentPrice,
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
