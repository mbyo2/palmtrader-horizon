import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlpacaPaperService } from "@/services/AlpacaPaperService";
import { TrendingUp, TrendingDown, RefreshCw, Wallet, PieChart, Activity, LineChart as LineIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface PaperAccount {
  cash: string;
  buying_power: string;
  portfolio_value: string;
  equity: string;
  last_equity: string;
  status: string;
}

interface PaperPosition {
  symbol: string;
  qty: string;
  avg_entry_price: string;
  current_price: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  unrealized_intraday_pl: string;
  unrealized_intraday_plpc: string;
}

type Period = "1D" | "1W" | "1M";

const fmt = (v?: string | number) =>
  v != null ? `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";

const pct = (v?: string | number) => (v != null ? `${Number(v) >= 0 ? "+" : ""}${(Number(v) * 100).toFixed(2)}%` : "—");

const PREF_KEY = "demoPortfolio.chart";

function readPref<T extends string>(param: "view" | "range", allowed: readonly T[], fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get(param);
    if (fromUrl && (allowed as readonly string[]).includes(fromUrl)) return fromUrl as T;
    const raw = window.localStorage.getItem(PREF_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, string>;
      const v = parsed?.[param];
      if (v && (allowed as readonly string[]).includes(v)) return v as T;
    }
  } catch {
    // ignore
  }
  return fallback;
}

function writePref(prefs: { view: string; range: string }) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    const url = new URL(window.location.href);
    url.searchParams.set("view", prefs.view);
    url.searchParams.set("range", prefs.range);
    window.history.replaceState({}, "", url.toString());
  } catch {
    // ignore
  }
}

const DemoPortfolio = () => {
  const [account, setAccount] = useState<PaperAccount | null>(null);
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [realized, setRealized] = useState<{ total: number; bySymbol: Record<string, number> }>({ total: 0, bySymbol: {} });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>(() => readPref<Period>("range", ["1D", "1W", "1M"], "1M"));
  const [history, setHistory] = useState<{ timestamp: number[]; equity: number[]; profit_loss: number[] } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [chartView, setChartView] = useState<"equity" | "pl">(() => readPref<"equity" | "pl">("view", ["equity", "pl"], "equity"));

  // Persist preferences to URL + localStorage
  useEffect(() => {
    writePref({ view: chartView, range: period });
  }, [chartView, period]);

  const load = async () => {
    setLoading(true);
    try {
      const [acc, pos, rp] = await Promise.all([
        AlpacaPaperService.getAccount(),
        AlpacaPaperService.getPositions(),
        AlpacaPaperService.getRealizedPL().catch(() => ({ realized_total: 0, realized_by_symbol: {} } as any)),
      ]);
      setAccount(acc.account);
      setPositions((pos.positions ?? []) as PaperPosition[]);
      setRealized({ total: Number(rp.realized_total ?? 0), bySymbol: rp.realized_by_symbol ?? {} });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load demo portfolio");
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (p: Period) => {
    setHistoryLoading(true);
    try {
      const res = await AlpacaPaperService.getPortfolioHistory(p);
      setHistory(res.history);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load performance history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    load();
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    loadHistory(period);
  }, [period]);

  const summary = useMemo(() => {
    if (!account) return null;
    const equity = Number(account.equity);
    const lastEquity = Number(account.last_equity || equity);
    const dayChange = equity - lastEquity;
    const dayChangePct = lastEquity > 0 ? (dayChange / lastEquity) * 100 : 0;
    const totalCost = positions.reduce((sum, p) => sum + Number(p.cost_basis), 0);
    const unrealized = positions.reduce((sum, p) => sum + Number(p.unrealized_pl), 0);
    const unrealizedPct = totalCost > 0 ? (unrealized / totalCost) * 100 : 0;
    const totalPL = unrealized + realized.total;
    return { equity, dayChange, dayChangePct, totalCost, unrealized, unrealizedPct, realized: realized.total, totalPL };
  }, [account, positions, realized]);

  const chartData = useMemo(() => {
    if (!history?.timestamp?.length) return [];
    return history.timestamp.map((ts, i) => ({
      ts: ts * 1000,
      label:
        period === "1D"
          ? new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : new Date(ts * 1000).toLocaleDateString([], { month: "short", day: "numeric" }),
      equity: Number(history.equity[i] ?? 0),
      pl: Number(history.profit_loss[i] ?? 0),
    })).filter((d) => d.equity > 0);
  }, [history, period]);

  const chartStats = useMemo(() => {
    if (chartData.length < 2) return null;
    const start = chartData[0].equity;
    const end = chartData[chartData.length - 1].equity;
    const change = end - start;
    const changePct = start > 0 ? (change / start) * 100 : 0;
    return { start, end, change, changePct };
  }, [chartData]);

  if (loading && !account) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                Portfolio Summary
              </CardTitle>
              <CardDescription>Live values from Alpaca paper trading</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Total Equity" value={fmt(summary?.equity)} icon={<Wallet className="h-4 w-4" />} />
            <Stat
              label="Today's Change"
              value={`${(summary?.dayChange ?? 0) >= 0 ? "+" : ""}${fmt(Math.abs(summary?.dayChange ?? 0))}`}
              sub={`${(summary?.dayChangePct ?? 0) >= 0 ? "+" : ""}${(summary?.dayChangePct ?? 0).toFixed(2)}%`}
              positive={(summary?.dayChange ?? 0) >= 0}
              icon={(summary?.dayChange ?? 0) >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            />
            <Stat
              label="Total P&L"
              value={`${(summary?.totalPL ?? 0) >= 0 ? "+" : ""}${fmt(Math.abs(summary?.totalPL ?? 0))}`}
              sub="Realized + Unrealized"
              positive={(summary?.totalPL ?? 0) >= 0}
              icon={<Activity className="h-4 w-4" />}
            />
            <Stat label="Cash" value={fmt(account?.cash)} sub={`Buying power: ${fmt(account?.buying_power)}`} />
          </div>

          {/* P&L breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <Stat
              label="Unrealized P&L"
              value={`${(summary?.unrealized ?? 0) >= 0 ? "+" : ""}${fmt(Math.abs(summary?.unrealized ?? 0))}`}
              sub={`${(summary?.unrealizedPct ?? 0) >= 0 ? "+" : ""}${(summary?.unrealizedPct ?? 0).toFixed(2)}% on cost`}
              positive={(summary?.unrealized ?? 0) >= 0}
            />
            <Stat
              label="Realized P&L"
              value={`${(summary?.realized ?? 0) >= 0 ? "+" : ""}${fmt(Math.abs(summary?.realized ?? 0))}`}
              sub="From closed positions (FIFO)"
              positive={(summary?.realized ?? 0) >= 0}
            />
            <Stat
              label="Cost Basis"
              value={fmt(summary?.totalCost)}
              sub={`${positions.length} open position${positions.length === 1 ? "" : "s"}`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Performance chart */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <LineIcon className="h-5 w-5 text-primary" />
                Performance
              </CardTitle>
              <CardDescription>
                {chartStats
                  ? `${chartStats.change >= 0 ? "+" : ""}${fmt(Math.abs(chartStats.change))} (${chartStats.changePct >= 0 ? "+" : ""}${chartStats.changePct.toFixed(2)}%) over ${period}`
                  : `${chartView === "equity" ? "Equity" : "Profit/Loss"} history from Alpaca paper account`}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex gap-1 rounded-md border p-0.5">
                <Button
                  size="sm"
                  variant={chartView === "equity" ? "default" : "ghost"}
                  className="h-7 px-2 text-xs"
                  onClick={() => setChartView("equity")}
                >
                  Equity
                </Button>
                <Button
                  size="sm"
                  variant={chartView === "pl" ? "default" : "ghost"}
                  className="h-7 px-2 text-xs"
                  onClick={() => setChartView("pl")}
                >
                  P&L
                </Button>
              </div>
              <div className="flex gap-1">
                {(["1D", "1W", "1M"] as Period[]).map((p) => (
                  <Button key={p} size="sm" variant={p === period ? "default" : "outline"} onClick={() => setPeriod(p)}>
                    {p}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {historyLoading && !chartData.length ? (
            <Skeleton className="h-64 w-full" />
          ) : chartData.length < 2 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
              No {chartView === "equity" ? "equity" : "P&L"} history yet for this period
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" minTickGap={30} />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v) =>
                      chartView === "equity"
                        ? `$${(v / 1000).toFixed(0)}k`
                        : `${v >= 0 ? "+" : "-"}$${Math.abs(v) >= 1000 ? `${(Math.abs(v) / 1000).toFixed(1)}k` : Math.abs(v).toFixed(0)}`
                    }
                  />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(v: number) => (chartView === "pl" && v < 0 ? `-${fmt(Math.abs(v))}` : fmt(v))}
                    labelFormatter={(l) => l}
                  />
                  {chartView === "equity" && chartStats && (
                    <ReferenceLine y={chartStats.start} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  )}
                  {chartView === "pl" && (
                    <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  )}
                  <Line
                    type="monotone"
                    dataKey={chartView === "equity" ? "equity" : "pl"}
                    name={chartView === "equity" ? "Equity" : "P&L"}
                    stroke={(chartStats?.change ?? 0) >= 0 ? "hsl(var(--success, 142 76% 36%))" : "hsl(var(--destructive))"}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Positions */}
      <Card>
        <CardHeader>
          <CardTitle>Positions ({positions.length})</CardTitle>
          <CardDescription>Real-time market values updated every 30 seconds</CardDescription>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No positions yet. Place a buy order from the Trading tab to start building your portfolio.
            </p>
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
              {positions.map((p) => {
                const pl = Number(p.unrealized_pl);
                const positive = pl >= 0;
                const realizedForSym = realized.bySymbol[p.symbol];
                return (
                  <div
                    key={p.symbol}
                    className="grid grid-cols-2 md:grid-cols-12 gap-2 px-3 py-3 rounded-md border items-center hover:bg-muted/50 transition-colors"
                  >
                    <div className="md:col-span-2 font-semibold">
                      {p.symbol}
                      {realizedForSym != null && Math.abs(realizedForSym) > 0.01 && (
                        <div className={cn("text-xs font-normal", realizedForSym >= 0 ? "text-green-500" : "text-red-500")}>
                          Realized: {realizedForSym >= 0 ? "+" : ""}{fmt(Math.abs(realizedForSym))}
                        </div>
                      )}
                    </div>
                    <div className="md:col-span-2 text-right text-sm">{Number(p.qty).toFixed(Number(p.qty) % 1 ? 4 : 0)}</div>
                    <div className="md:col-span-2 text-right text-sm text-muted-foreground">{fmt(p.avg_entry_price)}</div>
                    <div className="md:col-span-2 text-right text-sm">{fmt(p.current_price)}</div>
                    <div className="md:col-span-2 text-right font-medium">{fmt(p.market_value)}</div>
                    <div className={cn("md:col-span-2 text-right", positive ? "text-green-500" : "text-red-500")}>
                      <div className="flex items-center justify-end gap-1 font-medium">
                        {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {fmt(Math.abs(pl))}
                      </div>
                      <div className="text-xs">{pct(p.unrealized_plpc)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Allocation */}
      {positions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Allocation</CardTitle>
            <CardDescription>Position weights across your portfolio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {positions
              .map((p) => ({
                symbol: p.symbol,
                value: Number(p.market_value),
                pct: summary?.equity ? (Number(p.market_value) / summary.equity) * 100 : 0,
              }))
              .sort((a, b) => b.value - a.value)
              .map((row) => (
                <div key={row.symbol}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{row.symbol}</span>
                    <Badge variant="outline" className="text-xs">{row.pct.toFixed(1)}%</Badge>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(row.pct, 100)}%` }} />
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
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

export default DemoPortfolio;
