
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Newspaper, TrendingUp } from "lucide-react";

type NewsItem = {
  id: string;
  title: string;
  source: string;
  url: string;
  published_at: string;
  summary: string | null;
  symbols: string[] | null;
  sentiment: string | null;
  image_url: string | null;
};

type NewsFeedProps = {
  defaultCategory?: "general" | "market" | "crypto" | "ipo";
  limit?: number;
};

const NewsFeed = ({ defaultCategory = "general", limit = 10 }: NewsFeedProps) => {
  const [category, setCategory] = useState<string>(defaultCategory);
  const [viewMode, setViewMode] = useState<"compact" | "detailed">("detailed");

  // Function to filter news by category
  const getFilterParams = (category: string) => {
    switch (category) {
      case "crypto":
        return {
          filterColumn: "symbols",
          filterValue: ["BTC", "ETH", "SOL", "XRP", "ADA", "DOT"]
        };
      case "market":
        return {
          filterColumn: null,
          filterValue: null
        };
      case "ipo":
        return {
          filterColumn: "symbols",
          filterValue: ["IPO"]
        };
      default:
        return {
          filterColumn: null,
          filterValue: null
        };
    }
  };

  const { filterColumn, filterValue } = getFilterParams(category);
  
  const { data: news, isLoading, isError } = useQuery({
    queryKey: ["news", category, limit],
    queryFn: async () => {
      let query = supabase
        .from("market_news")
        .select("*")
        .order("published_at", { ascending: false })
        .limit(limit);
      
      if (filterColumn && filterValue) {
        query = query.overlaps(filterColumn, filterValue);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching news:", error);
        throw error;
      }
      
      return data as NewsItem[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("default", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric"
    }).format(date);
  };

  const getSentimentBadge = (sentiment: string | null) => {
    if (!sentiment) return null;
    
    const variants: Record<string, "default" | "destructive" | "outline"> = {
      positive: "default",
      negative: "destructive",
      neutral: "outline"
    };
    
    return (
      <Badge variant={variants[sentiment] || "outline"} className="text-xs">
        {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
      </Badge>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Newspaper className="h-5 w-5" /> News Feed
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "compact" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("compact")}
              className="text-xs px-2 py-1"
            >
              Compact
            </Button>
            <Button
              variant={viewMode === "detailed" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("detailed")}
              className="text-xs px-2 py-1"
            >
              Detailed
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <Tabs defaultValue={category} onValueChange={setCategory}>
        <div className="px-3 sm:px-6 pb-3">
          <TabsList className="w-full grid grid-cols-4 text-xs">
            <TabsTrigger value="general" className="text-xs px-2">Latest</TabsTrigger>
            <TabsTrigger value="market" className="text-xs px-2">Markets</TabsTrigger>
            <TabsTrigger value="crypto" className="text-xs px-2">Crypto</TabsTrigger>
            <TabsTrigger value="ipo" className="text-xs px-2">IPOs</TabsTrigger>
          </TabsList>
        </div>
        
        <CardContent className="px-3 sm:px-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex flex-col gap-2 pb-4 border-b border-border last:border-0">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  {viewMode === "detailed" && <Skeleton className="h-16 w-full" />}
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Unable to load news at this time</p>
              <Button variant="outline" className="mt-4 text-xs" size="sm">Retry</Button>
            </div>
          ) : !news || news.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No news available for this category</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {news.map((item) => (
                <div key={item.id} className="pb-3 sm:pb-4 border-b border-border last:border-0">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block hover:text-primary transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm sm:text-base leading-tight line-clamp-2 sm:line-clamp-3">
                          {item.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs text-muted-foreground mt-1">
                          <span className="truncate">{item.source}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="whitespace-nowrap">{formatDate(item.published_at)}</span>
                          {item.symbols && item.symbols.length > 0 && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span className="truncate text-xs">{item.symbols.join(", ")}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 self-start">
                        {item.sentiment && getSentimentBadge(item.sentiment)}
                      </div>
                    </div>
                    
                    {viewMode === "detailed" && item.summary && (
                      <p className="text-xs sm:text-sm text-muted-foreground mt-2 line-clamp-2 sm:line-clamp-3 leading-relaxed">
                        {item.summary}
                      </p>
                    )}
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Tabs>
    </Card>
  );
};

export default NewsFeed;
