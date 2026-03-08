import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, Shield, Smartphone, Building2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useTradingAccount } from '@/hooks/useTradingAccount';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const DEMO_QUICK_AMOUNTS = [1000, 5000, 10000, 25000, 50000];

export const WalletManager: React.FC = () => {
  const { balances, transactions, isLoading, deposit, withdraw, getBalance } = useWallet();
  const { isDemo, activeAccount, refreshAccounts } = useTradingAccount();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    if (isDemo) {
      await deposit(amount);
      await refreshAccounts();
      toast.success(`$${amount.toLocaleString()} added to demo account`);
    } else {
      toast.info("Live deposits will be available once payment APIs are connected.");
    }
    setDepositAmount('');
  };

  const handleDemoQuickDeposit = async (amount: number) => {
    await deposit(amount);
    await refreshAccounts();
    toast.success(`$${amount.toLocaleString()} virtual funds added`);
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    if (isDemo) {
      await withdraw(amount);
      await refreshAccounts();
    } else {
      toast.info("Live withdrawals will be available once payment APIs are connected.");
    }
    setWithdrawAmount('');
  };

  const handleResetDemo = async () => {
    // Reset demo balance to 100,000
    const currentBalance = getBalance('USD')?.available || 0;
    const resetAmount = 100000 - currentBalance;
    if (resetAmount > 0) {
      await deposit(resetAmount);
    } else if (resetAmount < 0) {
      await withdraw(Math.abs(resetAmount));
    }
    await refreshAccounts();
    toast.success("Demo account reset to $100,000");
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
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'withdrawal':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Wallet className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Banner */}
      <div className={`p-3 rounded-lg flex items-center gap-2 ${
        isDemo 
          ? 'bg-amber-500/10 border border-amber-500/20' 
          : 'bg-green-500/10 border border-green-500/20'
      }`}>
        {isDemo ? (
          <>
            <Shield className="h-5 w-5 text-amber-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Demo Wallet — Virtual funds for practice trading
              </p>
              <p className="text-xs text-muted-foreground">
                Virtual funds — trades execute exactly like live mode.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleResetDemo} className="text-xs">
              <RefreshCw className="h-3 w-3 mr-1" />
              Reset to $100K
            </Button>
          </>
        ) : (
          <>
            <AlertTriangle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Live Wallet — Real funds
              </p>
              <p className="text-xs text-muted-foreground">
                Deposits and withdrawals use Zambian payment methods.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Balances */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Overview
            <Badge variant={isDemo ? "secondary" : "default"} className={isDemo ? "" : "bg-green-500"}>
              {isDemo ? 'Demo' : 'Live'}
            </Badge>
          </CardTitle>
          <CardDescription>
            {isDemo ? 'Virtual funds — same trading experience as live' : 'Manage your real trading funds'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {balances.length === 0 ? (
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">USD</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(activeAccount?.available_balance || 0, 'USD')}
                      </p>
                    </div>
                    <Badge variant={isDemo ? "secondary" : "default"}>
                      {isDemo ? 'Virtual' : 'Real'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ) : (
              balances.map(balance => (
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
                        {isDemo ? 'Virtual' : balance.available > 0 ? 'Active' : 'Empty'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Deposit/Withdraw */}
      <Tabs defaultValue="deposit" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="deposit">Deposit</TabsTrigger>
          <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
        </TabsList>

        <TabsContent value="deposit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {isDemo ? 'Add Funds' : 'Deposit Funds'}
              </CardTitle>
              <CardDescription>
                {isDemo 
                  ? 'Add virtual funds to your demo account' 
                  : 'Add funds via Mobile Money, Bank Transfer, or Card'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isDemo && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Quick Add</Label>
                  <div className="flex flex-wrap gap-2">
                    {DEMO_QUICK_AMOUNTS.map(amount => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        onClick={() => handleDemoQuickDeposit(amount)}
                        disabled={isLoading}
                      >
                        +${amount >= 1000 ? `${amount / 1000}K` : amount}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="depositAmount">
                  {isDemo ? 'Custom Amount (USD)' : 'Amount (USD)'}
                </Label>
                <Input
                  id="depositAmount"
                  type="number"
                  placeholder="Enter amount"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
              </div>

              {!isDemo && (
                <div className="space-y-3">
                  <Label className="text-sm text-muted-foreground">Payment Method</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button variant="outline" className="justify-start h-auto py-3" disabled>
                      <Smartphone className="h-5 w-5 mr-2 text-green-500" />
                      <div className="text-left">
                        <p className="text-sm font-medium">Mobile Money</p>
                        <p className="text-xs text-muted-foreground">MTN, Airtel, Zamtel</p>
                      </div>
                    </Button>
                    <Button variant="outline" className="justify-start h-auto py-3" disabled>
                      <Building2 className="h-5 w-5 mr-2 text-primary" />
                      <div className="text-left">
                        <p className="text-sm font-medium">Bank Transfer</p>
                        <p className="text-xs text-muted-foreground">Local banks</p>
                      </div>
                    </Button>
                    <Button variant="outline" className="justify-start h-auto py-3" disabled>
                      <Wallet className="h-5 w-5 mr-2 text-blue-500" />
                      <div className="text-left">
                        <p className="text-sm font-medium">Card</p>
                        <p className="text-xs text-muted-foreground">VISA / Mastercard</p>
                      </div>
                    </Button>
                  </div>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Payment methods will be enabled once the payment processing API is configured.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              <Button 
                onClick={handleDeposit} 
                disabled={isLoading || !depositAmount}
                className="w-full"
              >
                {isLoading ? 'Processing...' : isDemo ? 'Add Funds' : 'Deposit Funds'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdraw" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {isDemo ? 'Withdraw Funds' : 'Withdraw Funds'}
              </CardTitle>
              <CardDescription>
                {isDemo 
                  ? 'Withdraw virtual funds from your demo account' 
                  : 'Transfer funds to your bank or mobile money account'}
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
                  Available: {formatCurrency(getBalance('USD')?.available || activeAccount?.available_balance || 0, 'USD')}
                  {isDemo && <span className="ml-1 text-amber-500">(virtual)</span>}
                </p>
              </div>

              {!isDemo && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Withdrawal processing will be available once payment APIs are configured. 
                    Typical processing: Mobile Money (instant), Bank Transfer (1-3 business days).
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={handleWithdraw} 
                disabled={isLoading || !withdrawAmount}
                variant="outline"
                className="w-full"
              >
                {isLoading ? 'Processing...' : isDemo ? 'Withdraw Funds' : 'Request Withdrawal'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            {isDemo ? 'Demo transaction history' : 'Your latest wallet activity'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No transactions yet. {isDemo ? 'Start by adding virtual funds above.' : 'Deposit funds to get started.'}
              </p>
            ) : (
              transactions.slice(0, 10).map(transaction => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(transaction.type)}
                    <div>
                      <p className="font-medium">
                        {transaction.description}
                        {isDemo && <span className="text-xs text-amber-500 ml-1">(demo)</span>}
                      </p>
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

export default WalletManager;
