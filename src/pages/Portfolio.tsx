
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PortfolioManager from "@/components/Portfolio/PortfolioManager";
import { RealTimePortfolioSummary } from "@/components/Portfolio/RealTimePortfolioSummary";
import { RealTimePositionsList } from "@/components/Portfolio/RealTimePositionsList";
import EnhancedTradingInterface from "@/components/Trading/EnhancedTradingInterface";
import EnhancedOrderHistory from "@/components/Trading/EnhancedOrderHistory";
import RecurringInvestments from "@/components/Trading/RecurringInvestments";
import WalletManager from "@/components/Trading/WalletManager";
import { ConnectionStatusIndicator } from "@/components/Trading/ConnectionStatusIndicator";
import { TradingErrorBoundary } from "@/components/ErrorBoundary/TradingErrorBoundary";

const Portfolio = () => {
  const { isLoading } = useProtectedRoute();

  if (isLoading) {
    return <div className="container py-6">Loading...</div>;
  }

  return (
    <div className="container py-4 sm:py-6 space-y-4 sm:space-y-6 px-3 sm:px-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">Portfolio & Trading</h1>
        <ConnectionStatusIndicator />
      </div>
      
      <Tabs defaultValue="portfolio" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5 h-auto gap-1">
          <TabsTrigger value="portfolio" className="text-xs sm:text-sm px-1 sm:px-3">Portfolio</TabsTrigger>
          <TabsTrigger value="wallet" className="text-xs sm:text-sm px-1 sm:px-3">Wallet</TabsTrigger>
          <TabsTrigger value="trading" className="text-xs sm:text-sm px-1 sm:px-3 hidden lg:inline-flex">Trading</TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm px-1 sm:px-3">History</TabsTrigger>
          <TabsTrigger value="recurring" className="text-xs sm:text-sm px-1 sm:px-3 hidden lg:inline-flex">Recurring</TabsTrigger>
        </TabsList>
        
        <TabsContent value="portfolio" className="space-y-4 sm:space-y-6 mt-4">
          <RealTimePortfolioSummary />
          <RealTimePositionsList />
        </TabsContent>
        
        <TabsContent value="wallet" className="space-y-4 sm:space-y-6 mt-4">
          <WalletManager />
        </TabsContent>
        
        <TabsContent value="trading" className="space-y-4 sm:space-y-6 mt-4">
          <TradingErrorBoundary>
            <EnhancedTradingInterface />
          </TradingErrorBoundary>
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4 sm:space-y-6 mt-4">
          <TradingErrorBoundary>
            <EnhancedOrderHistory />
          </TradingErrorBoundary>
        </TabsContent>
        
        <TabsContent value="recurring" className="space-y-4 sm:space-y-6 mt-4">
          <RecurringInvestments />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Portfolio;
