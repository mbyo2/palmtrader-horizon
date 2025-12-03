import { useEffect, useState } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { unifiedPriceService } from '@/services/UnifiedPriceService';
import { cn } from '@/lib/utils';

export const ConnectionStatusIndicator = () => {
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  useEffect(() => {
    unifiedPriceService.initialize();
    
    const interval = setInterval(() => {
      setStatus(unifiedPriceService.getConnectionStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors",
      status === 'connected' && "bg-green-500/10 text-green-500",
      status === 'connecting' && "bg-yellow-500/10 text-yellow-500",
      status === 'disconnected' && "bg-red-500/10 text-red-500"
    )}>
      {status === 'connected' && (
        <>
          <Wifi className="h-3 w-3" />
          <span>Live</span>
        </>
      )}
      {status === 'connecting' && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Connecting</span>
        </>
      )}
      {status === 'disconnected' && (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Offline</span>
        </>
      )}
    </div>
  );
};
