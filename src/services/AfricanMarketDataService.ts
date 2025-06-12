
import { supabase } from "@/integrations/supabase/client";

export interface AfricanMarketData {
  symbol: string;
  name: string;
  price: number;
  currency: 'ZMW' | 'USD' | 'ZAR' | 'NGN' | 'KES';
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  exchange: 'LuSE' | 'JSE' | 'NGX' | 'NSE';
  sector?: string;
  lastUpdated: string;
}

export interface CommodityPrice {
  commodity: 'copper' | 'gold' | 'cobalt' | 'maize' | 'coffee';
  price: number;
  currency: string;
  unit: string;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

export interface CurrencyRate {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

export class AfricanMarketDataService {
  // Lusaka Stock Exchange data
  static async fetchLuSEStocks(): Promise<AfricanMarketData[]> {
    try {
      // Mock data for now - in production, integrate with LuSE API
      const mockLuSEData: AfricanMarketData[] = [
        {
          symbol: "ZANACO",
          name: "Zambia National Commercial Bank Plc",
          price: 15.50,
          currency: "ZMW",
          change: 0.25,
          changePercent: 1.64,
          volume: 125000,
          marketCap: 2500000000,
          exchange: "LuSE",
          sector: "Financial Services",
          lastUpdated: new Date().toISOString()
        },
        {
          symbol: "SHOPRITE",
          name: "Shoprite Holdings Zambia Limited",
          price: 42.75,
          currency: "ZMW",
          change: -1.25,
          changePercent: -2.84,
          volume: 85000,
          marketCap: 1800000000,
          exchange: "LuSE",
          sector: "Consumer Staples",
          lastUpdated: new Date().toISOString()
        },
        {
          symbol: "ZCCM",
          name: "ZCCM Investments Holdings Plc",
          price: 8.90,
          currency: "ZMW",
          change: 0.15,
          changePercent: 1.71,
          volume: 200000,
          marketCap: 950000000,
          exchange: "LuSE",
          sector: "Mining",
          lastUpdated: new Date().toISOString()
        }
      ];

      // Store in database for caching
      await this.cacheMarketData(mockLuSEData);
      return mockLuSEData;
    } catch (error) {
      console.error("Error fetching LuSE data:", error);
      return this.getCachedAfricanStocks("LuSE");
    }
  }

  // Commodity prices (important for Zambian economy)
  static async fetchCommodityPrices(): Promise<CommodityPrice[]> {
    try {
      const mockCommodityData: CommodityPrice[] = [
        {
          commodity: "copper",
          price: 8245.50,
          currency: "USD",
          unit: "per tonne",
          change: 125.25,
          changePercent: 1.54,
          lastUpdated: new Date().toISOString()
        },
        {
          commodity: "gold",
          price: 1985.75,
          currency: "USD",
          unit: "per ounce",
          change: -12.50,
          changePercent: -0.63,
          lastUpdated: new Date().toISOString()
        },
        {
          commodity: "cobalt",
          price: 32450.00,
          currency: "USD",
          unit: "per tonne",
          change: 450.00,
          changePercent: 1.41,
          lastUpdated: new Date().toISOString()
        }
      ];

      await this.cacheCommodityData(mockCommodityData);
      return mockCommodityData;
    } catch (error) {
      console.error("Error fetching commodity data:", error);
      return this.getCachedCommodityData();
    }
  }

  // Currency exchange rates
  static async fetchCurrencyRates(): Promise<CurrencyRate[]> {
    try {
      const mockRates: CurrencyRate[] = [
        {
          baseCurrency: "USD",
          targetCurrency: "ZMW",
          rate: 18.45,
          change: 0.12,
          changePercent: 0.65,
          lastUpdated: new Date().toISOString()
        },
        {
          baseCurrency: "ZAR",
          targetCurrency: "ZMW",
          rate: 1.02,
          change: -0.01,
          changePercent: -0.98,
          lastUpdated: new Date().toISOString()
        },
        {
          baseCurrency: "GBP",
          targetCurrency: "ZMW",
          rate: 23.15,
          change: 0.25,
          changePercent: 1.09,
          lastUpdated: new Date().toISOString()
        }
      ];

      await this.cacheCurrencyRates(mockRates);
      return mockRates;
    } catch (error) {
      console.error("Error fetching currency rates:", error);
      return this.getCachedCurrencyRates();
    }
  }

