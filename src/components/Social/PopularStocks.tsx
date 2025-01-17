import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { TrendingUp, Users } from "lucide-react";
import { Link } from "react-router-dom";

interface PopularStock {
  symbol: string;
  comment_count: number;
  unique_users: number;
}

const PopularStocks = () => {
  const { data: popularStocks, isLoading } = useQuery({
    queryKey: ["popularStocks"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_popular_stocks");
      if (error) throw error;
      return data as PopularStock[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-4 animate-pulse bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {popularStocks?.map((stock) => (
        <Link to={`/stocks/${stock.symbol}`} key={stock.symbol}>
          <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-foreground">{stock.symbol}</h3>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span className="flex items-center">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    {stock.comment_count} comments
                  </span>
                  <span className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {stock.unique_users} users
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
};

export default PopularStocks;