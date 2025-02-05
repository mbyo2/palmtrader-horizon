
import { useAuth } from "@/hooks/useAuth";
import { lazy, Suspense, memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, DollarSign, LineChart, Building2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Optimize imports with code splitting
const MarketOverview = lazy(() => import("@/components/MarketOverview"));
const StockList = lazy(() => import("@/components/StockList"));
const ResearchTools = lazy(() => import("@/components/Research/ResearchTools"));
const TradingView = lazy(() => import("@/components/Trading/TradingView"));
const OptionsTrading = lazy(() => import("@/components/Trading/OptionsTrading"));
const RecurringInvestments = lazy(() => import("@/components/Trading/RecurringInvestments"));
const BankAccountManagement = lazy(() => import("@/components/Banking/BankAccountManagement"));
const FundTransfers = lazy(() => import("@/components/Banking/FundTransfers"));
const PortfolioAnalytics = lazy(() => import("@/components/Trading/PortfolioAnalytics"));
const CompanyFundamentals = lazy(() => import("@/components/Research/CompanyFundamentals"));
const AnalystRatings = lazy(() => import("@/components/Research/AnalystRatings"));
const MarketNews = lazy(() => import("@/components/Research/MarketNews"));
const PopularStocks = lazy(() => import("@/components/Social/PopularStocks"));
const Comments = lazy(() => import("@/components/Social/Comments"));
const UserFollowing = lazy(() => import("@/components/Social/UserFollowing"));
const SocialShare = lazy(() => import("@/components/Social/SocialShare"));
const UserManagement = lazy(() => import("@/components/Admin/UserManagement"));
const LocalBusinessManagement = lazy(() => import("@/components/Admin/LocalBusinessManagement"));

// Optimize QuickActionCard with memo
const QuickActionCard = memo(({ title, description, icon: Icon, onClick }: {
  title: string;
  description: string;
  icon: typeof TrendingUp;
  onClick: () => void;
}) => (
  <Card className="p-6 card-gradient hover:shadow-lg transition-all duration-200">
    <div className="flex items-start space-x-4">
      <div className="p-2 bg-primary/10 rounded-lg">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div className="flex-1">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-4">{description}</p>
        <Button onClick={onClick} className="w-full">
          View <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  </Card>
));

QuickActionCard.displayName = 'QuickActionCard';

// Main component with optimizations
const Index = memo(() => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-3xl font-bold gradient-text">Welcome to PalmCacia</h1>
      
      {/* Market Data Section with Suspense */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Market Overview</h2>
        <Suspense fallback={<Card className="h-40 animate-pulse" />}>
          <MarketOverview />
        </Suspense>
      </section>
      
      {/* Admin Section with Suspense */}
      {isAdmin() && (
        <Suspense fallback={<Card className="p-6 animate-pulse" />}>
          <UserManagement />
          <div className="mt-6">
            <LocalBusinessManagement />
          </div>
        </Suspense>
      )}
      
      {!user ? (
        <Card className="p-6 card-gradient">
          <h2 className="text-2xl font-bold mb-4">Get Started</h2>
          <p className="text-muted-foreground mb-4">
            Sign in or create an account to start trading and managing your portfolio.
          </p>
          <Button onClick={() => navigate('/auth')}>
            Get Started <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Card>
      ) : (
        <>
          {/* Quick Actions */}
          <div className="grid gap-6 md:grid-cols-3 content-visibility-auto">
            <QuickActionCard
              title="Markets"
              description="View real-time market data and trade your favorite stocks."
              icon={TrendingUp}
              onClick={() => navigate('/markets')}
            />
            <QuickActionCard
              title="Portfolio"
              description="Track your investments and manage your trading positions."
              icon={DollarSign}
              onClick={() => navigate('/portfolio')}
            />
            <QuickActionCard
              title="Research"
              description="Access market research, analysis, and company fundamentals."
              icon={LineChart}
              onClick={() => navigate('/research')}
            />
          </div>

          {/* Trading & Portfolio Section with Suspense */}
          <div className="grid gap-6 lg:grid-cols-2 content-visibility-auto">
            <div className="space-y-6">
              <Suspense fallback={<Card className="h-40 animate-pulse" />}>
                <section>
                  <h2 className="text-2xl font-semibold mb-4">Quick Trade</h2>
                  <TradingView />
                </section>
                
                <section>
                  <h2 className="text-2xl font-semibold mb-4">Options Trading</h2>
                  <OptionsTrading />
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">Recurring Investments</h2>
                  <RecurringInvestments />
                </section>
              </Suspense>
            </div>
            
            <div className="space-y-6">
              <Suspense fallback={<Card className="h-40 animate-pulse" />}>
                <section>
                  <h2 className="text-2xl font-semibold mb-4">Portfolio Analytics</h2>
                  <PortfolioAnalytics />
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">Banking</h2>
                  <BankAccountManagement />
                  <div className="mt-4">
                    <FundTransfers />
                  </div>
                </section>
              </Suspense>
            </div>
          </div>

          {/* Research & Analysis Section with Suspense */}
          <section className="space-y-6">
            <h2 className="text-2xl font-semibold">Research & Analysis</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <Suspense fallback={<Card className="h-40 animate-pulse" />}>
                <CompanyFundamentals symbol="AAPL" />
                <AnalystRatings symbol="AAPL" />
                <div className="lg:col-span-2">
                  <MarketNews symbol="AAPL" />
                </div>
              </Suspense>
            </div>
          </section>

          {/* Social Features Section with Suspense */}
          <section className="space-y-6">
            <h2 className="text-2xl font-semibold">Community</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <Suspense fallback={<Card className="h-40 animate-pulse" />}>
                <div>
                  <Card className="p-6">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Popular Stocks
                    </h3>
                    <PopularStocks />
                  </Card>
                </div>
                <div>
                  <Card className="p-6">
                    <h3 className="text-xl font-semibold mb-4">Community Discussion</h3>
                    <Comments symbol="AAPL" />
                  </Card>
                </div>
                <div className="lg:col-span-2 grid gap-6 md:grid-cols-2">
                  <UserFollowing userId={user?.id || ''} username="User" />
                  <SocialShare symbol="AAPL" title="Check out this stock on PalmCacia!" />
                </div>
              </Suspense>
            </div>
          </section>
        </>
      )}
      
      {/* Stock List Section with Suspense */}
      <section className="space-y-4 content-visibility-auto">
        <h2 className="text-2xl font-semibold">Popular Stocks</h2>
        <Suspense fallback={<Card className="h-40 animate-pulse" />}>
          <StockList />
        </Suspense>
      </section>
    </div>
  );
});

Index.displayName = 'Index';

export default Index;
