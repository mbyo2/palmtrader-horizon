
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import MarketOverview from "@/components/MarketOverview";
import StockList from "@/components/StockList";
import PortfolioPerformance from "@/components/Dashboard/PortfolioPerformance";
import MarketNews from "@/components/Research/MarketNews";
import PopularStocks from "@/components/Social/PopularStocks";
import NewsFeed from "@/components/Research/NewsFeed";
import { ArrowRight, TrendingUp, BarChart3, Clock, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Index() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
    };
    
    checkAuth();
  }, []);

  if (isLoggedIn === null) {
    return <div className="container py-6 flex items-center justify-center min-h-[60vh]">
      <div className="animate-pulse text-primary">Loading...</div>
    </div>;
  }

  return (
    <>
      {!isLoggedIn ? (
        <div className="container py-12 space-y-16">
          {/* Hero Section */}
          <section className="hero-section py-20 rounded-2xl">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <h1 className="text-4xl md:text-6xl font-bold gradient-text leading-tight">
                Investing Made Simple for Zambians
              </h1>
              <p className="text-xl text-foreground/80 max-w-2xl mx-auto">
                Join thousands of Zambians building wealth through smart investments in stocks, bonds, and more.
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <Button size="lg" onClick={() => navigate("/auth")} className="animated-gradient text-white">
                  Get Started
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/markets")}>
                  Explore Markets
                </Button>
              </div>
            </div>
          </section>

          {/* Feature Cards */}
          <section>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold">Why Choose Palm Cacia</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: "Zambian Focus",
                  description: "Tailored for Zambian investors with local market insights",
                  icon: <DollarSign className="h-10 w-10 text-primary" />
                },
                {
                  title: "Real-time Data",
                  description: "Get instant updates on market movements and opportunities",
                  icon: <Clock className="h-10 w-10 text-primary" />
                },
                {
                  title: "Smart Analytics",
                  description: "Powered by AI to help you make informed investment decisions",
                  icon: <BarChart3 className="h-10 w-10 text-primary" />
                },
                {
                  title: "Zero Commissions",
                  description: "Trade stocks with no commission fees - ever",
                  icon: <TrendingUp className="h-10 w-10 text-primary" />
                }
              ].map((feature, index) => (
                <Card key={index} className="feature-card">
                  <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                    {feature.icon}
                    <h3 className="text-xl font-bold">{feature.title}</h3>
                    <p className="text-foreground/70">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Market Highlight */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold">Market Highlights</h2>
              <Button variant="link" onClick={() => navigate("/markets")} className="gap-2">
                View all markets <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <MarketOverview />
          </section>

          {/* Latest News */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold">Latest News</h2>
              <Button variant="link" className="gap-2">
                More news <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <NewsFeed defaultCategory="general" limit={3} />
            </div>
          </section>

          {/* Call to Action */}
          <section className="bg-primary/5 p-12 rounded-2xl text-center space-y-6">
            <h2 className="text-3xl font-bold">Ready to start your investment journey?</h2>
            <p className="text-xl max-w-2xl mx-auto">
              Join thousands of Zambians who are growing their wealth with Palm Cacia
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="animated-gradient text-white">
              Create Your Account
            </Button>
          </section>
        </div>
      ) : (
        <div className="container py-6 space-y-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          
          <div className="grid gap-6 md:grid-cols-6">
            <div className="md:col-span-4">
              <PortfolioPerformance />
            </div>
            <div className="md:col-span-2">
              <PopularStocks />
            </div>
          </div>
          
          <MarketOverview />
          
          <div className="grid gap-6 md:grid-cols-6">
            <div className="md:col-span-4">
              <StockList />
            </div>
            <div className="md:col-span-2">
              <NewsFeed defaultCategory="general" limit={5} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
