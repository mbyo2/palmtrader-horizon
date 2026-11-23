import { useMemo } from "react";
import { generateChartData } from "@/services/demo/demoMarket";

interface SparklineProps {
  instrument: string;
  positive: boolean;
  width?: number;
  height?: number;
}

/**
 * Binance-style sparkline: a plain SVG polyline of recent closes in the
 * direction colour. No fill, no gradient, no axis — a shape you read at a
 * glance next to the number.
 */
const Sparkline = ({ instrument, positive, width = 96, height = 28 }: SparklineProps) => {
  const points = useMemo(() => {
    const closes = generateChartData(instrument, 24).map((c) => c.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const range = max - min || 1;
    const stepX = width / (closes.length - 1);
    return closes
      .map((v, i) => `${(i * stepX).toFixed(1)},${(height - 2 - ((v - min) / range) * (height - 4)).toFixed(1)}`)
      .join(" ");
  }, [instrument]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? "hsl(var(--gain))" : "hsl(var(--loss))"}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default Sparkline;
