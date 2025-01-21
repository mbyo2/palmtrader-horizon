import { useAuth } from "@/hooks/useAuth";
import UserManagement from "@/components/Admin/UserManagement";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-3xl font-bold">Welcome to PalmCacia</h1>
      
      {isAdmin() && <UserManagement />}
      
      {!user ? (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Get Started</h2>
          <p className="text-muted-foreground mb-4">
            Sign in or create an account to start trading and managing your portfolio.
          </p>
          <Button onClick={() => navigate('/auth')}>
            Get Started <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Markets</h2>
            <p className="text-muted-foreground mb-4">
              View real-time market data and trade your favorite stocks.
            </p>
            <Button onClick={() => navigate('/markets')}>
              View Markets <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Card>
          
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Portfolio</h2>
            <p className="text-muted-foreground mb-4">
              Track your investments and manage your trading positions.
            </p>
            <Button onClick={() => navigate('/portfolio')}>
              View Portfolio <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Index;