// Demo implementations for the stock side: trading accounts, stock order
// execution against the simulated market, portfolio/positions and the
// watchlist. All state lives in demoStore (localStorage-persisted), using
// the store's own shapes (StockPosition.averagePrice, useOrders Order).
import { loadDemoState, updateDemoState, DEMO_USER_ID, uid, type DemoPriceAlert } from './demoStore';
import { getStockDef, getPrice } from './demoMarket';

const now = () => new Date().toISOString();
const loadState = () => loadDemoState();
// The store keeps one cached object; updateDemoState persists + notifies.
const saveState = (_s?: unknown) => { updateDemoState(() => {}); };

// ---------------------------------------------------------------------------
// Trading accounts
// ---------------------------------------------------------------------------
export const ACCOUNT_TYPE_CONFIGS = [
  { id: 'cfg-demo', account_type: 'demo', display_name: 'Demo Account', description: 'Practice with $100,000 of simulated funds', min_deposit: 0, max_leverage: 1, commission_per_lot: 0, min_spread: 0, features: ['Simulated funds', 'All markets', 'No risk'], is_available: true },
  { id: 'cfg-standard', account_type: 'standard', display_name: 'Standard Account', description: 'Everyday investing in US and LuSE stocks', min_deposit: 100, max_leverage: 2, commission_per_lot: 0, min_spread: 0.1, features: ['US & LuSE stocks', 'Options', 'Research'], is_available: true },
  { id: 'cfg-margin', account_type: 'margin', display_name: 'Margin Account', description: 'Trade with leverage on margin', min_deposit: 2000, max_leverage: 4, commission_per_lot: 0, min_spread: 0.08, features: ['Margin trading', 'Short selling', 'Options'], is_available: true },
  { id: 'cfg-premium', account_type: 'premium', display_name: 'Premium Account', description: 'Priority support and advanced analytics', min_deposit: 10000, max_leverage: 5, commission_per_lot: 0, min_spread: 0.05, features: ['Priority support', 'Advanced analytics', 'IPO access'], is_available: true },
];

function syncAccountBalance() {
  updateDemoState(s => {
    const acct = s.tradingAccounts[0];
    if (acct) {
      acct.balance = s.stockCash.USD;
      acct.available_balance = s.stockCash.USD;
    }
  });
}

export const DemoAccounts = {
  getAccountTypeConfigs(): any[] { return ACCOUNT_TYPE_CONFIGS as any; },

  getUserAccounts(): any[] {
    syncAccountBalance();
    return [...loadState().tradingAccounts] as any;
  },

  createAccount(accountType: string, currency = 'USD', accountName?: string, initialDeposit = 0): any {
    const cfg = ACCOUNT_TYPE_CONFIGS.find(c => c.account_type === accountType) || ACCOUNT_TYPE_CONFIGS[0];
    const balance = accountType === 'demo' ? 100000 : initialDeposit;
    const acct: any = {
      id: uid('acct'), user_id: DEMO_USER_ID,
      account_number: `PT-${100000 + loadState().tradingAccounts.length + 1}`,
      account_type: accountType, account_name: accountName || cfg.display_name, currency,
      balance, available_balance: balance, reserved_balance: 0,
      leverage: Math.max(1, Math.floor(cfg.max_leverage / 2) || 1),
      max_leverage: cfg.max_leverage, min_deposit: cfg.min_deposit,
      commission_per_lot: cfg.commission_per_lot, spread_type: 'variable',
      min_spread: cfg.min_spread, margin_call_level: 50, stop_out_level: 20,
      is_active: true, is_verified: accountType === 'demo', trading_disabled: false,
      trading_disabled_reason: null, sec_zambia_compliant: false,
      created_at: now(), updated_at: now(),
    };
    updateDemoState(s => { s.tradingAccounts.push(acct); });
    return acct;
  },

  getAccount(accountId: string): any {
    syncAccountBalance();
    return loadState().tradingAccounts.find(a => a.id === accountId) || null;
  },

  updateAccount(accountId: string, updates: { account_name?: string; leverage?: number }): boolean {
    let ok = false;
    updateDemoState(s => {
      const acct = s.tradingAccounts.find(a => a.id === accountId);
      if (acct) { Object.assign(acct, updates, { updated_at: now() }); ok = true; }
    });
    return ok;
  },

  // Demo deposits/withdrawals move the simulated cash balance.
  deposit(accountId: string, amount: number): boolean {
    if (amount <= 0 || !loadState().tradingAccounts.some(a => a.id === accountId)) return false;
    updateDemoState(s => { s.stockCash.USD += amount; });
    syncAccountBalance();
    return true;
  },

  withdraw(accountId: string, amount: number): boolean {
    const s = loadState();
    if (amount <= 0 || amount > s.stockCash.USD || !s.tradingAccounts.some(a => a.id === accountId)) return false;
    updateDemoState(st => { st.stockCash.USD -= amount; });
    syncAccountBalance();
    return true;
  },
};

