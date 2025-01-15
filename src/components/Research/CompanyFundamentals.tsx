import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const CompanyFundamentals = ({ symbol }: { symbol: string }) => {
  const { data: fundamentals, isLoading } = useQuery({
    queryKey: ["fundamentals", symbol],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_fundamentals")
        .select("*")
        .eq("symbol", symbol)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!fundamentals) {
    return (
      <Card className="p-4">
        <p className="text-muted-foreground">No fundamental data available</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">{fundamentals.name} ({symbol})</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Market Cap</p>
          <p className="font-medium">${fundamentals.market_cap?.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">P/E Ratio</p>
          <p className="font-medium">{fundamentals.pe_ratio?.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">EPS</p>
          <p className="font-medium">${fundamentals.eps?.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Dividend Yield</p>
          <p className="font-medium">{fundamentals.dividend_yield?.toFixed(2)}%</p>
        </div>
      </div>
    </Card>
  );
};

export default CompanyFundamentals;