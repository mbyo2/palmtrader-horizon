import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PortfolioAnalytics } from "@/components/Trading/PortfolioAnalytics";
import { OrderHistory } from "@/components/Trading/OrderHistory";
import { RecurringInvestments } from "@/components/Trading/RecurringInvestments";

const Portfolio = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
      }
    };
    
    checkAuth();
  }, [navigate]);

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-3xl font-bold">Portfolio</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <PortfolioAnalytics />
        <RecurringInvestments />
      </div>
      
      <OrderHistory />
    </div>
  );
};

export default Portfolio;