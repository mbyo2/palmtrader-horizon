import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, TrendingUp, TrendingDown, RotateCcw, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  LusePaperService, formatZMW,
  type LuseAccount, type LuseListing, type LusePosition, type LuseTrade,
} from "@/services/LusePaperService";

const ZambianPortfolio = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<LuseAccount | null>(null);
  const [marketOpen, setMarketOpen] = useState<{ open: boolean; reason?: string }>({ open: true });
  const [listings, setListings] = useState<LuseListing[]>([]);
  const [positions, setPositions] = useState<LusePosition[]>([]);
  const [trades, setTrades] = useState<LuseTrade[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasAccountRef = useRef(false);

  const [symbol, setSymbol] = useState("CECZ");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [shares, setShares] = useState<string>("100");
  const [submitting, setSubmitting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const selectedListing = useMemo(() => listings.find((l) => l.symbol === symbol), [listings, symbol]);
  const sharesNum = Number(shares) || 0;
  const estGross = selectedListing ? sharesNum * Number(selectedListing.last_price) : 0;

  const refresh = useCallback(async () => {
    try {
      const [acc, lst, pos, trd] = await Promise.all([
        LusePaperService.getAccount(),
        LusePaperService.getListings(),
        LusePaperService.getPositions(),
        LusePaperService.getTrades(50),
      ]);
      setAccount(acc.account);
      hasAccountRef.current = true;
      setMarketOpen(acc.market);
      setListings(lst.listings);
      setPositions(pos.positions.filter((p) => Number(p.shares) > 0));
      setTrades(trd.trades);
      setLoadError(null);
    } catch (e: any) {
      // Keep cached values on screen when we have them; the unavailable
      // state below only replaces the view when nothing has loaded.
      setLoadError(e?.message ?? "Failed to load Zambian portfolio");
      if (hasAccountRef.current) {
        toast({ title: "Failed to refresh Zambian portfolio", description: e.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { refresh(); }, [refresh]);

  // Reconcile positions from trade history on mount (source of truth)
  useEffect(() => {
    LusePaperService.reconcile().then(() => refresh()).catch(() => {});
  }, [refresh]);

  // Realtime: instant refresh on any change to my LuSE account/positions/trades/listings
  useEffect(() => {
    let cancelled = false;
    const debounced = () => { if (!cancelled) refresh(); };
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel("luse-portfolio")
        .on("postgres_changes", { event: "*", schema: "public", table: "luse_demo_accounts" }, debounced)
        .on("postgres_changes", { event: "*", schema: "public", table: "luse_demo_positions" }, debounced)
        .on("postgres_changes", { event: "*", schema: "public", table: "luse_demo_trades" }, debounced)
        .on("postgres_changes", { event: "*", schema: "public", table: "luse_listings" }, debounced)
        .subscribe();
    } catch (e) {
      console.warn("LuSE realtime subscription failed", e);
    }
    return () => {
      cancelled = true;
      if (channel) {
        try { supabase.removeChannel(channel); } catch { /* noop */ }
      }
    };
  }, [refresh]);

  const handleSubmit = async () => {
    if (!selectedListing) return;
    if (sharesNum <= 0 || sharesNum % selectedListing.lot_size !== 0) {
      toast({
        title: "Invalid lot size",
        description: `Order must be a multiple of ${selectedListing.lot_size} shares.`,
        variant: "destructive",
      });
      return;
    }
    if (side === "buy" && account && estGross > account.cash_balance) {
      toast({
        title: "Insufficient cash",
        description: `Need ${formatZMW(estGross)}, you have ${formatZMW(account.cash_balance)}.`,
        variant: "destructive",
      });
      return;
    }
    if (side === "sell") {
      const held = positions.find((p) => p.symbol === selectedListing.symbol);
      if (!held || Number(held.shares) < sharesNum) {
        toast({
          title: "Not enough shares",
          description: `You hold ${held ? Number(held.shares) : 0} ${selectedListing.symbol}.`,
          variant: "destructive",
        });
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await LusePaperService.placeOrder({
        symbol: selectedListing.symbol,
        side,
        shares: sharesNum,
        force_after_hours: !marketOpen.open,
      });
      toast({
        title: `${side === "buy" ? "Bought" : "Sold"} ${sharesNum} ${selectedListing.symbol}`,
        description: `${side === "buy" ? "Cost" : "Proceeds"}: ${formatZMW(res.trade.net_amount)} · Fees ${formatZMW(res.trade.total_fees)} · Settles ${res.trade.settlement_date}`,
      });
      await refresh();
    } catch (e: any) {
      toast({
        title: "Order failed",
        description: e?.message ?? "Unable to place order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReconcile = async () => {
    try {
      await LusePaperService.reconcile();
      await refresh();
      toast({ title: "Portfolio reconciled", description: "Rebuilt positions from trade history." });
    } catch (e: any) {
      toast({ title: "Reconcile failed", description: e.message, variant: "destructive" });
    }
  };

  const handleReset = async () => {
    try {
      await LusePaperService.resetDemo();
      toast({ title: "Demo reset", description: "Zambian demo restarted with K500,000." });
      await refresh();
    } catch (e: any) {
      toast({ title: "Reset failed", description: e.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Honest unavailable state: the LuSE paper venue failed and nothing has
  // loaded — never render a zeroed-out fake portfolio in that case.
  if (loadError && !account) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Zambian portfolio unavailable</CardTitle>
          <CardDescription>
            We couldn't reach the LuSE paper market service, so there are no values to show right now — nothing has been estimated or filled in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <Button size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const totalPnl = account?.total_pnl ?? 0;
  const pnlPct = account && account.starting_balance > 0 ? (totalPnl / account.starting_balance) * 100 : 0;
  const PnlIcon = totalPnl >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="space-y-6">
      {loadError && account && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex flex-wrap items-center gap-3 text-sm">
            <span>Showing the last values we loaded — the latest refresh failed ({loadError}).</span>
            <Button size="sm" variant="outline" onClick={refresh}>
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {/* Compliance / market banner */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Zambia demo • ZMW • T+3 settlement • 1.5% brokerage, 0.025% SEC levy, 16% VAT, K10 CSD fee • Lot size 100
        </AlertDescription>
      </Alert>

      {!marketOpen.open && (
        <Alert variant="default" className="border-warning/40">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <strong>Market closed</strong> — {marketOpen.reason}. Zambia trades 10:00–15:00 CAT, Mon–Fri.
            Demo orders are still accepted at the last close price and flagged as after-hours.
          </AlertDescription>
        </Alert>
      )}

      {/* Account summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Equity" value={formatZMW(account?.equity ?? 0)} />
        <SummaryCard label="Cash" value={formatZMW(account?.cash_balance ?? 0)} />
        <SummaryCard label="Positions value" value={formatZMW(account?.positions_value ?? 0)} />
        <SummaryCard
          label="Total P&L"
          value={`${totalPnl >= 0 ? "+" : ""}${formatZMW(totalPnl)} (${pnlPct.toFixed(2)}%)`}
          accent={totalPnl >= 0 ? "success" : "danger"}
          icon={<PnlIcon className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trade panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Trade Zambia</CardTitle>
            <CardDescription>Place a demo order on the Zambian market</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={side} onValueChange={(v) => setSide(v as "buy" | "sell")}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="buy">Buy</TabsTrigger>
                <TabsTrigger value="sell">Sell</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2">
              <Label>Symbol</Label>
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {listings.map((l) => (
                    <SelectItem key={l.symbol} value={l.symbol}>
                      {l.symbol} — {l.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedListing && (
              <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last price</span>
                  <span className="font-medium">{formatZMW(Number(selectedListing.last_price))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Day change</span>
                  <span className={selectedListing.day_change_pct >= 0 ? "text-success" : "text-destructive"}>
                    {selectedListing.day_change_pct >= 0 ? "+" : ""}{Number(selectedListing.day_change_pct).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lot size</span>
                  <span>{selectedListing.lot_size}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Shares (multiples of {selectedListing?.lot_size ?? 100})</Label>
              <Input
                type="number"
                min={selectedListing?.lot_size ?? 100}
                step={selectedListing?.lot_size ?? 100}
                value={shares}
                onChange={(e) => setShares(e.target.value)}
              />
            </div>

            <div className="rounded-md border p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated gross</span>
                <span>{formatZMW(estGross)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Fees (approx.)</span>
                <span>{formatZMW(Math.max(estGross * 0.015, 10) * 1.16 + estGross * 0.00025 + 10)}</span>
              </div>
            </div>

            <Button
              className="w-full"
              variant={side === "buy" ? "default" : "destructive"}
              disabled={submitting || !selectedListing || sharesNum <= 0}
              onClick={handleSubmit}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {side === "buy" ? "Buy" : "Sell"} {selectedListing?.symbol}
            </Button>
          </CardContent>
        </Card>

        {/* Positions */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Holdings</CardTitle>
              <CardDescription>Persistent Zambia demo positions</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReconcile}>
                <RefreshCw className="h-4 w-4 mr-2" /> Reconcile
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmReset(true)}>
                <RotateCcw className="h-4 w-4 mr-2" /> Reset demo
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {positions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No holdings yet — buy some Zambian shares to get started.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead className="text-right">Shares</TableHead>
                      <TableHead className="text-right">Avg cost</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">Unrealized P&L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium">{p.symbol}</div>
                          <div className="text-xs text-muted-foreground">{p.company_name}</div>
                        </TableCell>
                        <TableCell className="text-right">{Number(p.shares).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{formatZMW(Number(p.average_price))}</TableCell>
                        <TableCell className="text-right">{formatZMW(p.current_price)}</TableCell>
                        <TableCell className="text-right">{formatZMW(p.market_value)}</TableCell>
                        <TableCell className={`text-right ${p.unrealized_pnl >= 0 ? "text-success" : "text-destructive"}`}>
                          {p.unrealized_pnl >= 0 ? "+" : ""}{formatZMW(p.unrealized_pnl)}
                          <div className="text-xs">({p.unrealized_pnl_pct.toFixed(2)}%)</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trade history */}
      <Card>
        <CardHeader>
          <CardTitle>Trade history</CardTitle>
          <CardDescription>Last {trades.length} demo trades · T+3 settlement</CardDescription>
        </CardHeader>
        <CardContent>
          {trades.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No trades yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Fees</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead className="text-right">Realized P&L</TableHead>
                    <TableHead>Settles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs">{new Date(t.executed_at).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{t.symbol}</TableCell>
                      <TableCell>
                        <Badge variant={t.side === "buy" ? "default" : "destructive"}>{t.side.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{Number(t.shares).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{formatZMW(Number(t.price))}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatZMW(Number(t.total_fees))}</TableCell>
                      <TableCell className="text-right">{formatZMW(Number(t.net_amount))}</TableCell>
                      <TableCell className={`text-right ${Number(t.realized_pnl) >= 0 ? "text-success" : "text-destructive"}`}>
                        {Number(t.realized_pnl) !== 0 ? formatZMW(Number(t.realized_pnl)) : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{t.settlement_date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Zambian demo?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears all Zambia demo positions and trade history, then restores K500,000 in cash.
              Your United States demo is unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>Reset demo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const SummaryCard = ({
  label, value, accent, icon,
}: { label: string; value: string; accent?: "success" | "danger"; icon?: React.ReactNode }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className={`text-lg font-semibold mt-1 ${accent === "success" ? "text-success" : accent === "danger" ? "text-destructive" : ""}`}>
        {value}
      </div>
    </CardContent>
  </Card>
);

export default ZambianPortfolio;
