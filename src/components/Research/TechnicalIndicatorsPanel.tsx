
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart, Bar } from 'recharts';
import { AlphaVantageService, TechnicalIndicator } from '@/services/AlphaVantageService';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface TechnicalIndicatorsPanelProps {
  symbol: string;
}

export function TechnicalIndicatorsPanel({ symbol }: TechnicalIndicatorsPanelProps) {
  const [rsiData, setRsiData] = useState<TechnicalIndicator[]>([]);
  const [macdData, setMacdData] = useState<TechnicalIndicator[]>([]);
  const [smaData, setSmaData] = useState<TechnicalIndicator[]>([]);
  const [bbandsData, setBbandsData] = useState<TechnicalIndicator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('rsi');

  useEffect(() => {
    const fetchIndicators = async () => {
      setIsLoading(true);
      try {
        const [rsi, macd, sma, bbands] = await Promise.all([
          AlphaVantageService.fetchRSI(symbol),
          AlphaVantageService.fetchMACD(symbol),
          AlphaVantageService.fetchSMA(symbol, 20),
          AlphaVantageService.fetchBollingerBands(symbol)
        ]);
        
        setRsiData(rsi.slice(-60));
        setMacdData(macd.slice(-60));
        setSmaData(sma.slice(-60));
        setBbandsData(bbands.slice(-60));
      } catch (error) {
        console.error('Error fetching indicators:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (symbol) {
      fetchIndicators();
    }
  }, [symbol]);

  const latestRsi = rsiData[rsiData.length - 1]?.value || 50;
  const rsiSignal = latestRsi > 70 ? 'Overbought' : latestRsi < 30 ? 'Oversold' : 'Neutral';
  const rsiColor = latestRsi > 70 ? 'text-red-500' : latestRsi < 30 ? 'text-green-500' : 'text-yellow-500';

  const latestMacd = macdData[macdData.length - 1];
  const macdSignal = latestMacd?.histogram && latestMacd.histogram > 0 ? 'Bullish' : 'Bearish';

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Technical Indicators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Technical Indicators - {symbol}
          </span>
          <div className="flex gap-2">
            <Badge variant={rsiSignal === 'Overbought' ? 'destructive' : rsiSignal === 'Oversold' ? 'default' : 'secondary'}>
              RSI: {rsiSignal}
            </Badge>
            <Badge variant={macdSignal === 'Bullish' ? 'default' : 'destructive'}>
              MACD: {macdSignal}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="rsi">RSI</TabsTrigger>
            <TabsTrigger value="macd">MACD</TabsTrigger>
            <TabsTrigger value="sma">SMA/EMA</TabsTrigger>
            <TabsTrigger value="bbands">Bollinger</TabsTrigger>
          </TabsList>

          <TabsContent value="rsi" className="mt-4">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rsiData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    formatter={(value: number) => [value.toFixed(2), 'RSI']}
                  />
                  <ReferenceLine y={70} stroke="red" strokeDasharray="3 3" label="Overbought" />
                  <ReferenceLine y={30} stroke="green" strokeDasharray="3 3" label="Oversold" />
                  <Line type="monotone" dataKey="value" stroke="#8884d8" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span>Current RSI: <strong className={rsiColor}>{latestRsi.toFixed(2)}</strong></span>
              <span className="text-muted-foreground">14-period RSI indicator</span>
            </div>
          </TabsContent>

          <TabsContent value="macd" className="mt-4">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={macdData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  />
                  <ReferenceLine y={0} stroke="#666" />
                  <Bar dataKey="histogram" fill="#82ca9d" name="Histogram" />
                  <Line type="monotone" dataKey="value" stroke="#8884d8" dot={false} name="MACD" strokeWidth={2} />
                  <Line type="monotone" dataKey="signal" stroke="#ff7300" dot={false} name="Signal" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                {macdSignal === 'Bullish' ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                <strong>{macdSignal}</strong> momentum
              </span>
              <span className="text-muted-foreground">12/26/9 MACD</span>
            </div>
          </TabsContent>

          <TabsContent value="sma" className="mt-4">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={smaData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis domain={['auto', 'auto']} />
                  <Tooltip 
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'SMA 20']}
                  />
                  <Line type="monotone" dataKey="value" stroke="#8884d8" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              20-period Simple Moving Average
            </div>
          </TabsContent>

          <TabsContent value="bbands" className="mt-4">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={bbandsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis domain={['auto', 'auto']} />
                  <Tooltip 
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    formatter={(value: number) => [`$${value.toFixed(2)}`]}
                  />
                  <Area type="monotone" dataKey="upperBand" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.1} name="Upper Band" />
                  <Area type="monotone" dataKey="lowerBand" stroke="#ff7300" fill="#ff7300" fillOpacity={0.1} name="Lower Band" />
                  <Line type="monotone" dataKey="value" stroke="#8884d8" dot={false} strokeWidth={2} name="Middle Band" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              20-period Bollinger Bands (2 std dev)
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
