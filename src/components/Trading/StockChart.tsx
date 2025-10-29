
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdvancedStockChart } from "../Research/AdvancedStockChart";

interface RecentTransaction {
  id: string;
  type: "buy" | "sell" | "deposit" | "withdrawal";
  amount: number;
  timestamp: string;
  status: string;
}

interface StockChartProps {
  symbol: string;
  historicalData: any[];
  isHistoricalLoading: boolean;
  recentTransactions?: RecentTransaction[];
}

const StockChart = ({ 
  symbol, 
  historicalData, 
  isHistoricalLoading,
  recentTransactions = []
}: StockChartProps) => {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg sm:text-xl">Market Data</CardTitle>
        <CardDescription className="text-sm">Real-time price, historical data, and recent account activity</CardDescription>
      </CardHeader>
      <Tabs defaultValue="chart" className="w-full">
        <TabsList className="px-4 sm:px-6 grid w-full grid-cols-2">
          <TabsTrigger value="chart" className="text-xs sm:text-sm">Stock Chart</TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs sm:text-sm">Recent Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="chart" className="mt-0">
          <CardContent className="p-3 sm:p-6">
            {isHistoricalLoading ? (
              <div className="h-[300px] sm:h-[400px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : historicalData && historicalData.length > 0 ? (
              <AdvancedStockChart symbol={symbol} data={historicalData} compact={true} />
            ) : (
              <div className="h-[300px] sm:h-[400px] flex items-center justify-center text-muted-foreground text-sm text-center px-4">
                No historical data available for {symbol}
              </div>
            )}
          </CardContent>
        </TabsContent>
        <TabsContent value="transactions" className="mt-0">
          <CardContent className="p-3 sm:p-6">
            {recentTransactions.length === 0 ? (
              <div className="h-[200px] sm:h-[250px] flex items-center justify-center text-muted-foreground text-sm text-center">
                No recent transactions
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3 max-h-[400px] overflow-y-auto">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-2 sm:p-3 border rounded-md hover:bg-accent/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium capitalize text-sm sm:text-base truncate">
                        {transaction.type === "buy" ? "Buy" : 
                         transaction.type === "sell" ? "Sell" :
                         transaction.type === "deposit" ? "Deposit" : "Withdrawal"}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        {new Date(transaction.timestamp).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className={`font-medium text-sm sm:text-base ${
                        transaction.type === "buy" || transaction.type === "withdrawal" 
                          ? "text-red-500" 
                          : "text-green-500"
                      }`}>
                        {transaction.type === "buy" || transaction.type === "withdrawal" ? "-" : "+"}
                        ${transaction.amount.toFixed(2)}
                      </div>
                      <div className="text-xs sm:text-sm capitalize text-muted-foreground">
                        {transaction.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default StockChart;
