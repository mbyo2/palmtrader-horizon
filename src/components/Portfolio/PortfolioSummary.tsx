
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { MarketDataService } from "@/services/MarketDataService";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PortfolioSummaryProps {
  portfolioData: Array<{
    symbol: string;
    shares: number;
    average_price: number;
  }>;
  totalValue: number;
}

const PortfolioSummary = ({ portfolioData, totalValue }: PortfolioSummaryProps) => {
  // Fetch latest prices for calculating current value
  const { data: latestPrices, isLoading } = useQuery({
    queryKey: ["portfolioPrices", portfolioData.map(item => item.symbol).join(',')],
    queryFn: async () => {
      if (portfolioData.length === 0) return [];
      return MarketDataService.fetchMultipleLatestPrices(
        portfolioData.map(item => item.symbol)
      );
    },
    enabled: portfolioData.length > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
  
  // Calculate portfolio metrics
  const calculateMetrics = () => {
    if (!latestPrices || latestPrices.length === 0) {
      return {
        currentValue: totalValue,
        dayChange: 0,
        dayChangePercent: 0,
        totalGain: 0,
        totalGainPercent: 0,
      };
    }
    
    let currentValue = 0;
    let costBasis = 0;
    
    portfolioData.forEach(position => {
      const currentPrice = latestPrices.find(
        price => price.symbol === position.symbol
      )?.price || position.average_price;
      
      currentValue += position.shares * currentPrice;
      costBasis += position.shares * position.average_price;
    });
    
    const totalGain = currentValue - costBasis;
    const totalGainPercent = costBasis > 0 ? (totalGain / costBasis) * 100 : 0;
    
    // Mocked day change - in a real app this would use actual daily data
    const dayChange = totalValue * 0.01; // Mocked 1% daily change
    const dayChangePercent = 1; // Mocked 1%
    
    return {
      currentValue,
      dayChange,
      dayChangePercent,
      totalGain,
      totalGainPercent,
    };
  };
  
  const metrics = calculateMetrics();
  
  // Generate mock historical data for the chart
  const generateHistoricalData = () => {
    const today = new Date();
    const data = [];
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      
      // Create a realistic growth pattern with some volatility
      const randomFactor = 0.98 + Math.random() * 0.04; // Random factor between 0.98 and 1.02
      const value = i === 0 
        ? metrics.currentValue 
        : (metrics.currentValue * 0.85) * (1 + (i / 100)) * randomFactor;
        
      data.push({
        date: date.toLocaleDateString(),
        value: parseFloat(value.toFixed(2)),
      });
    }
    return data;
  };
  
  const chartData = generateHistoricalData();
  const isPositive = metrics.totalGainPercent >= 0;
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Current Value</div>
          {isLoading ? (
            <Skeleton className="h-8 w-3/4 mt-2" />
          ) : (
            <div className="text-2xl font-bold mt-1">
              ${metrics.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          )}
        </Card>
        
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Day Change</div>
          {isLoading ? (
            <Skeleton className="h-8 w-3/4 mt-2" />
          ) : (
            <div className={`text-2xl font-bold mt-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {metrics.dayChange >= 0 ? '+' : ''}${metrics.dayChange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-sm ml-1">
                ({metrics.dayChangePercent >= 0 ? '+' : ''}{metrics.dayChangePercent.toFixed(2)}%)
              </span>
            </div>
          )}
        </Card>
        
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Gain/Loss</div>
          {isLoading ? (
            <Skeleton className="h-8 w-3/4 mt-2" />
          ) : (
            <div className={`text-2xl font-bold mt-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {metrics.totalGain >= 0 ? '+' : ''}${metrics.totalGain.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-sm ml-1">
                ({metrics.totalGainPercent >= 0 ? '+' : ''}{metrics.totalGainPercent.toFixed(2)}%)
              </span>
            </div>
          )}
        </Card>
      </div>
      
      <Card className="p-4">
        <h3 className="text-lg font-medium mb-4">Portfolio History</h3>
        <div className="h-[300px]">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => {
                    const d = new Date(date);
                    return `${d.getMonth()+1}/${d.getDate()}`;
                  }}
                />
                <YAxis 
                  tickFormatter={(value) => `$${value.toLocaleString(undefined, { 
                    notation: 'compact',
                    compactDisplay: 'short'
                  })}`}
                />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}`, 'Value']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={isPositive ? "#10b981" : "#ef4444"} 
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
};

export default PortfolioSummary;
