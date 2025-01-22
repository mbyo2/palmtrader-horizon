import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import WatchlistButton from "./WatchlistButton";
import { FixedSizeList as List } from "react-window";
import { useIsMobile } from "@/hooks/use-mobile";

interface Stock {
  symbol: string;
  name: string;
  price: string;
  change: string;
  previousPrice?: string;
}

// Memoize the StockCard component to prevent unnecessary re-renders
const StockCard = memo(({ stock }: { stock: Stock }) => (
  <Card className="card-gradient p-4 hover:shadow-lg transition-all duration-200 m-1">
    <div className="flex justify-between items-center">
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold text-foreground truncate">{stock.symbol}</h3>
          <WatchlistButton symbol={stock.symbol} />
        </div>
        <p className="text-sm text-foreground/70 truncate">{stock.name}</p>
      </div>
      <div className="text-right ml-4">
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
));

StockCard.displayName = 'StockCard';

const StockList = () => {
  const [search, setSearch] = useState("");
  const [stocks, setStocks] = useState<Stock[]>([
    { symbol: "ZCCM", name: "ZCCM Investments Holdings", price: "24.50", change: "+2.3%" },
    { symbol: "CEC", name: "Copperbelt Energy Corporation", price: "12.75", change: "-0.8%" },
    { symbol: "ZSUG", name: "Zambia Sugar", price: "8.90", change: "+1.5%" },
  ]);

  const isMobile = useIsMobile();

  // Debounce stock updates to prevent too frequent re-renders
  const updateStock = useCallback((payload: any) => {
    console.log('Received real-time stock data:', payload);
    
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
  }, []);

  useEffect(() => {
    let timeoutId: number;
    
    // Subscribe to real-time updates with debouncing
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
          // Debounce updates on mobile devices
          if (isMobile) {
            window.clearTimeout(timeoutId);
            timeoutId = window.setTimeout(() => updateStock(payload), 1000);
          } else {
            updateStock(payload);
          }
        }
      )
      .subscribe();

    return () => {
      window.clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [updateStock, isMobile]);

  const filteredStocks = stocks.filter(
    (stock) =>
      stock.symbol.toLowerCase().includes(search.toLowerCase()) ||
      stock.name.toLowerCase().includes(search.toLowerCase())
  );

  const Row = memo(({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <StockCard stock={filteredStocks[index]} />
    </div>
  ));

  Row.displayName = 'Row';

  return (
    <div className="space-y-4">
      <Input
        type="search"
        placeholder="Search stocks..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md bg-background/50"
      />
      <div className="h-[600px] content-visibility-auto">
        <List
          height={600}
          itemCount={filteredStocks.length}
          itemSize={100}
          width="100%"
          overscanCount={2}
        >
          {Row}
        </List>
      </div>
    </div>
  );
};

export default memo(StockList);