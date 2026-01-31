import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { ConvertService, ConvertQuote } from '@/services/ConvertService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDownUp, RefreshCw, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const CRYPTO_ICONS: Record<string, string> = {
  BTC: '₿', ETH: 'Ξ', SOL: '◎', XRP: '✕', USDT: '$', USDC: '$', ADA: '₳', DOT: '●'
};

export const ConvertSwap = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [fromCurrency, setFromCurrency] = useState('USDT');
  const [toCurrency, setToCurrency] = useState('BTC');
  const [fromAmount, setFromAmount] = useState('');
  const [quote, setQuote] = useState<ConvertQuote | null>(null);
  const [quoteExpiry, setQuoteExpiry] = useState<number>(0);

  const currencies = ConvertService.getSupportedCurrencies();

  const { data: history = [] } = useQuery({
    queryKey: ['convert-history', user?.id],
    queryFn: () => user ? ConvertService.getHistory(user.id) : [],
    enabled: !!user
  });

  // Fetch quote when amount changes
  useEffect(() => {
    const fetchQuote = async () => {
      if (!fromAmount || parseFloat(fromAmount) <= 0) {
        setQuote(null);
        return;
      }

      try {
        const newQuote = await ConvertService.getQuote(fromCurrency, toCurrency, parseFloat(fromAmount));
        setQuote(newQuote);
        setQuoteExpiry(10);
      } catch {
        setQuote(null);
      }
    };

    const debounce = setTimeout(fetchQuote, 300);
    return () => clearTimeout(debounce);
  }, [fromAmount, fromCurrency, toCurrency]);

  // Countdown for quote expiry
  useEffect(() => {
    if (quoteExpiry <= 0) return;

    const timer = setInterval(() => {
      setQuoteExpiry(prev => {
        if (prev <= 1) {
          setQuote(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quoteExpiry]);

  const convertMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      return ConvertService.executeConvert(user.id, fromCurrency, toCurrency, parseFloat(fromAmount));
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Converted ${fromAmount} ${fromCurrency} to ${result.toAmount?.toFixed(8)} ${toCurrency}`);
        setFromAmount('');
        setQuote(null);
        queryClient.invalidateQueries({ queryKey: ['convert-history'] });
        queryClient.invalidateQueries({ queryKey: ['crypto-wallets'] });
      } else {
        toast.error(result.error || 'Conversion failed');
      }
    }
  });

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setFromAmount('');
    setQuote(null);
  };

  const refreshQuote = async () => {
    if (!fromAmount) return;
    try {
      const newQuote = await ConvertService.getQuote(fromCurrency, toCurrency, parseFloat(fromAmount));
      setQuote(newQuote);
      setQuoteExpiry(10);
    } catch {
      toast.error('Failed to refresh quote');
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownUp className="h-5 w-5" />
            Convert
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* From */}
          <div className="space-y-2">
            <Label>From</Label>
            <div className="flex gap-2">
              <Select value={fromCurrency} onValueChange={setFromCurrency}>
                <SelectTrigger className="w-32">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{CRYPTO_ICONS[fromCurrency]}</span>
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {currencies.filter(c => c !== toCurrency).map(c => (
                    <SelectItem key={c} value={c}>
                      <div className="flex items-center gap-2">
                        <span>{CRYPTO_ICONS[c]}</span>
                        <span>{c}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="0.00"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="flex-1 text-right text-lg"
              />
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <Button variant="ghost" size="icon" onClick={swapCurrencies}>
              <ArrowDownUp className="h-5 w-5" />
            </Button>
          </div>

          {/* To */}
          <div className="space-y-2">
            <Label>To</Label>
            <div className="flex gap-2">
              <Select value={toCurrency} onValueChange={setToCurrency}>
                <SelectTrigger className="w-32">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{CRYPTO_ICONS[toCurrency]}</span>
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {currencies.filter(c => c !== fromCurrency).map(c => (
                    <SelectItem key={c} value={c}>
                      <div className="flex items-center gap-2">
                        <span>{CRYPTO_ICONS[c]}</span>
                        <span>{c}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex-1 px-3 py-2 rounded-md bg-muted text-right text-lg">
                {quote ? quote.toAmount.toFixed(8) : '0.00'}
              </div>
            </div>
          </div>

          {/* Quote Info */}
          {quote && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rate</span>
                <span>1 {fromCurrency} = {quote.rate.toFixed(8)} {toCurrency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee (0.1%)</span>
                <span>{quote.fee.toFixed(8)} {fromCurrency}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Quote expires in
                </span>
                <div className="flex items-center gap-2">
                  <span className={cn(quoteExpiry <= 3 ? 'text-red-500' : '')}>{quoteExpiry}s</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={refreshQuote}>
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Button 
            className="w-full" 
            size="lg"
            onClick={() => convertMutation.mutate()}
            disabled={convertMutation.isPending || !quote || quoteExpiry === 0}
          >
            {convertMutation.isPending ? 'Converting...' : 'Convert'}
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Conversions</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">No conversion history</div>
          ) : (
            <div className="space-y-3">
              {history.slice(0, 5).map(item => (
                <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div>
                      <div className="font-medium">
                        {item.from_amount.toFixed(4)} {item.from_currency} → {item.to_amount.toFixed(8)} {item.to_currency}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString()}
                      </div>
                    </div>
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
