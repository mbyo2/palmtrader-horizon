
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlphaVantageService, NewsItem } from '@/services/AlphaVantageService';
import { Newspaper, TrendingUp, TrendingDown, Minus, ExternalLink, Search, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MarketSentimentNewsProps {
  defaultTicker?: string;
}

export function MarketSentimentNews({ defaultTicker }: MarketSentimentNewsProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ticker, setTicker] = useState(defaultTicker || '');
  const [searchTicker, setSearchTicker] = useState(defaultTicker || '');

  const fetchNews = async (tickerToFetch?: string) => {
    setIsLoading(true);
    try {
      const tickers = tickerToFetch ? [tickerToFetch.toUpperCase()] : undefined;
      const newsData = await AlphaVantageService.fetchMarketNews(tickers);
      setNews(newsData);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(defaultTicker);
  }, [defaultTicker]);

  const handleSearch = () => {
    setSearchTicker(ticker);
    fetchNews(ticker);
  };

  const getSentimentIcon = (score: number) => {
    if (score > 0.1) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (score < -0.1) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-yellow-500" />;
  };

  const getSentimentBadge = (label: string) => {
    switch (label.toLowerCase()) {
      case 'bullish':
        return <Badge className="bg-green-500/20 text-green-600 hover:bg-green-500/30">Bullish</Badge>;
      case 'bearish':
        return <Badge className="bg-red-500/20 text-red-600 hover:bg-red-500/30">Bearish</Badge>;
      case 'somewhat-bullish':
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Somewhat Bullish</Badge>;
      case 'somewhat-bearish':
        return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20">Somewhat Bearish</Badge>;
      default:
        return <Badge variant="secondary">Neutral</Badge>;
    }
  };

  const parseTimePublished = (timeStr: string) => {
    try {
      // Format: 20240115T123045
      const year = timeStr.substring(0, 4);
      const month = timeStr.substring(4, 6);
      const day = timeStr.substring(6, 8);
      const hour = timeStr.substring(9, 11);
      const min = timeStr.substring(11, 13);
      return new Date(`${year}-${month}-${day}T${hour}:${min}:00`);
    } catch {
      return new Date();
    }
  };

  // Calculate overall market sentiment
  const avgSentiment = news.length > 0
    ? news.reduce((sum, item) => sum + item.overallSentiment, 0) / news.length
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            Market News & Sentiment
          </span>
          <div className="flex items-center gap-2">
            {getSentimentIcon(avgSentiment)}
            <span className="text-sm font-normal">
              Avg: {(avgSentiment * 100).toFixed(1)}%
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Search by ticker (e.g., AAPL)"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} size="icon" variant="outline">
            <Search className="h-4 w-4" />
          </Button>
          <Button onClick={() => fetchNews(searchTicker)} size="icon" variant="outline">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-16 w-16 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {news.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No news found. Try a different ticker.
                </div>
              ) : (
                news.map((item, index) => (
                  <div key={index} className="border-b pb-4 last:border-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-sm hover:text-primary transition-colors flex-1"
                      >
                        {item.title}
                        <ExternalLink className="h-3 w-3 inline ml-1 opacity-50" />
                      </a>
                      {getSentimentBadge(item.sentimentLabel)}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {item.summary}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{item.source}</span>
                      <span>{formatDistanceToNow(parseTimePublished(item.timePublished), { addSuffix: true })}</span>
                    </div>
                    {item.tickerSentiment && item.tickerSentiment.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {item.tickerSentiment.slice(0, 3).map((ts, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {ts.ticker}: {(ts.sentimentScore * 100).toFixed(0)}%
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
