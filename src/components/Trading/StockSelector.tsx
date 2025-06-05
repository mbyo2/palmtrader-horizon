
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface StockSelectorProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
}

const StockSelector = ({ symbol, onSymbolChange }: StockSelectorProps) => {
  const [customSymbol, setCustomSymbol] = useState("");
  const [popularStocks, setPopularStocks] = useState([
    { symbol: "AAPL", name: "Apple Inc." },
    { symbol: "MSFT", name: "Microsoft Corp." },
    { symbol: "GOOGL", name: "Alphabet Inc." },
    { symbol: "AMZN", name: "Amazon.com Inc." },
    { symbol: "META", name: "Meta Platforms Inc." },
    { symbol: "TSLA", name: "Tesla Inc." },
    { symbol: "NVDA", name: "NVIDIA Corp." },
  ]);

  // Fetch popular stocks from database based on trading activity
  useEffect(() => {
    const fetchPopularStocks = async () => {
      try {
        // Get most traded symbols from the trades table
        const { data: trades, error } = await supabase
          .from('trades')
          .select('symbol')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) {
          console.error('Error fetching popular stocks:', error);
          return;
        }

        if (trades && trades.length > 0) {
          // Count occurrences of each symbol
          const symbolCounts = trades.reduce((acc: Record<string, number>, trade) => {
            acc[trade.symbol] = (acc[trade.symbol] || 0) + 1;
            return acc;
          }, {});

          // Get top 7 most traded symbols
          const topSymbols = Object.entries(symbolCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 7)
            .map(([symbol]) => ({ symbol, name: `${symbol} Inc.` }));

          if (topSymbols.length > 0) {
            setPopularStocks(topSymbols);
          }
        }
      } catch (error) {
        console.error('Error fetching popular stocks:', error);
      }
    };

    fetchPopularStocks();
  }, []);

  const handleCustomSymbolSubmit = () => {
    if (customSymbol) {
      onSymbolChange(customSymbol.toUpperCase());
      setCustomSymbol("");
    }
  };

  return (
    <div>
      <Label htmlFor="symbol-select">Select Stock</Label>
      <div className="grid grid-cols-4 gap-2 mt-2">
        {popularStocks.map((stock) => (
          <Button
            key={stock.symbol}
            variant={symbol === stock.symbol ? "default" : "outline"}
            onClick={() => onSymbolChange(stock.symbol)}
            className="w-full"
          >
            {stock.symbol}
          </Button>
        ))}
        <div className="col-span-4 flex mt-2">
          <Input
            placeholder="Enter symbol..."
            value={customSymbol}
            onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
            className="mr-2"
          />
          <Button onClick={handleCustomSymbolSubmit}>Go</Button>
        </div>
      </div>
    </div>
  );
};

export default StockSelector;
