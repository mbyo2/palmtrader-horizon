
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MobileMoneyService, type MobileMoneyProvider } from "@/services/MobileMoneyService";
import { useAuth } from "@/hooks/useAuth";

const MobileMoneyForm = () => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    provider: '',
    phoneNumber: '',
    accountName: '',
    amount: '',
    transactionType: 'deposit' as 'deposit' | 'withdrawal'
  });

  const providers = MobileMoneyService.getProviders();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to continue");
      return;
    }

    setIsSubmitting(true);
    try {
      // First, add the mobile money account if it doesn't exist
      const accountResult = await MobileMoneyService.addMobileMoneyAccount(user.id, {
        provider: formData.provider as MobileMoneyProvider['name'],
        phoneNumber: formData.phoneNumber,
        accountName: formData.accountName
      });

      if (!accountResult.success && !accountResult.error?.includes("already exists")) {
        toast.error(accountResult.error || "Failed to add mobile money account");
        return;
      }

      // Get the account ID (either newly created or existing)
      const accounts = await MobileMoneyService.getUserMobileMoneyAccounts(user.id);
      const account = accounts.find(acc => 
        acc.phoneNumber === formData.phoneNumber && 
        acc.provider === formData.provider
      );

      if (!account) {
        toast.error("Unable to find mobile money account");
        return;
      }

      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      // Process the transaction
      let result;
      if (formData.transactionType === 'deposit') {
        result = await MobileMoneyService.processMobileMoneyDeposit({
          userId: user.id,
          accountId: account.id,
          amount: amount
        });
      } else {
        result = await MobileMoneyService.processMobileMoneyWithdrawal({
          userId: user.id,
          accountId: account.id,
          amount: amount
        });
      }

      if (result.success) {
        toast.success(
          `${formData.transactionType === 'deposit' ? 'Deposit' : 'Withdrawal'} of K${amount} initiated successfully`
        );
        setFormData({
          provider: '',
          phoneNumber: '',
          accountName: '',
          amount: '',
          transactionType: 'deposit'
        });
      } else {
        toast.error(result.error || `${formData.transactionType} failed`);
      }
    } catch (error) {
      console.error("Mobile money transaction error:", error);
      toast.error("Transaction failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProvider = providers.find(p => p.name === formData.provider);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mobile Money</CardTitle>
        <CardDescription>
          Deposit or withdraw funds using mobile money services
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="transactionType">Transaction Type</Label>
            <Select
              value={formData.transactionType}
              onValueChange={(value: 'deposit' | 'withdrawal') => 
                setFormData(prev => ({ ...prev, transactionType: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="withdrawal">Withdrawal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider">Mobile Money Provider</Label>
            <Select
              value={formData.provider}
              onValueChange={(value) => setFormData(prev => ({ ...prev, provider: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.name}>
                    <div className="flex items-center space-x-2">
                      <span>{provider.displayName}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="+260 97 123 4567"
              value={formData.phoneNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter your mobile money registered phone number
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountName">Account Name</Label>
            <Input
              id="accountName"
              type="text"
              placeholder="John Doe"
              value={formData.accountName}
              onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (ZMW)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="1"
              placeholder="100.00"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              required
            />
            {selectedProvider && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  Minimum: K{selectedProvider.fees.minimumAmount} • 
                  Maximum: K{selectedProvider.fees.maximumAmount.toLocaleString()}
                </p>
                <p>
                  Fee: {(selectedProvider.fees[formData.transactionType] * 100).toFixed(1)}%
                  {formData.amount && (
                    <span className="ml-1">
                      (≈ K{(parseFloat(formData.amount) * selectedProvider.fees[formData.transactionType]).toFixed(2)})
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting || !user}
          >
            {isSubmitting ? 'Processing...' : `Process ${formData.transactionType}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default MobileMoneyForm;
