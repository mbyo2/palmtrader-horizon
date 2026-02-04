
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlphaVantageService, ForexRate } from '@/services/AlphaVantageService';
import { ArrowRightLeft, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FOREX_PAIRS = [
  { from: 'USD', to: 'EUR', name: 'USD/EUR' },
  { from: 'USD', to: 'GBP', name: 'USD/GBP' },
  { from: 'USD', to: 'JPY', name: 'USD/JPY' },
  { from: 'USD', to: 'ZMW', name: 'USD/ZMW' },
  { from: 'EUR', to: 'USD', name: 'EUR/USD' },
  { from: 'GBP', to: 'USD', name: 'GBP/USD' },
];

const CRYPTO_PAIRS = [
  { from: 'BTC', to: 'USD', name: 'BTC/USD' },
  { from: 'ETH', to: 'USD', name: 'ETH/USD' },
  { from: 'SOL', to: 'USD', name: 'SOL/USD' },
  { from: 'XRP', to: 'USD', name: 'XRP/USD' },
];

export function ForexCryptoRates() {
  const [forexRates, setForexRates] = useState<ForexRate[]>([]);
  const [cryptoRates, setCryptoRates] = useState<ForexRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPair, setSelectedPair] = useState('USD_EUR');

  const fetchRates = async () => {
    setIsLoading(true);
    try {
      const [forex, crypto] = await Promise.all([
        AlphaVantageService.fetchMultipleForexRates(FOREX_PAIRS),
        AlphaVantageService.fetchMultipleForexRates(CRYPTO_PAIRS)
      ]);
      setForexRates(forex);
      setCryptoRates(crypto);
    } catch (error) {
      console.error('Error fetching rates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const allRates = [...forexRates, ...cryptoRates];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Forex & Crypto Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Forex & Crypto Rates
          </span>
          <Button onClick={fetchRates} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3 text-muted-foreground">Forex Rates</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {forexRates.map((rate, index) => (
              <div key={index} className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                <div className="text-xs text-muted-foreground mb-1">
                  {rate.fromCurrency}/{rate.toCurrency}
                </div>
                <div className="text-lg font-bold">
                  {rate.exchangeRate.toFixed(rate.exchangeRate > 100 ? 2 : 4)}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <span>Bid: {rate.bidPrice.toFixed(4)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-3 text-muted-foreground">Crypto Rates (USD)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {cryptoRates.map((rate, index) => (
              <div key={index} className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                <div className="text-xs text-muted-foreground mb-1">
                  {rate.fromCurrency}/{rate.toCurrency}
                </div>
                <div className="text-lg font-bold">
                  ${rate.exchangeRate.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-muted-foreground">
                  Spread: ${(rate.askPrice - rate.bidPrice).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
