
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  BarChart4,
  LineChart,
  Gauge
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TechnicalIndicatorService, TechnicalIndicator } from "@/services/TechnicalIndicatorService";

const TechnicalIndicators = ({ symbol }: { symbol: string }) => {
  const { data: indicators, isLoading } = useQuery({
    queryKey: ["technical-indicators", symbol],
    queryFn: () => TechnicalIndicatorService.getIndicators(symbol),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Map indicator name to icon
  const getIndicatorIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case "rsi":
        return <Gauge className="h-4 w-4" />;
      case "macd":
        return <LineChart className="h-4 w-4" />;
      case "bollinger bands":
        return <Activity className="h-4 w-4" />;
      case "moving average (50)":
        return <LineChart className="h-4 w-4" />;
      case "stochastic oscillator":
        return <BarChart4 className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // Format value based on indicator type
  const formatValue = (indicator: TechnicalIndicator) => {
    if (indicator.name === "RSI" || indicator.name === "Stochastic Oscillator") {
      return indicator.value.toFixed(2);
    } else if (indicator.name === "MACD") {
      return indicator.value > 0 ? `+${indicator.value.toFixed(3)}` : indicator.value.toFixed(3);
    } else if (indicator.name.includes("Moving Average")) {
      return `$${indicator.value.toFixed(2)}`;
    } else {
      return indicator.value.toFixed(2);
    }
  };

  const getSignalBadge = (signal: string) => {
    switch (signal) {
      case "buy":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <TrendingUp className="h-3 w-3 mr-1" /> Buy
          </Badge>
        );
      case "sell":
        return (
          <Badge className="bg-red-500 hover:bg-red-600">
            <TrendingDown className="h-3 w-3 mr-1" /> Sell
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Activity className="h-3 w-3 mr-1" /> Neutral
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Technical Indicators</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-background/50 p-3 rounded-lg">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-6 w-16 mb-2" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Technical Indicators</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {indicators?.map((indicator) => (
          <div key={indicator.name} className="bg-background/50 p-3 rounded-lg border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getIndicatorIcon(indicator.name)}
                <p className="text-sm font-medium">{indicator.name}</p>
              </div>
              <p className="text-xs text-muted-foreground">{indicator.timeframe}</p>
            </div>
            <p className="text-lg font-semibold">{formatValue(indicator)}</p>
            <div className="mt-2">
              {getSignalBadge(indicator.signal)}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default TechnicalIndicators;
