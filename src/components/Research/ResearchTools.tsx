
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

interface ResearchToolsProps {
  onSymbolChange?: (symbol: string) => void;
  initialSymbol?: string;
}

const ResearchTools = ({ onSymbolChange, initialSymbol = "AAPL" }: ResearchToolsProps) => {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [inputSymbol, setInputSymbol] = useState(initialSymbol);

  // Fetch market data for advanced charts
  const { data: marketData, isLoading: isLoadingMarketData } = useQuery({
    queryKey: ['marketData', symbol],
    queryFn: () => MarketDataService.fetchHistoricalData(symbol, 90),
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  // Get current price
  const currentPrice = marketData && marketData.length > 0 
    ? marketData[marketData.length - 1].price 
    : 150.75;

  const handleSymbolChange = () => {
    const newSymbol = inputSymbol.trim().toUpperCase();
    if (newSymbol && newSymbol !== symbol) {
      setSymbol(newSymbol);
      if (onSymbolChange) {
        onSymbolChange(newSymbol);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSymbolChange();
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputSymbol}
            onChange={(e) => setInputSymbol(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border rounded px-2 py-1 text-sm"
            placeholder="Enter symbol"
          />
          <Button size="sm" onClick={handleSymbolChange}>
            Search
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <PriceAlertModal symbol={symbol} currentPrice={currentPrice}>
            <Button size="sm" variant="outline" className="flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              Set Alert
            </Button>
          </PriceAlertModal>
          <WatchlistButton symbol={symbol} />
        </div>
      </div>

      <Tabs defaultValue="chart">
        <TabsList className="mb-4">
          <TabsTrigger value="chart" className="flex items-center gap-1">
            <LineChart className="h-4 w-4" />
            Advanced Chart
          </TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
          <TabsTrigger value="fundamentals">Fundamentals</TabsTrigger>
          <TabsTrigger value="predictive">Predictive</TabsTrigger>
          <TabsTrigger value="news">News</TabsTrigger>
          <TabsTrigger value="analysts">Analysts</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
        </TabsList>

        <TabsContent value="chart">
          <AdvancedChart symbol={symbol} data={marketData || []} />
        </TabsContent>
        
        <TabsContent value="technical">
          <TechnicalIndicators symbol={symbol} />
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
        
        <TabsContent value="social">
          <div className="space-y-4">
            <SocialShare symbol={symbol} />
            <Comments symbol={symbol} />
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default ResearchTools;
