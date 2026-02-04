
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TechnicalIndicatorsPanel } from '@/components/Research/TechnicalIndicatorsPanel';
import { MarketSentimentNews } from '@/components/Research/MarketSentimentNews';
import { ForexCryptoRates } from '@/components/Research/ForexCryptoRates';
import { EconomicIndicatorsDashboard } from '@/components/Research/EconomicIndicatorsDashboard';
import { AdvancedStockChart } from '@/components/Research/AdvancedStockChart';
import { useMarketDataQuery } from '@/hooks/useMarketDataQuery';
import { Search, BarChart3, Newspaper, ArrowRightLeft, Building2, LineChart } from 'lucide-react';

const Research = () => {
  const [symbol, setSymbol] = useState('AAPL');
  const [searchSymbol, setSearchSymbol] = useState('AAPL');
  const { data: historicalData, isLoading } = useMarketDataQuery(searchSymbol);

  const handleSearch = () => {
    setSearchSymbol(symbol.toUpperCase());
  };

  return (
    <div className="container py-6 space-y-6 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Market Research</h1>
          <p className="text-muted-foreground">
            Technical analysis, news sentiment, forex, crypto & economic indicators
          </p>
        </div>
        
        <div className="flex gap-2">
          <Input
            placeholder="Enter symbol (e.g., AAPL)"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-40"
          />
          <Button onClick={handleSearch}>
            <Search className="h-4 w-4 mr-2" />
            Analyze
          </Button>
        </div>
      </div>

      <Tabs defaultValue="charts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="charts" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            <span className="hidden sm:inline">Charts</span>
          </TabsTrigger>
          <TabsTrigger value="technicals" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Technicals</span>
          </TabsTrigger>
          <TabsTrigger value="news" className="flex items-center gap-2">
            <Newspaper className="h-4 w-4" />
            <span className="hidden sm:inline">News</span>
          </TabsTrigger>
          <TabsTrigger value="forex" className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Forex/Crypto</span>
          </TabsTrigger>
          <TabsTrigger value="economic" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Economic</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-6">
          {historicalData && historicalData.length > 0 ? (
            <AdvancedStockChart symbol={searchSymbol} data={historicalData} />
          ) : (
            <div className="h-[400px] flex items-center justify-center border rounded-lg text-muted-foreground">
              {isLoading ? 'Loading chart data...' : 'Enter a symbol to view chart'}
            </div>
          )}
        </TabsContent>

        <TabsContent value="technicals" className="space-y-6">
          <TechnicalIndicatorsPanel symbol={searchSymbol} />
        </TabsContent>

        <TabsContent value="news" className="space-y-6">
          <MarketSentimentNews defaultTicker={searchSymbol} />
        </TabsContent>

        <TabsContent value="forex" className="space-y-6">
          <ForexCryptoRates />
        </TabsContent>

        <TabsContent value="economic" className="space-y-6">
          <EconomicIndicatorsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Research;
