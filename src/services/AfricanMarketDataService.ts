
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

      return mockLuSEData;
    } catch (error) {
      console.error("Error fetching LuSE data:", error);
      return [];
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

      return mockCommodityData;
    } catch (error) {
      console.error("Error fetching commodity data:", error);
      return [];
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

      return mockRates;
    } catch (error) {
      console.error("Error fetching currency rates:", error);
      return [];
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

      return mockSecurities;
    } catch (error) {
      console.error("Error fetching government securities:", error);
      return [];
    }
  }
}
