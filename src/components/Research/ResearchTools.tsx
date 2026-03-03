
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CompanyFundamentals from "./CompanyFundamentals";
import AnalystRatings from "./AnalystRatings";
import MarketNews from "./MarketNews";
import TechnicalIndicators from "@/components/TechnicalIndicators";
import SocialShare from "@/components/Social/SocialShare";
import Comments from "@/components/Social/Comments";
import WatchlistButton from "@/components/WatchlistButton";
import PriceAlertModal from "@/components/Alerts/PriceAlertModal";
import PredictiveAnalytics from "./PredictiveAnalytics";
import AdvancedChart from "./AdvancedChart";
import { Button } from "@/components/ui/button";
import { AlertCircle, LineChart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { MarketDataService } from "@/services/MarketDataService";
import { TooltipProvider } from "@/components/ui/tooltip";

interface ResearchToolsProps {
  onSymbolChange?: (symbol: string) => void;
  initialSymbol?: string;
}

const ResearchTools = ({ onSymbolChange, initialSymbol = "AAPL" }: ResearchToolsProps) => {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [inputSymbol, setInputSymbol] = useState(initialSymbol);

  const { data: marketData } = useQuery({
    queryKey: ['marketData', symbol],
    queryFn: () => MarketDataService.fetchHistoricalData(symbol, 90),
    staleTime: 1000 * 60 * 5
  });

  const currentPrice = marketData && marketData.length > 0 
    ? (marketData[marketData.length - 1].close || marketData[marketData.length - 1].price || 150.75) 
    : 150.75;

  const handleSymbolChange = () => {
    const newSymbol = inputSymbol.trim().toUpperCase();
    if (newSymbol && newSymbol !== symbol) {
      setSymbol(newSymbol);
      onSymbolChange?.(newSymbol);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSymbolChange();
  };

  return (
    <Card className="p-3 sm:p-4">
      {/* Symbol search bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputSymbol}
            onChange={(e) => setInputSymbol(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border border-input rounded-md px-2 py-1.5 text-sm bg-background w-28"
            placeholder="Symbol"
          />
          <Button size="sm" onClick={handleSymbolChange}>Search</Button>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <PriceAlertModal symbol={symbol} currentPrice={currentPrice}>
              <Button size="sm" variant="outline" className="flex items-center gap-1 text-xs">
                <AlertCircle className="h-3.5 w-3.5" />
                Alert
              </Button>
            </PriceAlertModal>
          </TooltipProvider>
          <WatchlistButton symbol={symbol} />
        </div>
      </div>

      {/* Research tabs - scrollable on mobile */}
      <Tabs defaultValue="chart">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="mb-4 w-max sm:w-auto">
            <TabsTrigger value="chart" className="text-xs sm:text-sm">
              <LineChart className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
              Chart
            </TabsTrigger>
            <TabsTrigger value="fundamentals" className="text-xs sm:text-sm">Fundamentals</TabsTrigger>
            <TabsTrigger value="predictive" className="text-xs sm:text-sm">Predictive</TabsTrigger>
            <TabsTrigger value="news" className="text-xs sm:text-sm">News</TabsTrigger>
            <TabsTrigger value="analysts" className="text-xs sm:text-sm">Analysts</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chart">
          {marketData && marketData.length > 0 ? (
            <AdvancedChart symbol={symbol} data={marketData} height={380} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
              Loading chart data...
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="fundamentals">
          <CompanyFundamentals symbol={symbol} />
        </TabsContent>
        
        <TabsContent value="predictive">
          <PredictiveAnalytics symbol={symbol} currentPrice={currentPrice} />
        </TabsContent>
        
        <TabsContent value="news">
          <MarketNews symbol={symbol} />
        </TabsContent>
        
        <TabsContent value="analysts">
          <AnalystRatings symbol={symbol} />
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default ResearchTools;
