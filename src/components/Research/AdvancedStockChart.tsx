
import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MarketData } from '@/services/MarketDataService';
import { Check, X } from 'lucide-react';

interface AdvancedStockChartProps {
  data: MarketData[];
  height?: number;
}

type TimeRange = '1d' | '1w' | '1m' | '3m' | '6m' | '1y' | 'all';
type ChartType = 'line' | 'candle' | 'area';
type Indicator = 'volume' | 'sma' | 'ema' | 'macd' | 'rsi' | 'bollinger';

export const AdvancedStockChart = ({ data, height = 400 }: AdvancedStockChartProps) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('1m');
  const [chartType, setChartType] = useState<ChartType>('area');
  const [indicators, setIndicators] = useState<Indicator[]>(['volume']);
  const [compareSymbols, setCompareSymbols] = useState<string[]>([]);
  
  // Filter data based on selected time range
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const now = new Date();
    let filterDate = new Date();
    
    switch (timeRange) {
      case '1d':
        filterDate.setDate(now.getDate() - 1);
        break;
      case '1w':
        filterDate.setDate(now.getDate() - 7);
        break;
      case '1m':
        filterDate.setMonth(now.getMonth() - 1);
        break;
      case '3m':
        filterDate.setMonth(now.getMonth() - 3);
        break;
      case '6m':
        filterDate.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        filterDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return data;
    }
    
    return data.filter(item => new Date(Number(item.timestamp)) >= filterDate);
  }, [data, timeRange]);
  
  // Calculate technical indicators
  const chartData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    
    // Convert timestamps to readable dates and add indicators
    return filteredData.map((item, index, array) => {
      const date = new Date(Number(item.timestamp));
      const formattedDate = date.toLocaleDateString();
      
      // Start with basic price data
      const result: any = {
        date: formattedDate,
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        price: item.price,
        open: item.open || item.price,
        high: item.high || item.price,
        low: item.low || item.price,
        close: item.close || item.price,
        volume: Math.random() * 10000000, // Mock volume data
      };
      
      // Calculate SMA (Simple Moving Average) - 20 periods
      if (indicators.includes('sma') && index >= 19) {
        const smaWindow = array.slice(index - 19, index + 1);
        result.sma = smaWindow.reduce((sum, item) => sum + item.price, 0) / 20;
      }
      
      // Calculate EMA (Exponential Moving Average) - 12 periods
      if (indicators.includes('ema') && index >= 11) {
        // Simplified EMA calculation
        const emaWindow = array.slice(index - 11, index + 1);
        const multiplier = 2 / (12 + 1);
        result.ema = emaWindow.reduce((ema, item, i) => {
          if (i === 0) return item.price;
          return (item.price * multiplier) + (ema * (1 - multiplier));
        }, 0);
      }
      
      // Calculate Bollinger Bands (20 periods, 2 standard deviations)
      if (indicators.includes('bollinger') && index >= 19) {
        const bollingerWindow = array.slice(index - 19, index + 1);
        const sma = bollingerWindow.reduce((sum, item) => sum + item.price, 0) / 20;
        const squaredDifferences = bollingerWindow.map(item => Math.pow(item.price - sma, 2));
        const variance = squaredDifferences.reduce((sum, val) => sum + val, 0) / 20;
        const stdDev = Math.sqrt(variance);
        
        result.bollingerMiddle = sma;
        result.bollingerUpper = sma + (2 * stdDev);
        result.bollingerLower = sma - (2 * stdDev);
      }
      
      // Calculate RSI (Relative Strength Index) - 14 periods
      if (indicators.includes('rsi') && index >= 14) {
        // Simplified RSI calculation
        result.rsi = 50 + (Math.sin(index * 0.1) * 30); // Mock RSI data between 20-80
      }
      
      // Calculate MACD
      if (indicators.includes('macd') && index >= 25) {
        // Simplified MACD calculation
        result.macd = Math.sin(index * 0.1) * 2; // Mock MACD data
        result.macdSignal = Math.sin((index * 0.1) + 1) * 2; // Mock MACD signal line
        result.macdHistogram = result.macd - result.macdSignal;
      }
      
      return result;
    });
  }, [filteredData, indicators]);
  
  // Calculate the percentage change for the selected time period
  const priceChange = useMemo(() => {
    if (chartData.length < 2) return 0;
    const firstPrice = chartData[0].price;
    const lastPrice = chartData[chartData.length - 1].price;
    return ((lastPrice - firstPrice) / firstPrice) * 100;
  }, [chartData]);
  
  // Toggle technical indicators
  const toggleIndicator = (indicator: Indicator) => {
    setIndicators(prev => 
      prev.includes(indicator) 
        ? prev.filter(i => i !== indicator) 
        : [...prev, indicator]
    );
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">
            {data[0]?.symbol} 
            <span className={`ml-4 text-base ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </span>
          </h2>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Chart Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="line">Line</SelectItem>
              <SelectItem value="candle">Candlestick</SelectItem>
              <SelectItem value="area">Area</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
            <SelectTrigger className="w-[80px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">1D</SelectItem>
              <SelectItem value="1w">1W</SelectItem>
              <SelectItem value="1m">1M</SelectItem>
              <SelectItem value="3m">3M</SelectItem>
              <SelectItem value="6m">6M</SelectItem>
              <SelectItem value="1y">1Y</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <Button 
          variant={indicators.includes('volume') ? 'default' : 'outline'} 
          size="sm"
          onClick={() => toggleIndicator('volume')}
        >
          Volume
        </Button>
        <Button 
          variant={indicators.includes('sma') ? 'default' : 'outline'} 
          size="sm"
          onClick={() => toggleIndicator('sma')}
        >
          SMA
        </Button>
        <Button 
          variant={indicators.includes('ema') ? 'default' : 'outline'} 
          size="sm"
          onClick={() => toggleIndicator('ema')}
        >
          EMA
        </Button>
        <Button 
          variant={indicators.includes('bollinger') ? 'default' : 'outline'} 
          size="sm"
          onClick={() => toggleIndicator('bollinger')}
        >
          Bollinger
        </Button>
        <Button 
          variant={indicators.includes('macd') ? 'default' : 'outline'} 
          size="sm"
          onClick={() => toggleIndicator('macd')}
        >
          MACD
        </Button>
        <Button 
          variant={indicators.includes('rsi') ? 'default' : 'outline'} 
          size="sm"
          onClick={() => toggleIndicator('rsi')}
        >
          RSI
        </Button>
      </div>
      
      <div style={{ width: '100%', height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop 
                  offset="5%" 
                  stopColor={priceChange >= 0 ? "#10b981" : "#ef4444"} 
                  stopOpacity={0.8}
                />
                <stop 
                  offset="95%" 
                  stopColor={priceChange >= 0 ? "#10b981" : "#ef4444"} 
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => {
                if (timeRange === '1d') {
                  const d = chartData.find(item => item.date === date);
                  return d?.time || date;
                }
                return date;
              }}
            />
            <YAxis domain={['auto', 'auto']} yAxisId="price" />
            {indicators.includes('volume') && (
              <YAxis 
                domain={['auto', 'auto']} 
                orientation="right" 
                yAxisId="volume" 
                tickFormatter={(value) => value.toLocaleString(undefined, { 
                  notation: 'compact',
                  compactDisplay: 'short'
                })}
              />
            )}
            <Tooltip 
              formatter={(value: number, name: string) => {
                switch (name) {
                  case 'price':
                    return [`$${value.toFixed(2)}`, 'Price'];
                  case 'sma':
                    return [`$${value.toFixed(2)}`, 'SMA (20)'];
                  case 'ema':
                    return [`$${value.toFixed(2)}`, 'EMA (12)'];
                  case 'bollingerUpper':
                    return [`$${value.toFixed(2)}`, 'Upper Band'];
                  case 'bollingerMiddle':
                    return [`$${value.toFixed(2)}`, 'Middle Band'];
                  case 'bollingerLower':
                    return [`$${value.toFixed(2)}`, 'Lower Band'];
                  case 'volume':
                    return [value.toLocaleString(), 'Volume'];
                  case 'rsi':
                    return [`${value.toFixed(2)}`, 'RSI (14)'];
                  case 'macd':
                    return [`${value.toFixed(2)}`, 'MACD Line'];
                  case 'macdSignal':
                    return [`${value.toFixed(2)}`, 'Signal Line'];
                  case 'macdHistogram':
                    return [`${value.toFixed(2)}`, 'MACD Histogram'];
                  default:
                    return [`${value}`, name];
                }
              }}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Legend />
            
            {/* Price display based on chart type */}
            {chartType === 'line' && (
              <Line
                type="monotone"
                dataKey="price"
                stroke={priceChange >= 0 ? "#10b981" : "#ef4444"}
                strokeWidth={2}
                dot={false}
                yAxisId="price"
                name="Price"
              />
            )}
            
            {chartType === 'area' && (
              <Area
                type="monotone"
                dataKey="price"
                stroke={priceChange >= 0 ? "#10b981" : "#ef4444"}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPrice)"
                yAxisId="price"
                name="Price"
              />
            )}
            
            {/* Technical Indicators */}
            {indicators.includes('volume') && (
              <Bar 
                dataKey="volume" 
                fill="#6366f1" 
                opacity={0.5} 
                yAxisId="volume" 
                name="Volume" 
              />
            )}
            
            {indicators.includes('sma') && (
              <Line
                type="monotone"
                dataKey="sma"
                stroke="#0ea5e9"
                strokeWidth={1.5}
                dot={false}
                yAxisId="price"
                name="SMA (20)"
              />
            )}
            
            {indicators.includes('ema') && (
              <Line
                type="monotone"
                dataKey="ema"
                stroke="#fb923c"
                strokeWidth={1.5}
                dot={false}
                yAxisId="price"
                name="EMA (12)"
              />
            )}
            
            {indicators.includes('bollinger') && (
              <>
                <Line
                  type="monotone"
                  dataKey="bollingerUpper"
                  stroke="#a855f7"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  dot={false}
                  yAxisId="price"
                  name="Upper Band"
                />
                <Line
                  type="monotone"
                  dataKey="bollingerMiddle"
                  stroke="#a855f7"
                  strokeWidth={1.5}
                  dot={false}
                  yAxisId="price"
                  name="Middle Band"
                />
                <Line
                  type="monotone"
                  dataKey="bollingerLower"
                  stroke="#a855f7"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  dot={false}
                  yAxisId="price"
                  name="Lower Band"
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {/* Additional charts for RSI and MACD indicators */}
      {(indicators.includes('rsi') || indicators.includes('macd')) && (
        <div className="grid grid-cols-1 gap-4">
          {indicators.includes('rsi') && (
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-2">RSI (14)</h3>
              <div style={{ width: '100%', height: '100px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                    <XAxis 
                      dataKey="date" 
                      tick={false}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      ticks={[30, 50, 70]} 
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(2)}`, 'RSI (14)']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="rsi"
                      stroke="#6366f1"
                      strokeWidth={1.5}
                      dot={false}
                      name="RSI (14)"
                    />
                    {/* Reference lines */}
                    <Line
                      dataKey={() => 30}
                      stroke="#475569"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                    />
                    <Line
                      dataKey={() => 70}
                      stroke="#475569"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
          
          {indicators.includes('macd') && (
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-2">MACD</h3>
              <div style={{ width: '100%', height: '100px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                    <XAxis 
                      dataKey="date" 
                      tick={false}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number, name: string) => {
                        switch (name) {
                          case 'macd':
                            return [`${value.toFixed(2)}`, 'MACD Line'];
                          case 'macdSignal':
                            return [`${value.toFixed(2)}`, 'Signal Line'];
                          case 'macdHistogram':
                            return [`${value.toFixed(2)}`, 'Histogram'];
                          default:
                            return [`${value}`, name];
                        }
                      }}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    <Bar
                      dataKey="macdHistogram"
                      fill={(datum) => datum.macdHistogram >= 0 ? "#10b981" : "#ef4444"}
                      name="Histogram"
                    />
                    <Line
                      type="monotone"
                      dataKey="macd"
                      stroke="#0ea5e9"
                      strokeWidth={1.5}
                      dot={false}
                      name="MACD Line"
                    />
                    <Line
                      type="monotone"
                      dataKey="macdSignal"
                      stroke="#f97316"
                      strokeWidth={1.5}
                      dot={false}
                      name="Signal Line"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>
      )}
      
      {chartData.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-center">
          <Card className="p-2">
            <p className="text-sm text-muted-foreground">Open</p>
            <p className="font-semibold">${chartData[chartData.length - 1].open.toFixed(2)}</p>
          </Card>
          <Card className="p-2">
            <p className="text-sm text-muted-foreground">High</p>
            <p className="font-semibold">${chartData[chartData.length - 1].high.toFixed(2)}</p>
          </Card>
          <Card className="p-2">
            <p className="text-sm text-muted-foreground">Low</p>
            <p className="font-semibold">${chartData[chartData.length - 1].low.toFixed(2)}</p>
          </Card>
          <Card className="p-2">
            <p className="text-sm text-muted-foreground">Close</p>
            <p className="font-semibold">${chartData[chartData.length - 1].close.toFixed(2)}</p>
          </Card>
        </div>
      )}
    </div>
  );
};
