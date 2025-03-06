
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PortfolioManager from "@/components/Portfolio/PortfolioManager";
import TradingInterface from "@/components/Trading/TradingInterface";
import OrderHistory from "@/components/Trading/OrderHistory";
import RecurringInvestments from "@/components/Trading/RecurringInvestments";

const Portfolio = () => {
  const { isLoading } = useProtectedRoute();

  if (isLoading) {
    return <div className="container py-6">Loading...</div>;
  }

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-3xl font-bold">Portfolio & Trading</h1>
      
      <Tabs defaultValue="portfolio" className="space-y-6">
        <TabsList>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="trading">Trading</TabsTrigger>
          <TabsTrigger value="history">Order History</TabsTrigger>
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
        </TabsList>
        
        <TabsContent value="portfolio" className="space-y-6">
          <PortfolioManager />
        </TabsContent>
        
        <TabsContent value="trading" className="space-y-6">
          <TradingInterface />
        </TabsContent>
        
        <TabsContent value="history" className="space-y-6">
          <OrderHistory />
        </TabsContent>
        
        <TabsContent value="recurring" className="space-y-6">
          <RecurringInvestments />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Portfolio;
