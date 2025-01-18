import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MarketOverview from "@/components/MarketOverview";
import StockList from "@/components/StockList";
import TradingView from "@/components/Trading/TradingView";
import OrderHistory from "@/components/Trading/OrderHistory";
import OptionsTrading from "@/components/Trading/OptionsTrading";
import RecurringInvestments from "@/components/Trading/RecurringInvestments";
import PortfolioAnalytics from "@/components/Trading/PortfolioAnalytics";
import ResearchTools from "@/components/Research/ResearchTools";
import Comments from "@/components/Social/Comments";
import PopularStocks from "@/components/Social/PopularStocks";
import SocialShare from "@/components/Social/SocialShare";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold gradient-text">
            Market Overview
          </h1>
          <SocialShare symbol="MARKET" title="Check out this amazing trading platform!" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
          <div className="w-full overflow-x-auto">
            <MarketOverview />
          </div>
          <div className="w-full min-h-[400px]">
            <TradingView />
          </div>
        </div>

        <div className="mb-6 sm:mb-8">
          <PortfolioAnalytics />
        </div>

        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 gradient-text">Research Tools</h2>
          <div className="overflow-x-auto">
            <ResearchTools />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
          <div className="card-gradient p-4 sm:p-6 rounded-lg">
            <OptionsTrading />
          </div>
          <div className="card-gradient p-4 sm:p-6 rounded-lg">
            <RecurringInvestments />
          </div>
        </div>

        <div className="space-y-6 sm:space-y-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold mb-4 gradient-text">
              Order History
            </h2>
            <div className="overflow-x-auto">
              <OrderHistory />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-4 gradient-text">
                Popular Stocks
              </h2>
              <div className="card-gradient p-4 sm:p-6 rounded-lg">
                <PopularStocks />
              </div>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-4 gradient-text">
                Stock List
              </h2>
              <div className="card-gradient p-4 sm:p-6 rounded-lg">
                <StockList />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold mb-4 gradient-text">
              Community Discussion
            </h2>
            <div className="card-gradient p-4 sm:p-6 rounded-lg">
              <Comments />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;