// ---------------------------------------------------------------------------
// Stock orders / positions (orders use the useOrders Order shape)
// ---------------------------------------------------------------------------
function applyFill(state: any, symbol: string, side: 'buy' | 'sell', shares: number, price: number) {
  const stock = getStockDef(symbol);
  const currency = stock?.currency || 'USD';
  const pos = state.stockPositions.find((p: any) => p.symbol === symbol);
  if (side === 'buy') {
    state.stockCash[currency] = (state.stockCash[currency] || 0) - shares * price;
    if (pos) {
      const totalCost = pos.averagePrice * pos.quantity + shares * price;
      pos.quantity += shares;
      pos.averagePrice = totalCost / pos.quantity;
    } else {
      state.stockPositions.push({
        symbol, name: stock?.name || symbol, currency,
        quantity: shares, averagePrice: price,
      });
    }
  } else {
    state.stockCash[currency] = (state.stockCash[currency] || 0) + shares * price;
    if (pos) {
      pos.quantity -= shares;
      if (pos.quantity <= 0.000001) {
        state.stockPositions = state.stockPositions.filter((p: any) => p.symbol !== symbol);
      }
    }
  }
}

/** Fill resting limit/stop orders whose trigger price has been crossed. */
function runStockMatching(state: any) {
  for (const o of state.stockOrders) {
    if (o.status !== 'pending') continue;
    const mkt = getPrice(o.symbol);
    let crossed = false;
    if (o.order_type === 'limit') {
      crossed = o.side === 'buy' ? mkt <= (o.limit_price ?? Infinity) : mkt >= (o.limit_price ?? 0);
    } else if (o.order_type === 'stop' || o.order_type === 'stop_limit') {
      if (o.stop_price == null) continue;
      crossed = o.side === 'buy' ? mkt >= o.stop_price : mkt <= o.stop_price;
    }
    if (crossed) {
      o.status = 'filled';
      o.filled_quantity = o.quantity;
      o.average_fill_price = mkt;
      o.updated_at = now();
      applyFill(state, o.symbol, o.side, o.quantity, mkt);
    }
  }
}

export type DemoStockOrderType = 'market' | 'limit' | 'stop' | 'stop_limit';

