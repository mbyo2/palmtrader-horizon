
import { supabase } from "@/integrations/supabase/client";
import { PortfolioService } from "./PortfolioService";
import { MarketDataService } from "./market/MarketDataService";

export interface RiskParameters {
  maxPositionSize: number; // Percentage of portfolio
  maxDailyLoss: number; // Percentage of portfolio
  stopLossPercentage: number; // Percentage below purchase price
  takeProfitPercentage: number; // Percentage above purchase price
  maxCorrelation: number; // Maximum correlation between positions
  maxSectorConcentration: number; // Maximum percentage in one sector
  volatilityThreshold: number; // Maximum position volatility
}

export interface PositionSizeRecommendation {
  recommendedShares: number;
  maxShares: number;
  reasonCode: string;
  riskScore: number; // 1-10 scale
  stopLossPrice?: number;
  takeProfitPrice?: number;
}

export interface RiskAlert {
  id: string;
  userId: string;
  symbol: string;
  alertType: "stop_loss" | "take_profit" | "volatility" | "concentration" | "correlation";
  severity: "low" | "medium" | "high";
  message: string;
  actionRequired: boolean;
  createdAt: string;
}

export class RiskManagementService {
  private static readonly DEFAULT_RISK_PARAMS: RiskParameters = {
    maxPositionSize: 10, // 10% of portfolio
    maxDailyLoss: 2, // 2% of portfolio
    stopLossPercentage: 8, // 8% stop loss
    takeProfitPercentage: 20, // 20% take profit
    maxCorrelation: 0.7, // 70% correlation
    maxSectorConcentration: 25, // 25% in one sector
    volatilityThreshold: 30 // 30% annualized volatility
  };

  static async calculatePositionSize(
    userId: string,
    symbol: string,
    currentPrice: number,
    riskParams?: Partial<RiskParameters>
  ): Promise<PositionSizeRecommendation> {
    try {
      const params = { ...this.DEFAULT_RISK_PARAMS, ...riskParams };
      const portfolioSummary = await PortfolioService.getPortfolioSummary(userId);
      const portfolioValue = portfolioSummary.totalValue || 10000; // Default for new users

      // Calculate maximum position value based on portfolio percentage
      const maxPositionValue = portfolioValue * (params.maxPositionSize / 100);
      const maxShares = Math.floor(maxPositionValue / currentPrice);

      // Check existing position concentration
      const existingPosition = await PortfolioService.getPosition(userId, symbol);
      const currentPositionValue = existingPosition?.currentValue || 0;
      const availablePositionValue = maxPositionValue - currentPositionValue;

      if (availablePositionValue <= 0) {
        return {
          recommendedShares: 0,
          maxShares: 0,
          reasonCode: "POSITION_LIMIT_REACHED",
          riskScore: 10,
          stopLossPrice: currentPrice * (1 - params.stopLossPercentage / 100),
          takeProfitPrice: currentPrice * (1 + params.takeProfitPercentage / 100)
        };
      }

      // Calculate volatility-adjusted position size
      const volatility = await this.getSymbolVolatility(symbol);
      const volatilityAdjustment = Math.min(1, params.volatilityThreshold / volatility);
      
      // Calculate correlation-adjusted position size
      const correlationAdjustment = await this.calculateCorrelationAdjustment(userId, symbol);
      
      // Apply Kelly Criterion for optimal position sizing
      const winRate = 0.55; // Assumed 55% win rate
      const avgWin = params.takeProfitPercentage / 100;
      const avgLoss = params.stopLossPercentage / 100;
      const kellyFraction = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;
      const kellyAdjustment = Math.max(0.1, Math.min(1, kellyFraction));

      // Final position size calculation
      const adjustmentFactor = volatilityAdjustment * correlationAdjustment * kellyAdjustment;
      const recommendedValue = availablePositionValue * adjustmentFactor;
      const recommendedShares = Math.floor(recommendedValue / currentPrice);

      // Calculate risk score
      const riskScore = this.calculateRiskScore(
        recommendedShares * currentPrice,
        portfolioValue,
        volatility,
        correlationAdjustment
      );

      return {
        recommendedShares: Math.max(0, recommendedShares),
        maxShares,
        reasonCode: this.getReasonCode(adjustmentFactor),
        riskScore,
        stopLossPrice: currentPrice * (1 - params.stopLossPercentage / 100),
        takeProfitPrice: currentPrice * (1 + params.takeProfitPercentage / 100)
      };
    } catch (error) {
      console.error("Error calculating position size:", error);
      return {
        recommendedShares: 0,
        maxShares: 0,
        reasonCode: "CALCULATION_ERROR",
        riskScore: 10
      };
    }
  }

