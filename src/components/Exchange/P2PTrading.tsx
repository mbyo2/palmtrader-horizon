import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { P2PService, P2PAdvertisement, CreateAdRequest } from '@/services/P2PService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { User, Clock, CheckCircle, Plus, Search } from 'lucide-react';

const PAYMENT_METHODS = ['Bank Transfer', 'PayPal', 'Wise', 'Mobile Money', 'Zelle', 'Venmo'];
const CRYPTO_OPTIONS = ['BTC', 'ETH', 'USDT', 'SOL', 'XRP'];
const FIAT_OPTIONS = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZMW'];

export const P2PTrading = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [selectedCrypto, setSelectedCrypto] = useState('USDT');
  const [selectedFiat, setSelectedFiat] = useState('USD');
  const [amount, setAmount] = useState('');
  const [createAdOpen, setCreateAdOpen] = useState(false);
  const [newAd, setNewAd] = useState<Partial<CreateAdRequest>>({
    type: 'sell',
    crypto_currency: 'USDT',
    fiat_currency: 'USD',
    payment_methods: [],
    price: 0,
    min_amount: 100,
    max_amount: 10000,
    available_amount: 1000
  });

  const { data: advertisements = [], isLoading } = useQuery({
    queryKey: ['p2p-ads', activeTab === 'buy' ? 'sell' : 'buy', selectedCrypto, selectedFiat],
    queryFn: () => P2PService.getAdvertisements(
      activeTab === 'buy' ? 'sell' : 'buy', 
      selectedCrypto, 
      selectedFiat
    )
  });

  const { data: myAds = [] } = useQuery({
    queryKey: ['my-p2p-ads', user?.id],
    queryFn: () => user ? P2PService.getMyAdvertisements(user.id) : [],
    enabled: !!user
  });

  const createAdMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      return P2PService.createAdvertisement(user.id, newAd as CreateAdRequest);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Advertisement created');
        setCreateAdOpen(false);
        queryClient.invalidateQueries({ queryKey: ['p2p-ads'] });
        queryClient.invalidateQueries({ queryKey: ['my-p2p-ads'] });
      } else {
        toast.error(result.error || 'Failed to create ad');
      }
    }
  });

  const handleTrade = async (ad: P2PAdvertisement, tradeAmount: number) => {
    if (!user) {
      toast.error('Please sign in to trade');
      return;
    }

    const cryptoAmount = tradeAmount / ad.price;
    const result = await P2PService.createOrder(
      ad.id,
      activeTab === 'buy' ? user.id : ad.user_id,
      activeTab === 'buy' ? ad.user_id : user.id,
      cryptoAmount,
      tradeAmount,
      ad.price,
      ad.payment_methods[0],
      ad.crypto_currency,
      ad.fiat_currency
    );

    if (result.success) {
      toast.success('Order created! Check your orders for payment details.');
    } else {
      toast.error(result.error || 'Failed to create order');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">P2P Trading</h2>
        <Dialog open={createAdOpen} onOpenChange={setCreateAdOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Post Ad
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create P2P Advertisement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>I want to</Label>
                  <Select 
                    value={newAd.type} 
                    onValueChange={(v) => setNewAd(prev => ({ ...prev, type: v as 'buy' | 'sell' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buy">Buy</SelectItem>
                      <SelectItem value="sell">Sell</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Crypto</Label>
                  <Select 
                    value={newAd.crypto_currency} 
                    onValueChange={(v) => setNewAd(prev => ({ ...prev, crypto_currency: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CRYPTO_OPTIONS.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fiat Currency</Label>
                  <Select 
                    value={newAd.fiat_currency} 
                    onValueChange={(v) => setNewAd(prev => ({ ...prev, fiat_currency: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIAT_OPTIONS.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Price per {newAd.crypto_currency}</Label>
                  <Input
                    type="number"
                    placeholder="1.00"
                    value={newAd.price || ''}
                    onChange={(e) => setNewAd(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Min Amount</Label>
                  <Input
                    type="number"
                    value={newAd.min_amount || ''}
                    onChange={(e) => setNewAd(prev => ({ ...prev, min_amount: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Amount</Label>
                  <Input
                    type="number"
                    value={newAd.max_amount || ''}
                    onChange={(e) => setNewAd(prev => ({ ...prev, max_amount: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Available</Label>
                  <Input
                    type="number"
                    value={newAd.available_amount || ''}
                    onChange={(e) => setNewAd(prev => ({ ...prev, available_amount: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Methods</Label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_METHODS.map(method => (
                    <Badge
                      key={method}
                      variant={newAd.payment_methods?.includes(method) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        const current = newAd.payment_methods || [];
                        const updated = current.includes(method)
                          ? current.filter(m => m !== method)
                          : [...current, method];
                        setNewAd(prev => ({ ...prev, payment_methods: updated }));
                      }}
                    >
                      {method}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Terms (optional)</Label>
                <Textarea
                  placeholder="Add any terms or conditions..."
                  value={newAd.terms || ''}
                  onChange={(e) => setNewAd(prev => ({ ...prev, terms: e.target.value }))}
                />
              </div>

              <Button 
                className="w-full" 
                onClick={() => createAdMutation.mutate()}
                disabled={createAdMutation.isPending || !newAd.price || !newAd.payment_methods?.length}
              >
                {createAdMutation.isPending ? 'Creating...' : 'Create Advertisement'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'buy' | 'sell')}>
              <TabsList>
                <TabsTrigger value="buy" className="text-green-500">Buy</TabsTrigger>
                <TabsTrigger value="sell" className="text-red-500">Sell</TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={selectedCrypto} onValueChange={setSelectedCrypto}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRYPTO_OPTIONS.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedFiat} onValueChange={setSelectedFiat}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIAT_OPTIONS.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter amount"
                className="pl-9"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground">Loading offers...</div>
          ) : advertisements.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No offers available. Be the first to post an ad!
            </div>
          ) : (
            <div className="divide-y">
              {advertisements.map(ad => (
                <div key={ad.id} className="p-4 hover:bg-muted/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Trader</span>
                          {ad.completion_rate > 90 && (
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{ad.completion_rate.toFixed(0)}% completion</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            ~{ad.avg_release_time || 15} min
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {ad.price.toLocaleString()} {ad.fiat_currency}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {ad.min_amount.toLocaleString()} - {ad.max_amount.toLocaleString()} {ad.fiat_currency}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex flex-wrap gap-1">
                      {ad.payment_methods.slice(0, 3).map(method => (
                        <Badge key={method} variant="outline" className="text-xs">
                          {method}
                        </Badge>
                      ))}
                      {ad.payment_methods.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{ad.payment_methods.length - 3}
                        </Badge>
                      )}
                    </div>

                    <Button 
                      variant={activeTab === 'buy' ? 'default' : 'destructive'}
                      onClick={() => handleTrade(ad, parseFloat(amount) || ad.min_amount)}
                      disabled={!user}
                    >
                      {activeTab === 'buy' ? 'Buy' : 'Sell'} {ad.crypto_currency}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
