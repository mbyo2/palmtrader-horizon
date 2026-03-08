import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Copy, Award, TrendingUp, DollarSign, Settings2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TraderProfile {
  id: string;
  user_id: string;
  display_name: string;
  bio: string;
  total_return_pct: number;
  win_rate: number;
  total_trades: number;
  followers_count: number;
  risk_score: number;
  is_verified: boolean;
  specialization: string;
}

interface CopyFollow {
  id: string;
  leader_id: string;
  allocation_amount: number;
  max_trade_size: number;
  is_active: boolean;
  total_profit: number;
  total_trades_copied: number;
  leader?: TraderProfile;
}

const CopyTradingSystem = () => {
  const { user } = useAuth();
  const [traders, setTraders] = useState<TraderProfile[]>([]);
  const [myFollows, setMyFollows] = useState<CopyFollow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyAmount, setCopyAmount] = useState("500");
  const [selectedTrader, setSelectedTrader] = useState<TraderProfile | null>(null);

  useEffect(() => {
    loadTraders();
    if (user) loadMyFollows();
  }, [user]);

  const loadTraders = async () => {
    try {
      const { data, error } = await supabase
        .from('trader_stats')
        .select('*')
        .eq('is_public', true)
        .order('total_return_pct', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTraders((data as any[]) || []);
    } catch (err) {
      console.error('Error loading traders:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMyFollows = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('copy_trading_follows')
        .select('*')
        .eq('follower_id', user.id)
        .eq('is_active', true);

      if (error) throw error;
      setMyFollows((data as any[]) || []);
    } catch (err) {
      console.error('Error loading follows:', err);
    }
  };

  const handleCopyTrader = async (trader: TraderProfile) => {
    if (!user) {
      toast.error('Please log in to copy traders');
      return;
    }

    const amount = parseFloat(copyAmount);
    if (isNaN(amount) || amount < 50) {
      toast.error('Minimum allocation is $50');
      return;
    }

    try {
      const { error } = await supabase
        .from('copy_trading_follows')
        .upsert({
          follower_id: user.id,
          leader_id: trader.user_id,
          allocation_amount: amount,
          max_trade_size: amount * 0.1,
          is_active: true,
        });

      if (error) throw error;
      toast.success(`Now copying ${trader.display_name} with $${amount}`);
      setSelectedTrader(null);
      loadMyFollows();
    } catch (err) {
      console.error('Error copying trader:', err);
      toast.error('Failed to start copy trading');
    }
  };

  const handleStopCopying = async (followId: string) => {
    try {
      const { error } = await supabase
        .from('copy_trading_follows')
        .update({ is_active: false })
        .eq('id', followId);

      if (error) throw error;
      toast.success('Stopped copying trader');
      loadMyFollows();
    } catch (err) {
      toast.error('Failed to stop copying');
    }
  };

  const getRiskColor = (score: number) => {
    if (score <= 3) return 'text-green-500';
    if (score <= 6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const TraderCard = ({ trader }: { trader: TraderProfile }) => {
    const isFollowing = myFollows.some(f => f.leader_id === trader.user_id);

    return (
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {(trader.display_name || 'T').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{trader.display_name || 'Anonymous Trader'}</h3>
              {trader.is_verified && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  <Award className="h-3 w-3 mr-1" /> Verified
                </Badge>
              )}
            </div>

            {trader.specialization && (
              <p className="text-sm text-muted-foreground mb-2">{trader.specialization}</p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Return</p>
                <p className={`font-bold ${trader.total_return_pct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {trader.total_return_pct >= 0 ? '+' : ''}{trader.total_return_pct.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Win Rate</p>
                <p className="font-semibold">{trader.win_rate.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Followers</p>
                <p className="font-semibold">{trader.followers_count.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Risk</p>
                <p className={`font-semibold ${getRiskColor(trader.risk_score)}`}>
                  {trader.risk_score.toFixed(1)}/10
                </p>
              </div>
            </div>

            <div className="mb-3">
              <Progress value={trader.risk_score * 10} className="h-1.5" />
            </div>

            <div className="flex gap-2">
              {isFollowing ? (
                <Button size="sm" variant="outline" onClick={() => {
                  const follow = myFollows.find(f => f.leader_id === trader.user_id);
                  if (follow) handleStopCopying(follow.id);
                }}>
                  <X className="h-3 w-3 mr-1" /> Stop Copying
                </Button>
              ) : (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={() => setSelectedTrader(trader)}>
                      <Copy className="h-3 w-3 mr-1" /> Copy Trader
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Copy {trader.display_name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-muted p-3 rounded-lg">
                          <p className="text-muted-foreground">Return</p>
                          <p className="font-bold text-lg text-green-500">+{trader.total_return_pct}%</p>
                        </div>
                        <div className="bg-muted p-3 rounded-lg">
                          <p className="text-muted-foreground">Win Rate</p>
                          <p className="font-bold text-lg">{trader.win_rate}%</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Allocation Amount (USD)</Label>
                        <Input
                          type="number"
                          value={copyAmount}
                          onChange={(e) => setCopyAmount(e.target.value)}
                          min={50}
                          placeholder="Min $50"
                        />
                        <p className="text-xs text-muted-foreground">
                          This is the total amount allocated for copying this trader's positions proportionally.
                        </p>
                      </div>
                      <Button className="w-full" onClick={() => handleCopyTrader(trader)}>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Start Copying with ${copyAmount}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" /> Copy Trading
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="discover">
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="discover" className="flex-1">Discover</TabsTrigger>
            <TabsTrigger value="copying" className="flex-1">My Copies</TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex-1">Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading traders...</div>
            ) : traders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No public traders yet</p>
                <p className="text-sm">Be the first to share your trading performance!</p>
              </div>
            ) : (
              traders.map(trader => <TraderCard key={trader.id} trader={trader} />)
            )}
          </TabsContent>

          <TabsContent value="copying" className="space-y-3">
            {myFollows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Copy className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Not copying anyone yet</p>
                <p className="text-sm">Browse the Discover tab to find traders to copy</p>
              </div>
            ) : (
              myFollows.map(follow => (
                <Card key={follow.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Copying trader</p>
                      <p className="text-sm text-muted-foreground">
                        ${follow.allocation_amount} allocated · {follow.total_trades_copied} trades copied
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`font-bold ${follow.total_profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {follow.total_profit >= 0 ? '+' : ''}${follow.total_profit.toFixed(2)}
                        </p>
                      </div>
                      <Button size="sm" variant="destructive" onClick={() => handleStopCopying(follow.id)}>
                        Stop
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-2">
            {traders
              .sort((a, b) => b.total_return_pct - a.total_return_pct)
              .slice(0, 10)
              .map((trader, index) => (
                <Card key={trader.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                      {index + 1}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{(trader.display_name || 'T').charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{trader.display_name}</p>
                      <p className="text-xs text-muted-foreground">{trader.specialization}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-green-500">+{trader.total_return_pct.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">{trader.followers_count} followers</p>
                    </div>
                  </div>
                </Card>
              ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CopyTradingSystem;
