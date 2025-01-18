import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface WatchlistButtonProps {
  symbol: string;
}

const WatchlistButton = ({ symbol }: WatchlistButtonProps) => {
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkWatchlistStatus();
  }, [symbol]);

  const checkWatchlistStatus = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from("watchlists")
        .select("*")
        .eq("symbol", symbol)
        .single();

      setIsInWatchlist(!!data);
      setIsLoading(false);
    } catch (error) {
      console.error("Error checking watchlist status:", error);
      setIsLoading(false);
    }
  };

  const toggleWatchlist = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to use the watchlist feature",
          variant: "destructive",
        });
        return;
      }

      if (isInWatchlist) {
        await supabase
          .from("watchlists")
          .delete()
          .eq("symbol", symbol);
        
        toast({
          title: "Removed from watchlist",
          description: `${symbol} has been removed from your watchlist`,
        });
      } else {
        await supabase
          .from("watchlists")
          .insert([{ 
            symbol,
            user_id: session.session.user.id 
          }]);
        
        toast({
          title: "Added to watchlist",
          description: `${symbol} has been added to your watchlist`,
        });
      }

      setIsInWatchlist(!isInWatchlist);
    } catch (error) {
      console.error("Error toggling watchlist:", error);
      toast({
        title: "Error",
        description: "Failed to update watchlist",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleWatchlist}
      className="hover:bg-background/50"
    >
      <Star
        className={`h-5 w-5 ${
          isInWatchlist ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
        }`}
      />
    </Button>
  );
};

export default WatchlistButton;