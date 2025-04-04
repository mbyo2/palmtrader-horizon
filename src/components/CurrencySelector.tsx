
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUserPreferences = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: preferences, error } = await supabase
          .from('user_preferences')
          .select('currency')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;

        if (preferences) {
          setSelectedCurrency(preferences.currency);
          if (onChange) onChange(preferences.currency);
        }
      } catch (error) {
        console.error('Error fetching user preferences:', error);
        setError(error instanceof Error ? error : new Error('Unknown error'));
        toast.error("Error loading preferences");
      } finally {
        setLoading(false);
      }
    };

    fetchUserPreferences();
  }, [onChange]);

  const handleCurrencyChange = async (value: string) => {
    try {
      setSelectedCurrency(value);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to change currency");
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

      if (onChange) onChange(value);
      
      toast.success("Currency updated successfully");
    } catch (error) {
      console.error('Error updating currency:', error);
      toast.error("Error updating currency");
    }
  };

  if (loading) {
    return (
      <div className="w-[180px] h-10 bg-muted animate-pulse rounded"></div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive text-sm">
        Failed to load currency preferences
      </div>
    );
  }

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
