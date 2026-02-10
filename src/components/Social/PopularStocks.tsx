
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { finnhubSocket } from "@/utils/finnhubSocket";

interface PopularStock {
  symbol: string;
  comment_count: number;
  unique_users: number;
  price?: number;
  priceChange?: number;
}

const PopularStocks = () => {
  const [stocks, setStocks] = useState<PopularStock[]>([]);

  const { data: popularStocks, isLoading } = useQuery({
    queryKey: ["popularStocks"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_popular_stocks");
      if (error) throw error;
      return data as PopularStock[];
    },
  });

  useEffect(() => {
    // Initialize stocks state when data is loaded
    if (popularStocks) {
      setStocks(popularStocks);
      
      // Subscribe to real-time updates for each symbol
      popularStocks.forEach(stock => {
        finnhubSocket.subscribe(stock.symbol);
      });
      
      // Set up market data handler
      const unsubscribe = finnhubSocket.onMarketData(({ symbol, price }) => {
        setStocks(prevStocks => 
          prevStocks.map(stock => {
            if (stock.symbol.toUpperCase() === symbol.toUpperCase()) {
              const previousPrice = stock.price || 0;
              const priceChange = previousPrice > 0 
                ? ((price - previousPrice) / previousPrice) * 100 
                : 0;
              
              return {
                ...stock,
                price,
                priceChange
              };
            }
            return stock;
          })
        );
      });
      
      return () => {
        // Cleanup subscriptions when component unmounts
        popularStocks.forEach(stock => {
          finnhubSocket.unsubscribe(stock.symbol);
        });
        unsubscribe();
      };
    }
  }, [popularStocks]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-4 animate-pulse bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {stocks?.map((stock) => (
        <Link to={`/trade/${stock.symbol}`} key={stock.symbol}>
          <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-foreground">{stock.symbol}</h3>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span className="flex items-center">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    {stock.comment_count} comments
                  </span>
                  <span className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {stock.unique_users} users
                  </span>
                </div>
              </div>
              {stock.price && (
                <div className="text-right">
                  <div className="flex items-center font-medium">
                    <DollarSign className="h-4 w-4" />
                    {stock.price.toFixed(2)}
                  </div>
                  {stock.priceChange && (
                    <span className={`text-xs ${stock.priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {stock.priceChange >= 0 ? '+' : ''}{stock.priceChange.toFixed(2)}%
                    </span>
                  )}
                </div>
              )}
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
};

export default PopularStocks;
