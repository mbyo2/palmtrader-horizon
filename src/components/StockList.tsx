import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

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

  // Simulate real-time updates
  useEffect(() => {
    const updateInterval = setInterval(() => {
      setStocks(prevStocks => 
        prevStocks.map(stock => {
          // Generate a random price change between -1% and +1%
          const changePercent = (Math.random() * 2 - 1) / 100;
          const currentPrice = parseFloat(stock.price);
          const newPrice = currentPrice * (1 + changePercent);
          const priceChange = ((newPrice - currentPrice) / currentPrice) * 100;
          
          return {
            ...stock,
            previousPrice: stock.price, // Store previous price for animation
            price: newPrice.toFixed(2),
            change: `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(1)}%`
          };
        })
      );
    }, 3000); // Update every 3 seconds

    return () => clearInterval(updateInterval);
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