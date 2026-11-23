import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Wallet, PieChart, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadDemoState, subscribeDemoState } from "@/services/demo/demoStore";
import { getPrice, getCryptoPrice, subscribePrices, USD_ZMW_RATE } from "@/services/demo/demoMarket";
import { getStockDef } from "@/services/demo/demoMarket";

/**
 * DemoStorePortfolio — the signed-out demo Portfolio view.
 *
 * Demo trades execute in the local demo engine (demoStore): stock orders via
 * DemoStockTrading, spot crypto via the demo spot wallets. This component
 * reads THAT SAME store, so what the user bought on /trade/:symbol or the
 * Exchange is exactly what shows here. It never calls the Alpaca broker or
 * LuSE paper edge functions — those require a signed-in session and a linked
 * account, and in demo mode they can only fail and render a fake "empty /
 * offline" portfolio (the bug this component replaces).
 */

const fmtUSD = (v: number) =>
  `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtZMW = (v: number) =>
  `K${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtQty = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: v % 1 ? 6 : 0 });

function useDemoTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    const unsubState = subscribeDemoState(bump);
    const unsubPrices = subscribePrices(bump);
    return () => {
      unsubState();
      unsubPrices();
    };
  }, []);
}

interface StockRow {
  symbol: string;
  name: string;
  currency: "USD" | "ZMW";
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  pnl: number;
  pnlPct: number;
}

