import React, { useEffect, useRef, memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface TradingViewWidgetProps {
  symbol?: string;
  theme?: 'light' | 'dark';
  height?: number;
  interval?: string;
  allowSymbolChange?: boolean;
}

const TradingViewWidget: React.FC<TradingViewWidgetProps> = memo(({
  symbol = 'AAPL',
  theme,
  height = 500,
  interval = 'D',
  allowSymbolChange = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    const isDark = theme ?? (document.documentElement.classList.contains('dark') ? 'dark' : 'light');

    // Clear previous widget
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: interval,
      timezone: 'Africa/Lusaka',
      theme: isDark === 'dark' ? 'dark' : 'light',
      style: '1',
      locale: 'en',
      allow_symbol_change: allowSymbolChange,
      calendar: false,
      support_host: 'https://www.tradingview.com',
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: true,
      hide_volume: false,
      studies: [
        'STD;RSI',
        'STD;MACD',
        'STD;Bollinger_Bands',
      ],
    });

    scriptRef.current = script;
    containerRef.current?.appendChild(script);

    return () => {
      if (scriptRef.current && containerRef.current) {
        try {
          containerRef.current.innerHTML = '';
        } catch (e) {
          // Cleanup error - ignore
        }
      }
    };
  }, [symbol, theme, interval, allowSymbolChange]);

  return (
    <Card className="w-full overflow-hidden">
      <CardContent className="p-0">
        <div className="tradingview-widget-container" style={{ height, width: '100%' }}>
          <div
            ref={containerRef}
            className="tradingview-widget-container__widget"
            style={{ height: '100%', width: '100%' }}
          />
        </div>
      </CardContent>
    </Card>
  );
});

TradingViewWidget.displayName = 'TradingViewWidget';

export default TradingViewWidget;
