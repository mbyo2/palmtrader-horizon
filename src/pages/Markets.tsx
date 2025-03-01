
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import AdvancedChart from "@/components/Research/AdvancedChart";
import ResearchTools from "@/components/Research/ResearchTools";
import { MarketDataService, MarketData } from "@/services/MarketDataService";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { finnhubSocket } from "@/utils/finnhubSocket";
import MarketOverview from "@/components/MarketOverview";

const Markets = () => {
  const { toast } = useToast();
  const [symbol, setSymbol] = useState("AAPL");
  
  const { data: marketData = [], isLoading, error, refetch } = useQuery({
    queryKey: ['marketData', symbol],
    queryFn: () => MarketDataService.fetchHistoricalData(symbol, 30),
    retry: 2,
    refetchOnWindowFocus: false
  });

  // Subscribe to real-time updates for the current symbol
  useEffect(() => {
    // Subscribe to real-time updates
    finnhubSocket.subscribe(symbol);
    
    // Set up the handler for real-time data
    const unsubscribe = finnhubSocket.onMarketData((data) => {
      if (data.symbol === symbol && data.price) {
        console.log(`Real-time update received for ${symbol}: ${data.price}`);
        refetch(); // Refresh the data when we get a real-time update
      }
    });
    
    // Notify the user that real-time data is enabled
    toast({
      title: "Real-time Updates",
      description: `Now receiving live market data for ${symbol}`,
    });
    
    // Cleanup on unmount
    return () => {
      finnhubSocket.unsubscribe(symbol);
      unsubscribe();
    };
  }, [symbol, toast, refetch]);

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

  // Handle symbol change (will be triggered by the ResearchTools component)
  const handleSymbolChange = (newSymbol: string) => {
    setSymbol(newSymbol);
  };

  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">Markets</h1>
      
      {/* Market Overview section with real-time updates */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Market Overview</h2>
        <MarketOverview />
      </div>
      
      <div className="space-y-6">
        {isLoading ? (
          <Card className="p-4">
            <Skeleton className="h-[400px] w-full" />
          </Card>
        ) : marketData.length > 0 ? (
          <AdvancedChart data={marketData} />
        ) : (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground mb-2">No market data available for {symbol}</p>
            <p className="text-sm">Our data provider might be experiencing issues. Please try again later.</p>
          </Card>
        )}
        <ResearchTools onSymbolChange={handleSymbolChange} initialSymbol={symbol} />
      </div>
    </div>
  );
};

export default Markets;
