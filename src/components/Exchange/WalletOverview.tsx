import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { CryptoWalletService, WalletType, CryptoWallet } from '@/services/CryptoWalletService';
import { Wallet, ArrowUpDown, Plus, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const CRYPTO_ICONS: Record<string, string> = {
  BTC: '₿', ETH: 'Ξ', SOL: '◎', XRP: '✕', USDT: '$', USDC: '$', ADA: '₳', DOT: '●'
};

export const WalletOverview = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<WalletType>('spot');
  const [showBalances, setShowBalances] = useState(true);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferData, setTransferData] = useState({
    fromWallet: 'spot' as WalletType,
    toWallet: 'funding' as WalletType,
    currency: 'USDT',
    amount: ''
  });

  const { data: wallets = [], isLoading, refetch } = useQuery({
    queryKey: ['crypto-wallets', user?.id],
    queryFn: () => user ? CryptoWalletService.getWallets(user.id) : [],
    enabled: !!user
  });

  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      return CryptoWalletService.transferBetweenWallets(user.id, {
        fromWallet: transferData.fromWallet,
        toWallet: transferData.toWallet,
        currency: transferData.currency,
        amount: parseFloat(transferData.amount)
      });
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Transfer completed');
        setTransferOpen(false);
        queryClient.invalidateQueries({ queryKey: ['crypto-wallets'] });
      } else {
        toast.error(result.error || 'Transfer failed');
      }
    }
  });

  const getWalletsByType = (type: WalletType): CryptoWallet[] => {
    return wallets.filter(w => w.wallet_type === type);
  };

  const getTotalValue = (type: WalletType): number => {
    // Simplified - in production would use real exchange rates
    const rates: Record<string, number> = {
      BTC: 65000, ETH: 3500, SOL: 150, XRP: 0.55, USDT: 1, USDC: 1, ADA: 0.45
    };
    return getWalletsByType(type).reduce((sum, w) => {
      return sum + (w.available_balance + w.locked_balance) * (rates[w.currency] || 1);
    }, 0);
  };

  const formatBalance = (value: number, decimals = 8) => {
    if (!showBalances) return '****';
    return value.toLocaleString(undefined, { maximumFractionDigits: decimals });
  };

  const formatUSD = (value: number) => {
    if (!showBalances) return '****';
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Please sign in to view your wallets
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Wallets</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowBalances(!showBalances)}>
            {showBalances ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Transfer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Transfer Between Wallets</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From</Label>
                    <Select 
                      value={transferData.fromWallet} 
                      onValueChange={(v) => setTransferData(prev => ({ ...prev, fromWallet: v as WalletType }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spot">Spot</SelectItem>
                        <SelectItem value="funding">Funding</SelectItem>
                        <SelectItem value="earn">Earn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>To</Label>
                    <Select 
                      value={transferData.toWallet} 
                      onValueChange={(v) => setTransferData(prev => ({ ...prev, toWallet: v as WalletType }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spot">Spot</SelectItem>
                        <SelectItem value="funding">Funding</SelectItem>
                        <SelectItem value="earn">Earn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select 
                    value={transferData.currency} 
                    onValueChange={(v) => setTransferData(prev => ({ ...prev, currency: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['USDT', 'BTC', 'ETH', 'SOL', 'XRP'].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={transferData.amount}
                    onChange={(e) => setTransferData(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => transferMutation.mutate()}
                  disabled={transferMutation.isPending || !transferData.amount}
                >
                  {transferMutation.isPending ? 'Transferring...' : 'Confirm Transfer'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as WalletType)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="spot">
            <div className="flex flex-col items-center">
              <span>Spot</span>
              <span className="text-xs text-muted-foreground">{formatUSD(getTotalValue('spot'))}</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="funding">
            <div className="flex flex-col items-center">
              <span>Funding</span>
              <span className="text-xs text-muted-foreground">{formatUSD(getTotalValue('funding'))}</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="earn">
            <div className="flex flex-col items-center">
              <span>Earn</span>
              <span className="text-xs text-muted-foreground">{formatUSD(getTotalValue('earn'))}</span>
            </div>
          </TabsTrigger>
        </TabsList>

        {(['spot', 'funding', 'earn'] as WalletType[]).map(type => (
          <TabsContent key={type} value={type}>
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 text-center text-muted-foreground">Loading...</div>
                ) : getWalletsByType(type).length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    No assets in {type} wallet
                  </div>
                ) : (
                  <div className="divide-y">
                    {getWalletsByType(type).map(wallet => (
                      <div key={wallet.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold">
                            {CRYPTO_ICONS[wallet.currency] || wallet.currency[0]}
                          </div>
                          <div>
                            <div className="font-medium">{wallet.currency}</div>
                            <div className="text-sm text-muted-foreground">
                              {wallet.currency === 'BTC' ? 'Bitcoin' : 
                               wallet.currency === 'ETH' ? 'Ethereum' :
                               wallet.currency === 'USDT' ? 'Tether' : wallet.currency}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {formatBalance(wallet.available_balance)}
                          </div>
                          {wallet.locked_balance > 0 && (
                            <div className="text-xs text-muted-foreground">
                              +{formatBalance(wallet.locked_balance)} locked
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
