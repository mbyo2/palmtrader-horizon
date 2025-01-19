import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MarketOverview from "@/components/MarketOverview";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load components that aren't immediately visible
const StockList = lazy(() => import("@/components/StockList"));
const TradingView = lazy(() => import("@/components/Trading/TradingView"));
const PortfolioAnalytics = lazy(() => import("@/components/Trading/PortfolioAnalytics"));
const ResearchTools = lazy(() => import("@/components/Research/ResearchTools"));
const BankAccountManagement = lazy(() => import("@/components/Banking/BankAccountManagement"));
const FundTransfers = lazy(() => import("@/components/Banking/FundTransfers"));
const PriceAlertForm = lazy(() => import("@/components/Alerts/PriceAlertForm"));
const PriceAlertList = lazy(() => import("@/components/Alerts/PriceAlertList"));
const Comments = lazy(() => import("@/components/Social/Comments"));
const PopularStocks = lazy(() => import("@/components/Social/PopularStocks"));
const SocialShare = lazy(() => import("@/components/Social/SocialShare"));

// Loading fallback component
const LoadingFallback = () => (
  <div className="w-full h-48">
    <Skeleton className="w-full h-full" />
  </div>
);

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold gradient-text">
            Market Overview
          </h1>
          <Suspense fallback={<LoadingFallback />}>
            <SocialShare
              symbol="MARKET"
              title="Check out this amazing trading platform!"
            />
          </Suspense>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
          <div className="w-full overflow-x-auto">
            <MarketOverview />
          </div>
          <Suspense fallback={<LoadingFallback />}>
            <div className="w-full min-h-[400px]">
              <TradingView />
            </div>
          </Suspense>
        </div>

        <Suspense fallback={<LoadingFallback />}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
            <BankAccountManagement />
            <FundTransfers />
          </div>
        </Suspense>

        <Suspense fallback={<LoadingFallback />}>
          <div className="mb-6 sm:mb-8">
            <PortfolioAnalytics />
          </div>
        </Suspense>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
          <Suspense fallback={<LoadingFallback />}>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-4 gradient-text">
                Price Alerts
              </h2>
              <div className="space-y-4">
                <PriceAlertForm />
                <PriceAlertList />
              </div>
            </div>
          </Suspense>
          <Suspense fallback={<LoadingFallback />}>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-4 gradient-text">
                Research Tools
              </h2>
              <div className="overflow-x-auto">
                <ResearchTools />
              </div>
            </div>
          </Suspense>
        </div>

        <div className="space-y-6 sm:space-y-8">
          <Suspense fallback={<LoadingFallback />}>
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
          </Suspense>

          <Suspense fallback={<LoadingFallback />}>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-4 gradient-text">
                Community Discussion
              </h2>
              <div className="card-gradient p-4 sm:p-6 rounded-lg">
                <Comments />
              </div>
            </div>
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;