import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Stock {
  symbol: string;
  name: string;
  price: string;
  change: string;
  previousPrice?: string;
}

const StockList = () => {
  const [search, setSearch] = useState("");
  const [stocks, setStocks] = useState<Stock[]>([
    { symbol: "ZCCM", name: "ZCCM Investments Holdings", price: "24.50", change: "+2.3%" },
    { symbol: "CEC", name: "Copperbelt Energy Corporation", price: "12.75", change: "-0.8%" },
    { symbol: "ZSUG", name: "Zambia Sugar", price: "8.90", change: "+1.5%" },
  ]);

  useEffect(() => {
    // Subscribe to real-time updates
    const channel = supabase
      .channel('stock-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'market_data'
        },
        (payload) => {
          console.log('Received real-time stock data:', payload)
          
          // Update the corresponding stock data
          setStocks(prevStocks => 
            prevStocks.map(stock => {
              if (stock.symbol === payload.new.symbol) {
                const newPrice = parseFloat(payload.new.price).toFixed(2);
                const previousPrice = parseFloat(stock.price);
                const priceChange = ((parseFloat(newPrice) - previousPrice) / previousPrice) * 100;
                
                return {
                  ...stock,
                  previousPrice: stock.price,
                  price: newPrice,
                  change: `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(1)}%`
                };
              }
              return stock;
            })
          );
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredStocks = stocks.filter(
    (stock) =>
      stock.symbol.toLowerCase().includes(search.toLowerCase()) ||
      stock.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Input
        type="search"
        placeholder="Search stocks..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md bg-background/50"
      />
      <div className="space-y-2">
        {filteredStocks.map((stock) => (
          <Card 
            key={stock.symbol} 
            className="card-gradient p-4 hover:shadow-lg transition-all duration-200"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-foreground">{stock.symbol}</h3>
                <p className="text-sm text-foreground/70">{stock.name}</p>
              </div>
              <div className="text-right">
                <p className={`font-bold text-foreground transition-colors duration-300 ${
                  stock.previousPrice && parseFloat(stock.price) > parseFloat(stock.previousPrice)
                    ? 'text-green-500'
                    : stock.previousPrice && parseFloat(stock.price) < parseFloat(stock.previousPrice)
                    ? 'text-red-500'
                    : ''
                }`}>
                  ${stock.price}
                </p>
                <span className={`text-sm ${stock.change.startsWith("+") ? "text-green-500" : "text-red-500"}`}>
                  {stock.change}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default StockList;