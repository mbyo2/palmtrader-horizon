import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useMultipleRealTimePrices } from './useRealTimePrice';

export interface RealTimePosition {
  id: string;
  symbol: string;
  shares: number;
  averagePrice: number;
  currentPrice: number;
  currentValue: number;
  totalGainLoss: number;
  gainLossPercentage: number;
  dayChange: number;
  dayChangePercent: number;
}

export interface RealTimePortfolioSummary {
  totalValue: number;
  totalInvested: number;
  totalGainLoss: number;
  gainLossPercentage: number;
  dayChange: number;
  dayChangePercent: number;
  positionsCount: number;
}

export const useRealTimePortfolio = () => {
  const { user } = useAuth();
  const [positions, setPositions] = useState<Array<{
    id: string;
    symbol: string;
    shares: number;
    average_price: number;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get all symbols from positions
  const symbols = useMemo(() => positions.map(p => p.symbol), [positions]);
  
  // Subscribe to real-time prices for all portfolio symbols
  const { prices, isLoading: pricesLoading } = useMultipleRealTimePrices(symbols);

  // Fetch portfolio positions from database
  const fetchPositions = useCallback(async () => {
    if (!user) {
      setPositions([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('portfolio')
        .select('id, symbol, shares, average_price')
        .eq('user_id', user.id);

      if (error) throw error;
      setPositions(data || []);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial fetch and real-time subscription
  useEffect(() => {
    fetchPositions();

    if (!user) return;

    // Subscribe to portfolio changes
    const channel = supabase
      .channel('portfolio-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'portfolio',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchPositions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchPositions]);

  // Calculate real-time positions with live prices
  const realTimePositions: RealTimePosition[] = useMemo(() => {
    return positions.map(position => {
      const priceData = prices.get(position.symbol);
      const currentPrice = priceData?.price ?? position.average_price;
      const currentValue = position.shares * currentPrice;
      const totalCost = position.shares * position.average_price;
      const totalGainLoss = currentValue - totalCost;
      const gainLossPercentage = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
      const dayChange = priceData?.change ?? 0;
      const dayChangePercent = priceData?.changePercent ?? 0;

      return {
        id: position.id,
        symbol: position.symbol,
        shares: position.shares,
        averagePrice: position.average_price,
        currentPrice,
        currentValue,
        totalGainLoss,
        gainLossPercentage,
        dayChange: dayChange * position.shares,
        dayChangePercent
      };
    });
  }, [positions, prices]);

  // Calculate portfolio summary
  const summary: RealTimePortfolioSummary = useMemo(() => {
    const totalValue = realTimePositions.reduce((sum, pos) => sum + pos.currentValue, 0);
    const totalInvested = realTimePositions.reduce((sum, pos) => sum + (pos.shares * pos.averagePrice), 0);
    const totalGainLoss = totalValue - totalInvested;
    const gainLossPercentage = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
    const dayChange = realTimePositions.reduce((sum, pos) => sum + pos.dayChange, 0);
    const dayChangePercent = totalValue > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0;

    return {
      totalValue,
      totalInvested,
      totalGainLoss,
      gainLossPercentage,
      dayChange,
      dayChangePercent,
      positionsCount: realTimePositions.length
    };
  }, [realTimePositions]);

  return {
    positions: realTimePositions,
    summary,
    isLoading: isLoading || pricesLoading,
    refresh: fetchPositions
  };
};
