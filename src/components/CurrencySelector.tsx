
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "./ui/use-toast";

export interface CurrencySelectorProps {
  value?: string;
  onChange?: (value: string) => void;
}

const currencies = [
  { code: "USD", name: "US Dollar" },
  { code: "ZMW", name: "Zambian Kwacha" },
  { code: "GBP", name: "British Pound" },
  { code: "EUR", name: "Euro" },
  { code: "JPY", name: "Japanese Yen" },
];

const CurrencySelector = ({ value = "USD", onChange }: CurrencySelectorProps) => {
  const [selectedCurrency, setSelectedCurrency] = useState(value);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserPreferences = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: preferences, error } = await supabase
          .from('user_preferences')
          .select('currency')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        if (preferences) {
          setSelectedCurrency(preferences.currency);
          if (onChange) onChange(preferences.currency);
        } else {
          // Create default preferences if none exist
          await supabase
            .from('user_preferences')
            .insert([{ user_id: user.id, currency: 'USD' }]);
        }
      } catch (error) {
        console.error('Error fetching user preferences:', error);
        toast({
          title: "Error loading preferences",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserPreferences();
  }, []);

  const handleCurrencyChange = async (value: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Please sign in to change currency",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('user_preferences')
        .upsert({ 
          user_id: user.id, 
          currency: value,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setSelectedCurrency(value);
      if (onChange) onChange(value);
      
      toast({
        title: "Currency updated successfully",
      });
    } catch (error) {
      console.error('Error updating currency:', error);
      toast({
        title: "Error updating currency",
        variant: "destructive",
      });
    }
  };

  if (loading) return null;

  return (
    <Select value={selectedCurrency} onValueChange={handleCurrencyChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select currency" />
      </SelectTrigger>
      <SelectContent>
        {currencies.map((currency) => (
          <SelectItem key={currency.code} value={currency.code}>
            {currency.code} - {currency.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CurrencySelector;
