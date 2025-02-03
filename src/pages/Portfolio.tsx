import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import PortfolioAnalytics from "@/components/Trading/PortfolioAnalytics";
import OrderHistory from "@/components/Trading/OrderHistory";
import RecurringInvestments from "@/components/Trading/RecurringInvestments";

const Portfolio = () => {
  const { isLoading } = useProtectedRoute();

  if (isLoading) {
    return <div className="container py-6">Loading...</div>;
  }

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-3xl font-bold">Portfolio</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <PortfolioAnalytics />
        <RecurringInvestments />
      </div>
      
      <OrderHistory />
    </div>
  );
};

export default Portfolio;