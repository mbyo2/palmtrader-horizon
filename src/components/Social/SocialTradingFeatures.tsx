
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Copy, TrendingUp, TrendingDown, Users, Star, Award, Target } from "lucide-react";
import { toast } from "sonner";

interface Trader {
  id: string;
  username: string;
  avatar_url?: string;
  verified: boolean;
  performance: {
    totalReturn: number;
    returnPercentage: number;
    winRate: number;
    sharpeRatio: number;
    maxDrawdown: number;
    totalTrades: number;
    followers: number;
    copiers: number;
  };
  recentTrades: Trade[];
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  specialties: string[];
  bio: string;
}

interface Trade {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  price: number;
  quantity: number;
  timestamp: Date;
  pnl: number;
  pnlPercentage: number;
}

interface CopyTradingPosition {
  traderId: string;
  traderName: string;
  amountAllocated: number;
  currentValue: number;
  pnl: number;
  pnlPercentage: number;
  isActive: boolean;
}

const SocialTradingFeatures = () => {
  const [topTraders] = useState<Trader[]>([
    {
      id: '1',
      username: 'TechGuru2024',
      verified: true,
      performance: {
        totalReturn: 125000,
        returnPercentage: 45.2,
        winRate: 68,
        sharpeRatio: 1.8,
        maxDrawdown: -12.5,
        totalTrades: 156,
        followers: 2340,
        copiers: 890
      },
      recentTrades: [
        {
          id: '1',
          symbol: 'NVDA',
          type: 'buy',
          price: 450.50,
          quantity: 100,
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          pnl: 2250,
          pnlPercentage: 5.2
        }
      ],
      riskLevel: 'moderate',
      specialties: ['Tech Stocks', 'Growth', 'AI/ML'],
      bio: 'Technology sector specialist with 8+ years experience. Focus on AI and semiconductor companies.'
    },
    {
      id: '2',
      username: 'DividendMaster',
      verified: true,
      performance: {
        totalReturn: 89000,
        returnPercentage: 22.8,
        winRate: 78,
        sharpeRatio: 2.1,
        maxDrawdown: -8.2,
        totalTrades: 98,
        followers: 1890,
        copiers: 1250
      },
      recentTrades: [
        {
          id: '2',
          symbol: 'JNJ',
          type: 'buy',
          price: 165.75,
          quantity: 200,
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
          pnl: 1120,
          pnlPercentage: 3.4
        }
      ],
      riskLevel: 'conservative',
      specialties: ['Dividend Stocks', 'Value Investing', 'Blue Chips'],
      bio: 'Conservative dividend growth investor. Building steady wealth through quality companies.'
    }
  ]);

  const [copyPositions] = useState<CopyTradingPosition[]>([
    {
      traderId: '1',
      traderName: 'TechGuru2024',
      amountAllocated: 5000,
      currentValue: 5675,
      pnl: 675,
      pnlPercentage: 13.5,
      isActive: true
    },
    {
      traderId: '2',
      traderName: 'DividendMaster',
      amountAllocated: 3000,
      currentValue: 3240,
      pnl: 240,
      pnlPercentage: 8.0,
      isActive: true
    }
  ]);

  const handleCopyTrader = (traderId: string, amount: number) => {
    toast.success(`Started copying trader with $${amount.toLocaleString()}`);
  };

  const handleStopCopying = (traderId: string) => {
    toast.success('Stopped copying trader');
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'conservative': return 'text-green-500';
      case 'moderate': return 'text-yellow-500';
      case 'aggressive': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case 'conservative': return 'default';
      case 'moderate': return 'secondary';
      case 'aggressive': return 'destructive';
      default: return 'outline';
    }
  };

  const TraderCard = ({ trader }: { trader: Trader }) => (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={trader.avatar_url} />
          <AvatarFallback>{trader.username.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-lg">{trader.username}</h3>
            {trader.verified && <Star className="h-4 w-4 text-yellow-500" />}
            <Badge variant={getRiskBadgeVariant(trader.riskLevel)}>
              {trader.riskLevel}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3">{trader.bio}</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className={`text-lg font-bold ${trader.performance.returnPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {trader.performance.returnPercentage >= 0 ? '+' : ''}{trader.performance.returnPercentage}%
              </div>
              <div className="text-xs text-muted-foreground">Total Return</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">{trader.performance.winRate}%</div>
              <div className="text-xs text-muted-foreground">Win Rate</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">{trader.performance.sharpeRatio}</div>
              <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">{trader.performance.copiers}</div>
              <div className="text-xs text-muted-foreground">Copiers</div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-1 mb-4">
            {trader.specialties.map(specialty => (
              <Badge key={specialty} variant="outline" className="text-xs">
                {specialty}
              </Badge>
            ))}
          </div>
          
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="flex-1">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Trader
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Copy {trader.username}</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will automatically copy all future trades from this trader. 
                    Choose how much you want to allocate for copy trading.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleCopyTrader(trader.id, 1000)}>
                    Copy with $1,000
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Follow
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Social Trading
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="discover" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="discover">Discover Traders</TabsTrigger>
              <TabsTrigger value="copying">My Copy Positions</TabsTrigger>
              <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            </TabsList>

            <TabsContent value="discover" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Top Performing Traders</h3>
                <Badge variant="outline">Updated every hour</Badge>
              </div>
              
              {topTraders.map(trader => (
                <TraderCard key={trader.id} trader={trader} />
              ))}
            </TabsContent>

            <TabsContent value="copying" className="space-y-4">
              <h3 className="text-lg font-semibold">Active Copy Positions</h3>
              
              {copyPositions.length === 0 ? (
                <Card className="p-8 text-center">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No Copy Positions</h3>
                  <p className="text-muted-foreground mb-4">
                    You're not currently copying any traders. Discover top performers to start copy trading.
                  </p>
                  <Button>Discover Traders</Button>
                </Card>
              ) : (
                copyPositions.map(position => (
                  <Card key={position.traderId} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{position.traderName}</h4>
                        <p className="text-sm text-muted-foreground">
                          Allocated: ${position.amountAllocated.toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-semibold">
                          ${position.currentValue.toLocaleString()}
                        </div>
                        <div className={`text-sm ${position.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {position.pnl >= 0 ? '+' : ''}${position.pnl.toLocaleString()} ({position.pnlPercentage >= 0 ? '+' : ''}{position.pnlPercentage}%)
                        </div>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStopCopying(position.traderId)}
                      >
                        Stop Copying
                      </Button>
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Performance</span>
                        <span>{position.pnlPercentage >= 0 ? '+' : ''}{position.pnlPercentage}%</span>
                      </div>
                      <Progress 
                        value={Math.min(Math.max(position.pnlPercentage + 50, 0), 100)} 
                        className="h-2"
                      />
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="leaderboard" className="space-y-4">
              <h3 className="text-lg font-semibold">Top Traders This Month</h3>
              
              {topTraders.map((trader, index) => (
                <Card key={trader.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                      {index + 1}
                    </div>
                    
                    <Avatar>
                      <AvatarImage src={trader.avatar_url} />
                      <AvatarFallback>{trader.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{trader.username}</span>
                        {trader.verified && <Star className="h-4 w-4 text-yellow-500" />}
                        {index === 0 && <Award className="h-4 w-4 text-yellow-500" />}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {trader.performance.totalTrades} trades • {trader.performance.winRate}% win rate
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <div className={`font-bold ${trader.performance.returnPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {trader.performance.returnPercentage >= 0 ? '+' : ''}{trader.performance.returnPercentage}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {trader.performance.copiers} copiers
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SocialTradingFeatures;
