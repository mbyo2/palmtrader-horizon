
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
      <Badge variant={variants[sentiment] || "outline"}>
        {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
      </Badge>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" /> News Feed
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "compact" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("compact")}
            >
              Compact
            </Button>
            <Button
              variant={viewMode === "detailed" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("detailed")}
            >
              Detailed
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <Tabs defaultValue={category} onValueChange={setCategory}>
        <div className="px-6 pb-3">
          <TabsList className="w-full">
            <TabsTrigger value="general">Latest</TabsTrigger>
            <TabsTrigger value="market">Markets</TabsTrigger>
            <TabsTrigger value="crypto">Crypto</TabsTrigger>
            <TabsTrigger value="ipo">IPOs</TabsTrigger>
          </TabsList>
        </div>
        
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex flex-col gap-2 pb-4 border-b border-border last:border-0">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-8">
              <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-2" />
              <p className="text-muted-foreground">Unable to load news at this time</p>
              <Button variant="outline" className="mt-4">Retry</Button>
            </div>
          ) : !news || news.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No news available for this category</p>
            </div>
          ) : (
            <div className="space-y-4">
              {news.map((item) => (
                <div key={item.id} className="pb-4 border-b border-border last:border-0">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block hover:text-primary"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium">{item.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span>{item.source}</span>
                          <span>•</span>
                          <span>{formatDate(item.published_at)}</span>
                          {item.symbols && item.symbols.length > 0 && (
                            <>
                              <span>•</span>
                              <span>{item.symbols.join(", ")}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {item.sentiment && getSentimentBadge(item.sentiment)}
                    </div>
                    
                    {viewMode === "detailed" && item.summary && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
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
