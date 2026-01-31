import { supabase } from "@/integrations/supabase/client";

export interface FuturesPosition {
  id: string;
  user_id: string;
  symbol: string;
  side: 'long' | 'short';
  entry_price: number;
  quantity: number;
  leverage: number;
  margin: number;
  liquidation_price?: number;
  take_profit?: number;
  stop_loss?: number;
  unrealized_pnl: number;
  realized_pnl: number;
  status: 'open' | 'closed' | 'liquidated';
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OpenPositionRequest {
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  leverage: number;
  entryPrice: number;
  takeProfit?: number;
  stopLoss?: number;
}

export class FuturesService {
  static readonly MAX_LEVERAGE = 125;
  static readonly MAINTENANCE_MARGIN_RATE = 0.004; // 0.4%

  static async getPositions(userId: string, status?: 'open' | 'closed' | 'liquidated'): Promise<FuturesPosition[]> {
    let query = supabase
      .from('futures_positions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(pos => ({
      ...pos,
      side: pos.side as 'long' | 'short',
      status: pos.status as 'open' | 'closed' | 'liquidated',
      entry_price: Number(pos.entry_price),
      quantity: Number(pos.quantity),
      margin: Number(pos.margin),
      liquidation_price: pos.liquidation_price ? Number(pos.liquidation_price) : undefined,
      take_profit: pos.take_profit ? Number(pos.take_profit) : undefined,
      stop_loss: pos.stop_loss ? Number(pos.stop_loss) : undefined,
      unrealized_pnl: Number(pos.unrealized_pnl),
      realized_pnl: Number(pos.realized_pnl)
    }));
  }

  static async openPosition(userId: string, request: OpenPositionRequest): Promise<{ success: boolean; positionId?: string; error?: string }> {
    try {
      const { symbol, side, quantity, leverage, entryPrice, takeProfit, stopLoss } = request;

      if (leverage < 1 || leverage > this.MAX_LEVERAGE) {
        return { success: false, error: `Leverage must be between 1 and ${this.MAX_LEVERAGE}` };
      }

      const margin = (quantity * entryPrice) / leverage;
      const liquidationPrice = this.calculateLiquidationPrice(entryPrice, leverage, side);

      const { data, error } = await supabase
        .from('futures_positions')
        .insert({
          user_id: userId,
          symbol,
          side,
          entry_price: entryPrice,
          quantity,
          leverage,
          margin,
          liquidation_price: liquidationPrice,
          take_profit: takeProfit,
          stop_loss: stopLoss
        })
        .select('id')
        .single();

      if (error) throw error;
      return { success: true, positionId: data.id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to open position' };
    }
  }

  static async closePosition(positionId: string, exitPrice: number): Promise<{ success: boolean; pnl?: number; error?: string }> {
    try {
      const { data: position, error: fetchError } = await supabase
        .from('futures_positions')
        .select('*')
        .eq('id', positionId)
        .single();

      if (fetchError) throw fetchError;

      const pnl = this.calculatePnL(
        Number(position.entry_price),
        exitPrice,
        Number(position.quantity),
        position.side as 'long' | 'short',
        position.leverage
      );

      const { error } = await supabase
        .from('futures_positions')
        .update({
          status: 'closed',
          realized_pnl: pnl,
          unrealized_pnl: 0,
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', positionId);

      if (error) throw error;
      return { success: true, pnl };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to close position' };
    }
  }

  static async updateTpSl(positionId: string, takeProfit?: number, stopLoss?: number): Promise<{ success: boolean; error?: string }> {
    try {
      const updates: any = { updated_at: new Date().toISOString() };
      if (takeProfit !== undefined) updates.take_profit = takeProfit;
      if (stopLoss !== undefined) updates.stop_loss = stopLoss;

      const { error } = await supabase
        .from('futures_positions')
        .update(updates)
        .eq('id', positionId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update position' };
    }
  }

  static calculateLiquidationPrice(entryPrice: number, leverage: number, side: 'long' | 'short'): number {
    const maintenanceMarginRate = this.MAINTENANCE_MARGIN_RATE;
    const leverageRatio = 1 / leverage;

    if (side === 'long') {
      return entryPrice * (1 - leverageRatio + maintenanceMarginRate);
    } else {
      return entryPrice * (1 + leverageRatio - maintenanceMarginRate);
    }
  }

  static calculatePnL(entryPrice: number, currentPrice: number, quantity: number, side: 'long' | 'short', leverage: number): number {
    const priceDiff = side === 'long' 
      ? currentPrice - entryPrice 
      : entryPrice - currentPrice;
    
    return priceDiff * quantity;
  }

  static calculateROE(entryPrice: number, currentPrice: number, leverage: number, side: 'long' | 'short'): number {
    const priceChange = side === 'long'
      ? (currentPrice - entryPrice) / entryPrice
      : (entryPrice - currentPrice) / entryPrice;
    
    return priceChange * leverage * 100;
  }

  static calculateMargin(quantity: number, price: number, leverage: number): number {
    return (quantity * price) / leverage;
  }

  static async getPositionHistory(userId: string, limit: number = 50): Promise<FuturesPosition[]> {
    const { data, error } = await supabase
      .from('futures_positions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['closed', 'liquidated'])
      .order('closed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(pos => ({
      ...pos,
      side: pos.side as 'long' | 'short',
      status: pos.status as 'open' | 'closed' | 'liquidated',
      entry_price: Number(pos.entry_price),
      quantity: Number(pos.quantity),
      margin: Number(pos.margin),
      liquidation_price: pos.liquidation_price ? Number(pos.liquidation_price) : undefined,
      take_profit: pos.take_profit ? Number(pos.take_profit) : undefined,
      stop_loss: pos.stop_loss ? Number(pos.stop_loss) : undefined,
      unrealized_pnl: Number(pos.unrealized_pnl),
      realized_pnl: Number(pos.realized_pnl)
    }));
  }
}
