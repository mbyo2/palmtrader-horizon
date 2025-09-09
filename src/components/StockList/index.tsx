
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import SearchBar from "./SearchBar";
import VirtualList from "./VirtualList";
import MobileList from "./MobileList";
import { StockListSkeleton } from "./StockListSkeleton";
import { useStockData } from "./useStockData";
import { toast } from "sonner";
import ErrorPage from "@/components/ErrorPage";
import EnhancedErrorBoundary from "@/components/EnhancedErrorBoundary";
import { devConsole } from "@/utils/consoleCleanup";

const StockList = () => {
  const [search, setSearch] = useState("");
  const isMobile = useIsMobile();
  const { filteredStocks, loading, error } = useStockData(search);

  if (error) {
    return (
      <ErrorPage 
        statusCode={500}
        title="Error loading stocks"
        description={error.message}
        error={error}
      />
    );
  }
  
  if (loading) {
    return <StockListSkeleton />;
  }

  return (
    <EnhancedErrorBoundary
      onError={(error) => {
        toast.error("An error occurred while displaying stocks");
        devConsole.error("StockList error:", error);
      }}
    >
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
    </EnhancedErrorBoundary>
  );
};

export default StockList;
