
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const POPULAR_STOCKS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corp." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "NVDA", name: "NVIDIA Corp." },
];

interface StockSelectorProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
}

const StockSelector = ({ symbol, onSymbolChange }: StockSelectorProps) => {
  const [customSymbol, setCustomSymbol] = useState("");

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
        {POPULAR_STOCKS.map((stock) => (
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
