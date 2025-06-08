
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MarketSentimentCardProps {
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };
  symbol?: string;
}

const MarketSentimentCard = ({ sentiment, symbol }: MarketSentimentCardProps) => {
  const total = sentiment.positive + sentiment.negative + sentiment.neutral;
  
  if (total === 0) {
    return (
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-2">Market Sentiment</h3>
        <p className="text-muted-foreground">No sentiment data available</p>
      </Card>
    );
  }

  const positivePercent = (sentiment.positive / total) * 100;
  const negativePercent = (sentiment.negative / total) * 100;
  const neutralPercent = (sentiment.neutral / total) * 100;

  const overallSentiment = positivePercent > negativePercent 
    ? 'positive' 
    : negativePercent > positivePercent 
    ? 'negative' 
    : 'neutral';

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Market Sentiment</h3>
        <Badge variant={overallSentiment === 'positive' ? 'default' : overallSentiment === 'negative' ? 'destructive' : 'secondary'}>
          {overallSentiment === 'positive' && <TrendingUp className="h-3 w-3 mr-1" />}
          {overallSentiment === 'negative' && <TrendingDown className="h-3 w-3 mr-1" />}
          {overallSentiment === 'neutral' && <Minus className="h-3 w-3 mr-1" />}
          {overallSentiment.charAt(0).toUpperCase() + overallSentiment.slice(1)}
        </Badge>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center text-green-600">
            <TrendingUp className="h-4 w-4 mr-2" />
            Positive
          </span>
          <span className="font-medium">{sentiment.positive} ({positivePercent.toFixed(1)}%)</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="flex items-center text-red-600">
            <TrendingDown className="h-4 w-4 mr-2" />
            Negative
          </span>
          <span className="font-medium">{sentiment.negative} ({negativePercent.toFixed(1)}%)</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="flex items-center text-gray-600">
            <Minus className="h-4 w-4 mr-2" />
            Neutral
          </span>
          <span className="font-medium">{sentiment.neutral} ({neutralPercent.toFixed(1)}%)</span>
        </div>
      </div>

      <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full flex">
          <div 
            className="bg-green-500" 
            style={{ width: `${positivePercent}%` }}
          />
          <div 
            className="bg-red-500" 
            style={{ width: `${negativePercent}%` }}
          />
          <div 
            className="bg-gray-400" 
            style={{ width: `${neutralPercent}%` }}
          />
        </div>
      </div>

      {symbol && (
        <p className="text-xs text-muted-foreground mt-2">
          Based on news coverage for {symbol}
        </p>
      )}
    </Card>
  );
};

export default MarketSentimentCard;
