// Demo implementations for the stock side: trading accounts, stock order
// execution against the simulated market, portfolio/positions and the
// watchlist. All state lives in demoStore (localStorage-persisted), using
// the store's own shapes (StockPosition.averagePrice, useOrders Order).
import { loadDemoState, updateDemoState, DEMO_USER_ID, uid } from './demoStore';
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
