
import { supabase } from "@/integrations/supabase/client";
import { PortfolioService, PortfolioPosition } from "./PortfolioService";
import { MarketDataService } from "./market/MarketDataService";

export interface PortfolioMetrics {
  totalReturn: number;
  totalReturnPercentage: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  beta: number;
  alpha: number;
  valueAtRisk: number; // 95% VaR
  diversificationRatio: number;
  sectorAllocation: Record<string, number>;
  topHoldings: Array<{ symbol: string; percentage: number; value: number }>;
}

export interface PerformanceData {
  date: string;
  portfolioValue: number;
  marketValue: number; // S&P 500 benchmark
  dailyReturn: number;
  cumulativeReturn: number;
}

export interface RiskMetrics {
  portfolioVolatility: number;
  benchmarkVolatility: number;
  correlation: number;
  informationRatio: number;
  treynorRatio: number;
  sortino: number;
  calmarRatio: number;
}

export class AdvancedPortfolioAnalytics {
  static async calculatePortfolioMetrics(userId: string): Promise<PortfolioMetrics> {
    try {
      const positions = await PortfolioService.getPortfolio(userId);
      const performanceHistory = await this.getPerformanceHistory(userId, 252); // 1 year
      
      if (!positions.length) {
        return this.getEmptyMetrics();
      }

      const totalValue = positions.reduce((sum, pos) => sum + (pos.currentValue || 0), 0);
      const totalCost = positions.reduce((sum, pos) => sum + (pos.shares * pos.averagePrice), 0);
      
      const totalReturn = totalValue - totalCost;
      const totalReturnPercentage = (totalReturn / totalCost) * 100;

      // Calculate advanced metrics
      const annualizedReturn = this.calculateAnnualizedReturn(performanceHistory);
      const volatility = this.calculateVolatility(performanceHistory);
      const sharpeRatio = this.calculateSharpeRatio(annualizedReturn, volatility);
      const maxDrawdown = this.calculateMaxDrawdown(performanceHistory);
      const beta = await this.calculateBeta(performanceHistory);
      const alpha = this.calculateAlpha(annualizedReturn, beta);
      const valueAtRisk = this.calculateVaR(performanceHistory);
      const diversificationRatio = this.calculateDiversification(positions);

      const sectorAllocation = await this.calculateSectorAllocation(positions);
      const topHoldings = this.calculateTopHoldings(positions, totalValue);

      return {
        totalReturn,
        totalReturnPercentage,
        annualizedReturn,
        sharpeRatio,
        maxDrawdown,
        volatility,
        beta,
        alpha,
        valueAtRisk,
        diversificationRatio,
        sectorAllocation,
        topHoldings
      };
    } catch (error) {
      console.error("Error calculating portfolio metrics:", error);
      return this.getEmptyMetrics();
    }
  }

  static async getRiskMetrics(userId: string): Promise<RiskMetrics> {
    try {
      const performanceHistory = await this.getPerformanceHistory(userId, 252);
      const benchmarkHistory = await this.getBenchmarkHistory(252); // S&P 500
      
      const portfolioVolatility = this.calculateVolatility(performanceHistory);
      const benchmarkVolatility = this.calculateVolatility(benchmarkHistory);
      const correlation = this.calculateCorrelation(performanceHistory, benchmarkHistory);
      
      const portfolioReturns = performanceHistory.map(p => p.dailyReturn);
      const benchmarkReturns = benchmarkHistory.map(b => b.dailyReturn);
      
      const informationRatio = this.calculateInformationRatio(portfolioReturns, benchmarkReturns);
      const treynorRatio = this.calculateTreynorRatio(performanceHistory);
      const sortino = this.calculateSortinoRatio(portfolioReturns);
      const calmarRatio = this.calculateCalmarRatio(performanceHistory);

      return {
        portfolioVolatility,
        benchmarkVolatility,
        correlation,
        informationRatio,
        treynorRatio,
        sortino,
        calmarRatio
      };
    } catch (error) {
      console.error("Error calculating risk metrics:", error);
      return {
        portfolioVolatility: 0,
        benchmarkVolatility: 0,
        correlation: 0,
        informationRatio: 0,
        treynorRatio: 0,
        sortino: 0,
        calmarRatio: 0
      };
    }
  }

