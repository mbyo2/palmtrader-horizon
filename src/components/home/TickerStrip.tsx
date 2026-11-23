import { Link } from "react-router-dom";
import { getChangePct, getPrice } from "@/services/demo/demoMarket";
import { usePriceTick } from "@/hooks/usePriceTick";
import { fmtChange, fmtPrice } from "./format";

const TICKER_ITEMS: { id: string; label: string; currency: "USD" | "ZMW" }[] = [
  { id: "BTC-USDT", label: "BTC/USDT", currency: "USD" },
  { id: "ETH-USDT", label: "ETH/USDT", currency: "USD" },
  { id: "SOL-USDT", label: "SOL/USDT", currency: "USD" },
  { id: "BNB-USDT", label: "BNB/USDT", currency: "USD" },
  { id: "XRP-USDT", label: "XRP/USDT", currency: "USD" },
  { id: "AAPL", label: "AAPL", currency: "USD" },
  { id: "NVDA", label: "NVDA", currency: "USD" },
  { id: "TSLA", label: "TSLA", currency: "USD" },
  { id: "ZCCM", label: "ZCCM", currency: "ZMW" },
  { id: "ATEL", label: "ATEL", currency: "ZMW" },
  { id: "USDT-ZMW", label: "USDT/ZMW", currency: "ZMW" },
];

/**
 * Slim live ticker strip, the way Binance/Coinbase run one under the header:
 * symbol, last price, 24h change as coloured text. No animation, no badges.
 */
const TickerStrip = () => {
  usePriceTick();
  return (
    <div className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-4 py-2 scrollbar-hide sm:px-6 lg:px-8">
        {TICKER_ITEMS.map((item) => {
          const change = getChangePct(item.id);
          return (
            <Link
              key={item.id}
              to={`/trade/${item.id}`}
              className="flex items-baseline gap-2 whitespace-nowrap text-xs hover:opacity-80"
            >
              <span className="font-medium text-foreground">{item.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {fmtPrice(getPrice(item.id), item.currency)}
              </span>
              <span className={`tabular-nums ${change >= 0 ? "text-gain" : "text-loss"}`}>
                {fmtChange(change)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default TickerStrip;
