// Alpaca Market Data — supports BOTH credential types:
//  1) Legacy API keys (Key ID + Secret) → HTTP Basic auth on Broker API, or APCA headers on Trading Data API
//  2) OAuth2 Client Credentials (client_id + client_secret, e.g. CKN4...) → exchange for Bearer token via authx.alpaca.markets
// Auto-detects which mode the configured credentials work with and caches the result.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const ALPACA_KEY = Deno.env.get("ALPACA_BROKER_API_KEY") ?? "";
const ALPACA_SECRET = Deno.env.get("ALPACA_BROKER_API_SECRET") ?? "";
const BROKER_BASE = (Deno.env.get("ALPACA_BROKER_BASE_URL") ?? "https://broker-api.sandbox.alpaca.markets").replace(/\/+$/, "");
const TRADING_DATA_BASE = "https://data.alpaca.markets";
const OAUTH_TOKEN_URL = "https://authx.alpaca.markets/v1/oauth2/token";
const FEED = "iex";

// ---------- OAuth2 token cache ----------
let oauthToken: { token: string; expires: number } | null = null;

async function getOAuthToken(): Promise<string> {
  if (oauthToken && oauthToken.expires > Date.now() + 30_000) return oauthToken.token;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: ALPACA_KEY,
    client_secret: ALPACA_SECRET,
  });
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: body.toString(),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`OAuth token request failed ${res.status}: ${text.slice(0, 300)}`);
  const data = JSON.parse(text);
  const ttl = Number(data.expires_in ?? 900) * 1000;
  oauthToken = { token: data.access_token, expires: Date.now() + ttl };
  return oauthToken.token;
}

// ---------- Auth header builders ----------
function basicAuthHeaders() {
  const token = btoa(`${ALPACA_KEY}:${ALPACA_SECRET}`);
  return { Authorization: `Basic ${token}`, Accept: "application/json" };
}
function apcaAuthHeaders() {
  return {
    "APCA-API-KEY-ID": ALPACA_KEY,
    "APCA-API-SECRET-KEY": ALPACA_SECRET,
    Accept: "application/json",
  };
}
async function bearerAuthHeaders() {
  const t = await getOAuthToken();
  return { Authorization: `Bearer ${t}`, Accept: "application/json" };
}

// ---------- Cache ----------
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

// ---------- Endpoint candidates ----------
type Endpoint = {
  name: string;
  base: string;
  prefix: string;
  headers: () => Promise<Record<string, string>> | Record<string, string>;
};
const ENDPOINTS: Endpoint[] = [
  // OAuth Bearer first — required for new "Client Secret" credentials (CK... prefix)
  { name: "oauth-broker-v1beta3", base: BROKER_BASE, prefix: "/v1beta3/marketdata", headers: bearerAuthHeaders },
  { name: "oauth-broker-v1",      base: BROKER_BASE, prefix: "/v1/marketdata",      headers: bearerAuthHeaders },
  // Legacy Basic auth (Broker API)
  { name: "basic-broker-v1beta3", base: BROKER_BASE, prefix: "/v1beta3/marketdata", headers: basicAuthHeaders },
  { name: "basic-broker-v1",      base: BROKER_BASE, prefix: "/v1/marketdata",      headers: basicAuthHeaders },
  // Trading Data API (paper/live trading API keys)
  { name: "trading-v2",           base: TRADING_DATA_BASE, prefix: "/v2",            headers: apcaAuthHeaders },
];
let working: Endpoint | null = null;

async function alpaca(suffix: string) {
  const candidates = working ? [working] : ENDPOINTS;
  let lastErr: Error | null = null;
  for (const ep of candidates) {
    const url = `${ep.base}${ep.prefix}${suffix}`;
    try {
      const headers = await ep.headers();
      const res = await fetch(url, { headers });
      const text = await res.text();
      let body: any = null;
      try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
      if (res.ok) { working = ep; return body; }
      lastErr = new Error(`Alpaca ${res.status} via ${ep.name} ${suffix}: ${typeof body === "string" ? body : JSON.stringify(body).slice(0, 300)}`);
      // If a previously-working endpoint returns 401, clear cache and let next request retry all
      if (working && (res.status === 401 || res.status === 403)) {
        working = null;
        oauthToken = null;
      }
    } catch (e) {
      lastErr = new Error(`Alpaca request error via ${ep.name}: ${(e as Error).message}`);
    }
  }
  throw lastErr ?? new Error("Alpaca request failed");
}

function normalizeQuote(symbol: string, snapshot: any) {
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
      const snap = await alpaca(`/stocks/${encodeURIComponent(symbol)}/snapshot?feed=${FEED}`);
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
        `/stocks/snapshots?symbols=${encodeURIComponent(symbols.join(","))}&feed=${FEED}`,
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
      const timeframe = String(body.timeframe || "1Day");
      const limit = Math.min(Number(body.limit ?? 100), 10000);
      if (!symbol) return json({ error: "symbol required" }, 400);
      const params = new URLSearchParams({ timeframe, limit: String(limit), feed: FEED });
      if (body.start) params.set("start", String(body.start));
      if (body.end) params.set("end", String(body.end));
      const cacheKey = `b:${symbol}:${params.toString()}`;
      const cached = cacheGet(cacheKey);
      if (cached) return json(cached);
      const data = await alpaca(`/stocks/${encodeURIComponent(symbol)}/bars?${params.toString()}`);
      const bars = (data?.bars ?? []).map((b: any) => ({
        time: new Date(b.t).getTime(),
        open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v,
      }));
      const out = { symbol, bars, status: "ok" };
      cacheSet(cacheKey, out, 30_000);
      return json(out);
    }

    if (action === "diagnose") {
      const results: any[] = [];
      // Test OAuth token endpoint first
      let tokenInfo: any = { attempted: false };
      try {
        tokenInfo.attempted = true;
        const t = await getOAuthToken();
        tokenInfo.success = true;
        tokenInfo.tokenPrefix = t.slice(0, 12) + "...";
        tokenInfo.expiresInMs = oauthToken!.expires - Date.now();
      } catch (e) {
        tokenInfo.success = false;
        tokenInfo.error = (e as Error).message;
      }
      // Reset endpoint cache for fresh test
      working = null;
      for (const ep of ENDPOINTS) {
        const url = `${ep.base}${ep.prefix}/stocks/AAPL/snapshot?feed=${FEED}`;
        try {
          const headers = await ep.headers();
          const res = await fetch(url, { headers });
          const text = await res.text();
          results.push({ endpoint: ep.name, url, status: res.status, body: text.slice(0, 200) });
        } catch (e) {
          results.push({ endpoint: ep.name, url, error: (e as Error).message });
        }
      }
      return json({
        keyPrefix: ALPACA_KEY.slice(0, 4),
        keyLength: ALPACA_KEY.length,
        secretLength: ALPACA_SECRET.length,
        brokerBase: BROKER_BASE,
        oauth: tokenInfo,
        results,
      });
    }

    if (action === "get_news") {
      const symbols: string[] | undefined = body.symbols;
      const limit = Math.min(Number(body.limit ?? 20), 50);
      const params = new URLSearchParams({ limit: String(limit) });
      if (symbols?.length) params.set("symbols", symbols.join(","));
      const data = await alpaca(`/news?${params.toString()}`);
      return json(data);
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("alpaca-market-data error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message, source: "alpaca" }, 502);
  }
});