  // Government bonds and treasury bills
  static async fetchGovernmentSecurities() {
    try {
      const mockSecurities = [
        {
          id: "ZMW-TB-91D",
          name: "91-Day Treasury Bill",
          type: "treasury_bill",
          currency: "ZMW",
          yield: 12.5,
          minimumInvestment: 1000,
          maturityDays: 91,
          issuer: "Bank of Zambia",
          lastAuctionDate: "2024-01-15"
        },
        {
          id: "ZMW-GB-5Y",
          name: "5-Year Government Bond",
          type: "government_bond",
          currency: "ZMW",
          yield: 15.2,
          minimumInvestment: 5000,
          maturityYears: 5,
          issuer: "Ministry of Finance",
          couponRate: 14.5
        }
      ];

      await this.cacheGovernmentSecurities(mockSecurities);
      return mockSecurities;
    } catch (error) {
      console.error("Error fetching government securities:", error);
      return [];
    }
  }

  // Helper methods for caching
  private static async cacheMarketData(data: AfricanMarketData[]) {
    try {
      const { error } = await supabase
        .from("african_market_data")
        .upsert(data.map(item => ({
          symbol: item.symbol,
          name: item.name,
          price: item.price,
          currency: item.currency,
          change_amount: item.change,
          change_percent: item.changePercent,
          volume: item.volume,
          market_cap: item.marketCap,
          exchange: item.exchange,
          sector: item.sector,
          last_updated: item.lastUpdated
        })));

      if (error) throw error;
    } catch (error) {
      console.error("Error caching market data:", error);
    }
  }

  private static async cacheCommodityData(data: CommodityPrice[]) {
    try {
      const { error } = await supabase
        .from("commodity_prices")
        .upsert(data.map(item => ({
          commodity: item.commodity,
          price: item.price,
          currency: item.currency,
          unit: item.unit,
          change_amount: item.change,
          change_percent: item.changePercent,
          last_updated: item.lastUpdated
        })));

      if (error) throw error;
    } catch (error) {
      console.error("Error caching commodity data:", error);
    }
  }

  private static async cacheCurrencyRates(data: CurrencyRate[]) {
    try {
      const { error } = await supabase
        .from("currency_rates")
        .upsert(data.map(item => ({
          base_currency: item.baseCurrency,
          target_currency: item.targetCurrency,
          rate: item.rate,
          change_amount: item.change,
          change_percent: item.changePercent,
          last_updated: item.lastUpdated
        })));

      if (error) throw error;
    } catch (error) {
      console.error("Error caching currency rates:", error);
    }
  }

  private static async cacheGovernmentSecurities(data: any[]) {
    try {
      const { error } = await supabase
        .from("government_securities")
        .upsert(data);

      if (error) throw error;
    } catch (error) {
      console.error("Error caching government securities:", error);
    }
  }

  private static async getCachedAfricanStocks(exchange: string): Promise<AfricanMarketData[]> {
    try {
      const { data, error } = await supabase
        .from("african_market_data")
        .select("*")
        .eq("exchange", exchange)
        .order("last_updated", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching cached data:", error);
      return [];
    }
  }

  private static async getCachedCommodityData(): Promise<CommodityPrice[]> {
    try {
      const { data, error } = await supabase
        .from("commodity_prices")
        .select("*")
        .order("last_updated", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching cached commodity data:", error);
      return [];
    }
  }

  private static async getCachedCurrencyRates(): Promise<CurrencyRate[]> {
    try {
      const { data, error } = await supabase
        .from("currency_rates")
        .select("*")
        .order("last_updated", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching cached currency rates:", error);
      return [];
    }
  }
}
