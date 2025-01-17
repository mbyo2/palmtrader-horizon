import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { StockList } from "@/components/StockList";

const Watchlist = () => {
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
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">Watchlist</h1>
      <StockList type="watchlist" />
    </div>
  );
};

export default Watchlist;