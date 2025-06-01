
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, BarChart3, DollarSign, Percent } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FundamentalData {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  market_cap: number;
  pe_ratio: number;
  dividend_yield: number;
  eps: number;
  revenue: number;
  profit_margin: number;
  debt_to_equity: number;
}

interface FundamentalAnalysisProps {
  symbol: string;
}

const FundamentalAnalysis = ({ symbol }: FundamentalAnalysisProps) => {
  const [analysisScore, setAnalysisScore] = useState(0);

  const { data: fundamentals, isLoading } = useQuery({
    queryKey: ['fundamentals', symbol],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_fundamentals')
        .select('*')
        .eq('symbol', symbol)
        .single();

      if (error) {
        console.error('Error fetching fundamentals:', error);
        return null;
      }

      return data as FundamentalData;
    },
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  useEffect(() => {
    if (fundamentals) {
      calculateAnalysisScore();
    }
  }, [fundamentals]);

  const calculateAnalysisScore = () => {
    if (!fundamentals) return;

    let score = 50; // Base score

    // P/E Ratio scoring
    if (fundamentals.pe_ratio) {
      if (fundamentals.pe_ratio < 15) score += 15;
      else if (fundamentals.pe_ratio < 25) score += 10;
      else if (fundamentals.pe_ratio > 35) score -= 10;
    }

    // Profit margin scoring
    if (fundamentals.profit_margin) {
      if (fundamentals.profit_margin > 20) score += 15;
      else if (fundamentals.profit_margin > 10) score += 10;
      else if (fundamentals.profit_margin < 5) score -= 10;
    }

    // Debt to equity scoring
    if (fundamentals.debt_to_equity !== null) {
      if (fundamentals.debt_to_equity < 0.3) score += 10;
      else if (fundamentals.debt_to_equity > 1.0) score -= 15;
    }

    // Dividend yield scoring
    if (fundamentals.dividend_yield) {
      if (fundamentals.dividend_yield > 3) score += 5;
    }

    setAnalysisScore(Math.max(0, Math.min(100, score)));
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1e12) return `$${(amount / 1e12).toFixed(1)}T`;
    if (amount >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
    if (amount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
    return `$${amount.toFixed(2)}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { variant: "default" as const, label: "Strong Buy" };
    if (score >= 70) return { variant: "default" as const, label: "Buy" };
    if (score >= 50) return { variant: "secondary" as const, label: "Hold" };
    if (score >= 30) return { variant: "destructive" as const, label: "Weak Sell" };
    return { variant: "destructive" as const, label: "Sell" };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-8 bg-muted rounded w-full"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-muted rounded"></div>
              <div className="h-16 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!fundamentals) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            No fundamental data available for {symbol}
          </p>
        </CardContent>
      </Card>
    );
  }

  const scoreBadge = getScoreBadge(analysisScore);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Fundamental Analysis - {fundamentals.symbol}
          </div>
          <Badge variant={scoreBadge.variant}>
            {scoreBadge.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="valuation">Valuation</TabsTrigger>
            <TabsTrigger value="financial">Financial Health</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{fundamentals.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {fundamentals.sector} • {fundamentals.industry}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Analysis Score</span>
                <span className={`font-bold ${getScoreColor(analysisScore)}`}>
                  {analysisScore}/100
                </span>
              </div>
              <Progress value={analysisScore} className="h-3" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Market Cap</span>
                </div>
                <p className="text-lg font-semibold">
                  {formatCurrency(fundamentals.market_cap)}
                </p>
              </Card>

              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">EPS</span>
                </div>
                <p className="text-lg font-semibold">
                  ${fundamentals.eps?.toFixed(2) || 'N/A'}
                </p>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="valuation" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">P/E Ratio</span>
                  {fundamentals.pe_ratio && fundamentals.pe_ratio < 20 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <p className="text-2xl font-bold">
                  {fundamentals.pe_ratio?.toFixed(2) || 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {fundamentals.pe_ratio && fundamentals.pe_ratio < 15 
                    ? 'Undervalued' 
                    : fundamentals.pe_ratio && fundamentals.pe_ratio > 30 
                    ? 'Overvalued' 
                    : 'Fair Value'}
                </p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Dividend Yield</span>
                  <Percent className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-2xl font-bold">
                  {fundamentals.dividend_yield ? formatPercentage(fundamentals.dividend_yield) : 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {fundamentals.dividend_yield && fundamentals.dividend_yield > 3 
                    ? 'High Yield' 
                    : 'Standard Yield'}
                </p>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Revenue</span>
                  <DollarSign className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(fundamentals.revenue)}
                </p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Profit Margin</span>
                  <Percent className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-2xl font-bold">
                  {fundamentals.profit_margin ? formatPercentage(fundamentals.profit_margin) : 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {fundamentals.profit_margin && fundamentals.profit_margin > 15 
                    ? 'Excellent' 
                    : fundamentals.profit_margin && fundamentals.profit_margin < 5 
                    ? 'Poor' 
                    : 'Good'}
                </p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Debt-to-Equity</span>
                  {fundamentals.debt_to_equity !== null && fundamentals.debt_to_equity < 0.5 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <p className="text-2xl font-bold">
                  {fundamentals.debt_to_equity?.toFixed(2) || 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {fundamentals.debt_to_equity !== null && fundamentals.debt_to_equity < 0.3 
                    ? 'Low Risk' 
                    : fundamentals.debt_to_equity !== null && fundamentals.debt_to_equity > 1.0 
                    ? 'High Risk' 
                    : 'Moderate Risk'}
                </p>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FundamentalAnalysis;
