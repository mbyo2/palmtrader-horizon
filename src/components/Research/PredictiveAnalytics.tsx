
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, TrendingUp, TrendingDown, Zap, AlertTriangle, BarChart4 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
} from 'recharts';
import { useQuery } from "@tanstack/react-query";

interface PredictionData {
  symbol: string;
  prediction: "bullish" | "bearish" | "neutral";
  confidence: number;
  priceTarget: {
    low: number;
    high: number;
  };
  timeframe: string;
  pricePredictions: {
    date: string;
    predicted: number;
    low: number;
    high: number;
  }[];
}

// Note: This uses simulated data for demonstration. In production, connect to a real ML/AI endpoint.
const getPredictiveData = async (symbol: string): Promise<PredictionData> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Use deterministic seed based on symbol for consistent results per symbol
  const seed = symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const seededRandom = (offset: number) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };
  
  const currentPrice = 150 + (seededRandom(1) * 10 - 5);
  const prediction = seededRandom(2) > 0.6 ? "bullish" : seededRandom(3) > 0.4 ? "bearish" : "neutral";
  const confidence = seededRandom(4) * 30 + 60;
  
  const pricePredictions = [];
  let predictedPrice = currentPrice;
  const now = new Date();
  
  for (let i = 1; i <= 7; i++) {
    const date = new Date();
    date.setDate(now.getDate() + i);
    
    const dailyMovement = prediction === "bullish" 
      ? (seededRandom(i * 10) * 4 - 1)
      : prediction === "bearish"
        ? (seededRandom(i * 10) * 4 - 3)
        : (seededRandom(i * 10) * 4 - 2);
    
    predictedPrice = predictedPrice * (1 + (dailyMovement / 100));
    const volatility = seededRandom(i * 20) * 2 + 1;
    
    pricePredictions.push({
      date: date.toLocaleDateString(),
      predicted: predictedPrice,
      low: predictedPrice * (1 - (volatility / 100)),
      high: predictedPrice * (1 + (volatility / 100))
    });
  }
  
  return {
    symbol,
    prediction,
    confidence,
    priceTarget: {
      low: pricePredictions[pricePredictions.length - 1].low,
      high: pricePredictions[pricePredictions.length - 1].high
    },
    timeframe: "7d",
    pricePredictions
  };
};

const PredictiveAnalytics: React.FC<{ symbol: string; currentPrice?: number }> = ({ 
  symbol,
  currentPrice = 150
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["predictions", symbol],
    queryFn: () => getPredictiveData(symbol),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Predictive Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full mb-4" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Predictive Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to load prediction data. Please try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  // Prepare chart data with current price as first point
  const chartData = [
    {
      date: new Date().toLocaleDateString(),
      actual: currentPrice,
      predicted: currentPrice,
      low: currentPrice * 0.98,
      high: currentPrice * 1.02
    },
    ...data.pricePredictions
  ];
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Predictive Analytics</CardTitle>
          <Badge 
            className={
              data.prediction === "bullish" 
                ? "bg-green-500 hover:bg-green-600" 
                : data.prediction === "bearish" 
                  ? "bg-red-500 hover:bg-red-600" 
                  : "bg-yellow-500 hover:bg-yellow-600"
            }
          >
            {data.prediction === "bullish" 
              ? <TrendingUp className="h-3 w-3 mr-1" /> 
              : data.prediction === "bearish" 
                ? <TrendingDown className="h-3 w-3 mr-1" /> 
                : <BarChart4 className="h-3 w-3 mr-1" />
            }
            {data.prediction.charAt(0).toUpperCase() + data.prediction.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Predictions are for demonstration purposes only. Past performance is not indicative of future results.
          </AlertDescription>
        </Alert>
        
        <div className="h-[300px] mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[(dataMin: number) => dataMin * 0.98, (dataMax: number) => dataMax * 1.02]} />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="actual" 
                fill="#8884d8" 
                stroke="#8884d8" 
                name="Actual" 
              />
              <Line 
                type="monotone" 
                dataKey="predicted" 
                stroke="#ff7300" 
                name="Predicted" 
              />
              <Area 
                type="monotone" 
                dataKey="low" 
                stackId="1" 
                fill="#82ca9d" 
                stroke="none" 
                name="Low Range" 
              />
              <Area 
                type="monotone" 
                dataKey="high" 
                stackId="1" 
                fill="#ffc658" 
                stroke="none" 
                name="High Range" 
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <h3 className="font-medium">Prediction Confidence</h3>
            </div>
            <div className="flex items-end space-x-2">
              <span className="text-2xl font-bold">{data.confidence.toFixed(1)}%</span>
              <span className="text-sm text-muted-foreground mb-1">confidence level</span>
            </div>
          </div>
          
          <div className="border rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <h3 className="font-medium">Price Target (7-day)</h3>
            </div>
            <div className="flex items-end space-x-2">
              <span className="text-2xl font-bold">${data.priceTarget.low.toFixed(2)} - ${data.priceTarget.high.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PredictiveAnalytics;
