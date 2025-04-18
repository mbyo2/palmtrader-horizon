
import { useState, useEffect } from "react";
import { finnhubSocket } from "@/utils/finnhubSocket";
import { Stock } from "./StockCard";

// Initial stock data
const initialStocks: Stock[] = [
  { symbol: "ZCCM.ZM", name: "ZCCM Investments Holdings Plc", price: "24.50", change: "+2.3%" },
  { symbol: "CEC.ZM", name: "Copperbelt Energy Corporation Plc", price: "12.75", change: "-0.8%" },
  { symbol: "ZSUG.ZM", name: "Zambia Sugar Plc", price: "8.90", change: "+1.5%" },
  { symbol: "PUMA.ZM", name: "Puma Energy Zambia Plc", price: "15.30", change: "-0.4%" },
  { symbol: "REIZ.ZM", name: "Real Estate Investments Zambia Plc", price: "5.45", change: "+1.2%" },
  { symbol: "PRIMA.ZM", name: "Prima Reinsurance Plc", price: "2.80", change: "-0.6%" },
  { symbol: "BATZ.ZM", name: "British American Tobacco Zambia Plc", price: "22.15", change: "+0.9%" },
  { symbol: "ZNCO.ZM", name: "Zambia National Commercial Bank Plc", price: "1.95", change: "-0.3%" },
  { symbol: "AECI.ZM", name: "AECI Mining Chemicals Limited", price: "18.40", change: "+1.1%" },
  { symbol: "LAFZ.ZM", name: "Lafarge Zambia Plc", price: "4.75", change: "-0.2%" },
  { symbol: "SHOP.ZM", name: "Shoprite Holdings Limited", price: "45.60", change: "+0.7%" },
  { symbol: "MCEL.ZM", name: "Madison Financial Services Plc", price: "3.15", change: "-0.5%" }
];

export const useStockData = (searchQuery: string) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [stocks, setStocks] = useState<Stock[]>(initialStocks);

  // Filter stocks based on search query
  const filteredStocks = stocks.filter(
    (stock) =>
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Set up real-time data subscription
  useEffect(() => {
    try {
      console.log("Setting up stock data subscriptions");
      setLoading(true);
      
      // After data is loaded, set loading to false
      setLoading(false);
      
      // Subscribe to all stock symbols
      stocks.forEach(stock => {
        try {
          finnhubSocket.subscribe(stock.symbol);
        } catch (e) {
          console.error(`Error subscribing to ${stock.symbol}:`, e);
        }
      });

      // Set up data handler
      const unsubscribe = finnhubSocket.onMarketData(({ symbol, price }) => {
        if (!symbol || !price) return;
        
        setStocks(prevStocks => 
          prevStocks.map(stock => {
            if (stock.symbol === symbol) {
              const prevPrice = parseFloat(stock.price);
              const percentChange = ((price - prevPrice) / prevPrice * 100).toFixed(2);
              
              return {
                ...stock,
                previousPrice: stock.price,
                price: price.toFixed(2),
                change: `${percentChange.startsWith('-') ? '' : '+'}${percentChange}%`
              };
            }
            return stock;
          })
        );
      });

      // Cleanup subscriptions
      return () => {
        console.log("Cleaning up stock data subscriptions");
        stocks.forEach(stock => {
          try {
            finnhubSocket.unsubscribe(stock.symbol);
          } catch (e) {
            console.error(`Error unsubscribing from ${stock.symbol}:`, e);
          }
        });
        unsubscribe();
      };
    } catch (err) {
      console.error("Error in useStockData:", err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setLoading(false);
    }
  }, []);

  return { filteredStocks, loading, error };
};
