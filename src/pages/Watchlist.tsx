import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import EnhancedStockCard from "@/components/StockList/EnhancedStockCard";
import { useWatchlistData } from "@/components/StockList/useWatchlistData";
import { Star, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Watchlist = () => {
  const { isLoading: authLoading } = useProtectedRoute();
  const { watchlistStocks, loading, error } = useWatchlistData();
  const navigate = useNavigate();

  if (authLoading || loading) {
    return (
      <div className="container py-6">
        <h1 className="text-3xl font-bold mb-6">Watchlist</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-6">
        <h1 className="text-3xl font-bold mb-6">Watchlist</h1>
        <Card className="p-6 text-center">
          <p className="text-destructive mb-2">Failed to load watchlist</p>
          <p className="text-sm text-muted-foreground">Please try refreshing the page</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Star className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Watchlist</h1>
        </div>
        <Button onClick={() => navigate('/markets')} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Stocks
        </Button>
      </div>
      
      {watchlistStocks.length === 0 ? (
        <Card className="p-12 text-center">
          <Star className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Your Watchlist is Empty</h2>
          <p className="text-muted-foreground mb-6">
            Start building your watchlist by adding stocks you want to track
          </p>
          <Button onClick={() => navigate('/markets')}>
            <Plus className="h-4 w-4 mr-2" />
            Browse Stocks
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {watchlistStocks.map((stock) => (
            <EnhancedStockCard key={stock.symbol} stock={stock} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Watchlist;