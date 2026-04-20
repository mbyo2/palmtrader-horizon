import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlpacaBrokerService } from "@/services/AlpacaBrokerService";
import { Activity, AlertCircle, Building2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface AlpacaAccount {
  status: string;
  cash: string;
  buying_power: string;
  portfolio_value: string;
  currency: string;
}

interface AlpacaPosition {
  symbol: string;
  qty: string;
  market_value: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  current_price: string;
}

interface AlpacaOrder {
  id: string;
  symbol: string;
  qty: string;
  side: string;
  type: string;
  status: string;
  submitted_at: string;
  filled_avg_price?: string;
}

const AlpacaLivePanel = () => {
  const [linked, setLinked] = useState<boolean>(false);
  const [account, setAccount] = useState<AlpacaAccount | null>(null);
  const [positions, setPositions] = useState<AlpacaPosition[]>([]);
  const [orders, setOrders] = useState<AlpacaOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const acc = await AlpacaBrokerService.getAccount();
      setLinked(!!acc.linked);
      setAccount(acc.account ?? null);

      if (acc.linked) {
        const [pos, ord] = await Promise.all([
          AlpacaBrokerService.getPositions(),
          AlpacaBrokerService.getOrders("all", 25),
        ]);
        setPositions((pos.positions as AlpacaPosition[]) ?? []);
        setOrders((ord.orders as AlpacaOrder[]) ?? []);
      } else {
        setPositions([]);
        setOrders([]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load Alpaca data";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = async (id: string) => {
    try {
      await AlpacaBrokerService.cancelOrder(id);
      toast.success("Order cancelled");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!linked) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Alpaca Live (Paper) — Not Linked
            <Badge variant="secondary">Sandbox</Badge>
          </CardTitle>
          <CardDescription>
            Open a live trading account to enable real order routing through Alpaca's paper environment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Onboarding required</AlertTitle>
            <AlertDescription>
              Complete identity onboarding to provision your Alpaca sub-account. The onboarding flow can be added
              from the Account Settings → Live Trading section.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-success" />
              Alpaca Live (Paper)
              <Badge variant="default">{account?.status ?? "linked"}</Badge>
            </CardTitle>
            <CardDescription>Connected to Alpaca Broker sandbox</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {account && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Cash" value={`$${Number(account.cash).toLocaleString()}`} />
            <Stat label="Buying Power" value={`$${Number(account.buying_power).toLocaleString()}`} />
            <Stat label="Portfolio Value" value={`$${Number(account.portfolio_value).toLocaleString()}`} />
            <Stat label="Currency" value={account.currency} />
          </div>
        )}

        <section>
          <h3 className="text-sm font-semibold mb-2">Open Positions</h3>
          {positions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open positions.</p>
          ) : (
            <div className="divide-y rounded-md border">
              {positions.map((p) => {
                const pnl = Number(p.unrealized_pl);
                return (
                  <div key={p.symbol} className="flex items-center justify-between p-3">
                    <div>
                      <p className="font-medium">{p.symbol}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.qty} @ ${Number(p.current_price).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">${Number(p.market_value).toLocaleString()}</p>
                      <p className={`text-xs ${pnl >= 0 ? "text-success" : "text-destructive"}`}>
                        {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} ({(Number(p.unrealized_plpc) * 100).toFixed(2)}%)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h3 className="text-sm font-semibold mb-2">Recent Orders</h3>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="divide-y rounded-md border">
              {orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="font-medium">
                      {o.side.toUpperCase()} {o.qty} {o.symbol}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {o.type} • {new Date(o.submitted_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={o.status === "filled" ? "default" : "secondary"}>{o.status}</Badge>
                    {["new", "accepted", "pending_new", "partially_filled"].includes(o.status) && (
                      <Button size="sm" variant="outline" onClick={() => handleCancel(o.id)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold">{value}</p>
  </div>
);

export default AlpacaLivePanel;
