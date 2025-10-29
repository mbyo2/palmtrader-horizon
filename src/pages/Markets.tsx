
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { AdvancedStockChart } from "@/components/Research/AdvancedStockChart";
import AdvancedChart from "@/components/Research/AdvancedChart";
import ResearchTools from "@/components/Research/ResearchTools";
import { MarketDataService } from "@/services/MarketDataService";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { finnhubSocket } from "@/utils/finnhubSocket";
import MarketOverview from "@/components/MarketOverview";
import TradingInterface from "@/components/Trading/TradingInterface";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TechnicalIndicatorService } from "@/services/TechnicalIndicatorService";
import TechnicalIndicators from "@/components/TechnicalIndicators";
import SocialShare from "@/components/Social/SocialShare";
import Comments from "@/components/Social/Comments";
import { MarketData } from "@/services/market/types";

const Markets = () => {
  const [symbol, setSymbol] = useState("AAPL");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  const { data: marketData = [], isLoading, error, refetch } = useQuery({
    queryKey: ['marketData', symbol, lastUpdate],
    queryFn: () => MarketDataService.fetchHistoricalData(symbol, 90),
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 60000 // Consider data stale after 1 minute
  });

  // Preload technical indicators for the current symbol
  useQuery({
    queryKey: ["technical-indicators", symbol],
    queryFn: () => TechnicalIndicatorService.getIndicators(symbol),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Subscribe to real-time updates for the current symbol
  useEffect(() => {
    console.log(`Setting up real-time updates for ${symbol}`);
    
    // Subscribe to real-time updates
    finnhubSocket.subscribe(symbol);
    
    // Set up the handler for real-time data
    const unsubscribe = finnhubSocket.onMarketData((data) => {
      if (data.symbol === symbol && data.price) {
        console.log(`Real-time update received for ${symbol}: ${data.price}`);
        
        // Update the lastUpdate timestamp to trigger a refetch
        setLastUpdate(new Date());
        
        // Show a toast notification
        toast.success(`${symbol} updated: $${data.price.toFixed(2)}`);
      }
    });
    
    // Notify the user that real-time data is enabled
    toast.info(`Now receiving market data for ${symbol}`);
    
    // Cleanup on unmount or when symbol changes
    return () => {
      console.log(`Cleaning up real-time updates for ${symbol}`);
      finnhubSocket.unsubscribe(symbol);
      unsubscribe();
    };
  }, [symbol]);

  useEffect(() => {
    if (error) {
      toast.error("Error fetching market data. Using demo data instead.");
      console.error("Market data error:", error);
    }
  }, [error]);

  // Handle symbol change (will be triggered by the ResearchTools component)
  const handleSymbolChange = (newSymbol: string) => {
    console.log(`Changing symbol from ${symbol} to ${newSymbol}`);
    setSymbol(newSymbol);
  };

  return (
    <div className="container py-4 sm:py-6 px-3 sm:px-4">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Markets</h1>
      
      {/* Market Overview section with real-time updates */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">Market Overview</h2>
        <MarketOverview />
      </div>
      
      <Tabs defaultValue="chart" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="chart" className="text-xs sm:text-sm px-2 sm:px-4">Charts</TabsTrigger>
          <TabsTrigger value="trading" className="text-xs sm:text-sm px-2 sm:px-4">Trading</TabsTrigger>
          <TabsTrigger value="social" className="text-xs sm:text-sm px-2 sm:px-4">Social</TabsTrigger>
        </TabsList>
        
        <TabsContent value="chart" className="space-y-4 sm:space-y-6 mt-4">
          {isLoading ? (
            <Card className="p-4">
              <Skeleton className="h-[300px] sm:h-[400px] w-full" />
            </Card>
          ) : marketData.length > 0 ? (
            <AdvancedChart symbol={symbol} data={marketData} />
          ) : (
            <Card className="p-4 sm:p-6 text-center">
              <p className="text-sm sm:text-base text-muted-foreground mb-2">No market data available for {symbol}</p>
              <p className="text-xs sm:text-sm">Using demonstration data. Check your connection or try again later.</p>
            </Card>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2">
              <ResearchTools onSymbolChange={handleSymbolChange} initialSymbol={symbol} />
            </div>
            <div>
              <TechnicalIndicators symbol={symbol} />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="trading" className="space-y-4 sm:space-y-6 mt-4">
          <TradingInterface />
        </TabsContent>
        
        <TabsContent value="social" className="space-y-4 sm:space-y-6 mt-4">
          <Card className="p-4 sm:p-6">
            <div className="flex flex-col space-y-4 sm:space-y-6">
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">{symbol}</h2>
                  <p className="text-sm sm:text-base text-muted-foreground">Share your thoughts and insights about {symbol} with the community</p>
                </div>
                <div className="flex justify-start sm:justify-end">
                  <SocialShare 
                    symbol={symbol} 
                    title={`Check out ${symbol} on TradeHub!`} 
                    description={`I'm analyzing ${symbol} on TradeHub. What do you think about this stock?`}
                  />
                </div>
              </div>
              
              <div className="border-t pt-4 sm:pt-6">
                <Comments symbol={symbol} limit={5} />
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Markets;
