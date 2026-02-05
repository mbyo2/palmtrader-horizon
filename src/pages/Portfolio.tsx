import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RealTimePortfolioSummary } from "@/components/Portfolio/RealTimePortfolioSummary";
import { RealTimePositionsList } from "@/components/Portfolio/RealTimePositionsList";
import EnhancedOrderHistory from "@/components/Trading/EnhancedOrderHistory";
import RecurringInvestments from "@/components/Trading/RecurringInvestments";
import WalletManager from "@/components/Trading/WalletManager";
import { ConnectionStatusIndicator } from "@/components/Trading/ConnectionStatusIndicator";
import { TradingErrorBoundary } from "@/components/ErrorBoundary/TradingErrorBoundary";
import TradingModeSwitch from "@/components/Trading/TradingModeSwitch";
import QuickTradePanel from "@/components/Trading/QuickTradePanel";
import AdvancedTradingForm from "@/components/Trading/AdvancedTradingForm";
import PositionSizer from "@/components/Trading/PositionSizer";
import RiskMetricsPanel from "@/components/Trading/RiskMetricsPanel";
import AccountTypeSelector from "@/components/Trading/AccountTypeSelector";
import TradingAccountsList from "@/components/Trading/TradingAccountsList";
import { TradingAccountProvider, useTradingAccount } from "@/hooks/useTradingAccount";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, LineChart } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

const PortfolioContent = () => {
  const { activeAccount, isLoading: isAccountLoading } = useTradingAccount();
  const [selectedSymbol] = useState("AAPL");
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [tradingView, setTradingView] = useState<'quick' | 'advanced'>('quick');

  if (isAccountLoading) {
    return (
      <div className="container py-6 flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-md">
          <div className="h-8 bg-muted rounded w-3/4 mx-auto" />
          <div className="h-32 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 sm:py-6 space-y-4 sm:space-y-6 px-3 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Portfolio & Trading</h1>
        <div className="flex items-center gap-2">
          <ConnectionStatusIndicator />
          <Dialog open={showAccountSelector} onOpenChange={setShowAccountSelector}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <AccountTypeSelector onAccountCreated={() => setShowAccountSelector(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Account Mode Switcher */}
      <TradingModeSwitch />

      <Tabs defaultValue="trading" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-5 h-auto gap-1">
          <TabsTrigger value="trading" className="text-xs sm:text-sm px-1 sm:px-3">Trading</TabsTrigger>
          <TabsTrigger value="portfolio" className="text-xs sm:text-sm px-1 sm:px-3">Portfolio</TabsTrigger>
          <TabsTrigger value="accounts" className="text-xs sm:text-sm px-1 sm:px-3">Accounts</TabsTrigger>
          <TabsTrigger value="wallet" className="text-xs sm:text-sm px-1 sm:px-3">Wallet</TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm px-1 sm:px-3">History</TabsTrigger>
        </TabsList>

        {/* Trading Tab */}
        <TabsContent value="trading" className="space-y-4 sm:space-y-6 mt-4">
          <TradingErrorBoundary>
            {/* Trading View Toggle */}
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant={tradingView === 'quick' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTradingView('quick')}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Quick Trade
              </Button>
              <Button
                variant={tradingView === 'advanced' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTradingView('advanced')}
              >
                <LineChart className="h-4 w-4 mr-2" />
                Advanced
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Trading Panel */}
              <div className="lg:col-span-2 space-y-6">
                {tradingView === 'quick' ? (
                  <QuickTradePanel symbol={selectedSymbol} />
                ) : (
                  <AdvancedTradingForm />
                )}
              </div>

              {/* Risk Management Sidebar */}
              <div className="space-y-6">
                <PositionSizer currentPrice={150} symbol={selectedSymbol} />
                <RiskMetricsPanel />
              </div>
            </div>
          </TradingErrorBoundary>
        </TabsContent>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="space-y-4 sm:space-y-6 mt-4">
          <RealTimePortfolioSummary />
          <RealTimePositionsList />
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4 sm:space-y-6 mt-4">
          <TradingAccountsList 
            onOpenNewAccount={() => setShowAccountSelector(true)}
          />
        </TabsContent>

        {/* Wallet Tab */}
        <TabsContent value="wallet" className="space-y-4 sm:space-y-6 mt-4">
          <WalletManager />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4 sm:space-y-6 mt-4">
          <TradingErrorBoundary>
            <EnhancedOrderHistory />
          </TradingErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Portfolio = () => {
  const { isLoading } = useProtectedRoute();

  if (isLoading) {
    return <div className="container py-6">Loading...</div>;
  }

  return (
    <TradingAccountProvider>
      <PortfolioContent />
    </TradingAccountProvider>
  );
};

export default Portfolio;
