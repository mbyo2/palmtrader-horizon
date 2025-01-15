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

const RecurringInvestments = () => {
  const [symbol, setSymbol] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<string>("weekly");
  const { toast } = useToast();

  const handleSetupRecurring = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to set up recurring investments",
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

      const { error } = await supabase.from("recurring_investments").insert({
        user_id: user.id,
        symbol: symbol.toUpperCase(),
        amount: parseFloat(amount),
        frequency,
        next_execution_date: nextExecutionDate.toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Recurring Investment Set Up",
        description: `${frequency} investment of $${amount} in ${symbol} set up successfully`,
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
    <Card className="p-6 card-gradient">
      <h2 className="text-xl font-semibold mb-4">Recurring Investments</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Symbol</label>
          <Input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="Enter stock symbol"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Amount ($)</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter investment amount"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Frequency</label>
          <Select
            value={frequency}
            onValueChange={(value: string) => setFrequency(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleSetupRecurring}
          className="w-full bg-primary hover:bg-primary/90"
        >
          Set Up Recurring Investment
        </Button>
      </div>
    </Card>
  );
};

export default RecurringInvestments;