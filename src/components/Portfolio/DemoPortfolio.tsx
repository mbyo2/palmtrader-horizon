import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlpacaPaperService } from "@/services/AlpacaPaperService";
import { TrendingUp, TrendingDown, RefreshCw, Wallet, PieChart, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

const fmt = (v?: string | number) =>
  v != null ? `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";

const pct = (v?: string | number) => (v != null ? `${Number(v) >= 0 ? "+" : ""}${(Number(v) * 100).toFixed(2)}%` : "—");

const DemoPortfolio = () => {
  const [account, setAccount] = useState<PaperAccount | null>(null);
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [acc, pos] = await Promise.all([AlpacaPaperService.getAccount(), AlpacaPaperService.getPositions()]);
      setAccount(acc.account);
      setPositions((pos.positions ?? []) as PaperPosition[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load demo portfolio");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, []);

  const summary = useMemo(() => {
    if (!account) return null;
    const equity = Number(account.equity);
    const lastEquity = Number(account.last_equity || equity);
    const dayChange = equity - lastEquity;
    const dayChangePct = lastEquity > 0 ? (dayChange / lastEquity) * 100 : 0;
    const totalCost = positions.reduce((sum, p) => sum + Number(p.cost_basis), 0);
    const totalPL = positions.reduce((sum, p) => sum + Number(p.unrealized_pl), 0);
    const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
    return { equity, dayChange, dayChangePct, totalCost, totalPL, totalPLPct };
  }, [account, positions]);

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
              sub={`${(summary?.totalPLPct ?? 0) >= 0 ? "+" : ""}${(summary?.totalPLPct ?? 0).toFixed(2)}%`}
              positive={(summary?.totalPL ?? 0) >= 0}
              icon={<Activity className="h-4 w-4" />}
            />
            <Stat label="Cash" value={fmt(account?.cash)} sub={`Buying power: ${fmt(account?.buying_power)}`} />
          </div>
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
              {/* Header */}
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
                return (
                  <div
                    key={p.symbol}
                    className="grid grid-cols-2 md:grid-cols-12 gap-2 px-3 py-3 rounded-md border items-center hover:bg-muted/50 transition-colors"
                  >
                    <div className="md:col-span-2 font-semibold">{p.symbol}</div>
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
