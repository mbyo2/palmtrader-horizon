import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PriceAlertForm = () => {
  const [symbol, setSymbol] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create price alerts",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("price_alerts").insert({
        user_id: user.id,
        symbol: symbol.toUpperCase(),
        target_price: parseFloat(targetPrice),
        condition,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Price alert created successfully",
      });

      // Reset form
      setSymbol("");
      setTargetPrice("");
      setCondition("above");
    } catch (error) {
      console.error("Error creating price alert:", error);
      toast({
        title: "Error",
        description: "Failed to create price alert",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Symbol</label>
          <Input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="Enter stock symbol"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Target Price</label>
          <Input
            type="number"
            step="0.01"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            placeholder="Enter target price"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Condition</label>
          <Select value={condition} onValueChange={(value: "above" | "below") => setCondition(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="above">Price goes above</SelectItem>
              <SelectItem value="below">Price goes below</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" className="w-full">
          <Bell className="h-4 w-4 mr-2" />
          Create Alert
        </Button>
      </form>
    </Card>
  );
};

export default PriceAlertForm;