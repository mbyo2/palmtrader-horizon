
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import CompanyFundamentals from "./CompanyFundamentals";
import MarketNews from "./MarketNews";
import AnalystRatings from "./AnalystRatings";
import Comments from "../Social/Comments";

interface ResearchToolsProps {
  initialSymbol?: string;
  onSymbolChange?: (symbol: string) => void;
}

const ResearchTools = ({ initialSymbol = "AAPL", onSymbolChange }: ResearchToolsProps) => {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [searchInput, setSearchInput] = useState(initialSymbol);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newSymbol = searchInput.toUpperCase();
    setSymbol(newSymbol);
    
    // Notify parent component if callback is provided
    if (onSymbolChange) {
      onSymbolChange(newSymbol);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Enter stock symbol..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button type="submit">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </form>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CompanyFundamentals symbol={symbol} />
        <AnalystRatings symbol={symbol} />
      </div>
      
      <MarketNews symbol={symbol} />
      
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Discussion</h3>
        <Comments symbol={symbol} />
      </Card>
    </div>
  );
};

export default ResearchTools;
