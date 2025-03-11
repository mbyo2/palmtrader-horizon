
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdvancedStockChart } from "../Research/AdvancedStockChart";

interface StockChartProps {
  symbol: string;
  historicalData: any[];
  isHistoricalLoading: boolean;
}

const StockChart = ({ symbol, historicalData, isHistoricalLoading }: StockChartProps) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Stock Chart</CardTitle>
        <CardDescription>Real-time price and historical data</CardDescription>
      </CardHeader>
      <CardContent>
        {isHistoricalLoading ? (
          <div className="h-[400px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : historicalData && historicalData.length > 0 ? (
          <AdvancedStockChart symbol={symbol} data={historicalData} compact={true} />
        ) : (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            No historical data available for {symbol}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StockChart;
