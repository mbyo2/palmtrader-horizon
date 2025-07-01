
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MarketOverview from "@/components/MarketOverview";
import StockList from "@/components/StockList";
import PortfolioPerformance from "@/components/Dashboard/PortfolioPerformance";
import MarketNews from "@/components/Research/MarketNews";
import PopularStocks from "@/components/Social/PopularStocks";
import NewsFeed from "@/components/Research/NewsFeed";
import { ArrowRight, TrendingUp, BarChart3, Clock, DollarSign, Star, Users, Shield, Zap } from "lucide-react";
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
    return (
      <div className="container py-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="text-primary font-medium">Loading your experience...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {!isLoggedIn ? (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
          <div className="container py-12 space-y-20">
            {/* Enhanced Hero Section */}
            <section className="relative overflow-hidden py-24 rounded-3xl bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/5 border border-border/50">
              <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
              <div className="relative max-w-6xl mx-auto text-center space-y-8">
                <Badge variant="secondary" className="px-4 py-2 text-sm font-medium mb-4">
                  🚀 Trusted by 10,000+ Zambian Investors
                </Badge>
                <h1 className="text-5xl md:text-7xl font-bold gradient-text leading-tight">
                  Your Wealth Journey
                  <br />
                  <span className="text-primary">Starts Here</span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                  Join the smartest Zambians building generational wealth through intelligent investing. 
                  Zero fees. Real returns. Maximum growth.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
                  <Button 
                    size="lg" 
                    onClick={() => navigate("/auth")} 
                    className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-semibold px-8 py-4 h-auto text-lg shadow-lg"
                  >
                    Start Investing Today
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    onClick={() => navigate("/markets")}
                    className="border-2 border-primary/20 hover:bg-primary/10 font-semibold px-8 py-4 h-auto text-lg"
                  >
                    Explore Markets
                  </Button>
                </div>
                
                {/* Trust Indicators */}
                <div className="grid grid-cols-3 gap-8 pt-12 max-w-2xl mx-auto">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">K50M+</div>
                    <div className="text-sm text-muted-foreground">Assets Under Management</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">10,000+</div>
                    <div className="text-sm text-muted-foreground">Active Investors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">24/7</div>
                    <div className="text-sm text-muted-foreground">Market Access</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Enhanced Feature Cards */}
            <section>
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold mb-4">Why Choose Palm Cacia</h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Everything you need to build wealth, all in one beautiful platform
                </p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  {
                    title: "Zambian Focus",
                    description: "Tailored for Zambian investors with deep local market insights and currency support",
                    icon: <DollarSign className="h-12 w-12 text-primary" />,
                    color: "from-green-500/10 to-emerald-500/10",
                    border: "border-green-500/20"
                  },
                  {
                    title: "Real-time Data",
                    description: "Lightning-fast market updates with institutional-grade data feeds",
                    icon: <Clock className="h-12 w-12 text-blue-500" />,
                    color: "from-blue-500/10 to-cyan-500/10",
                    border: "border-blue-500/20"
                  },
                  {
                    title: "AI-Powered Analytics",
                    description: "Smart insights and personalized recommendations powered by advanced AI",
                    icon: <BarChart3 className="h-12 w-12 text-purple-500" />,
                    color: "from-purple-500/10 to-pink-500/10",
                    border: "border-purple-500/20"
                  },
                  {
                    title: "Zero Commissions",
                    description: "Trade stocks, bonds, and ETFs with absolutely no commission fees",
                    icon: <TrendingUp className="h-12 w-12 text-orange-500" />,
                    color: "from-orange-500/10 to-red-500/10",
                    border: "border-orange-500/20"
                  }
                ].map((feature, index) => (
                  <Card key={index} className={`group relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl ${feature.border} bg-gradient-to-br ${feature.color}`}>
                    <CardContent className="p-8 text-center space-y-6">
                      <div className="mx-auto w-20 h-20 rounded-full bg-background/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        {feature.icon}
                      </div>
                      <h3 className="text-xl font-bold">{feature.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Live Market Preview */}
            <section className="bg-card/50 backdrop-blur-sm rounded-3xl p-8 border border-border/50">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Live Market Data</h2>
                  <p className="text-muted-foreground">Real-time insights from global markets</p>
                </div>
                <Badge variant="secondary" className="px-3 py-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  Live
                </Badge>
              </div>
              <MarketOverview />
            </section>

            {/* Social Proof & News */}
            <section>
              <div className="grid lg:grid-cols-2 gap-12">
                <div>
                  <h2 className="text-3xl font-bold mb-6">Latest Market News</h2>
                  <NewsFeed defaultCategory="general" limit={4} />
                </div>
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold">Join Our Community</h2>
                  <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-6 border border-primary/20">
                    <div className="flex items-center space-x-4 mb-4">
                      <Users className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-semibold">10,000+ Active Investors</h3>
                        <p className="text-sm text-muted-foreground">Growing every day</p>
                      </div>
                    </div>
                    <p className="text-sm mb-4">
                      Connect with like-minded investors, share insights, and learn from the community.
                    </p>
                    <Button variant="outline" size="sm">
                      Join Community
                    </Button>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-2xl p-6 border border-green-500/20">
                    <div className="flex items-center space-x-4 mb-4">
                      <Shield className="h-8 w-8 text-green-500" />
                      <div>
                        <h3 className="font-semibold">Bank-Level Security</h3>
                        <p className="text-sm text-muted-foreground">Your money is safe</p>
                      </div>
                    </div>
                    <p className="text-sm">
                      256-bit encryption, cold storage, and regulatory compliance ensure your investments are protected.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Enhanced CTA */}
            <section className="relative overflow-hidden">
              <div className="bg-gradient-to-r from-primary via-secondary to-primary p-12 rounded-3xl text-center space-y-8 text-white">
                <div className="absolute inset-0 bg-black/20 rounded-3xl"></div>
                <div className="relative z-10">
                  <Zap className="h-16 w-16 mx-auto mb-6" />
                  <h2 className="text-4xl font-bold mb-4">Ready to Build Your Wealth?</h2>
                  <p className="text-xl opacity-90 max-w-2xl mx-auto mb-8">
                    Join thousands of successful Zambian investors who are already growing their portfolios with Palm Cacia
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button 
                      size="lg" 
                      onClick={() => navigate("/auth")} 
                      className="bg-white text-primary hover:bg-gray-100 font-semibold px-8 py-4 h-auto text-lg"
                    >
                      Create Free Account
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="border-white text-white hover:bg-white/10 font-semibold px-8 py-4 h-auto text-lg"
                    >
                      Watch Demo
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gradient-to-br from-background to-primary/5">
          <div className="container py-8 space-y-8">
            {/* Enhanced Dashboard Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div>
                <h1 className="text-4xl font-bold gradient-text">Welcome Back!</h1>
                <p className="text-muted-foreground text-lg">Here's what's happening with your investments today</p>
              </div>
              <div className="flex space-x-3">
                <Button variant="outline" className="border-primary/20 hover:bg-primary/10">
                  <Star className="h-4 w-4 mr-2" />
                  Watchlist
                </Button>
                <Button className="bg-gradient-to-r from-primary to-secondary text-white">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Start Trading
                </Button>
              </div>
            </div>
            
            {/* Enhanced Dashboard Grid */}
            <div className="grid gap-8 lg:grid-cols-6">
              <div className="lg:col-span-4 space-y-8">
                <Card className="bg-gradient-to-r from-card to-card/50 border-border/50 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      <span>Portfolio Performance</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PortfolioPerformance />
                  </CardContent>
                </Card>
                
                <MarketOverview />
                
                <Card className="bg-gradient-to-r from-card to-card/50 border-border/50 shadow-lg">
                  <CardHeader>
                    <CardTitle>Market Opportunities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StockList />
                  </CardContent>
                </Card>
              </div>
              
              <div className="lg:col-span-2 space-y-8">
                <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-primary">Trending Stocks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PopularStocks />
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                  <CardHeader>
                    <CardTitle className="text-blue-600 dark:text-blue-400">Latest News</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <NewsFeed defaultCategory="general" limit={5} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
