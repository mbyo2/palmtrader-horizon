
import { Badge } from "@/components/ui/badge";
import { Clock, Database, Wifi, WifiOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PriceSourceIndicatorProps {
  source: 'alpaca' | 'finnhub' | 'alpha_vantage' | 'cache' | 'cached' | 'mock' | 'demo';
  timestamp?: number;
  isRealTime?: boolean;
}

const PriceSourceIndicator = ({ source, timestamp, isRealTime }: PriceSourceIndicatorProps) => {
  const getSourceInfo = () => {
    switch (source) {
      case 'alpaca':
        return {
          label: 'Alpaca · Live',
          color: 'bg-success/10 text-success',
          icon: <Wifi className="h-3 w-3" />,
        };
      case 'finnhub':
        return {
          label: 'Finnhub',
          color: 'bg-success/10 text-success',
          icon: isRealTime ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />,
        };
      case 'alpha_vantage':
        return {
          label: 'Alpha Vantage',
          color: 'bg-info/10 text-info',
          icon: <Database className="h-3 w-3" />,
        };
      case 'cache':
      case 'cached':
        return {
          label: 'Cached',
          color: 'bg-warning/10 text-warning',
          icon: <Clock className="h-3 w-3" />,
        };
      case 'mock':
      case 'demo':
        return {
          label: 'Demo · Not Live',
          color: 'bg-destructive/10 text-destructive',
          icon: <WifiOff className="h-3 w-3" />,
        };
      default:
        return {
          label: 'Unknown',
          color: 'bg-muted text-muted-foreground',
          icon: <WifiOff className="h-3 w-3" />,
        };
    }
  };

  const sourceInfo = getSourceInfo();
  const timeAgo = timestamp ? formatDistanceToNow(new Date(timestamp), { addSuffix: true }) : '';

  return (
    <div className="flex items-center gap-1 text-xs">
      <Badge variant="outline" className={`${sourceInfo.color} flex items-center gap-1 px-1 py-0.5`}>
        {sourceInfo.icon}
        {sourceInfo.label}
      </Badge>
      {timeAgo && (
        <span className="text-muted-foreground">
          {timeAgo}
        </span>
      )}
    </div>
  );
};

export default PriceSourceIndicator;
