import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const StockList = () => {
  const [search, setSearch] = useState("");
  
  const stocks = [
    { symbol: "ZCCM", name: "ZCCM Investments Holdings", price: "24.50", change: "+2.3%" },
    { symbol: "CEC", name: "Copperbelt Energy Corporation", price: "12.75", change: "-0.8%" },
    { symbol: "ZSUG", name: "Zambia Sugar", price: "8.90", change: "+1.5%" },
  ];

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
          <Card key={stock.symbol} className="card-gradient p-4 hover:shadow-lg transition-all duration-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-foreground">{stock.symbol}</h3>
                <p className="text-sm text-foreground/70">{stock.name}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-foreground">${stock.price}</p>
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