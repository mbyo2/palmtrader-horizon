
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowUpCircle, ArrowDownCircle, CreditCard, Smartphone, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_verified: boolean;
  is_primary: boolean;
}

interface MobileMoneyAccount {
  id: string;
  provider: string;
  phone_number: string;
  account_name: string;
  is_verified: boolean;
  is_primary: boolean;
}

const FundTransferInterface = () => {
  const { user } = useAuth();
  const [transferType, setTransferType] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [selectedBankAccount, setSelectedBankAccount] = useState("");
  const [selectedMobileAccount, setSelectedMobileAccount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankAccounts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_verified', true);
      if (error) throw error;
      return data as BankAccount[];
    },
    enabled: !!user,
  });

  const { data: mobileAccounts = [] } = useQuery({
    queryKey: ["mobileAccounts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('mobile_money_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_verified', true);
      if (error) throw error;
      return data as MobileMoneyAccount[];
    },
    enabled: !!user,
  });

  const { data: cashBalance = 0 } = useQuery({
    queryKey: ["cashBalance", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      // Mock cash balance - in real app this would come from a wallet table
      return 5000;
    },
    enabled: !!user,
  });

  const handleBankTransfer = async () => {
    if (!user || !selectedBankAccount || !amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    const transferAmount = parseFloat(amount);
    if (transferAmount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (transferType === "withdraw" && transferAmount > cashBalance) {
      toast.error("Insufficient funds");
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await supabase.from('fund_transfers').insert({
        user_id: user.id,
        bank_account_id: selectedBankAccount,
        amount: transferAmount,
        direction: transferType,
        status: 'pending'
      });

      if (error) throw error;

      toast.success(
        `${transferType === 'deposit' ? 'Deposit' : 'Withdrawal'} request submitted successfully`
      );
      setAmount("");
      setSelectedBankAccount("");
    } catch (error) {
      toast.error("Transfer failed. Please try again.");
      console.error("Transfer error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMobileMoneyTransfer = async () => {
    if (!user || !selectedMobileAccount || !amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    const transferAmount = parseFloat(amount);
    if (transferAmount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (transferType === "withdraw" && transferAmount > cashBalance) {
      toast.error("Insufficient funds");
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await supabase.from('mobile_money_transactions').insert({
        user_id: user.id,
        account_id: selectedMobileAccount,
        amount: transferAmount,
        type: transferType,
        status: 'pending'
      });

      if (error) throw error;

      toast.success(
        `Mobile money ${transferType} request submitted successfully`
      );
      setAmount("");
      setSelectedMobileAccount("");
    } catch (error) {
      toast.error("Transfer failed. Please try again.");
      console.error("Mobile money error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-center py-4">
            ${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-center text-muted-foreground">Available for trading</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fund Transfer</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={transferType} onValueChange={(value) => setTransferType(value as "deposit" | "withdraw")}>
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value="deposit" className="flex items-center gap-2">
                <ArrowDownCircle className="h-4 w-4" />
                Deposit
              </TabsTrigger>
              <TabsTrigger value="withdraw" className="flex items-center gap-2">
                <ArrowUpCircle className="h-4 w-4" />
                Withdraw
              </TabsTrigger>
            </TabsList>

            <div className="space-y-4">
              <div>
                <Label htmlFor="amount">Amount (USD)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>

              <Tabs defaultValue="bank" className="space-y-4">
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="bank" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Bank Transfer
                  </TabsTrigger>
                  <TabsTrigger value="mobile" className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Mobile Money
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="bank" className="space-y-4">
                  {bankAccounts.length === 0 ? (
                    <Alert>
                      <AlertDescription>
                        No verified bank accounts found. Please add and verify a bank account first.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <div>
                        <Label htmlFor="bankAccount">Select Bank Account</Label>
                        <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose bank account" />
                          </SelectTrigger>
                          <SelectContent>
                            {bankAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.bank_name} - {account.account_number.slice(-4)}
                                {account.is_primary && " (Primary)"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button 
                        onClick={handleBankTransfer}
                        disabled={!selectedBankAccount || !amount || isProcessing}
                        className="w-full"
                      >
                        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {transferType === "deposit" ? "Deposit Funds" : "Withdraw Funds"}
                      </Button>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="mobile" className="space-y-4">
                  {mobileAccounts.length === 0 ? (
                    <Alert>
                      <AlertDescription>
                        No verified mobile money accounts found. Please add and verify a mobile money account first.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <div>
                        <Label htmlFor="mobileAccount">Select Mobile Money Account</Label>
                        <Select value={selectedMobileAccount} onValueChange={setSelectedMobileAccount}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose mobile money account" />
                          </SelectTrigger>
                          <SelectContent>
                            {mobileAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.provider} - {account.phone_number}
                                {account.is_primary && " (Primary)"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button 
                        onClick={handleMobileMoneyTransfer}
                        disabled={!selectedMobileAccount || !amount || isProcessing}
                        className="w-full"
                      >
                        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {transferType === "deposit" ? "Deposit via Mobile Money" : "Withdraw via Mobile Money"}
                      </Button>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default FundTransferInterface;
