
import { Badge } from "@/components/ui/badge";
import { Clock, Database, Wifi, WifiOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PriceSourceIndicatorProps {
  source: 'finnhub' | 'alpha_vantage' | 'cache' | 'mock';
  timestamp?: number;
  isRealTime?: boolean;
}

const PriceSourceIndicator = ({ source, timestamp, isRealTime }: PriceSourceIndicatorProps) => {
  const getSourceInfo = () => {
    switch (source) {
      case 'finnhub':
        return {
          label: 'Finnhub',
          color: 'bg-green-100 text-green-800',
          icon: isRealTime ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />
        };
      case 'alpha_vantage':
        return {
          label: 'Alpha Vantage',
          color: 'bg-blue-100 text-blue-800',
          icon: <Database className="h-3 w-3" />
        };
      case 'cache':
        return {
          label: 'Cached',
          color: 'bg-yellow-100 text-yellow-800',
          icon: <Clock className="h-3 w-3" />
        };
      case 'mock':
        return {
          label: 'Demo',
          color: 'bg-gray-100 text-gray-800',
          icon: <WifiOff className="h-3 w-3" />
        };
      default:
        return {
          label: 'Unknown',
          color: 'bg-gray-100 text-gray-800',
          icon: <WifiOff className="h-3 w-3" />
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
