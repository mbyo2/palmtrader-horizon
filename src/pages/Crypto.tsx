import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CryptoTrading from "@/components/Trading/CryptoTrading";
import { useQuery } from "@tanstack/react-query";
import { MarketDataService } from "@/services/MarketDataService";
import { AdvancedStockChart } from "@/components/Research/AdvancedStockChart";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

const popularCryptos = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "XRP", name: "Ripple" },
  { symbol: "ADA", name: "Cardano" },
  { symbol: "DOT", name: "Polkadot" },
];

const Crypto = () => {
  const [selectedCrypto, setSelectedCrypto] = useState("BTC");
  
  const { data: cryptoData, isLoading } = useQuery({
    queryKey: ['cryptoData', selectedCrypto],
    queryFn: () => MarketDataService.fetchHistoricalData(selectedCrypto, 30),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
  
  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">Cryptocurrency</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {popularCryptos.map((crypto) => (
          <Card 
            key={crypto.symbol}
            className={`cursor-pointer transition-all ${selectedCrypto === crypto.symbol ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setSelectedCrypto(crypto.symbol)}
          >
            <CardHeader className="p-4">
              <CardTitle className="flex justify-between">
                {crypto.name}
                <span className="text-muted-foreground">{crypto.symbol}</span>
              </CardTitle>
              <PriceTicker symbol={crypto.symbol} />
            </CardHeader>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{selectedCrypto} Chart</CardTitle>
              <CardDescription>
                Cryptocurrency price chart and technical analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : cryptoData && cryptoData.length > 0 ? (
                <AdvancedStockChart data={cryptoData} />
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  No data available for {selectedCrypto}
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
              <CryptoTrading />
            </TabsContent>
            
            <TabsContent value="portfolio">
              <CryptoPortfolio />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

// PriceTicker component to show real-time prices
const PriceTicker = ({ symbol }: { symbol: string }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['cryptoPrice', symbol],
    queryFn: async () => await MarketDataService.fetchLatestPrice(symbol),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  // Generate mock data for price change
  const priceChange = Math.random() > 0.5 ? 
    Math.random() * 5 : 
    -Math.random() * 5;
  
  return (
    <div className="flex justify-between items-center mt-2">
      <div className="text-xl font-semibold">
        {isLoading ? (
          <Skeleton className="h-6 w-24" />
        ) : (
          `$${data?.price.toFixed(2) || "0.00"}`
        )}
      </div>
      <div className={`${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
        {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
      </div>
    </div>
  );
};

// CryptoPortfolio component to display crypto holdings
const CryptoPortfolio = () => {
  const { data: portfolio, isLoading } = useQuery({
    queryKey: ['cryptoPortfolio'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("portfolio")
        .select("*")
        .eq("user_id", user.id)
        .in("symbol", popularCryptos.map(c => c.symbol));
        
      if (error) throw error;
      return data || [];
    },
  });
  
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
            const crypto = popularCryptos.find(c => c.symbol === item.symbol);
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
