import Navbar from "@/components/Navbar";
import MarketOverview from "@/components/MarketOverview";
import StockList from "@/components/StockList";
import TradingView from "@/components/Trading/TradingView";
import OrderHistory from "@/components/Trading/OrderHistory";
import OptionsTrading from "@/components/Trading/OptionsTrading";
import RecurringInvestments from "@/components/Trading/RecurringInvestments";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold mb-8 gradient-text">
          Market Overview
        </h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <MarketOverview />
          <TradingView />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <OptionsTrading />
          <RecurringInvestments />
        </div>
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-4 gradient-text">
              Order History
            </h2>
            <OrderHistory />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-4 gradient-text">
              Popular Stocks
            </h2>
            <StockList />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;