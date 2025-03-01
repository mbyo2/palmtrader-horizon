
import { useQuery } from "@tanstack/react-query";
import AdvancedChart from "@/components/Research/AdvancedChart";
import ResearchTools from "@/components/Research/ResearchTools";
import { MarketDataService } from "@/services/MarketDataService";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const Markets = () => {
  const { toast } = useToast();
  
  const { data: marketData = [], isLoading, error } = useQuery({
    queryKey: ['marketData', 'AAPL'],
    queryFn: () => MarketDataService.fetchHistoricalData('AAPL', 30),
    retry: 2,
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error fetching market data",
        description: "There was a problem loading market data. Please try again later.",
        variant: "destructive",
      });
      console.error("Market data error:", error);
    }
  }, [error, toast]);

  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">Markets</h1>
      <div className="space-y-6">
        {isLoading ? (
          <Card className="p-4">
            <Skeleton className="h-[400px] w-full" />
          </Card>
        ) : marketData.length > 0 ? (
          <AdvancedChart data={marketData} />
        ) : (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground mb-2">No market data available for AAPL</p>
            <p className="text-sm">Our data provider might be experiencing issues. Please try again later.</p>
          </Card>
        )}
        <ResearchTools />
      </div>
    </div>
  );
};

export default Markets;
