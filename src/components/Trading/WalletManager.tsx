import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Wallet, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { Badge } from '@/components/ui/badge';

export const WalletManager: React.FC = () => {
  const { balances, transactions, isLoading, deposit, withdraw, getBalance } = useWallet();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    await deposit(amount);
    setDepositAmount('');
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    await withdraw(amount);
    setWithdrawAmount('');
  };

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
    }
    return `${amount.toFixed(8)} ${currency}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'withdrawal':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Wallet className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Overview
          </CardTitle>
          <CardDescription>
            Manage your funds and view transaction history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {balances.map(balance => (
              <Card key={balance.currency}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{balance.currency}</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(balance.available, balance.currency)}
                      </p>
                      {balance.reserved > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Reserved: {formatCurrency(balance.reserved, balance.currency)}
                        </p>
                      )}
                    </div>
                    <Badge variant={balance.available > 0 ? "default" : "secondary"}>
                      {balance.available > 0 ? "Active" : "Empty"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="deposit" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="deposit">Deposit</TabsTrigger>
          <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
        </TabsList>

        <TabsContent value="deposit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deposit Funds</CardTitle>
              <CardDescription>
                Add funds to your wallet to start trading
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="depositAmount">Amount (USD)</Label>
                <Input
                  id="depositAmount"
                  type="number"
                  placeholder="Enter amount"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleDeposit} 
                disabled={isLoading || !depositAmount}
                className="w-full"
              >
                {isLoading ? 'Processing...' : 'Deposit Funds'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdraw" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Withdraw Funds</CardTitle>
              <CardDescription>
                Transfer funds from your wallet to your bank account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="withdrawAmount">Amount (USD)</Label>
                <Input
                  id="withdrawAmount"
                  type="number"
                  placeholder="Enter amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Available: {formatCurrency(getBalance('USD')?.available || 0, 'USD')}
                </p>
              </div>
              <Button 
                onClick={handleWithdraw} 
                disabled={isLoading || !withdrawAmount}
                variant="outline"
                className="w-full"
              >
                {isLoading ? 'Processing...' : 'Request Withdrawal'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Your latest wallet activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No transactions yet
              </p>
            ) : (
              transactions.slice(0, 10).map(transaction => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(transaction.type)}
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${
                      transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount), transaction.currency)}
                    </span>
                    {getStatusIcon(transaction.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};