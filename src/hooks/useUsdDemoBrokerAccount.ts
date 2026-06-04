import { useQuery } from "@tanstack/react-query";
import { AlpacaPaperService } from "@/services/AlpacaPaperService";

export const USD_DEMO_ACCOUNT_QUERY_KEY = ["usd-demo-broker-account"] as const;

export const useUsdDemoBrokerAccount = (enabled = true) => {
  const query = useQuery({
    queryKey: USD_DEMO_ACCOUNT_QUERY_KEY,
    queryFn: async () => {
      const response = await AlpacaPaperService.getAccount();
      return response.account;
    },
    enabled,
    refetchInterval: 15000,
    staleTime: 5000,
  });

  return {
    ...query,
    account: query.data ?? null,
    cash: Number(query.data?.cash ?? 0),
    buyingPower: Number(query.data?.buying_power ?? 0),
    equity: Number(query.data?.equity ?? 0),
  };
};