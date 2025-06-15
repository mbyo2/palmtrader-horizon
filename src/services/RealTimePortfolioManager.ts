
import { supabase } from "@/integrations/supabase/client";
import { finnhubSocket } from "@/utils/finnhubSocket";

export interface PortfolioPosition {
  id: string;
  symbol: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  dayChange: number;
  dayChangePercent: number;
  lastUpdate: Date;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalUnrealizedPL: number;
  totalUnrealizedPLPercent: number;
  dayChange: number;
  dayChangePercent: number;
  positions: PortfolioPosition[];
  lastUpdate: Date;
}

export class RealTimePortfolioManager {
  private static instance: RealTimePortfolioManager;
  private positions: Map<string, PortfolioPosition> = new Map();
  private subscribers: Set<(summary: PortfolioSummary) => void> = new Set();
  private priceUpdateInterval: number | null = null;

  static getInstance(): RealTimePortfolioManager {
    if (!RealTimePortfolioManager.instance) {
      RealTimePortfolioManager.instance = new RealTimePortfolioManager();
    }
    return RealTimePortfolioManager.instance;
  }

  async initialize(userId: string): Promise<void> {
    await this.loadPositions(userId);
    this.subscribeToMarketData();
    this.startPeriodicUpdates();
  }

  private async loadPositions(userId: string): Promise<void> {
    try {
      const { data: portfolioData, error } = await supabase
        .from('portfolio')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      this.positions.clear();
      
      for (const position of portfolioData || []) {
        const currentPrice = await this.getCurrentPrice(position.symbol);
        const marketValue = position.shares * currentPrice;
        const costBasis = position.shares * position.average_price;
        const unrealizedPL = marketValue - costBasis;
        const unrealizedPLPercent = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;

        const portfolioPosition: PortfolioPosition = {
          id: position.id,
          symbol: position.symbol,
          quantity: position.shares,
          averageCost: position.average_price,
          currentPrice: currentPrice,
          marketValue: marketValue,
          unrealizedPL: unrealizedPL,
          unrealizedPLPercent: unrealizedPLPercent,
          dayChange: 0, // Will be calculated with price updates
          dayChangePercent: 0,
          lastUpdate: new Date()
        };

        this.positions.set(position.symbol, portfolioPosition);
      }

      this.notifySubscribers();
    } catch (error) {
      console.error('Error loading portfolio positions:', error);
    }
  }

  private subscribeToMarketData(): void {
    // Subscribe to real-time price updates for all positions
    this.positions.forEach((_, symbol) => {
      finnhubSocket.subscribe(symbol);
    });

    // Listen for price updates
    finnhubSocket.onMarketData((data) => {
      if (data && data.symbol && data.price && this.positions.has(data.symbol)) {
        this.updatePositionPrice(data.symbol, data.price);
      }
    });
  }

  private updatePositionPrice(symbol: string, newPrice: number): void {
    const position = this.positions.get(symbol);
    if (!position) return;

    const previousPrice = position.currentPrice;
    const marketValue = position.quantity * newPrice;
    const costBasis = position.quantity * position.averageCost;
    const unrealizedPL = marketValue - costBasis;
    const unrealizedPLPercent = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;
    const dayChange = (newPrice - previousPrice) * position.quantity;
    const dayChangePercent = previousPrice > 0 ? ((newPrice - previousPrice) / previousPrice) * 100 : 0;

    const updatedPosition: PortfolioPosition = {
      ...position,
      currentPrice: newPrice,
      marketValue: marketValue,
      unrealizedPL: unrealizedPL,
      unrealizedPLPercent: unrealizedPLPercent,
      dayChange: dayChange,
      dayChangePercent: dayChangePercent,
      lastUpdate: new Date()
    };

    this.positions.set(symbol, updatedPosition);
    this.notifySubscribers();
  }

  private async getCurrentPrice(symbol: string): Promise<number> {
    try {
      // Try to get latest market data from our database first
      const { data, error } = await supabase
        .from('market_data')
        .select('price')
        .eq('symbol', symbol)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        return Number(data.price);
      }

      // Fallback to API
      const response = await fetch(`/api/market-data/quote/${symbol}`);
      const apiData = await response.json();
      return apiData.price || 100; // Default price
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      return 100; // Default price
    }
  }

  private startPeriodicUpdates(): void {
    // Update positions every 30 seconds for any missed real-time updates
    this.priceUpdateInterval = window.setInterval(() => {
      this.refreshAllPrices();
    }, 30000);
  }

  private async refreshAllPrices(): Promise<void> {
    const symbols = Array.from(this.positions.keys());
    
    try {
      const pricePromises = symbols.map(async (symbol) => {
        const price = await this.getCurrentPrice(symbol);
        return { symbol, price };
      });

      const prices = await Promise.all(pricePromises);
      
      prices.forEach(({ symbol, price }) => {
        if (price > 0) {
          this.updatePositionPrice(symbol, price);
        }
      });
    } catch (error) {
      console.error('Error refreshing prices:', error);
    }
  }

  private notifySubscribers(): void {
    const summary = this.calculateSummary();
    this.subscribers.forEach(callback => callback(summary));
  }

  private calculateSummary(): PortfolioSummary {
    const positions = Array.from(this.positions.values());
    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);
    const totalCost = positions.reduce((sum, pos) => sum + (pos.quantity * pos.averageCost), 0);
    const totalUnrealizedPL = positions.reduce((sum, pos) => sum + pos.unrealizedPL, 0);
    const totalUnrealizedPLPercent = totalCost > 0 ? (totalUnrealizedPL / totalCost) * 100 : 0;
    const dayChange = positions.reduce((sum, pos) => sum + pos.dayChange, 0);
    const dayChangePercent = positions.length > 0 
      ? positions.reduce((sum, pos) => sum + pos.dayChangePercent, 0) / positions.length 
      : 0;

    return {
      totalValue,
      totalCost,
      totalUnrealizedPL,
      totalUnrealizedPLPercent,
      dayChange,
      dayChangePercent,
      positions,
      lastUpdate: new Date()
    };
  }

  subscribe(callback: (summary: PortfolioSummary) => void): () => void {
    this.subscribers.add(callback);
    
    // Send current state immediately
    const summary = this.calculateSummary();
    callback(summary);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  async addPosition(symbol: string, quantity: number, averagePrice: number): Promise<void> {
    const currentPrice = await this.getCurrentPrice(symbol);
    const marketValue = quantity * currentPrice;
    const costBasis = quantity * averagePrice;
    const unrealizedPL = marketValue - costBasis;
    const unrealizedPLPercent = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;

    const position: PortfolioPosition = {
      id: `${symbol}-${Date.now()}`,
      symbol,
      quantity,
      averageCost: averagePrice,
      currentPrice,
      marketValue,
      unrealizedPL,
      unrealizedPLPercent,
      dayChange: 0,
      dayChangePercent: 0,
      lastUpdate: new Date()
    };

    this.positions.set(symbol, position);
    finnhubSocket.subscribe(symbol);
    this.notifySubscribers();
  }

  removePosition(symbol: string): void {
    if (this.positions.has(symbol)) {
      this.positions.delete(symbol);
      finnhubSocket.unsubscribe(symbol);
      this.notifySubscribers();
    }
  }

  destroy(): void {
    // Cleanup
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = null;
    }

    this.positions.forEach((_, symbol) => {
      finnhubSocket.unsubscribe(symbol);
    });

    this.positions.clear();
    this.subscribers.clear();
  }
}
