import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useCallback, memo } from "react";
import WatchlistButton from "./WatchlistButton";
import { FixedSizeList as List } from "react-window";
import { useIsMobile } from "@/hooks/use-mobile";
import { finnhubSocket } from "@/utils/finnhubSocket";

interface Stock {
  symbol: string;
  name: string;
  price: string;
  change: string;
  previousPrice?: string;
}

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
    { symbol: "ZCCM.ZM", name: "ZCCM Investments Holdings Plc", price: "24.50", change: "+2.3%" },
    { symbol: "CEC.ZM", name: "Copperbelt Energy Corporation Plc", price: "12.75", change: "-0.8%" },
    { symbol: "ZSUG.ZM", name: "Zambia Sugar Plc", price: "8.90", change: "+1.5%" },
    { symbol: "PUMA.ZM", name: "Puma Energy Zambia Plc", price: "15.30", change: "-0.4%" },
    { symbol: "REIZ.ZM", name: "Real Estate Investments Zambia Plc", price: "5.45", change: "+1.2%" },
    { symbol: "PRIMA.ZM", name: "Prima Reinsurance Plc", price: "2.80", change: "-0.6%" },
    { symbol: "BATZ.ZM", name: "British American Tobacco Zambia Plc", price: "22.15", change: "+0.9%" },
    { symbol: "ZNCO.ZM", name: "Zambia National Commercial Bank Plc", price: "1.95", change: "-0.3%" },
    { symbol: "AECI.ZM", name: "AECI Mining Chemicals Limited", price: "18.40", change: "+1.1%" },
    { symbol: "LAFZ.ZM", name: "Lafarge Zambia Plc", price: "4.75", change: "-0.2%" },
    { symbol: "SHOP.ZM", name: "Shoprite Holdings Limited", price: "45.60", change: "+0.7%" },
    { symbol: "MCEL.ZM", name: "Madison Financial Services Plc", price: "3.15", change: "-0.5%" }
  ]);

  const isMobile = useIsMobile();

  useEffect(() => {
    console.log("Setting up stock data subscriptions");
    
    // Subscribe to all stock symbols
    stocks.forEach(stock => {
      finnhubSocket.subscribe(stock.symbol);
    });

    // Set up data handler
    const unsubscribe = finnhubSocket.onMarketData(({ symbol, price }) => {
      console.log("Received stock data:", { symbol, price });
      
      setStocks(prevStocks => 
        prevStocks.map(stock => {
          if (stock.symbol === symbol) {
            const prevPrice = parseFloat(stock.price);
            const percentChange = ((price - prevPrice) / prevPrice * 100).toFixed(2);
            
            return {
              ...stock,
              previousPrice: stock.price,
              price: price.toFixed(2),
              change: `${percentChange.startsWith('-') ? '' : '+'}${percentChange}%`
            };
          }
          return stock;
        })
      );
    });

    // Cleanup subscriptions
    return () => {
      console.log("Cleaning up stock data subscriptions");
      stocks.forEach(stock => {
        finnhubSocket.unsubscribe(stock.symbol);
      });
      unsubscribe();
    };
  }, [stocks]);

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