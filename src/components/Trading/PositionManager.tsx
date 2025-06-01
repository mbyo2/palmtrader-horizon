
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PositionService, Position } from "@/services/PositionService";
import { toast } from "sonner";

const PositionManager = () => {
  const { user } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

  useEffect(() => {
    if (user) {
      loadPositions();
    }
  }, [user]);

  const loadPositions = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const userPositions = await PositionService.getUserPositions(user.id);
      setPositions(userPositions);
    } catch (error) {
      console.error('Error loading positions:', error);
      toast.error('Failed to load positions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClosePosition = async (positionId: string) => {
    try {
      await PositionService.closePosition(positionId);
      toast.success('Position closed successfully');
      loadPositions();
    } catch (error) {
      console.error('Error closing position:', error);
      toast.error('Failed to close position');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Position Manager
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active Positions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="space-y-4">
            {positions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No active positions
              </div>
            ) : (
              positions.map((position) => (
                <Card key={position.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{position.symbol}</h3>
                      <p className="text-sm text-muted-foreground">
                        {position.shares} shares @ {formatCurrency(position.averagePrice)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <Badge variant={position.unrealizedPL >= 0 ? "default" : "destructive"}>
                          {position.unrealizedPL >= 0 ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {formatCurrency(position.unrealizedPL)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatPercentage(position.percentChange)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Market Value</p>
                      <p className="font-medium">{formatCurrency(position.marketValue)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cost Basis</p>
                      <p className="font-medium">{formatCurrency(position.costBasis)}</p>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Risk Level</span>
                      <span>{position.riskLevel}/10</span>
                    </div>
                    <Progress value={position.riskLevel * 10} className="h-2" />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedPosition(position)}
                    >
                      View Details
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleClosePosition(position.id)}
                    >
                      Close Position
                    </Button>
                  </div>
                  
                  {position.riskLevel >= 7 && (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-800">High risk position - consider review</span>
                    </div>
                  )}
                </Card>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Total P&L</span>
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(positions.reduce((sum, pos) => sum + pos.unrealizedPL, 0))}
                </p>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Total Value</span>
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(positions.reduce((sum, pos) => sum + pos.marketValue, 0))}
                </p>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-muted-foreground">Avg. Return</span>
                </div>
                <p className="text-2xl font-bold">
                  {formatPercentage(
                    positions.length > 0 
                      ? positions.reduce((sum, pos) => sum + pos.percentChange, 0) / positions.length
                      : 0
                  )}
                </p>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PositionManager;
