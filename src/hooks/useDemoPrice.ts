import { useEffect, useState } from 'react';
import { getPrice, getChangePct, subscribePrices } from '@/services/demo/demoMarket';
import { isDemoSync } from '@/services/demo/DemoBackend';

/**
 * Live demo price for an instrument (pair id like 'BTC-USDT', crypto symbol
 * like 'BTC', or stock symbol like 'AAPL'). Returns null when not in demo
 * mode so callers can prefer real price sources first.
 */
export function useDemoPrice(instrument: string | null | undefined) {
  const demo = isDemoSync();
  const [price, setPrice] = useState<number | null>(null);
  const [changePct, setChangePct] = useState(0);

  useEffect(() => {
    if (!demo || !instrument) { setPrice(null); return; }
    const update = () => {
      setPrice(getPrice(instrument));
      setChangePct(getChangePct(instrument));
    };
    update();
    return subscribePrices(update);
  }, [demo, instrument]);

  return { price, changePct, isDemo: demo };
}
