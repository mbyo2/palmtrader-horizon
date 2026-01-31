import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { StakingService, StakingProduct, StakingPosition } from '@/services/StakingService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Percent, Lock, Unlock, Clock, TrendingUp, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';

const CRYPTO_ICONS: Record<string, string> = {
  BTC: '₿', ETH: 'Ξ', SOL: '◎', XRP: '✕', USDT: '$', USDC: '$'
};

export const EarnStaking = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<StakingProduct | null>(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [autoRestake, setAutoRestake] = useState(false);
  const [stakeDialogOpen, setStakeDialogOpen] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ['staking-products'],
    queryFn: StakingService.getProducts
  });

  const { data: positions = [] } = useQuery({
    queryKey: ['staking-positions', user?.id],
    queryFn: () => user ? StakingService.getMyPositions(user.id) : [],
    enabled: !!user
  });

  const stakeMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedProduct) throw new Error('Invalid state');
      return StakingService.stake(user.id, selectedProduct.id, parseFloat(stakeAmount), autoRestake);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Staking successful!');
        setStakeDialogOpen(false);
        setStakeAmount('');
        queryClient.invalidateQueries({ queryKey: ['staking-positions'] });
      } else {
        toast.error(result.error || 'Staking failed');
      }
    }
  });

  const unstakeMutation = useMutation({
    mutationFn: StakingService.unstake,
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Unstaked successfully');
        queryClient.invalidateQueries({ queryKey: ['staking-positions'] });
      } else {
        toast.error(result.error || 'Unstake failed');
      }
    }
  });

  const claimMutation = useMutation({
    mutationFn: StakingService.claimInterest,
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Claimed ${result.amount?.toFixed(8)} interest!`);
        queryClient.invalidateQueries({ queryKey: ['staking-positions'] });
      } else {
        toast.error(result.error || 'Claim failed');
      }
    }
  });

  const totalStaked = StakingService.getTotalStaked(positions);
  const totalEarned = StakingService.getTotalEarned(positions);

  const flexibleProducts = products.filter(p => p.type === 'flexible');
  const lockedProducts = products.filter(p => p.type === 'locked');

  const handleStakeClick = (product: StakingProduct) => {
    setSelectedProduct(product);
    setStakeDialogOpen(true);
  };

  const getDaysRemaining = (position: StakingPosition): number | null => {
    if (!position.end_date) return null;
    const end = new Date(position.end_date);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Staked Value</div>
                <div className="text-2xl font-bold">${totalStaked.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <Gift className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Earned</div>
                <div className="text-2xl font-bold text-green-500">${totalEarned.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/10">
                <Percent className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Active Positions</div>
                <div className="text-2xl font-bold">{positions.filter(p => p.status === 'active').length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="positions">My Positions</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          {/* Flexible Savings */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Unlock className="h-5 w-5" />
              Flexible Savings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {flexibleProducts.map(product => (
                <Card key={product.id} className="hover:border-primary transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{CRYPTO_ICONS[product.currency]}</span>
                        <span className="font-semibold">{product.currency}</span>
                      </div>
                      <Badge variant="secondary">Flexible</Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">APY</span>
                        <span className="text-xl font-bold text-green-500">{product.apy}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Min. Amount</span>
                        <span>{product.min_amount} {product.currency}</span>
                      </div>
                    </div>

                    <Button className="w-full mt-4" onClick={() => handleStakeClick(product)}>
                      Subscribe
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Locked Savings */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Locked Savings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lockedProducts.map(product => (
                <Card key={product.id} className="hover:border-primary transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{CRYPTO_ICONS[product.currency]}</span>
                        <span className="font-semibold">{product.currency}</span>
                      </div>
                      <Badge>{product.lock_period_days} days</Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">APY</span>
                        <span className="text-xl font-bold text-green-500">{product.apy}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Min. Amount</span>
                        <span>{product.min_amount} {product.currency}</span>
                      </div>
                    </div>

                    <Button className="w-full mt-4" onClick={() => handleStakeClick(product)}>
                      Subscribe
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="positions">
          {positions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No active staking positions. Subscribe to a product to start earning!
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {positions.map(position => {
                const daysRemaining = getDaysRemaining(position);
                return (
                  <Card key={position.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{CRYPTO_ICONS[position.product?.currency || '']}</span>
                          <div>
                            <div className="font-semibold">{position.product?.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {position.amount} {position.product?.currency}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-500">
                            +{position.accrued_interest.toFixed(8)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {position.product?.apy}% APY
                          </div>
                        </div>
                      </div>

                      {daysRemaining !== null && (
                        <div className="mt-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Lock Period
                            </span>
                            <span>{daysRemaining} days remaining</span>
                          </div>
                          <Progress value={100 - (daysRemaining / (position.product?.lock_period_days || 30)) * 100} />
                        </div>
                      )}

                      <div className="flex gap-2 mt-4">
                        {position.accrued_interest > 0 && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => claimMutation.mutate(position.id)}
                            disabled={claimMutation.isPending}
                          >
                            Claim Interest
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => unstakeMutation.mutate(position.id)}
                          disabled={unstakeMutation.isPending || (daysRemaining !== null && daysRemaining > 0)}
                        >
                          Unstake
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Stake Dialog */}
      <Dialog open={stakeDialogOpen} onOpenChange={setStakeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscribe to {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">APY</span>
                <span className="text-green-500 font-bold">{selectedProduct?.apy}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lock Period</span>
                <span>{selectedProduct?.lock_period_days || 'Flexible'} {selectedProduct?.lock_period_days ? 'days' : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Min. Amount</span>
                <span>{selectedProduct?.min_amount} {selectedProduct?.currency}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Amount ({selectedProduct?.currency})</Label>
              <Input
                type="number"
                placeholder={`Min. ${selectedProduct?.min_amount}`}
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Auto-Restake</Label>
              <Switch checked={autoRestake} onCheckedChange={setAutoRestake} />
            </div>

            <Button 
              className="w-full" 
              onClick={() => stakeMutation.mutate()}
              disabled={stakeMutation.isPending || !stakeAmount || parseFloat(stakeAmount) < (selectedProduct?.min_amount || 0)}
            >
              {stakeMutation.isPending ? 'Subscribing...' : 'Confirm Subscription'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
