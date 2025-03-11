
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
      <CardHeader>
        <CardTitle>Market Data</CardTitle>
        <CardDescription>Real-time price, historical data, and recent account activity</CardDescription>
      </CardHeader>
      <Tabs defaultValue="chart">
        <TabsList className="px-6">
          <TabsTrigger value="chart">Stock Chart</TabsTrigger>
          <TabsTrigger value="transactions">Recent Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="chart">
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
        </TabsContent>
        <TabsContent value="transactions">
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No recent transactions
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <div className="font-medium capitalize">
                        {transaction.type === "buy" ? "Buy" : 
                         transaction.type === "sell" ? "Sell" :
                         transaction.type === "deposit" ? "Deposit" : "Withdrawal"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(transaction.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${
                        transaction.type === "buy" || transaction.type === "withdrawal" 
                          ? "text-red-500" 
                          : "text-green-500"
                      }`}>
                        {transaction.type === "buy" || transaction.type === "withdrawal" ? "-" : "+"}
                        ${transaction.amount.toFixed(2)}
                      </div>
                      <div className="text-sm capitalize">
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
