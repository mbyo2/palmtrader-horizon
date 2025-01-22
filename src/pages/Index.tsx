import { useAuth } from "@/hooks/useAuth";
import { lazy, Suspense, memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MarketOverview from "@/components/MarketOverview";
import StockList from "@/components/StockList";
import ResearchTools from "@/components/Research/ResearchTools";
import TradingView from "@/components/Trading/TradingView";
import OptionsTrading from "@/components/Trading/OptionsTrading";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const UserManagement = lazy(() => import("@/components/Admin/UserManagement"));

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

const Index = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <div className="container py-6 space-y-6 defer-paint">
          <h1 className="text-3xl font-bold gradient-text">Welcome to PalmCacia</h1>
          
          <MarketOverview />
          
          {isAdmin() && (
            <Suspense fallback={<Card className="p-6 animate-pulse" />}>
              <UserManagement />
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
              <div className="grid gap-6 md:grid-cols-2 content-visibility-auto">
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
              </div>

              <div className="grid gap-6 lg:grid-cols-2 content-visibility-auto">
                <div className="space-y-6">
                  <Card className="p-6 card-gradient">
                    <h2 className="text-2xl font-bold mb-4">Quick Trade</h2>
                    <TradingView />
                  </Card>
                  
                  <Card className="p-6 card-gradient">
                    <h2 className="text-2xl font-bold mb-4">Options Trading</h2>
                    <OptionsTrading />
                  </Card>
                </div>
                
                <div className="space-y-6">
                  <Card className="p-6 card-gradient">
                    <h2 className="text-2xl font-bold mb-4">Research & Analysis</h2>
                    <ResearchTools />
                  </Card>
                </div>
              </div>
            </>
          )}
          
          <div className="space-y-6 content-visibility-auto">
            <h2 className="text-2xl font-bold">Popular Stocks</h2>
            <StockList />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default memo(Index);