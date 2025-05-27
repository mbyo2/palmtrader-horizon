
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PortfolioService, PortfolioPosition, PortfolioSummary } from "@/services/PortfolioService";
import { useAuth } from "./useAuth";

export const usePortfolio = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { 
    data: portfolio = [], 
    isLoading: isPortfolioLoading, 
    error: portfolioError,
    refetch: refetchPortfolio 
  } = useQuery({
    queryKey: ["portfolio", user?.id],
    queryFn: () => user ? PortfolioService.getPortfolio(user.id) : [],
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
  });

  const { 
    data: summary, 
    isLoading: isSummaryLoading 
  } = useQuery({
    queryKey: ["portfolioSummary", user?.id],
    queryFn: () => user ? PortfolioService.getPortfolioSummary(user.id) : null,
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  const refreshPortfolio = async () => {
    if (user) {
      await PortfolioService.refreshPortfolio(user.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["portfolio", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["portfolioSummary", user.id] })
      ]);
    }
  };

  const getPosition = (symbol: string): PortfolioPosition | undefined => {
    return portfolio.find(pos => pos.symbol === symbol);
  };

  return {
    portfolio,
    summary,
    isPortfolioLoading,
    isSummaryLoading,
    portfolioError,
    refreshPortfolio,
    refetchPortfolio,
    getPosition
  };
};