  private static async getPerformanceHistory(userId: string, days: number): Promise<PerformanceData[]> {
    // In production, this would fetch historical portfolio values
    // For now, generate mock performance data
    const history: PerformanceData[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let portfolioValue = 10000; // Starting value
    let marketValue = 10000;

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Generate realistic returns with some correlation to market
      const marketReturn = (Math.random() - 0.5) * 0.04; // ±2% daily
      const portfolioReturn = marketReturn * 0.8 + (Math.random() - 0.5) * 0.02; // 80% correlation
      
      portfolioValue *= (1 + portfolioReturn);
      marketValue *= (1 + marketReturn);
      
      const cumulativeReturn = (portfolioValue - 10000) / 10000 * 100;

      history.push({
        date: date.toISOString().split('T')[0],
        portfolioValue,
        marketValue,
        dailyReturn: portfolioReturn * 100,
        cumulativeReturn
      });
    }

    return history;
  }

  private static async getBenchmarkHistory(days: number): Promise<PerformanceData[]> {
    // Mock S&P 500 data
    const history: PerformanceData[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let value = 4500; // SPY approximate value

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      const dailyReturn = (Math.random() - 0.5) * 0.03; // ±1.5% daily
      value *= (1 + dailyReturn);

      history.push({
        date: date.toISOString().split('T')[0],
        portfolioValue: value,
        marketValue: value,
        dailyReturn: dailyReturn * 100,
        cumulativeReturn: ((value - 4500) / 4500) * 100
      });
    }

    return history;
  }

  private static calculateAnnualizedReturn(performanceData: PerformanceData[]): number {
    if (performanceData.length < 2) return 0;
    
    const startValue = performanceData[0].portfolioValue;
    const endValue = performanceData[performanceData.length - 1].portfolioValue;
    const years = performanceData.length / 252; // Trading days per year
    
    return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
  }

