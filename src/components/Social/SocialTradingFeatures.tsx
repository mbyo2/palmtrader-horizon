
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Users, TrendingUp, Copy, Star, Award, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface TopTrader {
  id: string;
  username: string;
  avatar_url?: string;
  returnPercentage: number;
  followers: number;
  trades: number;
  winRate: number;
  riskScore: number;
  verified: boolean;
  specialization?: string;
}

interface CopyTrade {
  id: string;
  originalTrader: TopTrader;
  symbol: string;
  action: 'buy' | 'sell';
  amount: number;
  timestamp: Date;
  status: 'pending' | 'executed' | 'failed';
}

const SocialTradingFeatures = () => {
  const { user } = useAuth();
  const [topTraders, setTopTraders] = useState<TopTrader[]>([]);
  const [copiedTrades, setCopiedTrades] = useState<CopyTrade[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadTopTraders();
    loadCopiedTrades();
  }, []);

  const loadTopTraders = async () => {
    // Mock data for top traders
    const mockTraders: TopTrader[] = [
      {
        id: '1',
        username: 'StockMaster2024',
        returnPercentage: 127.5,
        followers: 15420,
        trades: 342,
        winRate: 78.3,
        riskScore: 6.2,
        verified: true,
        specialization: 'Tech Stocks'
      },
      {
        id: '2',
        username: 'DividendKing',
        returnPercentage: 89.2,
        followers: 8930,
        trades: 156,
        winRate: 83.1,
        riskScore: 3.8,
        verified: true,
        specialization: 'Dividend Growth'
      },
      {
        id: '3',
        username: 'ValueHunter',
        returnPercentage: 156.8,
        followers: 12100,
        trades: 289,
        winRate: 71.2,
        riskScore: 7.5,
        verified: false,
        specialization: 'Value Investing'
      },
      {
        id: '4',
        username: 'CryptoQueen',
        returnPercentage: 234.6,
        followers: 22500,
        trades: 567,
        winRate: 68.9,
        riskScore: 8.9,
        verified: true,
        specialization: 'Cryptocurrency'
      }
    ];
    setTopTraders(mockTraders);
  };

  const loadCopiedTrades = async () => {
    // Mock copied trades data
    const mockCopiedTrades: CopyTrade[] = [
      {
        id: '1',
        originalTrader: topTraders[0],
        symbol: 'AAPL',
        action: 'buy',
        amount: 500,
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        status: 'executed'
      },
      {
        id: '2',
        originalTrader: topTraders[1],
        symbol: 'MSFT',
        action: 'buy',
        amount: 750,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        status: 'pending'
      }
    ];
    setCopiedTrades(mockCopiedTrades);
  };

  const handleFollowTrader = async (traderId: string) => {
    if (!user) {
      toast.error('Please log in to follow traders');
      return;
    }

    setIsLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (following.includes(traderId)) {
        setFollowing(prev => prev.filter(id => id !== traderId));
        toast.success('Unfollowed trader');
      } else {
        setFollowing(prev => [...prev, traderId]);
        toast.success('Now following trader');
      }
    } catch (error) {
      toast.error('Failed to update following status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyTrade = async (traderId: string) => {
    if (!user) {
      toast.error('Please log in to copy trades');
      return;
    }

    setIsLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Copy trading enabled for this trader');
    } catch (error) {
      toast.error('Failed to enable copy trading');
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore <= 3) return 'text-green-600';
    if (riskScore <= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskLabel = (riskScore: number) => {
    if (riskScore <= 3) return 'Low Risk';
    if (riskScore <= 6) return 'Medium Risk';
    return 'High Risk';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const TraderCard = ({ trader }: { trader: TopTrader }) => (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Avatar>
          <AvatarImage src={trader.avatar_url} />
          <AvatarFallback>{trader.username.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{trader.username}</h3>
            {trader.verified && (
              <Badge variant="secondary" className="text-xs">
                <Award className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
          
          {trader.specialization && (
            <p className="text-sm text-muted-foreground mb-2">
              Specializes in {trader.specialization}
            </p>
          )}
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs text-muted-foreground">12M Return</p>
              <p className="font-semibold text-green-600">+{trader.returnPercentage}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <p className="font-semibold">{trader.winRate}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Followers</p>
              <p className="font-semibold">{trader.followers.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Trades</p>
              <p className="font-semibold">{trader.trades}</p>
            </div>
          </div>
          
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span>Risk Level</span>
              <span className={getRiskColor(trader.riskScore)}>
                {getRiskLabel(trader.riskScore)}
              </span>
            </div>
            <Progress value={trader.riskScore * 10} className="h-2" />
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={following.includes(trader.id) ? "outline" : "default"}
              onClick={() => handleFollowTrader(trader.id)}
              disabled={isLoading}
            >
              <Users className="h-3 w-3 mr-1" />
              {following.includes(trader.id) ? 'Following' : 'Follow'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCopyTrade(trader.id)}
              disabled={isLoading}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Social Trading
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="traders">
          <TabsList className="mb-4">
            <TabsTrigger value="traders">Top Traders</TabsTrigger>
            <TabsTrigger value="copied">Copied Trades</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="traders" className="space-y-4">
            {topTraders.map(trader => (
              <TraderCard key={trader.id} trader={trader} />
            ))}
          </TabsContent>

          <TabsContent value="copied" className="space-y-4">
            {copiedTrades.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Copy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No copied trades yet</p>
                <p className="text-sm">Start following traders to see copied trades here</p>
              </div>
            ) : (
              copiedTrades.map(trade => (
                <Card key={trade.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={trade.originalTrader.avatar_url} />
                        <AvatarFallback>
                          {trade.originalTrader.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {trade.action.toUpperCase()} {trade.symbol}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Copied from @{trade.originalTrader.username}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(trade.amount)}</p>
                      <Badge 
                        variant={
                          trade.status === 'executed' ? 'default' :
                          trade.status === 'pending' ? 'secondary' : 'destructive'
                        }
                      >
                        {trade.status}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-4">
            <div className="space-y-3">
              {topTraders
                .sort((a, b) => b.returnPercentage - a.returnPercentage)
                .map((trader, index) => (
                  <Card key={trader.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                        {index + 1}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={trader.avatar_url} />
                        <AvatarFallback>
                          {trader.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{trader.username}</h3>
                          {trader.verified && (
                            <Award className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {trader.specialization}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600 text-lg">
                          +{trader.returnPercentage}%
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {trader.followers.toLocaleString()} followers
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SocialTradingFeatures;
