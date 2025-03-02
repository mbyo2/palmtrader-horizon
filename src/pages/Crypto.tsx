
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import CryptoTrading from "@/components/Trading/CryptoTrading";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MarketDataService } from "@/services/MarketDataService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CryptoMarket = () => {
  const { isLoading } = useProtectedRoute();
  const [selectedCrypto, setSelectedCrypto] = useState("BTC");
  
  const { data: chartData } = useQuery({
    queryKey: ['cryptoHistory', selectedCrypto],
    queryFn: async () => {
      const data = await MarketDataService.fetchHistoricalData(selectedCrypto, 30);
      // Format data for the chart
      return data.map(item => ({
        date: new Date(item.timestamp).toLocaleDateString(),
        price: item.price
      }));
    }
  });

  if (isLoading) {
    return <div className="container py-6">Loading...</div>;
  }

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-3xl font-bold">Cryptocurrency</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Bitcoin (BTC) Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {chartData && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="price" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
        
        <div>
          <CryptoTrading />
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Popular Cryptocurrencies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {["BTC", "ETH", "SOL", "XRP", "ADA", "DOT"].map(crypto => (
                <CryptoListItem key={crypto} symbol={crypto} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Crypto list item component
const CryptoListItem = ({ symbol }: { symbol: string }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['cryptoPrice', symbol],
    queryFn: () => MarketDataService.fetchLatestPrice(symbol),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return (
    <div className="flex items-center justify-between p-2 hover:bg-accent rounded-lg">
      <div>
        <h3 className="font-medium">{symbol}</h3>
      </div>
      <div className="text-right">
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <p className="font-medium">${data?.price.toFixed(2) || "N/A"}</p>
        )}
      </div>
    </div>
  );
};

export default CryptoMarket;
