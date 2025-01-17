import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const MarketNews = ({ symbol }: { symbol: string }) => {
  const { data: news, isLoading } = useQuery({
    queryKey: ["market-news", symbol],
    queryFn: async () => {
      console.log("Fetching news for symbol:", symbol);
      const { data, error } = await supabase
        .from("market_news")
        .select("*")
        .filter("symbols", "cs", `{${symbol}}`)
        .order("published_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error fetching news:", error);
        throw error;
      }
      console.log("Fetched news data:", data);
      return data;
    },
  });

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!news || news.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Latest News</h3>
        <p className="text-muted-foreground">No news available for {symbol}</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Latest News</h3>
      <div className="space-y-4">
        {news.map((article) => (
          <div key={article.id} className="border-b border-border pb-4 last:border-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:underline"
                >
                  {article.title}
                </a>
                <p className="text-sm text-muted-foreground mt-1">
                  {article.source} • {new Date(article.published_at).toLocaleDateString()}
                </p>
              </div>
              {article.sentiment && (
                <Badge variant={article.sentiment === "positive" ? "default" : "destructive"}>
                  {article.sentiment}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default MarketNews;