export const DemoStockTrading = {
  async placeOrder(userId: string, params: {
    symbol: string;
    side: 'buy' | 'sell';
    orderType: DemoStockOrderType;
    quantity: number;
    limitPrice?: number;
    stopPrice?: number;
    timeInForce?: 'day' | 'gtc' | 'ioc' | 'fok';
  }): Promise<{ success: boolean; orderId?: string; error?: string }> {
    const s = loadState();
    const stock = getStockDef(params.symbol);
    if (!stock) return { success: false, error: `Unknown symbol ${params.symbol}` };
    const price = getPrice(params.symbol);
    const currency = stock.currency;

    if (params.side === 'buy') {
      const ref = params.orderType === 'limit' ? (params.limitPrice || price) : price;
      if ((s.stockCash[currency] || 0) < params.quantity * ref) {
        return { success: false, error: `Insufficient ${currency} cash for this order` };
      }
    } else {
      const pos = s.stockPositions.find((p: any) => p.symbol === params.symbol);
      if (!pos || pos.quantity < params.quantity) {
        return { success: false, error: 'Insufficient shares to sell' };
      }
    }

    const order: any = {
      id: uid('ord'), user_id: DEMO_USER_ID, symbol: params.symbol, side: params.side,
      order_type: params.orderType, quantity: params.quantity, filled_quantity: 0,
      limit_price: params.limitPrice ?? undefined, stop_price: params.stopPrice ?? undefined,
      time_in_force: params.timeInForce || 'day', status: 'pending',
      average_fill_price: undefined, created_at: now(), updated_at: now(),
    };

    updateDemoState(state => {
      if (params.orderType === 'market') {
        order.status = 'filled';
        order.filled_quantity = params.quantity;
        order.average_fill_price = price;
        applyFill(state, params.symbol, params.side, params.quantity, price);
      }
      state.stockOrders.unshift(order);
    });
    return { success: true, orderId: order.id };
  },

  async getOrders(userId: string, status?: string): Promise<any[]> {
    updateDemoState(state => runStockMatching(state));
    const orders = [...loadState().stockOrders];
    return status ? orders.filter(o => o.status === status) : orders;
  },

  async cancelOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    let result: { success: boolean; error?: string } = { success: false, error: 'Order not found' };
    updateDemoState(state => {
      const o = state.stockOrders.find((x: any) => x.id === orderId);
      if (!o) return;
      if (o.status !== 'pending') { result = { success: false, error: 'Only pending orders can be cancelled' }; return; }
      o.status = 'cancelled';
      o.updated_at = now();
      result = { success: true };
    });
    return result;
  },

  /** Positions in the usePositions() hook shape. */
  getPositionsHookShape(): any[] {
    return loadState().stockPositions.map((p: any) => ({
      id: `pos-${p.symbol}`, user_id: DEMO_USER_ID, symbol: p.symbol,
      quantity: p.quantity, average_cost: p.averagePrice, realized_pnl: 0,
      created_at: now(), updated_at: now(),
    }));
  },

  /** Positions in the PortfolioService shape, enriched with live prices. */
  getPortfolio(): any[] {
    return loadState().stockPositions.map((p: any) => {
      const currentPrice = getPrice(p.symbol);
      const currentValue = p.quantity * currentPrice;
      const totalCost = p.quantity * p.averagePrice;
      const totalGainLoss = currentValue - totalCost;
      return {
        id: `pos-${p.symbol}`, symbol: p.symbol, shares: p.quantity,
        averagePrice: p.averagePrice, currentPrice, currentValue, totalGainLoss,
        gainLossPercentage: totalCost ? (totalGainLoss / totalCost) * 100 : 0,
        createdAt: now(), updatedAt: now(),
      };
    });
  },

  getPortfolioSummary(): any {
    const positions = this.getPortfolio();
    const totalValue = positions.reduce((a, p) => a + (p.currentValue || 0), 0);
    const totalInvested = positions.reduce((a, p) => a + p.shares * p.averagePrice, 0);
    const totalGainLoss = totalValue - totalInvested;
    return {
      totalValue, totalGainLoss,
      gainLossPercentage: totalInvested ? (totalGainLoss / totalInvested) * 100 : 0,
      totalInvested, positionsCount: positions.length,
    };
  },

  // Watchlist ----------------------------------------------------------------
  getWatchlistSymbols(): string[] { return [...loadState().watchlist]; },
  isWatched(symbol: string): boolean { return loadState().watchlist.includes(symbol); },
  addToWatchlist(symbol: string) {
    updateDemoState(s => { if (!s.watchlist.includes(symbol)) s.watchlist.push(symbol); });
  },
  removeFromWatchlist(symbol: string) {
    updateDemoState(s => { s.watchlist = s.watchlist.filter(x => x !== symbol); });
  },
};

