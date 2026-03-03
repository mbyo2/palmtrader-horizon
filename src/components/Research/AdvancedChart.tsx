
import React, { useState, useRef } from 'react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { 
  Area, Line, Bar, ComposedChart, Legend, 
  XAxis, YAxis, ReferenceLine, Brush
} from 'recharts';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";
import { MarketData } from "@/services/market/types";

interface AdvancedChartProps {
  symbol: string;
  data: MarketData[];
  height?: number;
}

const AdvancedChart: React.FC<AdvancedChartProps> = ({ 
  symbol, data, height = 380
}) => {
  const [chartType, setChartType] = useState<string>("area");
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);
  const [showVolume, setShowVolume] = useState(false);

  const processedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    const result = data.map((item: any) => ({
      ...item,
      date: new Date(item.timestamp).toLocaleDateString(),
      formattedDate: new Date(item.timestamp).toLocaleString(),
    }));

    if (selectedIndicator === "sma50" || selectedIndicator === "sma200") {
      const period = selectedIndicator === "sma50" ? 50 : 200;
      for (let i = period; i < result.length; i++) {
        const slice = result.slice(i - period, i);
        const sum = slice.reduce((total: number, item: any) => total + item.price, 0);
        (result[i] as any)[`sma${period}`] = sum / period;
      }
    }

    return result;
  }, [data, selectedIndicator]);

  const yAxisDomain = React.useMemo(() => {
    if (!data || data.length === 0) return [0, 100];
    const prices = data.map(d => d.price);
    return [Math.min(...prices) * 0.95, Math.max(...prices) * 1.05];
  }, [data]);

  const predictions = React.useMemo(() => {
    if (!data || data.length < 5) return [];
    const lastPrice = data[data.length - 1].price;
    const lastDate = new Date(data[data.length - 1].timestamp);
    return Array.from({ length: 5 }, (_, i) => {
      const newDate = new Date(lastDate);
      newDate.setDate(lastDate.getDate() + i + 1);
      return {
        date: newDate.toLocaleDateString(),
        formattedDate: newDate.toLocaleString(),
        price: lastPrice * (1 + (Math.random() * 0.04 - 0.02)),
        isPrediction: true
      };
    });
  }, [data]);

  const allData = React.useMemo(() => {
    return [...processedData, ...(selectedIndicator === "prediction" ? predictions : [])];
  }, [processedData, predictions, selectedIndicator]);

  const formatTooltip = (value: any, name: any) => {
    if (name === "price") return [`$${value.toFixed(2)}`, "Price"];
    if (name === "volume") return [`${(value / 1000000).toFixed(2)}M`, "Volume"];
    if (name?.startsWith("sma")) return [`$${value.toFixed(2)}`, `SMA ${name.substring(3)}`];
    return [value, name];
  };

  return (
    <div className="space-y-3">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2">
        {["area", "line"].map(type => (
          <Button key={type} variant={chartType === type ? "default" : "outline"} size="sm" className="text-xs h-7"
            onClick={() => setChartType(type)}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Button>
        ))}
        <div className="w-px h-5 bg-border mx-1" />
        {[
          { key: "sma50", label: "SMA 50" },
          { key: "sma200", label: "SMA 200" },
          { key: "prediction", label: "Predict" },
        ].map(ind => (
          <Button key={ind.key} variant={selectedIndicator === ind.key ? "default" : "outline"} size="sm" className="text-xs h-7"
            onClick={() => setSelectedIndicator(selectedIndicator === ind.key ? null : ind.key)}>
            {ind.label}
          </Button>
        ))}
        <Button variant={showVolume ? "default" : "outline"} size="sm" className="text-xs h-7 ml-auto"
          onClick={() => setShowVolume(!showVolume)}>
          Vol
        </Button>
      </div>

      {selectedIndicator === "prediction" && (
        <Alert className="py-2">
          <AlertCircle className="h-3.5 w-3.5" />
          <AlertDescription className="text-xs">
            Predictions are for demonstration only, not trading advice.
          </AlertDescription>
        </Alert>
      )}

      {/* Chart */}
      <div className="w-full" style={{ height }}>
        <ChartContainer
          config={{
            price: { theme: { dark: '#8884d8', light: '#8884d8' } },
            prediction: { theme: { dark: '#ff9800', light: '#ff9800' } },
            sma50: { theme: { dark: '#4CAF50', light: '#4CAF50' } },
            sma200: { theme: { dark: '#F44336', light: '#F44336' } },
            volume: { theme: { dark: '#64748b', light: '#64748b' } },
          }}
        >
          <ComposedChart data={allData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis domain={yAxisDomain} tickFormatter={(v) => `$${v.toFixed(0)}`} tick={{ fontSize: 10 }} width={55} />
            {showVolume && (
              <YAxis yAxisId="volume" orientation="right" tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} tick={{ fontSize: 10 }} width={45} />
            )}
            <ChartTooltip content={<ChartTooltipContent formatter={formatTooltip} />} />

            {chartType === "area" && (
              <Area type="monotone" dataKey="price" name="Price" fill="url(#colorPrice)" stroke="var(--color-price)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            )}
            {chartType === "line" && (
              <Line type="monotone" dataKey="price" name="Price" stroke="var(--color-price)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            )}
            {selectedIndicator === "prediction" && (
              <Line type="monotone" dataKey="price" name="Prediction" stroke="var(--color-prediction)" strokeWidth={2} strokeDasharray="3 3" dot connectNulls isAnimationActive={false} data={predictions} />
            )}
            {selectedIndicator === "sma50" && (
              <Line type="monotone" dataKey="sma50" name="SMA 50" stroke="var(--color-sma50)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            )}
            {selectedIndicator === "sma200" && (
              <Line type="monotone" dataKey="sma200" name="SMA 200" stroke="var(--color-sma200)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            )}
            {showVolume && (
              <Bar dataKey="volume" name="Volume" yAxisId="volume" fill="var(--color-volume)" opacity={0.5} isAnimationActive={false} />
            )}
            {data && data.length > 0 && (
              <ReferenceLine y={data[data.length - 1].price} stroke="#888" strokeDasharray="3 3" />
            )}
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-price)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-price)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Brush dataKey="date" height={25} stroke="hsl(var(--primary))" startIndex={Math.max(0, allData.length - 30)} />
          </ComposedChart>
        </ChartContainer>
      </div>
    </div>
  );
};

export default AdvancedChart;