  private static calculateVolatility(performanceData: PerformanceData[]): number {
    const returns = performanceData.map(p => p.dailyReturn / 100);
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance * 252) * 100; // Annualized volatility
  }

  private static calculateSharpeRatio(annualizedReturn: number, volatility: number, riskFreeRate: number = 2): number {
    return (annualizedReturn - riskFreeRate) / volatility;
  }

  private static calculateMaxDrawdown(performanceData: PerformanceData[]): number {
    let maxDrawdown = 0;
    let peak = performanceData[0]?.portfolioValue || 0;

    for (const data of performanceData) {
      if (data.portfolioValue > peak) {
        peak = data.portfolioValue;
      }
      const drawdown = (peak - data.portfolioValue) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown * 100;
  }

  private static async calculateBeta(performanceData: PerformanceData[]): Promise<number> {
    // Calculate beta vs S&P 500
    const benchmarkData = await this.getBenchmarkHistory(performanceData.length);
    
    if (performanceData.length !== benchmarkData.length) return 1;

    const portfolioReturns = performanceData.map(p => p.dailyReturn / 100);
    const marketReturns = benchmarkData.map(b => b.dailyReturn / 100);

    const covariance = this.calculateCovariance(portfolioReturns, marketReturns);
    const marketVariance = this.calculateVariance(marketReturns);

    return marketVariance !== 0 ? covariance / marketVariance : 1;
  }

  private static calculateAlpha(portfolioReturn: number, beta: number, marketReturn: number = 10, riskFreeRate: number = 2): number {
    return portfolioReturn - (riskFreeRate + beta * (marketReturn - riskFreeRate));
  }

  private static calculateVaR(performanceData: PerformanceData[], confidenceLevel: number = 0.95): number {
    const returns = performanceData.map(p => p.dailyReturn / 100).sort((a, b) => a - b);
    const index = Math.floor((1 - confidenceLevel) * returns.length);
    return Math.abs(returns[index] || 0) * 100;
  }

  private static calculateDiversification(positions: PortfolioPosition[]): number {
    if (positions.length <= 1) return 0;
    
    const totalValue = positions.reduce((sum, pos) => sum + (pos.currentValue || 0), 0);
    const weights = positions.map(pos => (pos.currentValue || 0) / totalValue);
    
    // Herfindahl-Hirschman Index for diversification
    const hhi = weights.reduce((sum, weight) => sum + weight * weight, 0);
    return (1 - hhi) * 100; // Higher is more diversified
  }

  private static async calculateSectorAllocation(positions: PortfolioPosition[]): Promise<Record<string, number>> {
    // Mock sector data - in production, fetch from company fundamentals
    const sectorMap: Record<string, string> = {
      'AAPL': 'Technology',
      'MSFT': 'Technology',
      'GOOGL': 'Technology',
      'AMZN': 'Consumer Discretionary',
      'NVDA': 'Technology',
      'META': 'Technology',
      'TSLA': 'Consumer Discretionary'
    };

    const totalValue = positions.reduce((sum, pos) => sum + (pos.currentValue || 0), 0);
    const sectorAllocation: Record<string, number> = {};

    positions.forEach(pos => {
      const sector = sectorMap[pos.symbol] || 'Other';
      const percentage = ((pos.currentValue || 0) / totalValue) * 100;
      sectorAllocation[sector] = (sectorAllocation[sector] || 0) + percentage;
    });

    return sectorAllocation;
  }

  private static calculateTopHoldings(positions: PortfolioPosition[], totalValue: number): Array<{ symbol: string; percentage: number; value: number }> {
    return positions
      .map(pos => ({
        symbol: pos.symbol,
        percentage: ((pos.currentValue || 0) / totalValue) * 100,
        value: pos.currentValue || 0
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 10);
  }

  private static calculateCovariance(x: number[], y: number[]): number {
    const meanX = x.reduce((sum, val) => sum + val, 0) / x.length;
    const meanY = y.reduce((sum, val) => sum + val, 0) / y.length;
    
    return x.reduce((sum, val, i) => sum + (val - meanX) * (y[i] - meanY), 0) / x.length;
  }

  private static calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private static calculateCorrelation(data1: PerformanceData[], data2: PerformanceData[]): number {
    const returns1 = data1.map(d => d.dailyReturn / 100);
    const returns2 = data2.map(d => d.dailyReturn / 100);
    
    const covariance = this.calculateCovariance(returns1, returns2);
    const std1 = Math.sqrt(this.calculateVariance(returns1));
    const std2 = Math.sqrt(this.calculateVariance(returns2));
    
    return std1 * std2 !== 0 ? covariance / (std1 * std2) : 0;
  }

  private static calculateInformationRatio(portfolioReturns: number[], benchmarkReturns: number[]): number {
    const excessReturns = portfolioReturns.map((r, i) => r - benchmarkReturns[i]);
    const meanExcess = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
    const trackingError = Math.sqrt(this.calculateVariance(excessReturns));
    
    return trackingError !== 0 ? meanExcess / trackingError : 0;
  }

  private static calculateTreynorRatio(performanceData: PerformanceData[], riskFreeRate: number = 2): number {
    const annualizedReturn = this.calculateAnnualizedReturn(performanceData);
    // Mock beta for calculation
    const beta = 1.2;
    
    return (annualizedReturn - riskFreeRate) / beta;
  }

  private static calculateSortinoRatio(returns: number[], targetReturn: number = 0): number {
    const excessReturns = returns.map(r => r - targetReturn);
    const meanExcess = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
    
    const downside = excessReturns.filter(r => r < 0);
    const downsideDeviation = Math.sqrt(downside.reduce((sum, r) => sum + r * r, 0) / downside.length);
    
    return downsideDeviation !== 0 ? meanExcess / downsideDeviation : 0;
  }

  private static calculateCalmarRatio(performanceData: PerformanceData[]): number {
    const annualizedReturn = this.calculateAnnualizedReturn(performanceData);
    const maxDrawdown = this.calculateMaxDrawdown(performanceData);
    
    return maxDrawdown !== 0 ? annualizedReturn / maxDrawdown : 0;
  }

  private static getEmptyMetrics(): PortfolioMetrics {
    return {
      totalReturn: 0,
      totalReturnPercentage: 0,
      annualizedReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      volatility: 0,
      beta: 1,
      alpha: 0,
      valueAtRisk: 0,
      diversificationRatio: 0,
      sectorAllocation: {},
      topHoldings: []
    };
  }
}