export const DemoStorePortfolio = ({ market }: { market: "us" | "zm" }) => {
  useDemoTick();
  const state = loadDemoState();

  const stockRows: StockRow[] = useMemo(
    () =>
      state.stockPositions
        .filter((p) => p.quantity > 0)
        .map((p) => {
          const currentPrice = getPrice(p.symbol);
          const marketValue = p.quantity * currentPrice;
          const costBasis = p.quantity * p.averagePrice;
          const pnl = marketValue - costBasis;
          return {
            symbol: p.symbol,
            name: p.name || getStockDef(p.symbol)?.name || p.symbol,
            currency: p.currency,
            quantity: p.quantity,
            averagePrice: p.averagePrice,
            currentPrice,
            marketValue,
            costBasis,
            pnl,
            pnlPct: costBasis ? (pnl / costBasis) * 100 : 0,
          };
        }),
    // Recomputed on every demo-state / price tick via useDemoTick re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state],
  );

  const usRows = stockRows.filter((r) => r.currency === "USD");
  const zmRows = stockRows.filter((r) => r.currency === "ZMW");

  const spotWallets = useMemo(
    () =>
      state.cryptoWallets
        .filter((w) => w.wallet_type === "spot" && (w.available_balance > 0 || w.locked_balance > 0))
        .map((w) => {
          const total = w.available_balance + w.locked_balance;
          const usdPrice =
            w.currency === "ZMW" ? 1 / USD_ZMW_RATE : w.currency === "USD" || w.currency === "USDT" || w.currency === "USDC" ? 1 : getCryptoPrice(w.currency);
          return { ...w, total, usdPrice, usdValue: total * usdPrice };
        })
        .sort((a, b) => b.usdValue - a.usdValue),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state],
  );

  const usPositionsValue = usRows.reduce((a, r) => a + r.marketValue, 0);
  const zmPositionsValue = zmRows.reduce((a, r) => a + r.marketValue, 0);
  const usPnl = usRows.reduce((a, r) => a + r.pnl, 0);
  const zmPnl = zmRows.reduce((a, r) => a + r.pnl, 0);
  const spotUsdValue = spotWallets.reduce((a, w) => a + w.usdValue, 0);
  const cashUSD = state.stockCash.USD || 0;
  const cashZMW = state.stockCash.ZMW || 0;

  // One honest total, in USD terms: stock cash + stock positions in both
  // currencies (ZMW converted at the demo rate) + spot wallet holdings.
  const totalEquityUSD =
    cashUSD + usPositionsValue + (cashZMW + zmPositionsValue) / USD_ZMW_RATE + spotUsdValue;

  if (market === "zm") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Zambian Portfolio — Demo
            </CardTitle>
            <CardDescription>
              LuSE positions from your local demo account — the same store your demo trades execute in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Cash (ZMW)" value={fmtZMW(cashZMW)} icon={<Wallet className="h-4 w-4" />} />
              <Stat label="Positions Value" value={fmtZMW(zmPositionsValue)} />
              <Stat
                label="Total P&L"
                value={`${zmPnl >= 0 ? "+" : "−"}${fmtZMW(Math.abs(zmPnl))}`}
                positive={zmPnl >= 0}
                icon={zmPnl >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              />
              <Stat label="Holdings" value={String(zmRows.length)} />
            </div>
          </CardContent>
        </Card>
        <StockTable title="LuSE Holdings" rows={zmRows} currency="ZMW" emptyText="No Zambian positions yet. Buy a LuSE stock such as ZCCM from the Trading tab or a /trade page to see it here." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            Portfolio Summary — Demo
          </CardTitle>
          <CardDescription>
            Live values from your local demo account — the same store your demo trades execute in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Total Equity (USD terms)" value={fmtUSD(totalEquityUSD)} icon={<Wallet className="h-4 w-4" />} />
            <Stat
              label="US Stocks P&L"
              value={`${usPnl >= 0 ? "+" : "−"}${fmtUSD(Math.abs(usPnl))}`}
              sub="Unrealized, vs average cost"
              positive={usPnl >= 0}
              icon={usPnl >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            />
            <Stat label="Cash (USD)" value={fmtUSD(cashUSD)} sub={`ZMW cash: ${fmtZMW(cashZMW)}`} />
            <Stat label="Spot Wallet (USD terms)" value={fmtUSD(spotUsdValue)} sub={`${spotWallets.length} asset${spotWallets.length === 1 ? "" : "s"} held`} />
          </div>
        </CardContent>
      </Card>

      <StockTable title="US Stock Positions" rows={usRows} currency="USD" emptyText="No US stock positions yet. Buy a stock such as AAPL from the Trading tab or a /trade page to see it here." />

      {/* Spot wallet — this is where Exchange spot crypto trades show up. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Spot Wallet Holdings
          </CardTitle>
          <CardDescription>Demo spot wallet — crypto bought on the Exchange appears here.</CardDescription>
        </CardHeader>
        <CardContent>
          {spotWallets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No spot holdings yet.</p>
          ) : (
            <div className="space-y-2">
              <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 text-xs text-muted-foreground border-b">
                <div className="col-span-3">Asset</div>
                <div className="col-span-3 text-right">Available</div>
                <div className="col-span-2 text-right">Locked</div>
                <div className="col-span-2 text-right">Price (USD)</div>
                <div className="col-span-2 text-right">Value (USD)</div>
              </div>
              {spotWallets.map((w) => (
                <div key={w.id} className="grid grid-cols-2 md:grid-cols-12 gap-2 px-3 py-3 rounded-md border items-center">
                  <div className="md:col-span-3 font-semibold flex items-center gap-2">
                    {w.currency}
                    <Badge variant="outline" className="text-[10px]">spot</Badge>
                  </div>
                  <div className="md:col-span-3 text-right text-sm">{fmtQty(w.available_balance)}</div>
                  <div className="md:col-span-2 text-right text-sm text-muted-foreground">{fmtQty(w.locked_balance)}</div>
                  <div className="md:col-span-2 text-right text-sm">{fmtUSD(w.usdPrice)}</div>
                  <div className="md:col-span-2 text-right font-medium">{fmtUSD(w.usdValue)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const StockTable = ({
  title,
  rows,
  currency,
  emptyText,
}: {
  title: string;
  rows: StockRow[];
  currency: "USD" | "ZMW";
  emptyText: string;
}) => {
  const fmt = currency === "USD" ? fmtUSD : fmtZMW;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title} ({rows.length})</CardTitle>
        <CardDescription>Marked to the live demo market price.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{emptyText}</p>
        ) : (
          <div className="space-y-2">
            <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 text-xs text-muted-foreground border-b">
              <div className="col-span-2">Symbol</div>
              <div className="col-span-2 text-right">Quantity</div>
              <div className="col-span-2 text-right">Avg Cost</div>
              <div className="col-span-2 text-right">Current</div>
              <div className="col-span-2 text-right">Market Value</div>
              <div className="col-span-2 text-right">P&L</div>
            </div>
            {rows.map((r) => (
              <div key={r.symbol} className="grid grid-cols-2 md:grid-cols-12 gap-2 px-3 py-3 rounded-md border items-center hover:bg-muted/50 transition-colors">
                <div className="md:col-span-2">
                  <div className="font-semibold">{r.symbol}</div>
                  <div className="text-xs text-muted-foreground">{r.name}</div>
                </div>
                <div className="md:col-span-2 text-right text-sm">{fmtQty(r.quantity)}</div>
                <div className="md:col-span-2 text-right text-sm text-muted-foreground">{fmt(r.averagePrice)}</div>
                <div className="md:col-span-2 text-right text-sm">{fmt(r.currentPrice)}</div>
                <div className="md:col-span-2 text-right font-medium">{fmt(r.marketValue)}</div>
                <div className={cn("md:col-span-2 text-right", r.pnl >= 0 ? "text-green-500" : "text-red-500")}>
                  <div className="flex items-center justify-end gap-1 font-medium">
                    {r.pnl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {fmt(Math.abs(r.pnl))}
                  </div>
                  <div className="text-xs">{r.pnlPct >= 0 ? "+" : ""}{r.pnlPct.toFixed(2)}%</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Stat = ({
  label,
  value,
  sub,
  positive,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  icon?: React.ReactNode;
}) => (
  <div className="rounded-lg border p-3">
    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
      {icon}
      {label}
    </div>
    <div className={cn("font-bold text-lg", positive === true && "text-green-500", positive === false && "text-red-500")}>
      {value}
    </div>
    {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
  </div>
);

export default DemoStorePortfolio;
