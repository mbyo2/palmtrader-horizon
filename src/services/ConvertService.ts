import { supabase } from "@/integrations/supabase/client";
import { isDemo, isDemoSync } from '@/services/demo/DemoBackend';
import { DemoConvert } from '@/services/demo/demoExchange';
import { crossRate } from '@/services/demo/demoMarket';

export interface ConvertQuote {
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  fee: number;
  expiresAt: Date;
}

export interface ConvertHistory {
  id: string;
  user_id: string;
  from_currency: string;
  to_currency: string;
  from_amount: number;
  to_amount: number;
  rate: number;
  fee: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

export class ConvertService {
  private static readonly FEE_PERCENTAGE = 0.001; // 0.1% fee
  private static readonly QUOTE_VALIDITY_SECONDS = 10;

  // Simulated exchange rates (in production, fetch from real API)
  private static readonly BASE_RATES: Record<string, number> = {
    'BTC': 65000,
    'ETH': 3500,
    'SOL': 150,
    'XRP': 0.55,
    'ADA': 0.45,
    'DOT': 7.5,
    'DOGE': 0.12,
    'USDT': 1,
    'USDC': 1,
    'USD': 1
  };

  static async getQuote(fromCurrency: string, toCurrency: string, fromAmount: number): Promise<ConvertQuote> {
    if (await isDemo()) return DemoConvert.getQuote(fromCurrency, toCurrency, fromAmount);
    const fromRate = this.BASE_RATES[fromCurrency] || 1;
    const toRate = this.BASE_RATES[toCurrency] || 1;
    
    const rate = fromRate / toRate;
    const fee = fromAmount * this.FEE_PERCENTAGE;
    const netAmount = fromAmount - fee;
    const toAmount = netAmount * rate;

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + this.QUOTE_VALIDITY_SECONDS);

    return {
      fromCurrency,
      toCurrency,
      fromAmount,
      toAmount,
      rate,
      fee,
      expiresAt
    };
  }

  static async executeConvert(
    userId: string,
    fromCurrency: string,
    toCurrency: string,
    fromAmount: number
  ): Promise<{ success: boolean; toAmount?: number; error?: string }> {
    if (await isDemo()) return DemoConvert.executeConvert(userId, fromCurrency, toCurrency, fromAmount);
    try {
      const quote = await this.getQuote(fromCurrency, toCurrency, fromAmount);

      const { data, error } = await supabase
        .from('convert_history')
        .insert({
          user_id: userId,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          from_amount: fromAmount,
          to_amount: quote.toAmount,
          rate: quote.rate,
          fee: quote.fee,
          status: 'completed'
        })
        .select('id')
        .single();

      if (error) throw error;

      return { success: true, toAmount: quote.toAmount };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Conversion failed' };
    }
  }

  static async getHistory(userId: string, limit: number = 50): Promise<ConvertHistory[]> {
    if (await isDemo()) return DemoConvert.getHistory(userId, limit);
    const { data, error } = await supabase
      .from('convert_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(h => ({
      ...h,
      status: h.status as 'pending' | 'completed' | 'failed',
      from_amount: Number(h.from_amount),
      to_amount: Number(h.to_amount),
      rate: Number(h.rate),
      fee: Number(h.fee)
    }));
  }

  static getSupportedCurrencies(): string[] {
    const base = Object.keys(this.BASE_RATES);
    // Demo mode adds ZMW (and the live cross-rate engine behind it).
    return isDemoSync() ? [...base, 'ZMW'] : base;
  }

  static getRate(fromCurrency: string, toCurrency: string): number {
    if (isDemoSync()) return crossRate(fromCurrency, toCurrency);
    const fromRate = this.BASE_RATES[fromCurrency] || 1;
    const toRate = this.BASE_RATES[toCurrency] || 1;
    return fromRate / toRate;
  }
}
