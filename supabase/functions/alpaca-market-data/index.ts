// Alpaca Market Data v2 — sandbox-friendly public endpoint for quotes, bars, snapshots.
// Docs: https://docs.alpaca.markets/reference/stocklatestquotes
// Uses Broker API credentials (sandbox or live). Free IEX feed by default.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const ALPACA_KEY = Deno.env.get("ALPACA_BROKER_API_KEY") ?? "";
const ALPACA_SECRET = Deno.env.get("ALPACA_BROKER_API_SECRET") ?? "";
// Market data API host is fixed; the broker base URL is for trading only.
// Broker API hosts the market data endpoints under /v1/marketdata/* using Basic auth.
const DATA_BASE = (Deno.env.get("ALPACA_BROKER_BASE_URL") ?? "https://broker-api.sandbox.alpaca.markets").replace(/\/+$/, "");
const FEED = "iex"; // sandbox supports iex

function authHeaders() {
  // Broker API credentials use HTTP Basic auth even for /v2/stocks data endpoints
  // when calling the sandbox data host. Direct Trading API keys would use
  // Apca-Api-Key-Id / Apca-Api-Secret-Key headers, but those aren't what the user has.
  const token = btoa(`${ALPACA_KEY}:${ALPACA_SECRET}`);
  return {
    Authorization: `Basic ${token}`,
    Accept: "application/json",
  };
}

// In-memory cache (per-isolate) — quotes for 5s, bars for 30s.
const cache = new Map<string, { data: unknown; expires: number }>();
function cacheGet<T>(key: string): T | null {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data as T;
  return null;
}
function cacheSet(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function alpaca(path: string) {
  const res = await fetch(`${DATA_BASE}${path}`, { headers: authHeaders() });
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!res.ok) throw new Error(`Alpaca data ${res.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
  return body;
}

function normalizeQuote(symbol: string, snapshot: any) {
  // Snapshot shape: { latestTrade, latestQuote, dailyBar, prevDailyBar }
  const trade = snapshot?.latestTrade;
  const quote = snapshot?.latestQuote;
  const day = snapshot?.dailyBar;
  const prev = snapshot?.prevDailyBar;

  const price = Number(trade?.p ?? quote?.ap ?? day?.c ?? 0);
  const prevClose = Number(prev?.c ?? day?.o ?? price);
  const change = price && prevClose ? price - prevClose : 0;
  const changePercent = prevClose ? (change / prevClose) * 100 : 0;

  return {
    symbol,
    price,
    change: Number(change.toFixed(4)),
    changePercent: Number(changePercent.toFixed(4)),
    high: Number(day?.h ?? price),
    low: Number(day?.l ?? price),
    open: Number(day?.o ?? price),
    previousClose: prevClose,
    volume: Number(day?.v ?? 0),
    timestamp: trade?.t ? new Date(trade.t).getTime() : Date.now(),
    bid: Number(quote?.bp ?? 0),
    ask: Number(quote?.ap ?? 0),
    isDemo: false,
    source: "alpaca",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!ALPACA_KEY || !ALPACA_SECRET) {
      return json({ error: "Alpaca market data credentials not configured" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const action: string = body.action ?? "";

    if (action === "get_quote") {
      const symbol = String(body.symbol || "").toUpperCase();
      if (!symbol) return json({ error: "symbol required" }, 400);

      const cacheKey = `q:${symbol}`;
      const cached = cacheGet(cacheKey);
      if (cached) return json(cached);

      const snap = await alpaca(`/v1/marketdata/stocks/${encodeURIComponent(symbol)}/snapshot?feed=${FEED}`);
      const result = normalizeQuote(symbol, snap);
      cacheSet(cacheKey, result, 5_000);
      return json(result);
    }

    if (action === "get_quotes") {
      const symbolsRaw: string[] = Array.isArray(body.symbols) ? body.symbols : [];
      const symbols = symbolsRaw.map((s) => String(s).toUpperCase()).filter(Boolean).slice(0, 100);
      if (symbols.length === 0) return json({ quotes: {} });

      const cacheKey = `qs:${symbols.join(",")}`;
      const cached = cacheGet<{ quotes: Record<string, unknown> }>(cacheKey);
      if (cached) return json(cached);

      const snaps = await alpaca(
        `/v1/marketdata/stocks/snapshots?symbols=${encodeURIComponent(symbols.join(","))}&feed=${FEED}`,
      );
      const quotes: Record<string, unknown> = {};
      for (const sym of symbols) {
        if (snaps[sym]) quotes[sym] = normalizeQuote(sym, snaps[sym]);
      }
      const out = { quotes };
      cacheSet(cacheKey, out, 5_000);
      return json(out);
    }

    if (action === "get_bars") {
      const symbol = String(body.symbol || "").toUpperCase();
      const timeframe = String(body.timeframe || "1Day"); // 1Min,5Min,15Min,1Hour,1Day
      const limit = Math.min(Number(body.limit ?? 100), 10000);
      if (!symbol) return json({ error: "symbol required" }, 400);

      const params = new URLSearchParams({ timeframe, limit: String(limit), feed: FEED });
      if (body.start) params.set("start", String(body.start));
      if (body.end) params.set("end", String(body.end));

      const cacheKey = `b:${symbol}:${params.toString()}`;
      const cached = cacheGet(cacheKey);
      if (cached) return json(cached);

      const data = await alpaca(`/v1/marketdata/stocks/${encodeURIComponent(symbol)}/bars?${params.toString()}`);
      const bars = (data?.bars ?? []).map((b: any) => ({
        time: new Date(b.t).getTime(),
        open: b.o,
        high: b.h,
        low: b.l,
        close: b.c,
        volume: b.v,
      }));
      const out = { symbol, bars, status: "ok" };
      cacheSet(cacheKey, out, 30_000);
      return json(out);
    }

    if (action === "get_news") {
      const symbols: string[] | undefined = body.symbols;
      const limit = Math.min(Number(body.limit ?? 20), 50);
      const params = new URLSearchParams({ limit: String(limit) });
      if (symbols?.length) params.set("symbols", symbols.join(","));
      const data = await alpaca(`/v1/marketdata/news?${params.toString()}`);
      return json(data);
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("alpaca-market-data error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message, source: "alpaca" }, 502);
  }
});
