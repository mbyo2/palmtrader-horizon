
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { MarketData } from "@/services/market/types";

interface StockInfoProps {
  symbol: string;
  price: number;
  change?: number;
  changePercent?: number;
  volume?: number;
}

const StockInfo = ({ symbol, price, change = 0, changePercent = 0, volume }: StockInfoProps) => {
  const isPositive = change >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{symbol}</span>
          <Badge variant={isPositive ? "default" : "destructive"}>
            {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {changePercent.toFixed(2)}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Current Price</span>
            <span className="font-semibold text-lg">${price.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Change</span>
            <span className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}${change.toFixed(2)}
            </span>
          </div>

          {volume && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Volume</span>
              <span className="font-medium">{volume.toLocaleString()}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StockInfo;
