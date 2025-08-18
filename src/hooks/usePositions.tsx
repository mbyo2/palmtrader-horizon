import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

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
      
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as Position[];
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
  });

  const updatePosition = async (symbol: string, quantity: number, averageCost: number) => {
    if (!user) return;

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