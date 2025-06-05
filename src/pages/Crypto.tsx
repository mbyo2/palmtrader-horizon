
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { AdvancedStockChart } from "@/components/Research/AdvancedStockChart";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import CryptoTrading from "@/components/Trading/CryptoTrading";
import { useCryptoData } from "@/hooks/useCryptoData";
import { CryptoErrorBoundary } from "@/components/ErrorBoundary/CryptoErrorBoundary";
import { toast } from "sonner";

const popularCryptos = [
  { symbol: "bitcoin", name: "Bitcoin", ticker: "BTC" },
  { symbol: "ethereum", name: "Ethereum", ticker: "ETH" },
  { symbol: "solana", name: "Solana", ticker: "SOL" },
  { symbol: "ripple", name: "XRP", ticker: "XRP" },
  { symbol: "cardano", name: "Cardano", ticker: "ADA" },
  { symbol: "polkadot", name: "Polkadot", ticker: "DOT" },
];

const Crypto = () => {
  const [selectedCrypto, setSelectedCrypto] = useState(popularCryptos[0]);
  
  const { data: cryptoData, isLoading, error } = useQuery({
    queryKey: ['cryptoHistorical', selectedCrypto.symbol],
    queryFn: async () => {
      try {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${selectedCrypto.symbol}/market_chart?vs_currency=usd&days=30&interval=daily`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Convert CoinGecko format to our MarketData format
        if (data.prices) {
          return data.prices.map(([timestamp, price]: [number, number]) => ({
            symbol: selectedCrypto.ticker,
            timestamp: timestamp.toString(),
            price,
            close: price,
            type: 'crypto' as const
          }));
        }
        return [];
      } catch (error) {
        console.error('Error fetching crypto historical data:', error);
        toast.error('Failed to load cryptocurrency data');
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
  
  return (
    <CryptoErrorBoundary>
      <div className="container py-6">
        <h1 className="text-3xl font-bold mb-6">Cryptocurrency</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {popularCryptos.map((crypto) => (
            <Card 
              key={crypto.symbol}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedCrypto.symbol === crypto.symbol ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedCrypto(crypto)}
            >
              <CardHeader className="p-4">
                <CardTitle className="flex justify-between">
                  {crypto.name}
                  <span className="text-muted-foreground">{crypto.ticker}</span>
                </CardTitle>
                <CryptoErrorBoundary fallback={
                  <div className="text-sm text-muted-foreground">Price unavailable</div>
                }>
                  <PriceTicker cryptoId={crypto.symbol} />
                </CryptoErrorBoundary>
              </CardHeader>
            </Card>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{selectedCrypto.name} Chart</CardTitle>
                <CardDescription>
                  Cryptocurrency price chart and technical analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : error ? (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <p>Failed to load chart data for {selectedCrypto.name}</p>
                      <p className="text-sm mt-2">Please try again later</p>
                    </div>
                  </div>
                ) : cryptoData && cryptoData.length > 0 ? (
                  <TooltipProvider>
                    <AdvancedStockChart symbol={selectedCrypto.ticker} data={cryptoData} />
                  </TooltipProvider>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    No data available for {selectedCrypto.name}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Tabs defaultValue="trade" className="space-y-6">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="trade">Trade</TabsTrigger>
                <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
              </TabsList>
              
              <TabsContent value="trade">
                <CryptoErrorBoundary>
                  <CryptoTrading />
                </CryptoErrorBoundary>
              </TabsContent>
              
              <TabsContent value="portfolio">
                <CryptoErrorBoundary>
                  <CryptoPortfolio />
                </CryptoErrorBoundary>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </CryptoErrorBoundary>
  );
};

const PriceTicker = ({ cryptoId }: { cryptoId: string }) => {
  const { price, change, isLoading, error } = useCryptoData(cryptoId);
  
  if (error) {
    return (
      <div className="flex justify-between items-center mt-2">
        <div className="text-sm text-muted-foreground">Price unavailable</div>
      </div>
    );
  }
  
  return (
    <div className="flex justify-between items-center mt-2">
      <div className="text-xl font-semibold">
        {isLoading ? (
          <Skeleton className="h-6 w-24" />
        ) : (
          `$${price?.toFixed(2) || "0.00"}`
        )}
      </div>
      <div className={`${change && change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
        {isLoading ? (
          <Skeleton className="h-4 w-16" />
        ) : (
          `${change && change >= 0 ? '+' : ''}${change?.toFixed(2) || '0.00'}%`
        )}
      </div>
    </div>
  );
};

const CryptoPortfolio = () => {
  const { data: portfolio, isLoading, error } = useQuery({
    queryKey: ['cryptoPortfolio'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("portfolio")
        .select("*")
        .eq("user_id", user.id)
        .in("symbol", popularCryptos.map(c => c.ticker));
        
      if (error) throw error;
      return data || [];
    },
    retry: 3,
  });
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Crypto Portfolio</CardTitle>
          <CardDescription>Error loading portfolio data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            Failed to load portfolio. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Crypto Portfolio</CardTitle>
        <CardDescription>Your cryptocurrency holdings</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          Array(3).fill(0).map((_, index) => (
            <div key={index} className="flex justify-between py-2 border-b">
              <Skeleton className="h-6 w-16" />
              <div className="text-right">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-16 mt-1" />
              </div>
            </div>
          ))
        ) : portfolio && portfolio.length > 0 ? (
          portfolio.map((item) => {
            const crypto = popularCryptos.find(c => c.ticker === item.symbol);
            return (
              <div key={item.id} className="flex justify-between py-2 border-b">
                <div>
                  <div className="font-medium">{crypto?.name || item.symbol}</div>
                  <div className="text-sm text-muted-foreground">{item.symbol}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {item.shares.toFixed(8)} {item.symbol}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ${(item.shares * item.average_price).toFixed(2)}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            You don't own any cryptocurrency yet
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Crypto;
