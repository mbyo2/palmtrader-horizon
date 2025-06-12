
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AfricanMarketDataService, type AfricanMarketData, type CommodityPrice, type CurrencyRate } from "@/services/AfricanMarketDataService";
import { CurrencyService } from "@/services/CurrencyService";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const AfricanMarketOverview = () => {
  const [luseStocks, setLuseStocks] = useState<AfricanMarketData[]>([]);
  const [commodities, setCommodities] = useState<CommodityPrice[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMarketData = async () => {
      setIsLoading(true);
      try {
        const [stocksData, commoditiesData, currenciesData] = await Promise.all([
          AfricanMarketDataService.fetchLuSEStocks(),
          AfricanMarketDataService.fetchCommodityPrices(),
          AfricanMarketDataService.fetchCurrencyRates()
        ]);

        setLuseStocks(stocksData);
        setCommodities(commoditiesData);
        setCurrencies(currenciesData);
      } catch (error) {
        console.error("Error fetching African market data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-500";
    if (change < 0) return "text-red-500";
    return "text-gray-500";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">African Markets</h2>
        <Badge variant="outline">Live Data</Badge>
      </div>

      <Tabs defaultValue="stocks" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stocks">LuSE Stocks</TabsTrigger>
          <TabsTrigger value="commodities">Commodities</TabsTrigger>
          <TabsTrigger value="currencies">Currencies</TabsTrigger>
        </TabsList>

        <TabsContent value="stocks" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {luseStocks.map((stock) => (
              <Card key={stock.symbol} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{stock.symbol}</CardTitle>
                    <Badge variant="secondary">{stock.exchange}</Badge>
                  </div>
                  <CardDescription className="text-sm">{stock.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {CurrencyService.formatCurrency(stock.price, stock.currency)}
                      </span>
                      <div className="flex items-center space-x-1">
                        {getTrendIcon(stock.change)}
                        <span className={`text-sm font-medium ${getChangeColor(stock.change)}`}>
                          {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Volume: {stock.volume.toLocaleString()}
                    </div>
                    {stock.sector && (
                      <Badge variant="outline" className="text-xs">
                        {stock.sector}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="commodities" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {commodities.map((commodity) => (
              <Card key={commodity.commodity} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg capitalize">{commodity.commodity}</CardTitle>
                  <CardDescription className="text-sm">{commodity.unit}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {CurrencyService.formatCurrency(commodity.price, commodity.currency as any)}
                      </span>
                      <div className="flex items-center space-x-1">
                        {getTrendIcon(commodity.change)}
                        <span className={`text-sm font-medium ${getChangeColor(commodity.change)}`}>
                          {commodity.change >= 0 ? '+' : ''}{commodity.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last updated: {new Date(commodity.lastUpdated).toLocaleTimeString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="currencies" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currencies.map((currency) => (
              <Card key={`${currency.baseCurrency}-${currency.targetCurrency}`} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    {currency.baseCurrency}/{currency.targetCurrency}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {CurrencyService.getCurrencyInfo(currency.baseCurrency as any)?.name} to{' '}
                    {CurrencyService.getCurrencyInfo(currency.targetCurrency as any)?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {currency.rate.toFixed(4)}
                      </span>
                      <div className="flex items-center space-x-1">
                        {getTrendIcon(currency.change)}
                        <span className={`text-sm font-medium ${getChangeColor(currency.change)}`}>
                          {currency.change >= 0 ? '+' : ''}{currency.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last updated: {new Date(currency.lastUpdated).toLocaleTimeString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AfricanMarketOverview;
