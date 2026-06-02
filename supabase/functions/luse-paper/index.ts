// LuSE (Zambian) paper-trading edge function.
// Persists demo positions, cash and trades. Computes Zambian-style fees:
//   - Brokerage: 1.5% of gross (min K10)
//   - SEC levy: 0.025% of gross
//   - VAT 16% on brokerage
//   - CSD fee: K10 flat
// Trading hours: LuSE 10:00–15:00 CAT, Mon–Fri. Demo allows after-hours with a flag.

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const BROKERAGE_RATE = 0.015;
const MIN_BROKERAGE = 10;
const SEC_LEVY_RATE = 0.00025;
const VAT_RATE = 0.16;
const CSD_FEE = 10;
const STARTING_CASH = 500000;

function computeFees(gross: number) {
  const brokerage = Math.max(gross * BROKERAGE_RATE, MIN_BROKERAGE);
  const sec_levy = gross * SEC_LEVY_RATE;
  const vat = brokerage * VAT_RATE;
  const csd_fee = CSD_FEE;
  const total = brokerage + sec_levy + vat + csd_fee;
  return {
    brokerage: +brokerage.toFixed(2),
    sec_levy: +sec_levy.toFixed(2),
    vat: +vat.toFixed(2),
    csd_fee: +csd_fee.toFixed(2),
    total_fees: +total.toFixed(2),
  };
}

function addBusinessDays(date: Date, days: number): string {
  const d = new Date(date);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d.toISOString().slice(0, 10);
}

