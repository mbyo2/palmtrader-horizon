
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { AlphaVantageService, EconomicIndicator } from '@/services/AlphaVantageService';
import { Building2, TrendingUp, TrendingDown, DollarSign, Percent, Users } from 'lucide-react';

export function EconomicIndicatorsDashboard() {
  const [indicators, setIndicators] = useState<Record<string, EconomicIndicator | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('gdp');

  useEffect(() => {
    const fetchIndicators = async () => {
      setIsLoading(true);
      try {
        const data = await AlphaVantageService.fetchAllEconomicIndicators();
        setIndicators(data);
      } catch (error) {
        console.error('Error fetching economic indicators:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIndicators();
  }, []);

  const formatValue = (value: number, type: string) => {
    switch (type) {
      case 'gdp':
        return `$${(value / 1000).toFixed(1)}T`;
      case 'inflation':
      case 'fedFunds':
      case 'unemployment':
      case 'treasury':
        return `${value.toFixed(2)}%`;
      default:
        return value.toFixed(2);
    }
  };

  const getIndicatorIcon = (type: string) => {
    switch (type) {
      case 'gdp':
        return <Building2 className="h-4 w-4" />;
      case 'inflation':
        return <TrendingUp className="h-4 w-4" />;
      case 'fedFunds':
        return <DollarSign className="h-4 w-4" />;
      case 'unemployment':
        return <Users className="h-4 w-4" />;
      case 'treasury':
        return <Percent className="h-4 w-4" />;
      default:
        return <TrendingUp className="h-4 w-4" />;
    }
  };

  const indicatorLabels: Record<string, { title: string; description: string }> = {
    gdp: { title: 'Real GDP', description: 'Quarterly US Gross Domestic Product in billions' },
    inflation: { title: 'Inflation Rate', description: 'Consumer Price Index year-over-year change' },
    fedFunds: { title: 'Federal Funds Rate', description: 'Federal Reserve target interest rate' },
    unemployment: { title: 'Unemployment Rate', description: 'US unemployment rate percentage' },
    treasury: { title: '10Y Treasury Yield', description: '10-year US Treasury bond yield' }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Economic Indicators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const getLatestValue = (key: string) => {
    const indicator = indicators[key];
    if (!indicator || !indicator.data || indicator.data.length === 0) return 'N/A';
    return formatValue(indicator.data[0].value, key);
  };

  const getChange = (key: string) => {
    const indicator = indicators[key];
    if (!indicator || !indicator.data || indicator.data.length < 2) return null;
    const change = indicator.data[0].value - indicator.data[1].value;
    return change;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Economic Indicators
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {Object.keys(indicatorLabels).map((key) => {
            const change = getChange(key);
            return (
              <div
                key={key}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  activeTab === key ? 'bg-accent border-primary' : 'hover:bg-accent/50'
                }`}
                onClick={() => setActiveTab(key)}
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  {getIndicatorIcon(key)}
                  <span>{indicatorLabels[key].title}</span>
                </div>
                <div className="text-lg font-bold">{getLatestValue(key)}</div>
                {change !== null && (
                  <div className={`text-xs flex items-center gap-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {change >= 0 ? '+' : ''}{change.toFixed(2)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="h-[300px]">
          {indicators[activeTab] && indicators[activeTab]!.data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[...indicators[activeTab]!.data].reverse()}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { year: '2-digit', month: 'short' })}
                />
                <YAxis 
                  domain={['auto', 'auto']}
                  tickFormatter={(val) => formatValue(val, activeTab)}
                />
                <Tooltip 
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  formatter={(value: number) => [formatValue(value, activeTab), indicatorLabels[activeTab].title]}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  fill="url(#colorValue)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          {indicatorLabels[activeTab]?.description}
        </p>
      </CardContent>
    </Card>
  );
}
