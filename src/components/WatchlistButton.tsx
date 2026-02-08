
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface WatchlistButtonProps {
  symbol: string;
}

const WatchlistButton = ({ symbol }: WatchlistButtonProps) => {
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

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
        .select()
        .eq("user_id", session.session.user.id)
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
        });
        navigate('/auth');
        return;
      }

      if (isInWatchlist) {
        await supabase
          .from("watchlists")
          .delete()
          .eq("user_id", session.session.user.id)
          .eq("symbol", symbol);

        setIsInWatchlist(false);
        toast({
          title: "Removed from watchlist",
          description: `${symbol} has been removed from your watchlist`,
        });
      } else {
        await supabase.from("watchlists").insert({
          user_id: session.session.user.id,
          symbol,
        });

        setIsInWatchlist(true);
        toast({
          title: "Added to watchlist",
          description: `${symbol} has been added to your watchlist`,
        });
      }
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
    return (
      <div className="p-2">
        <Star className="h-6 w-6 text-muted-foreground animate-pulse" />
      </div>
    );
  }

  return (
    <button
      onClick={toggleWatchlist}
      aria-label={isInWatchlist ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
      title={isInWatchlist ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
      className={`p-2 rounded-full transition-colors ${
        isInWatchlist
          ? "text-yellow-500 hover:text-yellow-600"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Star className="h-6 w-6" fill={isInWatchlist ? "currentColor" : "none"} />
    </button>
  );
};

export default WatchlistButton;
