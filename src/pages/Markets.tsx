
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import ResearchTools from "@/components/Research/ResearchTools";
import { MarketDataService } from "@/services/MarketDataService";
import { toast } from "sonner";
import { finnhubSocket } from "@/utils/finnhubSocket";
import MarketOverview from "@/components/MarketOverview";
import TradingInterface from "@/components/Trading/TradingInterface";
import RealTimeChart from "@/components/Trading/RealTimeChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TechnicalIndicators from "@/components/TechnicalIndicators";
import SocialShare from "@/components/Social/SocialShare";
import Comments from "@/components/Social/Comments";
import { Card } from "@/components/ui/card";

const Markets = () => {
  const [symbol, setSymbol] = useState("AAPL");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Subscribe to real-time updates for the current symbol
  useEffect(() => {
    finnhubSocket.subscribe(symbol);
    
    const unsubscribe = finnhubSocket.onMarketData((data) => {
      if (data.symbol === symbol && data.price && data.price > 0) {
        setLastUpdate(new Date());
      }
    });
    
    return () => {
      finnhubSocket.unsubscribe(symbol);
      unsubscribe();
    };
  }, [symbol]);

  const handleSymbolChange = (newSymbol: string) => {
    setSymbol(newSymbol);
  };

  return (
    <div className="container py-4 sm:py-6 px-3 sm:px-4 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Markets</h1>
      
      {/* Market Overview */}
      <section>
        <h2 className="text-lg sm:text-xl font-semibold mb-3">Market Overview</h2>
        <MarketOverview />
      </section>
      
      <Tabs defaultValue="chart" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="chart" className="text-xs sm:text-sm">Charts</TabsTrigger>
          <TabsTrigger value="trading" className="text-xs sm:text-sm">Trading</TabsTrigger>
          <TabsTrigger value="social" className="text-xs sm:text-sm">Social</TabsTrigger>
        </TabsList>
        
        <TabsContent value="chart" className="space-y-6 mt-4">
          {/* Single real-time chart - no duplicate */}
          <RealTimeChart symbol={symbol} height={350} />
          
          {/* Research tools with chart, fundamentals, etc. */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2">
              <ResearchTools onSymbolChange={handleSymbolChange} initialSymbol={symbol} />
            </div>
            <div>
              <TechnicalIndicators symbol={symbol} />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="trading" className="space-y-4 mt-4">
          <TradingInterface />
        </TabsContent>
        
        <TabsContent value="social" className="mt-4">
          <Card className="p-4 sm:p-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">{symbol}</h2>
                  <p className="text-sm text-muted-foreground">Share your thoughts about {symbol}</p>
                </div>
                <SocialShare 
                  symbol={symbol} 
                  title={`Check out ${symbol} on TradeHub!`} 
                  description={`I'm analyzing ${symbol} on TradeHub.`}
                />
              </div>
              <div className="border-t pt-4">
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
