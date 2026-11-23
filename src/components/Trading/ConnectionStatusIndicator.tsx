import { useEffect, useState } from 'react';
import { Wifi, WifiOff, Loader2, RefreshCw, Database } from 'lucide-react';
import { unifiedPriceService } from '@/services/UnifiedPriceService';
import { isDemoSync } from '@/services/demo/DemoBackend';
import { cn } from '@/lib/utils';

type VenueStatus = 'demo' | 'connected' | 'connecting' | 'cached' | 'disconnected';

/**
 * Connection status must reflect the venue the user is actually trading on:
 *
 * - Demo mode: the venue is the LOCAL demo engine — always available, so the
 *   indicator shows "Demo" and can never say Offline.
 * - Signed-in: the realtime price feed. If the socket drops but prices are
 *   already cached on screen, data is still available — show "Cached", never
 *   "Offline". Only a genuine feed failure with nothing on hand shows
 *   "Offline", with a working Retry (the socket layer also auto-reconnects
 *   with backoff).
 */
export const ConnectionStatusIndicator = () => {
  const [status, setStatus] = useState<VenueStatus>('connecting');

  useEffect(() => {
    // Re-evaluated every second: the demo/live answer can change as the
    // session restores, so it is never latched from a single mount-time read.
    const evaluate = () => {
      if (isDemoSync()) {
        setStatus('demo');
        return;
      }
      unifiedPriceService.initialize();
      const feed = unifiedPriceService.getConnectionStatus();
      if (feed === 'connected') setStatus('connected');
      else if (feed === 'connecting') setStatus('connecting');
      else setStatus(unifiedPriceService.hasCachedData() ? 'cached' : 'disconnected');
    };
    evaluate();
    const interval = setInterval(evaluate, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = () => {
    setStatus('connecting');
    unifiedPriceService.reconnect();
  };

  if (status === 'demo') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success" title="Demo mode — your data is stored locally on this device">
        <Wifi className="h-3 w-3" />
        <span>Demo</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors",
      status === 'connected' && "bg-success/10 text-success",
      status === 'connecting' && "bg-warning/10 text-warning",
      status === 'cached' && "bg-warning/10 text-warning",
      status === 'disconnected' && "bg-destructive/10 text-destructive"
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
      {status === 'cached' && (
        <>
          <Database className="h-3 w-3" />
          <span>Cached</span>
          <button
            type="button"
            onClick={handleRetry}
            className="ml-0.5 inline-flex items-center gap-0.5 underline underline-offset-2 hover:opacity-80"
            aria-label="Retry connection"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </>
      )}
      {status === 'disconnected' && (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Offline</span>
          <button
            type="button"
            onClick={handleRetry}
            className="ml-0.5 inline-flex items-center gap-0.5 underline underline-offset-2 hover:opacity-80"
            aria-label="Retry connection"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </>
      )}
    </div>
  );
};
