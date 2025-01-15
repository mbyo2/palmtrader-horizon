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

const OptionsTrading = () => {
  const [symbol, setSymbol] = useState("");
  const [optionType, setOptionType] = useState<"CALL" | "PUT">("CALL");
  const [strikePrice, setStrikePrice] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [contracts, setContracts] = useState("");
  const [premium, setPremium] = useState("");
  const { toast } = useToast();

  const handleOptionsOrder = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to place options trades",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("options_trades").insert({
        user_id: user.id,
        symbol: symbol.toUpperCase(),
        option_type: optionType,
        strike_price: parseFloat(strikePrice),
        expiration_date: expirationDate,
        contracts: parseInt(contracts),
        premium_per_contract: parseFloat(premium),
        total_premium: parseFloat(premium) * parseInt(contracts),
      });

      if (error) throw error;

      toast({
        title: "Options Order Placed",
        description: `${optionType} option order for ${symbol} placed successfully`,
      });

      // Reset form
      setSymbol("");
      setStrikePrice("");
      setExpirationDate("");
      setContracts("");
      setPremium("");
    } catch (error) {
      console.error("Error placing options order:", error);
      toast({
        title: "Error",
        description: "Failed to place options order",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-6 card-gradient">
      <h2 className="text-xl font-semibold mb-4">Options Trading</h2>
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
          <label className="block text-sm font-medium mb-1">Option Type</label>
          <Select
            value={optionType}
            onValueChange={(value: "CALL" | "PUT") => setOptionType(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select option type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CALL">CALL</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Strike Price</label>
          <Input
            type="number"
            value={strikePrice}
            onChange={(e) => setStrikePrice(e.target.value)}
            placeholder="Enter strike price"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Expiration Date</label>
          <Input
            type="date"
            value={expirationDate}
            onChange={(e) => setExpirationDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Number of Contracts
          </label>
          <Input
            type="number"
            value={contracts}
            onChange={(e) => setContracts(e.target.value)}
            placeholder="Enter number of contracts"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Premium per Contract
          </label>
          <Input
            type="number"
            value={premium}
            onChange={(e) => setPremium(e.target.value)}
            placeholder="Enter premium per contract"
          />
        </div>

        <Button
          onClick={handleOptionsOrder}
          className="w-full bg-primary hover:bg-primary/90"
        >
          Place Options Order
        </Button>
      </div>
    </Card>
  );
};

export default OptionsTrading;