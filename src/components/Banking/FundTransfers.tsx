import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowDownUp } from "lucide-react";

const FundTransfers = () => {
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"deposit" | "withdrawal">("deposit");
  const [bankAccountId, setBankAccountId] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleTransfer = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to make transfers",
          variant: "destructive",
        });
        return;
      }

      // Call the banking edge function
      const { data, error } = await supabase.functions.invoke('banking', {
        body: {
          action: 'processTransfer',
          data: {
            amount: parseFloat(amount),
            bankAccountId,
            direction,
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Transfer Initiated",
        description: `Your ${direction} of $${amount} has been initiated. Reference: ${data.transfer.transaction_ref}`,
      });

      // Reset form
      setAmount("");
      setBankAccountId("");
    } catch (error) {
      console.error("Error initiating transfer:", error);
      toast({
        title: "Error",
        description: "Failed to initiate transfer",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 card-gradient">
      <div className="flex items-center gap-2 mb-6">
        <ArrowDownUp className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Fund Transfers</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Transfer Type</label>
          <Select
            value={direction}
            onValueChange={(value: "deposit" | "withdrawal") =>
              setDirection(value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select transfer type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deposit">Deposit</SelectItem>
              <SelectItem value="withdrawal">Withdrawal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Amount</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Bank Account</label>
          <Select value={bankAccountId} onValueChange={setBankAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Select bank account" />
            </SelectTrigger>
            <SelectContent>
              {/* We'll populate this dynamically later */}
              <SelectItem value="account1">Account 1</SelectItem>
              <SelectItem value="account2">Account 2</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleTransfer}
          className="w-full bg-primary hover:bg-primary/90"
          disabled={!amount || !bankAccountId || loading}
        >
          {loading ? "Processing..." : "Initiate Transfer"}
        </Button>
      </div>
    </Card>
  );
};

export default FundTransfers;