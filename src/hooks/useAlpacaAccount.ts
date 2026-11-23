import { useQuery } from "@tanstack/react-query";
import { AlpacaPaperService } from "@/services/AlpacaPaperService";

/**
 * The signed-in user's Alpaca sandbox (broker) account.
 * Buying power / cash are read back from Alpaca — never from local tables.
 * `linked` is false when the user has not completed Alpaca onboarding yet;
 * in that state there is no Alpaca account to trade through.
 */
export const useAlpacaAccount = (enabled: boolean = true) => {
  const query = useQuery({
    queryKey: ["alpaca-paper-account"],
    queryFn: async () => {
      const res = await AlpacaPaperService.getAccount();
      return { linked: res.linked, account: res.account as any | null };
    },
    enabled,
    staleTime: 15 * 1000,
    retry: 1,
  });

  const account = query.data?.account ?? undefined;
  return {
    account,
    linked: query.data ? query.data.linked : undefined,
    buyingPower: account ? Number(account.buying_power ?? 0) : 0,
    cash: account ? Number(account.cash ?? 0) : 0,
    equity: account ? Number(account.equity ?? 0) : 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
