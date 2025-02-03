import { useState } from "react";
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
import { useAuthRedirect } from "@/hooks/useAuthRedirect";

const RecurringInvestments = () => {
  const [symbol, setSymbol] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<string>("weekly");
  const { toast } = useToast();
  const { handleAuthRequired } = useAuthRedirect();

  const handleSetupRecurring = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        handleAuthRequired("Please sign in to set up recurring investments");
        return;
      }

      // Validate inputs
      if (!symbol || !amount || !frequency) {
        toast({
          title: "Error",
          description: "Please fill in all fields",
          variant: "destructive",
        });
        return;
      }

      // Calculate next execution date based on frequency
      const nextExecutionDate = new Date();
      switch (frequency) {
        case "daily":
          nextExecutionDate.setDate(nextExecutionDate.getDate() + 1);
          break;
        case "weekly":
          nextExecutionDate.setDate(nextExecutionDate.getDate() + 7);
          break;
        case "monthly":
          nextExecutionDate.setMonth(nextExecutionDate.getMonth() + 1);
          break;
      }

      // Insert recurring investment
      const { error } = await supabase.from("recurring_investments").insert({
        user_id: user.id,
        symbol: symbol.toUpperCase(),
        amount: parseFloat(amount),
        frequency,
        next_execution_date: nextExecutionDate.toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Recurring investment set up successfully",
      });

      // Reset form
      setSymbol("");
      setAmount("");
      setFrequency("weekly");
    } catch (error) {
      console.error("Error setting up recurring investment:", error);
      toast({
        title: "Error",
        description: "Failed to set up recurring investment",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Stock symbol (e.g., AAPL)"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
      />
      <Input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Select value={frequency} onValueChange={setFrequency}>
        <SelectTrigger>
          <SelectValue placeholder="Select frequency" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="daily">Daily</SelectItem>
          <SelectItem value="weekly">Weekly</SelectItem>
          <SelectItem value="monthly">Monthly</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={handleSetupRecurring} className="w-full">
        Set Up Recurring Investment
      </Button>
    </div>
  );
};

export default RecurringInvestments;