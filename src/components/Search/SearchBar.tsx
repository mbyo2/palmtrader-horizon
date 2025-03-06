import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Loader2, Search, TrendingUp, Bitcoin } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

type SearchResult = {
  symbol: string;
  name: string;
  type: "stock" | "crypto";
  price?: number;
};

const SearchBar = () => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // Watch for keyboard shortcuts to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["search", searchValue],
    queryFn: async () => {
      if (!searchValue || searchValue.length < 2) return [];

      // Define symbols for stocks and cryptos
      const stockSymbols = ["AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA", "NVDA"];
      const cryptoSymbols = ["BTC", "ETH", "SOL", "XRP", "ADA", "DOT", "DOGE"];
      
      const allSymbols = [
        ...stockSymbols.map(s => ({ symbol: s, type: "stock" as const })),
        ...cryptoSymbols.map(s => ({ symbol: s, type: "crypto" as const }))
      ];
      
      const searchPattern = searchValue.toUpperCase();
      
      // Filter symbols based on search pattern
      const matchedSymbols = allSymbols.filter(
        item => item.symbol.includes(searchPattern)
      );
      
      // Get company/token names from database
      const stockPromise = supabase
        .from("company_fundamentals")
        .select("symbol, name")
        .in("symbol", matchedSymbols.filter(i => i.type === "stock").map(i => i.symbol));
      
      // For cryptos, we'll use a mapping since we don't have a crypto table
      const cryptoNames: Record<string, string> = {
        "BTC": "Bitcoin",
        "ETH": "Ethereum",
        "SOL": "Solana",
        "XRP": "Ripple",
        "ADA": "Cardano",
        "DOT": "Polkadot",
        "DOGE": "Dogecoin"
      };
      
      const [stockResult] = await Promise.all([stockPromise]);
      
      // Process stock results
      const stocksWithNames = (stockResult.data || []).map(item => ({
        symbol: item.symbol,
        name: item.name,
        type: "stock" as const
      }));
      
      // Process crypto results
      const cryptosWithNames = matchedSymbols
        .filter(item => item.type === "crypto")
        .map(item => ({
          symbol: item.symbol,
          name: cryptoNames[item.symbol] || item.symbol,
          type: "crypto" as const
        }));
      
      return [...stocksWithNames, ...cryptosWithNames] as SearchResult[];
    },
    enabled: searchValue.length >= 2,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    if (result.type === "crypto") {
      navigate("/crypto");
    } else {
      navigate("/markets");
    }
  };

  const renderResultIcon = (type: "stock" | "crypto") => {
    return type === "stock" ? (
      <TrendingUp className="h-4 w-4 text-muted-foreground" />
    ) : (
      <Bitcoin className="h-4 w-4 text-muted-foreground" />
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`${isMobile ? 'w-full' : 'w-[200px]'} justify-between text-muted-foreground`}
          onClick={() => setOpen(true)}
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span>Search...</span>
          </div>
          {!isMobile && (
            <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={`${isMobile ? 'w-[calc(100vw-2rem)]' : 'w-[300px]'} p-0`} align="start">
        <Command>
          <CommandInput 
            placeholder="Search stocks & crypto..."
            ref={inputRef}
            value={searchValue}
            onValueChange={setSearchValue}
            className="border-none focus:ring-0"
          />
          <CommandList>
            {isLoading && (
              <div className="py-6 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </div>
            )}
            
            {!isLoading && searchValue.length < 2 && (
              <CommandEmpty className="py-4 text-center text-sm">
                Type at least 2 characters to search
              </CommandEmpty>
            )}
            
            {!isLoading && searchValue.length >= 2 && (
              <>
                <CommandEmpty className="py-6 text-center">
                  No results found
                </CommandEmpty>
                
                <CommandGroup heading="Stocks">
                  {searchResults
                    ?.filter(result => result.type === "stock")
                    .map(result => (
                      <CommandItem
                        key={result.symbol}
                        value={`${result.symbol} ${result.name}`}
                        onSelect={() => handleSelect(result)}
                      >
                        <div className="flex items-center gap-2">
                          {renderResultIcon(result.type)}
                          <span className="font-medium">{result.symbol}</span>
                          <span className="text-muted-foreground">{result.name}</span>
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
                
                <CommandGroup heading="Cryptocurrencies">
                  {searchResults
                    ?.filter(result => result.type === "crypto")
                    .map(result => (
                      <CommandItem
                        key={result.symbol}
                        value={`${result.symbol} ${result.name}`}
                        onSelect={() => handleSelect(result)}
                      >
                        <div className="flex items-center gap-2">
                          {renderResultIcon(result.type)}
                          <span className="font-medium">{result.symbol}</span>
                          <span className="text-muted-foreground">{result.name}</span>
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SearchBar;
