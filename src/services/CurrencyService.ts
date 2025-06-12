
import { supabase } from "@/integrations/supabase/client";

export type SupportedCurrency = 'ZMW' | 'USD' | 'ZAR' | 'GBP' | 'EUR' | 'NGN' | 'KES';

export interface CurrencyConversion {
  fromCurrency: SupportedCurrency;
  toCurrency: SupportedCurrency;
  rate: number;
  amount: number;
  convertedAmount: number;
  fees: number;
  timestamp: string;
}

export interface CurrencyPreferences {
  baseCurrency: SupportedCurrency;
  displayCurrency: SupportedCurrency;
  autoConvert: boolean;
}

export class CurrencyService {
  private static readonly CURRENCY_INFO = {
    ZMW: { name: 'Zambian Kwacha', symbol: 'K', decimals: 2 },
    USD: { name: 'US Dollar', symbol: '$', decimals: 2 },
    ZAR: { name: 'South African Rand', symbol: 'R', decimals: 2 },
    GBP: { name: 'British Pound', symbol: '£', decimals: 2 },
    EUR: { name: 'Euro', symbol: '€', decimals: 2 },
    NGN: { name: 'Nigerian Naira', symbol: '₦', decimals: 2 },
    KES: { name: 'Kenyan Shilling', symbol: 'KSh', decimals: 2 }
  };

  private static readonly CONVERSION_FEES = {
    ZMW: { base: 0.005, minimum: 1 }, // 0.5% fee, minimum K1
    USD: { base: 0.01, minimum: 0.5 }, // 1% fee, minimum $0.50
    ZAR: { base: 0.008, minimum: 1 }, // 0.8% fee, minimum R1
    GBP: { base: 0.012, minimum: 0.5 }, // 1.2% fee, minimum £0.50
    EUR: { base: 0.011, minimum: 0.5 }, // 1.1% fee, minimum €0.50
    NGN: { base: 0.007, minimum: 10 }, // 0.7% fee, minimum ₦10
    KES: { base: 0.006, minimum: 5 } // 0.6% fee, minimum KSh5
  };

  // Get current exchange rates
  static async getExchangeRates(baseCurrency: SupportedCurrency = 'ZMW'): Promise<Record<SupportedCurrency, number>> {
    try {
      const { data, error } = await supabase
        .from("currency_rates")
        .select("*")
        .eq("base_currency", baseCurrency)
        .order("last_updated", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Convert to rates object
      const rates: Record<string, number> = { [baseCurrency]: 1 };
      data?.forEach(rate => {
        rates[rate.target_currency] = rate.rate;
      });

      // Fill in missing rates with mock data if needed
      const mockRates = {
        ZMW: baseCurrency === 'ZMW' ? 1 : 18.45,
        USD: baseCurrency === 'USD' ? 1 : 0.054,
        ZAR: baseCurrency === 'ZAR' ? 1 : 1.02,
        GBP: baseCurrency === 'GBP' ? 1 : 0.043,
        EUR: baseCurrency === 'EUR' ? 1 : 0.049,
        NGN: baseCurrency === 'NGN' ? 1 : 25.8,
        KES: baseCurrency === 'KES' ? 1 : 2.67
      };

      // Merge with actual rates, fallback to mock rates
      Object.keys(mockRates).forEach(currency => {
        if (!rates[currency]) {
          rates[currency] = mockRates[currency as SupportedCurrency];
        }
      });

      return rates as Record<SupportedCurrency, number>;
    } catch (error) {
      console.error("Error fetching exchange rates:", error);
      // Return default rates for ZMW base
      return {
        ZMW: 1,
        USD: 0.054,
        ZAR: 1.02,
        GBP: 0.043,
        EUR: 0.049,
        NGN: 25.8,
        KES: 2.67
      };
    }
  }

  // Convert currency
  static async convertCurrency(
    amount: number,
    fromCurrency: SupportedCurrency,
    toCurrency: SupportedCurrency
  ): Promise<CurrencyConversion> {
    try {
      if (fromCurrency === toCurrency) {
        return {
          fromCurrency,
          toCurrency,
          rate: 1,
          amount,
          convertedAmount: amount,
          fees: 0,
          timestamp: new Date().toISOString()
        };
      }

      const rates = await this.getExchangeRates(fromCurrency);
      const rate = rates[toCurrency];
      const convertedAmount = amount * rate;
      
      // Calculate conversion fees
      const feeConfig = this.CONVERSION_FEES[toCurrency];
      const calculatedFee = convertedAmount * feeConfig.base;
      const fees = Math.max(calculatedFee, feeConfig.minimum);

      const conversion: CurrencyConversion = {
        fromCurrency,
        toCurrency,
        rate,
        amount,
        convertedAmount: convertedAmount - fees,
        fees,
        timestamp: new Date().toISOString()
      };

      // Log conversion for audit trail
      await this.logCurrencyConversion(conversion);

      return conversion;
    } catch (error) {
      console.error("Error converting currency:", error);
      throw new Error(`Currency conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Format currency for display
  static formatCurrency(amount: number, currency: SupportedCurrency): string {
    const info = this.CURRENCY_INFO[currency];
    const formattedAmount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: info.decimals,
      maximumFractionDigits: info.decimals
    }).format(Math.abs(amount));

    const sign = amount < 0 ? '-' : '';
    return `${sign}${info.symbol}${formattedAmount}`;
  }

  // Get currency info
  static getCurrencyInfo(currency: SupportedCurrency) {
    return this.CURRENCY_INFO[currency];
  }

  // Get all supported currencies
  static getSupportedCurrencies(): Array<{code: SupportedCurrency, name: string, symbol: string}> {
    return Object.entries(this.CURRENCY_INFO).map(([code, info]) => ({
      code: code as SupportedCurrency,
      name: info.name,
      symbol: info.symbol
    }));
  }

  // User currency preferences
  static async getUserCurrencyPreferences(userId: string): Promise<CurrencyPreferences> {
    try {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("currency, auto_convert")
        .eq("user_id", userId)
        .single();

      if (error) throw error;

      return {
        baseCurrency: (data?.currency as SupportedCurrency) || 'ZMW',
        displayCurrency: (data?.currency as SupportedCurrency) || 'ZMW',
        autoConvert: data?.auto_convert || false
      };
    } catch (error) {
      console.error("Error fetching currency preferences:", error);
      return {
        baseCurrency: 'ZMW',
        displayCurrency: 'ZMW',
        autoConvert: false
      };
    }
  }

  static async updateUserCurrencyPreferences(
    userId: string, 
    preferences: Partial<CurrencyPreferences>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("user_preferences")
        .upsert({
          user_id: userId,
          currency: preferences.baseCurrency,
          auto_convert: preferences.autoConvert,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error updating currency preferences:", error);
      return false;
    }
  }

  // Private helper methods
  private static async logCurrencyConversion(conversion: CurrencyConversion) {
    try {
      await supabase.from("currency_conversions").insert({
        from_currency: conversion.fromCurrency,
        to_currency: conversion.toCurrency,
        rate: conversion.rate,
        amount: conversion.amount,
        converted_amount: conversion.convertedAmount,
        fees: conversion.fees,
        timestamp: conversion.timestamp
      });
    } catch (error) {
      console.error("Error logging currency conversion:", error);
    }
  }

  // Real-time rate updates
  static subscribeToRateUpdates(callback: (rates: Record<SupportedCurrency, number>) => void) {
    const channel = supabase
      .channel('currency_rates_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'currency_rates'
        },
        async () => {
          const rates = await this.getExchangeRates();
          callback(rates);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }
}