function isMarketOpen(): { open: boolean; reason?: string } {
  // Convert to Africa/Lusaka (UTC+2)
  const now = new Date();
  const lusaka = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const day = lusaka.getUTCDay();
  if (day === 0 || day === 6) return { open: false, reason: "LuSE closed on weekends" };
  const hour = lusaka.getUTCHours();
  const minute = lusaka.getUTCMinutes();
  const t = hour * 60 + minute;
  if (t < 600 || t >= 900) return { open: false, reason: "LuSE trades 10:00–15:00 CAT" };
  return { open: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorised" }, 401);
    const userId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    // Ensure account exists
    await admin
      .from("luse_demo_accounts")
      .upsert(
        { user_id: userId, cash_balance: STARTING_CASH, reserved_balance: 0, starting_balance: STARTING_CASH },
        { onConflict: "user_id", ignoreDuplicates: true },
      );

    switch (action) {
      case "get_account": {
        const { data: acc } = await admin.from("luse_demo_accounts").select("*").eq("user_id", userId).maybeSingle();
        const { data: positions } = await admin.from("luse_demo_positions").select("*").eq("user_id", userId);
        const symbols = (positions ?? []).map((p) => p.symbol);
        const { data: listings } = symbols.length
          ? await admin.from("luse_listings").select("symbol,last_price,previous_close").in("symbol", symbols)
          : { data: [] };
        const priceMap = new Map((listings ?? []).map((l: any) => [l.symbol, Number(l.last_price)]));
        let positions_value = 0;
        let unrealized_pnl = 0;
        let realized_pnl = 0;
        for (const p of positions ?? []) {
          const px = priceMap.get(p.symbol) ?? Number(p.average_price);
          const mv = Number(p.shares) * px;
          positions_value += mv;
          unrealized_pnl += mv - Number(p.shares) * Number(p.average_price);
          realized_pnl += Number(p.realized_pnl);
        }
        const cash = Number(acc?.cash_balance ?? 0);
        const reserved = Number(acc?.reserved_balance ?? 0);
        const equity = cash + reserved + positions_value;
        return json({
          ok: true,
          account: {
            cash_balance: cash,
            reserved_balance: reserved,
            starting_balance: Number(acc?.starting_balance ?? STARTING_CASH),
            positions_value: +positions_value.toFixed(2),
            equity: +equity.toFixed(2),
            unrealized_pnl: +unrealized_pnl.toFixed(2),
            realized_pnl: +realized_pnl.toFixed(2),
            total_pnl: +(unrealized_pnl + realized_pnl).toFixed(2),
            currency: "ZMW",
          },
          market: isMarketOpen(),
        });
      }

      case "get_listings": {
        const { data, error } = await admin
          .from("luse_listings")
          .select("*")
          .eq("is_active", true)
          .order("symbol");
        if (error) throw error;
        return json({ ok: true, listings: data });
      }

      case "get_positions": {
        const { data: positions } = await admin.from("luse_demo_positions").select("*").eq("user_id", userId);
        const symbols = (positions ?? []).map((p) => p.symbol);
        const { data: listings } = symbols.length
          ? await admin.from("luse_listings").select("symbol,last_price,previous_close,company_name").in("symbol", symbols)
          : { data: [] };
        const map = new Map((listings ?? []).map((l: any) => [l.symbol, l]));
        const enriched = (positions ?? []).map((p) => {
          const l: any = map.get(p.symbol);
          const px = l ? Number(l.last_price) : Number(p.average_price);
          const market_value = Number(p.shares) * px;
          const cost_basis = Number(p.shares) * Number(p.average_price);
          const unrealized_pnl = market_value - cost_basis;
          return {
            ...p,
            company_name: l?.company_name,
            current_price: px,
            market_value: +market_value.toFixed(2),
            cost_basis: +cost_basis.toFixed(2),
            unrealized_pnl: +unrealized_pnl.toFixed(2),
            unrealized_pnl_pct: cost_basis ? +((unrealized_pnl / cost_basis) * 100).toFixed(2) : 0,
          };
        });
        return json({ ok: true, positions: enriched });
      }

      case "get_trades": {
        const limit = Math.min(Number(body.limit ?? 100), 500);
        const { data, error } = await admin
          .from("luse_demo_trades")
          .select("*")
          .eq("user_id", userId)
          .order("executed_at", { ascending: false })
          .limit(limit);
        if (error) throw error;
        return json({ ok: true, trades: data });
      }

      case "get_quote": {
        const symbol = String(body.symbol ?? "").toUpperCase();
        const { data, error } = await admin
          .from("luse_listings")
          .select("*")
          .eq("symbol", symbol)
          .maybeSingle();
        if (error) throw error;
        if (!data) return json({ error: "Unknown symbol" }, 404);
        return json({ ok: true, quote: data });
      }

      case "reset_demo": {
        const { error } = await admin.rpc("reset_luse_demo", { p_user_id: userId });
        if (error) throw error;
        return json({ ok: true });
      }

      case "place_order": {
        const symbol = String(body.symbol ?? "").toUpperCase();
        const side = String(body.side ?? "").toLowerCase();
        const shares = Number(body.shares ?? 0);
        const force = Boolean(body.force_after_hours);

        if (!symbol || !["buy", "sell"].includes(side) || !Number.isFinite(shares) || shares <= 0) {
          return json({ error: "Invalid order: symbol, side (buy|sell), shares (>0) required" }, 400);
        }

        const { data: listing } = await admin.from("luse_listings").select("*").eq("symbol", symbol).maybeSingle();
        if (!listing || !listing.is_active) return json({ error: `Symbol ${symbol} not tradeable on LuSE` }, 404);

        // Lot size validation
        const lot = Number(listing.lot_size) || 100;
        if (shares % lot !== 0) {
          return json({ error: `Order must be in multiples of ${lot} shares (LuSE lot size)` }, 400);
        }

        // Market hours
        const market = isMarketOpen();
        if (!market.open && !force) {
          return json({ error: market.reason ?? "Market closed", market_closed: true }, 400);
        }

        const price = Number(listing.last_price);
        const gross = +(shares * price).toFixed(2);
        const fees = computeFees(gross);

        const { data: acc } = await admin.from("luse_demo_accounts").select("*").eq("user_id", userId).maybeSingle();
        const cash = Number(acc?.cash_balance ?? 0);

        const { data: existing } = await admin
          .from("luse_demo_positions")
          .select("*")
          .eq("user_id", userId)
          .eq("symbol", symbol)
          .maybeSingle();

        let newCash = cash;
        let net = 0;
        let realized_delta = 0;
        let newShares = Number(existing?.shares ?? 0);
        let newAvg = Number(existing?.average_price ?? 0);
        let newRealized = Number(existing?.realized_pnl ?? 0);

        if (side === "buy") {
          net = +(gross + fees.total_fees).toFixed(2);
          if (net > cash) return json({ error: `Insufficient cash. Need K${net.toFixed(2)}, have K${cash.toFixed(2)}` }, 400);
          newCash = +(cash - net).toFixed(2);
          const totalCost = newShares * newAvg + shares * price;
          newShares = newShares + shares;
          newAvg = newShares > 0 ? +(totalCost / newShares).toFixed(4) : 0;
        } else {
          if (newShares < shares) return json({ error: `Insufficient shares. Hold ${newShares}, selling ${shares}` }, 400);
          realized_delta = +((price - newAvg) * shares - fees.total_fees).toFixed(2);
          net = +(gross - fees.total_fees).toFixed(2);
          newCash = +(cash + net).toFixed(2);
          newShares = newShares - shares;
          newRealized = +(newRealized + realized_delta).toFixed(2);
        }

        // Insert trade
        const settlement_date = addBusinessDays(new Date(), 3);
        const { data: trade, error: tradeErr } = await admin
          .from("luse_demo_trades")
          .insert({
            user_id: userId,
            symbol,
            side,
            shares,
            price,
            gross_amount: gross,
            brokerage_fee: fees.brokerage,
            sec_levy: fees.sec_levy,
            vat: fees.vat,
            csd_fee: fees.csd_fee,
            total_fees: fees.total_fees,
            net_amount: net,
            realized_pnl: realized_delta,
            status: "filled",
            settlement_date,
          })
          .select()
          .single();
        if (tradeErr) throw tradeErr;

        // Update cash
        await admin.from("luse_demo_accounts").update({ cash_balance: newCash }).eq("user_id", userId);

        // Update position
        if (newShares > 0) {
          await admin.from("luse_demo_positions").upsert(
            {
              user_id: userId,
              symbol,
              shares: newShares,
              average_price: side === "buy" ? newAvg : Number(existing?.average_price ?? newAvg),
              realized_pnl: newRealized,
            },
            { onConflict: "user_id,symbol" },
          );
        } else if (existing) {
          // Position closed — keep realized P&L on a zero-share row so history is preserved
          await admin
            .from("luse_demo_positions")
            .update({ shares: 0, realized_pnl: newRealized })
            .eq("user_id", userId)
            .eq("symbol", symbol);
        }

        return json({ ok: true, trade, fees, new_cash: newCash });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    console.error("luse-paper error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
