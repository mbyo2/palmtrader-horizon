
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import SearchBar from "./SearchBar";
import VirtualList from "./VirtualList";
import MobileList from "./MobileList";
import { useStockData } from "./useStockData";

const StockList = () => {
  const [search, setSearch] = useState("");
  const isMobile = useIsMobile();
  const { filteredStocks, loading, error } = useStockData(search);
  
  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">Error loading stocks: {error.message}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-primary text-white rounded-md"
        >
          Reload
        </button>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-full max-w-md bg-muted animate-pulse rounded-md"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-md"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchBar search={search} setSearch={setSearch} />
      
      {filteredStocks.length === 0 ? (
        <div className="text-center p-8 border border-border rounded-md">
          <p className="text-muted-foreground">No stocks found matching "{search}"</p>
        </div>
      ) : isMobile ? (
        <MobileList stocks={filteredStocks} />
      ) : (
        <VirtualList stocks={filteredStocks} />
      )}
    </div>
  );
};

export default StockList;
