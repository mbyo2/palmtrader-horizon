import { useParams, useNavigate } from "react-router-dom";
import { MobileTradingInterface } from "@/components/Trading/Mobile/MobileTradingInterface";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect } from "react";
import { TradingErrorBoundary } from "@/components/ErrorBoundary/TradingErrorBoundary";

const MobileTrade = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Redirect to regular trading page if not mobile
  useEffect(() => {
    if (!isMobile) {
      navigate(`/trade/${symbol}`);
    }
  }, [isMobile, navigate, symbol]);

  if (!symbol) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">No symbol provided</p>
      </div>
    );
  }

  // Mock data - replace with actual data fetching
  const stockData = {
    symbol: symbol.toUpperCase(),
    companyName: "Company Name Inc.",
    currentPrice: 150.25,
    priceChange: 2.35,
    priceChangePercent: 1.59,
  };

  return (
    <TradingErrorBoundary>
      <div className="relative">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 left-2 z-20 h-10 w-10"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <MobileTradingInterface
          symbol={stockData.symbol}
          companyName={stockData.companyName}
          currentPrice={stockData.currentPrice}
          priceChange={stockData.priceChange}
          priceChangePercent={stockData.priceChangePercent}
        />
      </div>
    </TradingErrorBoundary>
  );
};

export default MobileTrade;