// ---------------------------------------------------------------------------
// Copy trading — demo trader leaderboard (labelled demo profiles); follows
// persist in demoStore.followedTraders with allocations alongside.
// ---------------------------------------------------------------------------
export const DEMO_TRADERS: any[] = [
  { id: 'tr-1', user_id: 'trader-mwansa', display_name: 'Mwansa K. (Demo Trader)', bio: 'Demo profile — LuSE blue chips and dividend stocks.', total_return_pct: 42.8, win_rate: 68, total_trades: 214, followers_count: 318, risk_score: 3, is_verified: true, specialization: 'LuSE Equities' },
  { id: 'tr-2', user_id: 'trader-chanda', display_name: 'Chanda M. (Demo Trader)', bio: 'Demo profile — crypto swing trading on BTC and ETH.', total_return_pct: 87.3, win_rate: 61, total_trades: 486, followers_count: 542, risk_score: 6, is_verified: true, specialization: 'Crypto Swing' },
  { id: 'tr-3', user_id: 'trader-bwalya', display_name: 'Bwalya T. (Demo Trader)', bio: 'Demo profile — US tech momentum with strict position sizing.', total_return_pct: 35.1, win_rate: 64, total_trades: 167, followers_count: 203, risk_score: 4, is_verified: false, specialization: 'US Tech' },
  { id: 'tr-4', user_id: 'trader-ngoma', display_name: 'Ngoma S. (Demo Trader)', bio: 'Demo profile — conservative options income strategies.', total_return_pct: 18.9, win_rate: 74, total_trades: 98, followers_count: 121, risk_score: 2, is_verified: true, specialization: 'Options Income' },
];

const ALLOC_KEY = 'palmtrader:copy-allocations:v1';
function loadAllocations(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(ALLOC_KEY) || '{}'); } catch { return {}; }
}

export const DemoCopyTrading = {
  traders(): any[] { return DEMO_TRADERS; },
  follows(): any[] {
    const allocs = loadAllocations();
    return loadState().followedTraders
      .map(leaderId => {
        const trader = DEMO_TRADERS.find(t => t.user_id === leaderId);
        if (!trader) return null;
        const allocation = allocs[leaderId] ?? 500;
        return {
          id: `follow-${leaderId}`, leader_id: leaderId,
          allocation_amount: allocation, max_trade_size: allocation * 0.1,
          is_active: true, total_profit: 0, total_trades_copied: 0, leader: trader,
        };
      })
      .filter(Boolean);
  },
  follow(leaderId: string, allocation: number) {
    const allocs = loadAllocations();
    allocs[leaderId] = allocation;
    try { localStorage.setItem(ALLOC_KEY, JSON.stringify(allocs)); } catch { /* ignore */ }
    updateDemoState(s => { if (!s.followedTraders.includes(leaderId)) s.followedTraders.push(leaderId); });
    const trader = DEMO_TRADERS.find(t => t.user_id === leaderId);
    if (trader) trader.followers_count += 1;
  },
  unfollow(followId: string) {
    const leaderId = followId.replace('follow-', '');
    updateDemoState(s => { s.followedTraders = s.followedTraders.filter(id => id !== leaderId); });
    const trader = DEMO_TRADERS.find(t => t.user_id === leaderId);
    if (trader && trader.followers_count > 0) trader.followers_count -= 1;
  },
};

