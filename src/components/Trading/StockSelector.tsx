
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface StockSelectorProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
}

const StockSelector = ({ symbol, onSymbolChange }: StockSelectorProps) => {
  const [inputValue, setInputValue] = useState(symbol);

  const popularStocks = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "NVDA"];

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onSymbolChange(inputValue.trim().toUpperCase());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="symbol">Stock Symbol</Label>
        <div className="flex gap-2">
          <Input
            id="symbol"
            placeholder="Enter symbol (e.g., AAPL)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            className="uppercase"
          />
          <Button onClick={handleSubmit} size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div>
        <Label className="text-sm text-muted-foreground">Popular Stocks</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {popularStocks.map((stock) => (
            <Button
              key={stock}
              variant={symbol === stock ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setInputValue(stock);
                onSymbolChange(stock);
              }}
            >
              {stock}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StockSelector;
