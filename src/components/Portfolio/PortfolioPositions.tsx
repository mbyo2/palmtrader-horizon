
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MarketDataService } from "@/services/MarketDataService";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Search, SortAsc, SortDesc } from "lucide-react";

interface PortfolioPositionsProps {
  portfolioData: Array<{
    id: string;
    symbol: string;
    shares: number;
    average_price: number;
  }>;
  onRefresh: () => void;
}

type SortField = "symbol" | "shares" | "averagePrice" | "currentValue" | "gain";
type SortDirection = "asc" | "desc";

const PortfolioPositions = ({ portfolioData, onRefresh }: PortfolioPositionsProps) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("currentValue");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  
  // Fetch latest prices for all symbols in portfolio
  const { data: latestPrices, isLoading } = useQuery({
    queryKey: ["portfolioPrices", portfolioData.map(item => item.symbol).join(',')],
    queryFn: async () => {
      if (portfolioData.length === 0) return [];
      return MarketDataService.fetchMultipleLatestPrices(
        portfolioData.map(item => item.symbol)
      );
    },
    enabled: portfolioData.length > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
  
  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };
  
  // Filter and sort the portfolio data
  const getFilteredAndSortedData = () => {
    let filtered = [...portfolioData];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(position => 
        position.symbol.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply sorting
    return filtered.sort((a, b) => {
      const priceA = latestPrices?.find(p => p.symbol === a.symbol)?.price || a.average_price;
      const priceB = latestPrices?.find(p => p.symbol === b.symbol)?.price || b.average_price;
      
      const currentValueA = a.shares * priceA;
      const currentValueB = b.shares * priceB;
      
      const gainPercentA = ((priceA - a.average_price) / a.average_price) * 100;
      const gainPercentB = ((priceB - b.average_price) / b.average_price) * 100;
      
      let result = 0;
      
      switch (sortField) {
        case "symbol":
          result = a.symbol.localeCompare(b.symbol);
          break;
        case "shares":
          result = a.shares - b.shares;
          break;
        case "averagePrice":
          result = a.average_price - b.average_price;
          break;
        case "currentValue":
          result = currentValueA - currentValueB;
          break;
        case "gain":
          result = gainPercentA - gainPercentB;
          break;
      }
      
      return sortDirection === "asc" ? result : -result;
    });
  };
  
  const filteredAndSortedData = getFilteredAndSortedData();
  
  // Sell position handler
  const handleSellPosition = async (position: typeof portfolioData[0]) => {
    if (!user) return;
    
    try {
      const currentPrice = latestPrices?.find(p => p.symbol === position.symbol)?.price || position.average_price;
      
      // Insert the sell trade
      const { error } = await supabase.from("trades").insert({
        user_id: user.id,
        symbol: position.symbol,
        type: "sell",
        shares: position.shares,
        price: currentPrice,
        total_amount: position.shares * currentPrice,
        status: "completed",
      });
      
      if (error) throw error;
      
      // Refresh portfolio data
      onRefresh();
      
      toast.success(`Sold all ${position.shares} shares of ${position.symbol}`);
    } catch (error) {
      console.error("Error selling position:", error);
      toast.error("Failed to sell position. Please try again.");
    }
  };
  
  // Render a sort indicator
  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? <SortAsc className="w-4 h-4 ml-1" /> : <SortDesc className="w-4 h-4 ml-1" />;
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by symbol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer"
                onClick={() => handleSort("symbol")}
              >
                <div className="flex items-center">
                  Symbol {renderSortIndicator("symbol")}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer text-right"
                onClick={() => handleSort("shares")}
              >
                <div className="flex items-center justify-end">
                  Shares {renderSortIndicator("shares")}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer text-right"
                onClick={() => handleSort("averagePrice")}
              >
                <div className="flex items-center justify-end">
                  Avg Price {renderSortIndicator("averagePrice")}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer text-right"
                onClick={() => handleSort("currentValue")}
              >
                <div className="flex items-center justify-end">
                  Current Value {renderSortIndicator("currentValue")}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer text-right"
                onClick={() => handleSort("gain")}
              >
                <div className="flex items-center justify-end">
                  Gain/Loss {renderSortIndicator("gain")}
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(3).fill(0).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredAndSortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  {searchTerm ? "No positions matching your search" : "No positions in your portfolio"}
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedData.map((position) => {
                const currentPrice = latestPrices?.find(p => p.symbol === position.symbol)?.price || position.average_price;
                const currentValue = position.shares * currentPrice;
                const gainValue = currentValue - (position.shares * position.average_price);
                const gainPercent = ((currentPrice - position.average_price) / position.average_price) * 100;
                const isPositive = gainValue >= 0;
                
                return (
                  <TableRow key={position.id}>
                    <TableCell className="font-medium">{position.symbol}</TableCell>
                    <TableCell className="text-right">{position.shares.toFixed(position.shares % 1 === 0 ? 0 : 8)}</TableCell>
                    <TableCell className="text-right">${position.average_price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${currentValue.toFixed(2)}</TableCell>
                    <TableCell className={`text-right ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                      {isPositive ? '+' : ''}{gainPercent.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSellPosition(position)}
                      >
                        Sell
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PortfolioPositions;
