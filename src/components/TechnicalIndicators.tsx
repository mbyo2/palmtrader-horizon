import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface TechnicalIndicator {
  symbol: string;
  indicator_type: string;
  value: number;
  period?: number;
  timestamp: string;
}

const TechnicalIndicators = ({ symbol }: { symbol: string }) => {
  const { data: indicators, isLoading } = useQuery({
    queryKey: ["technical-indicators", symbol],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technical_indicators")
        .select("*")
        .eq("symbol", symbol)
        .order("timestamp", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as TechnicalIndicator[];
    },
  });

  const fetchIndicator = async (indicator: string) => {
    try {
      await fetch("/api/alpha-vantage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symbol, indicator }),
      });
    } catch (error) {
      console.error("Error fetching indicator:", error);
    }
  };

  if (isLoading) {
    return <div>Loading indicators...</div>;
  }

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Technical Indicators</h3>
      <div className="grid grid-cols-2 gap-4">
        {indicators?.map((indicator) => (
          <div key={indicator.indicator_type} className="bg-background/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">{indicator.indicator_type}</p>
            <p className="font-medium">{indicator.value.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              Period: {indicator.period || "N/A"}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default TechnicalIndicators;