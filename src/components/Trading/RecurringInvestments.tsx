
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Calendar, DollarSign } from "lucide-react";
import { toast } from "sonner";

const RecurringInvestments = () => {
  const { user } = useAuth();
  const [symbol, setSymbol] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [isCreating, setIsCreating] = useState(false);

  const { data: investments = [], refetch } = useQuery({
    queryKey: ["recurringInvestments", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("recurring_investments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleCreateInvestment = async () => {
    if (!user || !symbol || !amount) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsCreating(true);
    try {
      // Calculate next execution date based on frequency
      const nextDate = new Date();
      switch (frequency) {
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'biweekly':
          nextDate.setDate(nextDate.getDate() + 14);
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case 'quarterly':
          nextDate.setMonth(nextDate.getMonth() + 3);
          break;
      }

      const { error } = await supabase
        .from("recurring_investments")
        .insert({
          user_id: user.id,
          symbol: symbol.toUpperCase(),
          amount: parseFloat(amount),
          frequency,
          next_execution_date: nextDate.toISOString(),
        });

      if (error) throw error;

      toast.success("Recurring investment created successfully");
      setSymbol("");
      setAmount("");
      setFrequency("monthly");
      refetch();
    } catch (error) {
      toast.error("Failed to create recurring investment");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleInvestment = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("recurring_investments")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;

      toast.success(isActive ? "Investment paused" : "Investment resumed");
      refetch();
    } catch (error) {
      toast.error("Failed to update investment");
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Recurring Investment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="symbol">Stock Symbol</Label>
              <Input
                id="symbol"
                placeholder="e.g., AAPL"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="uppercase"
              />
            </div>

            <div>
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="frequency">Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={handleCreateInvestment}
            disabled={isCreating || !symbol || !amount}
            className="w-full"
          >
            {isCreating ? "Creating..." : "Create Recurring Investment"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Recurring Investments</CardTitle>
        </CardHeader>
        <CardContent>
          {investments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recurring investments yet. Create your first one above!
            </div>
          ) : (
            <div className="space-y-3">
              {investments.map((investment) => (
                <div key={investment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{investment.symbol}</span>
                      <Badge variant={investment.is_active ? "default" : "secondary"}>
                        {investment.is_active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${investment.amount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {investment.frequency}
                      </span>
                      <span>
                        Next: {new Date(investment.next_execution_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleInvestment(investment.id, investment.is_active)}
                  >
                    {investment.is_active ? "Pause" : "Resume"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RecurringInvestments;
