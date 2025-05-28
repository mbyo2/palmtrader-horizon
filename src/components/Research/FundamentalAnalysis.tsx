
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, PieChart, Calculator } from "lucide-react";

interface FundamentalData {
  symbol: string;
  name: string;
  sector: string;
  marketCap: number;
  peRatio: number;
  pegRatio: number;
  priceToBook: number;
  priceToSales: number;
  roe: number;
  roa: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  debtToEquity: number;
  currentRatio: number;
  quickRatio: number;
  revenue: number;
  revenueGrowth: number;
  earningsGrowth: number;
  freeCashFlow: number;
  dividendYield: number;
  payoutRatio: number;
  analystRating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
  targetPrice: number;
  fairValue: number;
}

interface FundamentalAnalysisProps {
  data: FundamentalData;
  currentPrice: number;
}

const FundamentalAnalysis = ({ data, currentPrice }: FundamentalAnalysisProps) => {
  const getValuationScore = () => {
    let score = 0;
    if (data.peRatio < 15) score += 20;
    else if (data.peRatio < 25) score += 10;
    
    if (data.pegRatio < 1) score += 20;
    else if (data.pegRatio < 1.5) score += 10;
    
    if (data.priceToBook < 1.5) score += 20;
    else if (data.priceToBook < 3) score += 10;
    
    if (data.priceToSales < 2) score += 20;
    else if (data.priceToSales < 5) score += 10;
    
    if (currentPrice < data.fairValue) score += 20;
    
    return Math.min(score, 100);
  };

  const getProfitabilityScore = () => {
    let score = 0;
    if (data.roe > 15) score += 25;
    else if (data.roe > 10) score += 15;
    
    if (data.roa > 10) score += 25;
    else if (data.roa > 5) score += 15;
    
    if (data.grossMargin > 40) score += 25;
    else if (data.grossMargin > 25) score += 15;
    
    if (data.netMargin > 15) score += 25;
    else if (data.netMargin > 8) score += 15;
    
    return Math.min(score, 100);
  };

  const getFinancialHealthScore = () => {
    let score = 0;
    if (data.debtToEquity < 0.3) score += 30;
    else if (data.debtToEquity < 0.6) score += 20;
    else if (data.debtToEquity < 1) score += 10;
    
    if (data.currentRatio > 2) score += 25;
    else if (data.currentRatio > 1.5) score += 15;
    else if (data.currentRatio > 1) score += 10;
    
    if (data.quickRatio > 1.5) score += 25;
    else if (data.quickRatio > 1) score += 15;
    else if (data.quickRatio > 0.8) score += 10;
    
    if (data.freeCashFlow > 0) score += 20;
    
    return Math.min(score, 100);
  };

  const getGrowthScore = () => {
    let score = 0;
    if (data.revenueGrowth > 20) score += 30;
    else if (data.revenueGrowth > 10) score += 20;
    else if (data.revenueGrowth > 5) score += 10;
    
    if (data.earningsGrowth > 25) score += 30;
    else if (data.earningsGrowth > 15) score += 20;
    else if (data.earningsGrowth > 8) score += 10;
    
    if (data.pegRatio < 1) score += 40;
    else if (data.pegRatio < 1.5) score += 20;
    
    return Math.min(score, 100);
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'Strong Buy': return 'text-green-600';
      case 'Buy': return 'text-green-500';
      case 'Hold': return 'text-yellow-500';
      case 'Sell': return 'text-red-500';
      case 'Strong Sell': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Fundamental Analysis - {data.symbol}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{data.sector}</Badge>
          <Badge className={getRatingColor(data.analystRating)} variant="outline">
            {data.analystRating}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="valuation">Valuation</TabsTrigger>
            <TabsTrigger value="profitability">Profitability</TabsTrigger>
            <TabsTrigger value="financial">Financial Health</TabsTrigger>
            <TabsTrigger value="growth">Growth</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{formatCurrency(data.marketCap)}</div>
                <div className="text-sm text-muted-foreground">Market Cap</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatCurrency(data.revenue)}</div>
                <div className="text-sm text-muted-foreground">Revenue (TTM)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{data.peRatio.toFixed(1)}</div>
                <div className="text-sm text-muted-foreground">P/E Ratio</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatPercent(data.dividendYield)}</div>
                <div className="text-sm text-muted-foreground">Dividend Yield</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span>Overall Score</span>
                  <span className="font-medium">
                    {Math.round((getValuationScore() + getProfitabilityScore() + getFinancialHealthScore() + getGrowthScore()) / 4)}/100
                  </span>
                </div>
                <Progress value={(getValuationScore() + getProfitabilityScore() + getFinancialHealthScore() + getGrowthScore()) / 4} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span>Current Price:</span>
                  <span className="font-medium">{formatCurrency(currentPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fair Value:</span>
                  <span className="font-medium">{formatCurrency(data.fairValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Target Price:</span>
                  <span className="font-medium">{formatCurrency(data.targetPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Upside:</span>
                  <span className={`font-medium ${data.targetPrice > currentPrice ? 'text-green-500' : 'text-red-500'}`}>
                    {formatPercent(((data.targetPrice - currentPrice) / currentPrice) * 100)}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="valuation" className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span>Valuation Score</span>
                <span className="font-medium">{getValuationScore()}/100</span>
              </div>
              <Progress value={getValuationScore()} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>P/E Ratio:</span>
                  <span className="font-medium">{data.peRatio.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span>PEG Ratio:</span>
                  <span className="font-medium">{data.pegRatio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Price/Book:</span>
                  <span className="font-medium">{data.priceToBook.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Price/Sales:</span>
                  <span className="font-medium">{data.priceToSales.toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {data.peRatio < 15 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                  <span className="text-sm">P/E Ratio</span>
                </div>
                <div className="flex items-center gap-2">
                  {data.pegRatio < 1 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                  <span className="text-sm">PEG Ratio</span>
                </div>
                <div className="flex items-center gap-2">
                  {data.priceToBook < 1.5 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                  <span className="text-sm">Price/Book</span>
                </div>
                <div className="flex items-center gap-2">
                  {data.priceToSales < 2 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                  <span className="text-sm">Price/Sales</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="profitability" className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span>Profitability Score</span>
                <span className="font-medium">{getProfitabilityScore()}/100</span>
              </div>
              <Progress value={getProfitabilityScore()} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>ROE:</span>
                  <span className="font-medium">{formatPercent(data.roe)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ROA:</span>
                  <span className="font-medium">{formatPercent(data.roa)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gross Margin:</span>
                  <span className="font-medium">{formatPercent(data.grossMargin)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Net Margin:</span>
                  <span className="font-medium">{formatPercent(data.netMargin)}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Gross Margin</span>
                    <span>{formatPercent(data.grossMargin)}</span>
                  </div>
                  <Progress value={Math.min(data.grossMargin, 100)} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Operating Margin</span>
                    <span>{formatPercent(data.operatingMargin)}</span>
                  </div>
                  <Progress value={Math.min(Math.max(data.operatingMargin, 0), 100)} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Net Margin</span>
                    <span>{formatPercent(data.netMargin)}</span>
                  </div>
                  <Progress value={Math.min(Math.max(data.netMargin, 0), 100)} />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span>Financial Health Score</span>
                <span className="font-medium">{getFinancialHealthScore()}/100</span>
              </div>
              <Progress value={getFinancialHealthScore()} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Debt/Equity:</span>
                  <span className="font-medium">{data.debtToEquity.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Ratio:</span>
                  <span className="font-medium">{data.currentRatio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quick Ratio:</span>
                  <span className="font-medium">{data.quickRatio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Free Cash Flow:</span>
                  <span className="font-medium">{formatCurrency(data.freeCashFlow)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {data.debtToEquity < 0.6 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                  <span className="text-sm">Low Debt</span>
                </div>
                <div className="flex items-center gap-2">
                  {data.currentRatio > 1.5 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                  <span className="text-sm">Liquidity</span>
                </div>
                <div className="flex items-center gap-2">
                  {data.freeCashFlow > 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                  <span className="text-sm">Cash Generation</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="growth" className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span>Growth Score</span>
                <span className="font-medium">{getGrowthScore()}/100</span>
              </div>
              <Progress value={getGrowthScore()} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Revenue Growth:</span>
                  <span className={`font-medium ${data.revenueGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatPercent(data.revenueGrowth)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Earnings Growth:</span>
                  <span className={`font-medium ${data.earningsGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatPercent(data.earningsGrowth)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>PEG Ratio:</span>
                  <span className="font-medium">{data.pegRatio.toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Revenue Growth</span>
                    <span>{formatPercent(data.revenueGrowth)}</span>
                  </div>
                  <Progress value={Math.min(Math.max(data.revenueGrowth + 20, 0), 100)} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Earnings Growth</span>
                    <span>{formatPercent(data.earningsGrowth)}</span>
                  </div>
                  <Progress value={Math.min(Math.max(data.earningsGrowth + 20, 0), 100)} />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FundamentalAnalysis;
