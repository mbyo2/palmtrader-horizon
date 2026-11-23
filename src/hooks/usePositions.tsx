import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { isDemo, isDemoSync } from '@/services/demo/DemoBackend';
import { DemoStockTrading } from '@/services/demo/demoStocks';
import { resolveInstrument } from '@/services/venueRouting';
import { AlpacaPaperService, mapAlpacaPosition } from '@/services/AlpacaPaperService';

export interface Position {
  id: string;
  user_id: string;
  symbol: string;
  quantity: number;
  average_cost: number;
  market_value?: number;
  unrealized_pnl?: number;
  realized_pnl: number;
  created_at: string;
  updated_at: string;
  /** Where this position lives: Alpaca paper, or the local engine (LuSE carve-out). */
  venue?: 'alpaca' | 'local';
}

export const usePositions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: positions = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["positions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      if (await isDemo()) return DemoStockTrading.getPositionsHookShape() as Position[];

      // Signed-in: US-stock and crypto positions are read back from Alpaca
      // paper (source of truth); local rows are kept only for local-venue
      // instruments (LuSE). Alpaca positions win on any symbol overlap.
      const [localRes, alpacaPositions] = await Promise.all([
        supabase
          .from('positions')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false }),
        AlpacaPaperService.getPositions()
          .then((r) => (r.positions as any[]).map((p) => mapAlpacaPosition(p, user.id) as unknown as Position))
          .catch((err) => {
            console.error('Alpaca paper positions read-back failed:', err);
            return [] as Position[];
          }),
      ]);

      if (localRes.error) throw localRes.error;
      const alpacaSymbols = new Set(alpacaPositions.map((p) => p.symbol));
      const localPositions = ((localRes.data ?? []) as Position[])
        .filter((p) => resolveInstrument(p.symbol).venue === 'local' && !alpacaSymbols.has(p.symbol))
        .map((p) => ({ ...p, venue: 'local' as const }));

      return [...alpacaPositions, ...localPositions];
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
  });

  const updatePosition = async (symbol: string, quantity: number, averageCost: number) => {
    if (!user) return;
    if (isDemoSync()) { await queryClient.invalidateQueries({ queryKey: ["positions", user.id] }); return; }

    const { error } = await supabase
      .from('positions')
      .upsert({
        user_id: user.id,
        symbol,
        quantity,
        average_cost: averageCost,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,symbol'
      });

    if (error) throw error;

    await queryClient.invalidateQueries({ queryKey: ["positions", user.id] });
  };

  return {
    positions,
    isLoading,
    error,
    refetch,
    updatePosition
  };
};
