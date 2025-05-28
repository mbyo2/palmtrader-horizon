
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { TrendingUp, TrendingDown, Target, Shield, X, Zap } from "lucide-react";

interface Position {
  id: string;
  symbol: string;
  shares: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  dayChange: number;
  dayChangePercent: number;
  exposure: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface PositionManagerProps {
  positions: Position[];
  onClosePosition: (positionId: string) => void;
  onTrimPosition: (positionId: string, percentage: number) => void;
  onAddToPosition: (positionId: string) => void;
  onSetStopLoss: (positionId: string, price: number) => void;
}

const PositionManager = ({ 
  positions, 
  onClosePosition, 
  onTrimPosition, 
  onAddToPosition, 
  onSetStopLoss 
}: PositionManagerProps) => {
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

  const totalPortfolioValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);
  const totalUnrealizedPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
  const totalDayChange = positions.reduce((sum, pos) => sum + pos.dayChange, 0);

  const getPositionRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'high': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'default';
      case 'medium': return 'secondary';
      case 'high': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Position Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">${totalPortfolioValue.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Portfolio Value</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${totalUnrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalUnrealizedPnL >= 0 ? '+' : ''}${totalUnrealizedPnL.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Unrealized P&L</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${totalDayChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalDayChange >= 0 ? '+' : ''}${totalDayChange.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Day Change</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Positions List */}
      <Card>
        <CardHeader>
          <CardTitle>Open Positions ({positions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All Positions</TabsTrigger>
              <TabsTrigger value="winners">Winners</TabsTrigger>
              <TabsTrigger value="losers">Losers</TabsTrigger>
              <TabsTrigger value="high-risk">High Risk</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-4">
              {positions.map((position) => (
                <Card key={position.id} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                    <div>
                      <div className="font-semibold text-lg">{position.symbol}</div>
                      <div className="text-sm text-muted-foreground">
                        {position.shares} shares @ ${position.averagePrice.toFixed(2)}
                      </div>
                    </div>
                    
                    <div>
                      <div className="font-medium">${position.currentPrice.toFixed(2)}</div>
                      <div className={`text-sm ${position.dayChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {position.dayChangePercent >= 0 ? '+' : ''}{position.dayChangePercent.toFixed(2)}%
                      </div>
                    </div>
                    
                    <div>
                      <div className="font-medium">${position.marketValue.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Market Value</div>
                    </div>
                    
                    <div>
                      <div className={`font-medium ${position.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {position.unrealizedPnL >= 0 ? '+' : ''}${position.unrealizedPnL.toLocaleString()}
                      </div>
                      <div className={`text-sm ${position.unrealizedPnLPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {position.unrealizedPnLPercent >= 0 ? '+' : ''}{position.unrealizedPnLPercent.toFixed(2)}%
                      </div>
                    </div>
                    
                    <div>
                      <Badge variant={getRiskBadgeVariant(position.riskLevel)}>
                        {position.riskLevel.toUpperCase()}
                      </Badge>
                      <Progress 
                        value={(position.exposure / totalPortfolioValue) * 100} 
                        className="mt-1 h-2"
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        {((position.exposure / totalPortfolioValue) * 100).toFixed(1)}% of portfolio
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onAddToPosition(position.id)}
                      >
                        <Zap className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onTrimPosition(position.id, 50)}
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <X className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Close Position</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to close your entire {position.symbol} position?
                              This will sell all {position.shares} shares at the current market price.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => onClosePosition(position.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Close Position
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>
            
            <TabsContent value="winners">
              {positions.filter(p => p.unrealizedPnL > 0).map((position) => (
                <div key={position.id} className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <span className="font-semibold">{position.symbol}</span>
                    <Badge variant="default">+{position.unrealizedPnLPercent.toFixed(2)}%</Badge>
                  </div>
                </div>
              ))}
            </TabsContent>
            
            <TabsContent value="losers">
              {positions.filter(p => p.unrealizedPnL < 0).map((position) => (
                <div key={position.id} className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-500" />
                    <span className="font-semibold">{position.symbol}</span>
                    <Badge variant="destructive">{position.unrealizedPnLPercent.toFixed(2)}%</Badge>
                  </div>
                </div>
              ))}
            </TabsContent>
            
            <TabsContent value="high-risk">
              {positions.filter(p => p.riskLevel === 'high').map((position) => (
                <div key={position.id} className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-yellow-500" />
                    <span className="font-semibold">{position.symbol}</span>
                    <Badge variant="secondary">HIGH RISK</Badge>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PositionManager;
