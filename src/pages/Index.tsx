import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import TickerStrip from "@/components/home/TickerStrip";
import { MarketTable, MoversPanel } from "@/components/home/MarketTable";
import NewsList from "@/components/home/NewsList";
import PortfolioPerformance from "@/components/Dashboard/PortfolioPerformance";

/**
 * Homepage, rebuilt to the professional trading design language
 * (see ~/workspace/palmtrader-horizon-work/DESIGN-BRIEF.md): live data
 * first, flat surfaces, hairline dividers, one accent, factual copy.
 * No gradients, no feature-card grids, no invented statistics.
 */

const FACTS: { value: string; label: string }[] = [
  { value: "10", label: "Crypto pairs" },
  { value: "18", label: "Listed stocks — US & LuSE" },
  { value: "USD · ZMW", label: "Market currencies" },
  { value: "24h", label: "Crypto markets, around the clock" },
];

const NOTES: { title: string; body: string }[] = [
  {
    title: "An order book on every pair",
    body: "Spot and futures screens show live bids, asks and depth, with market, limit and stop orders — the way a professional terminal works.",
  },
  {
    title: "Fees on the ticket, before you trade",
    body: "Your fee tier is set by your 30-day trading volume, and the order ticket shows the charge before you confirm. Nothing is added afterwards.",
  },
  {
    title: "Kwacha markets",
    body: "Bitcoin and Ethereum trade against the Zambian kwacha, and Lusaka Securities Exchange shares are priced in kwacha, alongside the US dollar markets.",
  },
];

export default function Index() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
    };
    checkAuth();
  }, []);

  if (isLoggedIn === null) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center py-6">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background">
        <TickerStrip />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Intro — compact, left-aligned, factual */}
          <section className="grid gap-8 py-8 lg:grid-cols-[1fr_360px] lg:py-10">
            <div>
              <h1 className="max-w-xl text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
                Crypto, US stocks and LuSE shares in one terminal
              </h1>
              <p className="pt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                PalmCacia is a trading terminal for Bitcoin and global crypto pairs,
                US-listed stocks and shares on the Lusaka Securities Exchange —
                priced in US dollars and Zambian kwacha, with live prices and an
                order book on every market.
              </p>
              <div className="flex flex-wrap gap-3 pt-5">
                <Button onClick={() => navigate("/auth")} className="font-semibold">
                  Create account
                </Button>
                <Button variant="outline" onClick={() => navigate("/markets")}>
                  Browse markets
                </Button>
              </div>
              <dl className="grid max-w-xl grid-cols-2 gap-x-6 gap-y-4 pt-8 sm:grid-cols-4">
                {FACTS.map((f) => (
                  <div key={f.label} className="flex flex-col">
                    <dt className="order-2 pt-1 text-xs text-muted-foreground">{f.label}</dt>
                    <dd className="order-1 text-lg font-semibold tabular-nums text-foreground">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="hidden lg:block">
              <MoversPanel />
            </div>
          </section>

          {/* Markets — the product, first */}
          <section className="border-t border-border py-6">
            <h2 className="pb-4 text-base font-semibold text-foreground">Markets</h2>
            <MarketTable />
          </section>

          <section className="border-t border-border py-6 lg:hidden">
            <MoversPanel />
          </section>

          {/* Plain factual notes — hairline columns, no cards, no icons */}
          <section className="border-t border-border py-8">
            <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
              {NOTES.map((n) => (
                <div key={n.title} className="border-t-2 border-primary/70 pt-3">
                  <h3 className="text-sm font-semibold text-foreground">{n.title}</h3>
                  <p className="pt-1.5 text-sm leading-relaxed text-muted-foreground">{n.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* News */}
          <section className="border-t border-border py-6">
            <h2 className="pb-1 text-base font-semibold text-foreground">Market news</h2>
            <NewsList />
          </section>
        </div>

        {/* Closing band — flat, one line, one action */}
        <section className="border-t border-border bg-card">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:px-8">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Start with the live markets</h2>
              <p className="pt-1 text-sm text-muted-foreground">
                Open an account to trade US stocks and crypto on the Alpaca sandbox,
                and LuSE shares on the PalmCacia paper market.
              </p>
            </div>
            <Button onClick={() => navigate("/auth")} className="shrink-0 font-semibold">
              Create account
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TickerStrip />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5">
          <h1 className="text-xl font-semibold text-foreground">Home</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/watchlist">Watchlist</Link>
            </Button>
            <Button size="sm" asChild className="font-semibold">
              <Link to="/portfolio">Portfolio</Link>
            </Button>
          </div>
        </div>

        <section>
          <PortfolioPerformance />
        </section>

        <section className="py-8">
          <h2 className="pb-4 text-base font-semibold text-foreground">Markets</h2>
          <MarketTable />
        </section>

        <section className="border-t border-border py-6">
          <MoversPanel />
        </section>

        <section className="border-t border-border py-6">
          <h2 className="pb-1 text-base font-semibold text-foreground">Market news</h2>
          <NewsList />
        </section>
      </div>
    </div>
  );
}
