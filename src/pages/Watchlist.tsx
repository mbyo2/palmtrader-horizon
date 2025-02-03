import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import StockList from "@/components/StockList";

const Watchlist = () => {
  const { isLoading } = useProtectedRoute();

  if (isLoading) {
    return <div className="container py-6">Loading...</div>;
  }

  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">Watchlist</h1>
      <StockList />
    </div>
  );
};

export default Watchlist;