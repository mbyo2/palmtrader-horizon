
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { TradingService } from '@/services/TradingService';
import { Loader2 } from 'lucide-react';
import { useCryptoData } from '@/hooks/useCryptoData';

const POPULAR_CRYPTOS = [
  { symbol: 'bitcoin', name: 'Bitcoin', ticker: 'BTC' },
  { symbol: 'ethereum', name: 'Ethereum', ticker: 'ETH' },
  { symbol: 'solana', name: 'Solana', ticker: 'SOL' },
  { symbol: 'ripple', name: 'XRP', ticker: 'XRP' },
  { symbol: 'cardano', name: 'Cardano', ticker: 'ADA' },
  { symbol: 'polkadot', name: 'Polkadot', ticker: 'DOT' },
];

export default function CryptoTrading() {
  const [selectedCrypto, setSelectedCrypto] = useState(POPULAR_CRYPTOS[0]);
  const [amount, setAmount] = useState(0);
  const [quantity, setQuantity] = useState(0);
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  // Use real-time crypto data
  const { price: cryptoPrice, isLoading: priceLoading } = useCryptoData(selectedCrypto.symbol);

  const { data: cryptoPortfolio, refetch: refetchPortfolio } = useQuery({
    queryKey: ['cryptoPortfolio', user?.id, selectedCrypto.ticker],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('portfolio')
        .select('*')
        .eq('user_id', user.id)
        .eq('symbol', selectedCrypto.ticker)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (cryptoPrice && amount > 0) {
      setQuantity(amount / cryptoPrice);
    } else {
      setQuantity(0);
    }
  }, [amount, cryptoPrice]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setAmount(isNaN(value) ? 0 : value);
  };

  const handleSubmitOrder = async () => {
    if (!user) {
      toast.error("Please sign in to trade crypto");
      return;
    }

    if (!cryptoPrice) {
      toast.error("Unable to fetch current price");
      return;
    }

    if (amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // For sell orders, make sure the user has enough crypto
    if (orderType === 'sell') {
      if (!cryptoPortfolio || cryptoPortfolio.shares < quantity) {
        toast.error(`You don't have enough ${selectedCrypto.ticker} to sell`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Use the TradingService to execute the crypto order
      const { success, error } = await TradingService.executeOrder({
        userId: user.id,
        symbol: selectedCrypto.ticker,
        type: orderType,
        shares: quantity,
        price: cryptoPrice,
        orderType: "market", // Crypto orders are always market orders in this implementation
        isFractional: true,  // Crypto is always fractional
      });

      if (!success) throw new Error(error);

      toast.success(`${orderType === 'buy' ? 'Bought' : 'Sold'} ${quantity.toFixed(8)} ${selectedCrypto.ticker} for $${amount.toFixed(2)}`);
      
      // Refetch portfolio data
      refetchPortfolio();
      
      // Reset form
      setAmount(0);
      setQuantity(0);
    } catch (error) {
      console.error('Error placing crypto order:', error);
      toast.error(error instanceof Error ? error.message : "Failed to place order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Crypto Trading</CardTitle>
        <CardDescription>Buy and sell cryptocurrencies with real-time prices</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="crypto-select">Select Cryptocurrency</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {POPULAR_CRYPTOS.map((crypto) => (
                <Button
                  key={crypto.symbol}
                  variant={selectedCrypto.symbol === crypto.symbol ? "default" : "outline"}
                  onClick={() => setSelectedCrypto(crypto)}
                  className="w-full text-xs"
                >
                  {crypto.ticker}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border rounded-md p-3">
            <div>
              <h3 className="font-medium">{selectedCrypto.name}</h3>
              <p className="text-sm text-muted-foreground">{selectedCrypto.ticker}</p>
            </div>
            <div className="text-right">
              <p className="font-medium">
                {priceLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
                ) : (
                  `$${cryptoPrice?.toFixed(2) || "N/A"}`
                )}
              </p>
              <p className="text-xs text-green-500">● Live Price</p>
              {cryptoPortfolio?.shares && (
                <p className="text-sm text-muted-foreground">
                  You own: {cryptoPortfolio.shares.toFixed(8)} {selectedCrypto.ticker}
                </p>
              )}
            </div>
          </div>

          <div className="flex space-x-2">
            <Button 
              variant={orderType === 'buy' ? "default" : "outline"} 
              className="flex-1"
              onClick={() => setOrderType('buy')}
              disabled={isSubmitting}
            >
              Buy
            </Button>
            <Button 
              variant={orderType === 'sell' ? "destructive" : "outline"} 
              className="flex-1"
              onClick={() => setOrderType('sell')}
              disabled={isSubmitting}
            >
              Sell
            </Button>
          </div>

          <div>
            <Label htmlFor="amount">Amount (USD)</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={amount || ''}
              onChange={handleAmountChange}
              placeholder="Enter amount in USD"
              className="mt-1"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="quantity">Quantity ({selectedCrypto.ticker})</Label>
            <p className="mt-1 p-2 border rounded-md bg-muted">
              {quantity ? quantity.toFixed(8) : '0.00000000'} {selectedCrypto.ticker}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSubmitOrder} 
          className="w-full" 
          disabled={priceLoading || amount <= 0 || isSubmitting || !cryptoPrice}
          variant={orderType === 'buy' ? "default" : "destructive"}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {orderType === 'buy' ? 'Buy' : 'Sell'} {selectedCrypto.ticker}
        </Button>
      </CardFooter>
    </Card>
  );
}
