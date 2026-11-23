import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import {
  CRYPTO_PAIRS,
  STOCKS,
  getChangePct,
  getPrice,
} from "@/services/demo/demoMarket";
import { usePriceTick } from "@/hooks/usePriceTick";
import Sparkline from "./Sparkline";
import { fmtChange, fmtPrice } from "./format";

type TabId = "crypto" | "us" | "luse";

interface Row {
  id: string;
  symbol: string;
  name: string;
  currency: "USD" | "ZMW";
}

const CRYPTO_NAMES: Record<string, string> = {
  BTC: "Bitcoin", ETH: "Ethereum", BNB: "BNB", SOL: "Solana", XRP: "XRP",
  ADA: "Cardano", DOGE: "Dogecoin", USDT: "Tether",
};

function rowsFor(tab: TabId): Row[] {
  if (tab === "crypto") {
    return CRYPTO_PAIRS.filter((p) => p.quote === "USDT").map((p) => ({
      id: p.id,
      symbol: p.id.replace("-", "/"),
      name: CRYPTO_NAMES[p.base] || p.base,
      currency: "USD" as const,
    }));
  }
  const market = tab === "us" ? "US" : "LuSE";
  return STOCKS.filter((s) => s.market === market).map((s) => ({
    id: s.symbol,
    symbol: s.symbol,
    name: s.name,
    currency: s.currency,
  }));
}

const TABS: { id: TabId; label: string }[] = [
  { id: "crypto", label: "Crypto" },
  { id: "us", label: "US Stocks" },
  { id: "luse", label: "LuSE" },
];

/**
 * The homepage market table — the Binance/Coinbase pattern: text tabs, a
 * hairline-divided table, tabular prices, change as coloured text, a plain
 * sparkline. Rows link straight to the trade screen.
 */
export const MarketTable = () => {
  const [tab, setTab] = useState<TabId>("crypto");
  usePriceTick();
  const rows = rowsFor(tab);

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border">
        <div className="flex gap-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 pb-2 text-sm font-medium ${
                tab === t.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Link
          to="/markets"
          className="flex items-center gap-1 pb-2 text-xs text-muted-foreground hover:text-foreground"
        >
          All markets <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 px-1 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid-cols-[1fr_110px_90px_110px] sm:gap-x-4">
        <span>Name</span>
        <span className="text-right">Last price</span>
        <span className="hidden text-right sm:block">24h %</span>
        <span className="hidden text-right sm:block">Last 24 hours</span>
      </div>
      <div className="divide-y divide-border">
        {rows.map((row) => {
          const change = getChangePct(row.id);
          const up = change >= 0;
          return (
            <Link
              key={row.id}
              to={`/trade/${row.id}`}
              className="grid grid-cols-[1fr_auto] items-center gap-x-3 px-1 py-2.5 hover:bg-accent/60 sm:grid-cols-[1fr_110px_90px_110px] sm:gap-x-4"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">{row.symbol}</span>
                <span className="block truncate text-xs text-muted-foreground">{row.name}</span>
              </span>
              <span className="text-right">
                <span className="block text-sm tabular-nums text-foreground">
                  {fmtPrice(getPrice(row.id), row.currency)}
                </span>
                <span className={`block text-xs tabular-nums sm:hidden ${up ? "text-gain" : "text-loss"}`}>
                  {fmtChange(change)}
                </span>
              </span>
              <span className={`hidden text-right text-sm tabular-nums sm:block ${up ? "text-gain" : "text-loss"}`}>
                {fmtChange(change)}
              </span>
              <span className="hidden justify-end sm:flex">
                <Sparkline instrument={row.id} positive={up} />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

interface MoverRow extends Row {
  change: number;
}

/** Top gainers / top losers across every listed instrument, as plain lists. */
export const MoversPanel = () => {
  usePriceTick();
  const all: MoverRow[] = [
    ...CRYPTO_PAIRS.filter((p) => p.quote === "USDT").map((p) => ({
      id: p.id, symbol: p.id.replace("-", "/"),
      name: CRYPTO_NAMES[p.base] || p.base, currency: "USD" as const,
      change: getChangePct(p.id),
    })),
    ...STOCKS.map((s) => ({
      id: s.symbol, symbol: s.symbol, name: s.name, currency: s.currency,
      change: getChangePct(s.symbol),
    })),
  ];
  const sorted = [...all].sort((a, b) => b.change - a.change);
  const gainers = sorted.slice(0, 5);
  const losers = sorted.slice(-5).reverse();

  const List = ({ title, rows }: { title: string; rows: MoverRow[] }) => (
    <div>
      <h3 className="pb-2 text-sm font-semibold text-foreground">{title}</h3>
      <div className="divide-y divide-border border-t border-border">
        {rows.map((r) => (
          <Link
            key={r.id}
            to={`/trade/${r.id}`}
            className="flex items-baseline justify-between gap-3 py-2 hover:bg-accent/60"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{r.symbol}</span>
              <span className="block truncate text-xs text-muted-foreground">{r.name}</span>
            </span>
            <span className="text-right">
              <span className="block text-sm tabular-nums">{fmtPrice(getPrice(r.id), r.currency)}</span>
              <span className={`block text-xs tabular-nums ${r.change >= 0 ? "text-gain" : "text-loss"}`}>
                {fmtChange(r.change)}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <List title="Top gainers" rows={gainers} />
      <List title="Top losers" rows={losers} />
    </div>
  );
};