// ---------------------------------------------------------------------------
// Price alerts — evaluated against the simulated market on every read.
// ---------------------------------------------------------------------------
export const DemoAlerts = {
  list(): any[] {
    // Evaluate triggers, but only write when one actually fires. Writing on
    // every read made updateDemoState dispatch DEMO_EVENT unconditionally,
    // and listeners that re-read alerts (PriceAlertList) recursed until the
    // stack overflowed.
    const evaluate = (alerts: DemoPriceAlert[]): boolean => {
      let changed = false;
      for (const a of alerts) {
        if (!a.is_active || a.is_triggered) continue;
        const px = getPrice(a.symbol);
        const hit = a.condition === 'above' ? px >= a.target_price : px <= a.target_price;
        if (hit) { a.is_triggered = true; a.is_active = false; changed = true; }
      }
      return changed;
    };
    if (evaluate(loadState().priceAlerts)) {
      // A trigger fired inside the read-only pass against the live cache;
      // persist + notify once (the store's saveState idiom). The nested
      // re-read finds nothing left to change, so it does not write again.
      saveState();
    }
    return [...loadState().priceAlerts].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  create(symbol: string, targetPrice: number, condition: 'above' | 'below') {
    updateDemoState(s => {
      s.priceAlerts.unshift({
        id: uid('alert'), user_id: DEMO_USER_ID, symbol: symbol.toUpperCase(),
        target_price: targetPrice, condition, is_active: true, is_triggered: false,
        created_at: now(),
      });
    });
  },
  remove(id: string) {
    updateDemoState(s => { s.priceAlerts = s.priceAlerts.filter(a => a.id !== id); });
  },
};

// ---------------------------------------------------------------------------
// IPO — fictional demo listings (labelled as such), applications reserve
// ZMW cash from the demo stock account.
// ---------------------------------------------------------------------------
function inDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export const DEMO_IPO_LISTINGS: any[] = [
  {
    id: 'ipo-demo-1', company_name: 'Copperline Solar Ltd', symbol: 'CSOL',
    description: 'Demo listing — a fictional Zambian solar equipment assembler used to demonstrate the IPO flow. Not a real offer.',
    sector: 'Energy', issue_price_min: 2.40, issue_price_max: 2.80, total_shares: 40000000,
    retail_allocation_percentage: 30, subscription_start_date: inDays(-3), subscription_end_date: inDays(11),
    listing_date: inDays(25), minimum_lot_size: 100, status: 'open', created_at: inDays(-10), updated_at: inDays(-1),
  },
  {
    id: 'ipo-demo-2', company_name: 'Lusaka Agro Processors Ltd', symbol: 'LAGP',
    description: 'Demo listing — a fictional agro-processing company used to demonstrate the IPO flow. Not a real offer.',
    sector: 'Agriculture', issue_price_min: 5.00, issue_price_max: 5.60, total_shares: 25000000,
    retail_allocation_percentage: 25, subscription_start_date: inDays(6), subscription_end_date: inDays(20),
    listing_date: inDays(34), minimum_lot_size: 50, status: 'upcoming', created_at: inDays(-6), updated_at: inDays(-2),
  },
  {
    id: 'ipo-demo-3', company_name: 'Zambezi Microfinance Group Ltd', symbol: 'ZMFG',
    description: 'Demo listing — a fictional microfinance group used to demonstrate the IPO flow. Not a real offer.',
    sector: 'Financial Services', issue_price_min: 1.80, issue_price_max: 2.10, total_shares: 60000000,
    retail_allocation_percentage: 40, subscription_start_date: inDays(-40), subscription_end_date: inDays(-18),
    listing_date: inDays(-4), minimum_lot_size: 100, status: 'listed', created_at: inDays(-60), updated_at: inDays(-4),
  },
];

export const DemoIPO = {
  listings(): any[] { return DEMO_IPO_LISTINGS; },
  getListing(id: string): any | null { return DEMO_IPO_LISTINGS.find(l => l.id === id) || null; },

  applications(): any[] {
    return loadState().ipoApplications.map(a => ({
      id: a.id, user_id: a.user_id, ipo_id: a.ipo_id,
      shares_applied: a.shares_requested,
      price_per_share: a.shares_requested ? a.amount / a.shares_requested : 0,
      total_amount: a.amount,
      status: a.status === 'allocated' ? 'allocated' : a.status === 'rejected' ? 'rejected' : 'pending',
      payment_status: 'completed', created_at: a.created_at, updated_at: a.created_at,
    }));
  },

  applicationFor(ipoId: string): any | null {
    return this.applications().find(a => a.ipo_id === ipoId) || null;
  },

  apply(ipoId: string, shares: number, pricePerShare: number): any {
    const listing = this.getListing(ipoId);
    if (!listing) throw new Error('IPO not found');
    const total = shares * pricePerShare;
    if ((loadState().stockCash.ZMW || 0) < total) {
      throw new Error('Insufficient ZMW cash in your demo account for this application');
    }
    const app: any = {
      id: uid('ipo'), user_id: DEMO_USER_ID, ipo_id: ipoId,
      shares_applied: shares, price_per_share: pricePerShare, total_amount: total,
      status: 'pending', payment_status: 'completed', created_at: now(), updated_at: now(),
    };
    updateDemoState(s => {
      s.stockCash.ZMW -= total;
      s.ipoApplications.unshift({
        id: app.id, user_id: DEMO_USER_ID, ipo_id: ipoId,
        shares_requested: shares, amount: total, status: 'pending', created_at: app.created_at,
      });
    });
    return app;
  },
};

// ---------------------------------------------------------------------------
// Options — chain priced off the live demo price with a simple
// intrinsic + time-value model; premiums move the USD stock cash balance.
// ---------------------------------------------------------------------------
function optionPremium(spot: number, strike: number, type: 'call' | 'put', daysToExpiry = 30): number {
  const intrinsic = type === 'call' ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
  const timeValue = 0.35 * spot * 0.30 * Math.sqrt(Math.max(daysToExpiry, 1) / 365) * Math.exp(-Math.abs(spot - strike) / (spot * 0.25));
  return Math.max(0.05, intrinsic + timeValue);
}

function nextExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export const DemoOptions = {
  chainFor(symbol: string) {
    const spot = getPrice(symbol);
    const expiry = nextExpiry();
    const offsets = [-0.10, -0.05, -0.025, 0, 0.025, 0.05, 0.10];
    return offsets.map((off, i) => {
      const strike = Math.round(spot * (1 + off) * 100) / 100;
      const call = optionPremium(spot, strike, 'call');
      const put = optionPremium(spot, strike, 'put');
      const vol = Math.round(2400 * Math.exp(-Math.abs(off) * 14)) + 120;
      return {
        strike,
        callBid: Math.max(0.01, call * 0.97), callAsk: call * 1.03, callVolume: vol,
        putBid: Math.max(0.01, put * 0.97), putAsk: put * 1.03, putVolume: Math.round(vol * 0.7),
        expiry,
      };
    });
  },

  placeTrade(params: {
    symbol: string; optionType: 'CALL' | 'PUT'; strikePrice: number;
    expirationDate: string; contracts: number; premium: number;
  }): { success: boolean; error?: string } {
    const cost = params.premium * params.contracts;
    const s = loadState();
    if ((s.stockCash.USD || 0) < cost) {
      return { success: false, error: 'Insufficient USD cash for this options premium' };
    }
    updateDemoState(state => {
      state.stockCash.USD -= cost;
      state.optionsTrades.unshift({
        id: uid('opt'), user_id: DEMO_USER_ID, symbol: params.symbol.toUpperCase(),
        option_type: params.optionType.toLowerCase() as 'call' | 'put',
        strike_price: params.strikePrice, expiration_date: params.expirationDate,
        premium: params.premium, quantity: params.contracts, side: 'buy',
        status: 'open', created_at: now(),
      });
    });
    return { success: true };
  },

  /** Positions in the EnhancedOptionsTrading OptionPosition shape, marked live. */
  positions(): any[] {
    return loadState().optionsTrades
      .filter(t => t.status === 'open')
      .map(t => {
        const spot = getPrice(t.symbol);
        const days = Math.max(1, Math.round((new Date(t.expiration_date).getTime() - Date.now()) / 86400000));
        const mark = optionPremium(spot, t.strike_price, t.option_type, days);
        const current_value = mark * t.quantity;
        const paid = t.premium * t.quantity;
        return {
          id: t.id, symbol: t.symbol, option_type: t.option_type.toUpperCase(),
          strike_price: t.strike_price, expiration_date: t.expiration_date,
          contracts: t.quantity, premium_per_contract: t.premium,
          current_value, pnl: current_value - paid, status: t.status,
        };
      });
  },
};
