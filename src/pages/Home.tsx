
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { TrendingUp, Shield, DollarSign, BarChart3 } from "lucide-react";

const Home = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: TrendingUp,
      title: "Enhanced Trading",
      description: "Advanced order types with real-time execution",
      href: "/portfolio"
    },
    {
      icon: Shield,
      title: "KYC Verification",
      description: "Secure identity verification for enhanced limits",
      href: "/kyc"
    },
    {
      icon: DollarSign,
      title: "Fund Management",
      description: "Easy deposits and withdrawals",
      href: "/transfers"
    },
    {
      icon: BarChart3,
      title: "Market Data",
      description: "Real-time market information and analytics",
      href: "/markets"
    }
  ];

  return (
    <div className="container py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Welcome to Trading Platform</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {user 
            ? "Manage your portfolio and trade with advanced tools"
            : "Start your investment journey with our comprehensive trading platform"
          }
        </p>
        
        {!user && (
          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/auth">Get Started</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/markets">Explore Markets</Link>
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature) => (
          <Card key={feature.title} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <feature.icon className="h-8 w-8 text-primary" />
              <CardTitle className="text-lg">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                {feature.description}
              </CardDescription>
              <Button variant="outline" size="sm" asChild>
                <Link to={feature.href}>Learn More</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {user && (
        <div className="text-center">
          <Button size="lg" asChild>
            <Link to="/portfolio">Go to Portfolio</Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default Home;