  static async createAutomaticStopLoss(
    userId: string,
    symbol: string,
    shares: number,
    entryPrice: number,
    stopLossPercentage: number = 8
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      const stopPrice = entryPrice * (1 - stopLossPercentage / 100);

      const { data, error } = await supabase.from("trades").insert({
        user_id: userId,
        symbol: symbol,
        type: "sell",
        shares: shares,
        price: entryPrice,
        stop_price: stopPrice,
        order_type: "stop",
        status: "pending",
        total_amount: shares * stopPrice
      }).select("id").single();

      if (error) throw error;

      // Schedule monitoring
      this.scheduleStopLossMonitoring(data.id, symbol, stopPrice);

      return { success: true, orderId: data.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create stop loss"
      };
    }
  }

  static async monitorRiskAlerts(userId: string): Promise<RiskAlert[]> {
    try {
      const portfolio = await PortfolioService.getPortfolio(userId);
      const alerts: RiskAlert[] = [];

      for (const position of portfolio) {
        // Check for stop loss triggers
        const currentPrice = position.currentPrice || 0;
        const entryPrice = position.averagePrice;
        const lossPercentage = ((entryPrice - currentPrice) / entryPrice) * 100;

        if (lossPercentage > this.DEFAULT_RISK_PARAMS.stopLossPercentage) {
          alerts.push({
            id: `stop_loss_${position.symbol}`,
            userId,
            symbol: position.symbol,
            alertType: "stop_loss",
            severity: "high",
            message: `${position.symbol} has declined ${lossPercentage.toFixed(1)}% below your entry price`,
            actionRequired: true,
            createdAt: new Date().toISOString()
          });
        }

        // Check for high volatility
        const volatility = await this.getSymbolVolatility(position.symbol);
        if (volatility > this.DEFAULT_RISK_PARAMS.volatilityThreshold) {
          alerts.push({
            id: `volatility_${position.symbol}`,
            userId,
            symbol: position.symbol,
            alertType: "volatility",
            severity: "medium",
            message: `${position.symbol} has high volatility (${volatility.toFixed(1)}%)`,
            actionRequired: false,
            createdAt: new Date().toISOString()
          });
        }
      }

      // Check for concentration risk
      const portfolioValue = portfolio.reduce((sum, pos) => sum + (pos.currentValue || 0), 0);
      const concentrationAlerts = this.checkConcentrationRisk(portfolio, portfolioValue, userId);
      alerts.push(...concentrationAlerts);

      return alerts;
    } catch (error) {
      console.error("Error monitoring risk alerts:", error);
      return [];
    }
  }

  private static async getSymbolVolatility(symbol: string): Promise<number> {
    try {
      // Fetch historical data to calculate volatility
      const historicalData = await MarketDataService.fetchHistoricalData(symbol, 30);
      if (historicalData.length < 10) return 25; // Default volatility

      const returns = [];
      for (let i = 1; i < historicalData.length; i++) {
        const dailyReturn = (historicalData[i].price - historicalData[i-1].price) / historicalData[i-1].price;
        returns.push(dailyReturn);
      }

      const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
      const dailyVolatility = Math.sqrt(variance);
      
      // Annualize volatility
      return dailyVolatility * Math.sqrt(252) * 100;
    } catch (error) {
      console.error("Error calculating volatility:", error);
      return 25; // Default volatility
    }
  }

  private static async calculateCorrelationAdjustment(userId: string, symbol: string): Promise<number> {
    try {
      const portfolio = await PortfolioService.getPortfolio(userId);
      if (portfolio.length === 0) return 1.0;

      // Simplified correlation calculation
      // In production, this would calculate actual correlation between assets
      const techStocks = ['AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA'];
      const portfolioTechExposure = portfolio
        .filter(pos => techStocks.includes(pos.symbol))
        .reduce((sum, pos) => sum + (pos.currentValue || 0), 0);

      const totalValue = portfolio.reduce((sum, pos) => sum + (pos.currentValue || 0), 0);
      const techConcentration = portfolioTechExposure / totalValue;

      // If adding another tech stock and already have high tech exposure, reduce position size
      if (techStocks.includes(symbol) && techConcentration > 0.5) {
        return 0.5; // Reduce position size by 50%
      }

      return 1.0;
    } catch (error) {
      console.error("Error calculating correlation adjustment:", error);
      return 1.0;
    }
  }

  private static calculateRiskScore(
    positionValue: number,
    portfolioValue: number,
    volatility: number,
    correlationAdjustment: number
  ): number {
    const positionWeight = positionValue / portfolioValue;
    const weightScore = Math.min(10, positionWeight * 100); // 1% = 1 point
    const volatilityScore = Math.min(10, volatility / 3); // 30% vol = 10 points
    const correlationScore = (1 - correlationAdjustment) * 5; // Higher correlation = higher risk

    return Math.min(10, Math.max(1, weightScore + volatilityScore + correlationScore));
  }

  private static getReasonCode(adjustmentFactor: number): string {
    if (adjustmentFactor < 0.3) return "HIGH_RISK_REDUCTION";
    if (adjustmentFactor < 0.6) return "MODERATE_RISK_REDUCTION";
    if (adjustmentFactor < 0.9) return "MINOR_RISK_ADJUSTMENT";
    return "OPTIMAL_SIZING";
  }

  private static checkConcentrationRisk(
    portfolio: any[],
    portfolioValue: number,
    userId: string
  ): RiskAlert[] {
    const alerts: RiskAlert[] = [];

    // Check individual position concentration
    portfolio.forEach(position => {
      const concentration = ((position.currentValue || 0) / portfolioValue) * 100;
      if (concentration > this.DEFAULT_RISK_PARAMS.maxPositionSize) {
        alerts.push({
          id: `concentration_${position.symbol}`,
          userId,
          symbol: position.symbol,
          alertType: "concentration",
          severity: "high",
          message: `${position.symbol} represents ${concentration.toFixed(1)}% of your portfolio (limit: ${this.DEFAULT_RISK_PARAMS.maxPositionSize}%)`,
          actionRequired: true,
          createdAt: new Date().toISOString()
        });
      }
    });

    return alerts;
  }

  private static scheduleStopLossMonitoring(orderId: string, symbol: string, stopPrice: number): void {
    // In production, integrate with real-time monitoring system
    console.log(`Scheduled stop loss monitoring for ${symbol} at $${stopPrice} (Order: ${orderId})`);
  }

  static async getPortfolioRiskSummary(userId: string): Promise<{
    overallRiskScore: number;
    activeAlerts: number;
    diversificationScore: number;
    maxDrawdownRisk: number;
  }> {
    try {
      const alerts = await this.monitorRiskAlerts(userId);
      const portfolio = await PortfolioService.getPortfolio(userId);
      
      const activeAlerts = alerts.filter(alert => alert.severity === "high").length;
      const overallRiskScore = Math.min(10, activeAlerts * 2 + 3);
      
      const diversificationScore = portfolio.length > 10 ? 8 : Math.max(1, portfolio.length * 0.8);
      const maxDrawdownRisk = 15; // Simplified calculation

      return {
        overallRiskScore,
        activeAlerts,
        diversificationScore,
        maxDrawdownRisk
      };
    } catch (error) {
      console.error("Error calculating portfolio risk summary:", error);
      return {
        overallRiskScore: 5,
        activeAlerts: 0,
        diversificationScore: 5,
        maxDrawdownRisk: 10
      };
    }
  }
}
