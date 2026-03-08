import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlphaVantageService, ForexRate } from '@/services/AlphaVantageService';
import { ArrowRightLeft, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const FOREX_PAIRS = [
  { from: 'USD', to: 'EUR' }, { from: 'USD', to: 'GBP' },
  { from: 'USD', to: 'JPY' }, { from: 'USD', to: 'ZMW' },
  { from: 'EUR', to: 'USD' }, { from: 'GBP', to: 'USD' },
];

const CRYPTO_PAIRS = [
  { from: 'BTC', to: 'USD' }, { from: 'ETH', to: 'USD' },
  { from: 'SOL', to: 'USD' }, { from: 'XRP', to: 'USD' },
];

function formatRate(value: number): string {
  if (value > 10000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (value > 100) return value.toFixed(2);
  if (value > 1) return value.toFixed(4);
  return value.toFixed(6);
}

export function ForexCryptoRates() {
  const [forexRates, setForexRates] = useState<ForexRate[]>([]);
  const [cryptoRates, setCryptoRates] = useState<ForexRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const prevRatesRef = useRef<Map<string, number>>(new Map());

  const fetchRates = useCallback(async () => {
    setIsLoading(true);
    try {
      const [forex, crypto] = await Promise.all([
        AlphaVantageService.fetchMultipleForexRates(FOREX_PAIRS),
        AlphaVantageService.fetchMultipleForexRates(CRYPTO_PAIRS),
      ]);

      if (forex.length > 0) {
        setForexRates(forex);
        setIsLive(true);
      }
      if (crypto.length > 0) {
        setCryptoRates(crypto);
        setIsLive(true);
      }
    } catch {
      // API unavailable — show empty state
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Store previous rates for change indicator
  useEffect(() => {
    const map = new Map<string, number>();
    forexRates.forEach(r => map.set(`${r.fromCurrency}/${r.toCurrency}`, r.exchangeRate));
    cryptoRates.forEach(r => map.set(`${r.fromCurrency}/${r.toCurrency}`, r.exchangeRate));
    prevRatesRef.current = map;
  }, [forexRates, cryptoRates]);

  // Fetch on mount, refresh every 60s
  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 60000);
    return () => clearInterval(interval);
  }, [fetchRates]);

  const getRateChange = (key: string, current: number) => {
    const prev = prevRatesRef.current.get(key);
    if (!prev) return 0;
    return current - prev;
  };

  const hasData = forexRates.length > 0 || cryptoRates.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Forex & Crypto Rates
            <Badge variant={isLive ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
              {isLive ? 'LIVE' : 'LOADING'}
            </Badge>
          </span>
          <Button onClick={fetchRates} size="sm" variant="outline" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData && !isLoading && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Unable to fetch live rates. Please try refreshing.
          </div>
        )}

        {isLoading && !hasData && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Fetching live rates...
          </div>
        )}

        {forexRates.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-3 text-muted-foreground">Forex Rates</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {forexRates.map((rate, index) => {
                const key = `${rate.fromCurrency}/${rate.toCurrency}`;
                const change = getRateChange(key, rate.exchangeRate);
                return (
                  <div key={index} className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="text-xs text-muted-foreground mb-1 font-medium">{key}</div>
                    <div className="text-lg font-bold">{formatRate(rate.exchangeRate)}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      {change >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-success" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-destructive" />
                      )}
                      <span>Bid: {formatRate(rate.bidPrice)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {cryptoRates.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3 text-muted-foreground">Crypto Rates (USD)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {cryptoRates.map((rate, index) => {
                const key = `${rate.fromCurrency}/${rate.toCurrency}`;
                const change = getRateChange(key, rate.exchangeRate);
                return (
                  <div key={index} className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="text-xs text-muted-foreground mb-1 font-medium">
                      {rate.fromCurrency}/{rate.toCurrency}
                    </div>
                    <div className="text-lg font-bold">
                      ${rate.exchangeRate.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs flex items-center gap-1">
                      {change >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-success" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-destructive" />
                      )}
                      <span className="text-muted-foreground">
                        Spread: ${Math.abs(rate.askPrice - rate.bidPrice).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
