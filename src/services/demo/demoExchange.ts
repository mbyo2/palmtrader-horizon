/**
 * DemoExchange — demo-mode implementations behind the existing exchange
 * service classes (Spot, Futures, Convert, Staking, Launchpad, Wallets,
 * FeeTiers, P2P). Each service checks DemoBackend.isDemo() and delegates
 * here, so components never change and the real backend wiring stays a
 * one-line decision per method.
 *
 * Balance rules (all against the shared demoStore ledger):
 * - Spot limit orders reserve funds (available → locked) and release/settle
 *   on fill or cancel. Market orders settle immediately at the live demo
 *   price. Trading fee: 0.1%.
 * - Futures margin moves USDT spot available → locked; closing returns
 *   margin + PnL (floored at 0). Liquidation / TP / SL are evaluated on read.
 * - Convert swaps spot balances at the live cross rate minus 0.1%.
 * - Staking moves spot → earn; unstake/claim move value back to spot.
 * - Launchpad subscriptions debit the payment currency; claims credit the
 *   project token to the spot wallet.
 * - P2P: selling locks the seller's crypto in escrow; demo counterparties
 *   auto-progress their side after a few seconds so orders can complete.
 */
import type { TradingPair, SpotOrder, OrderBook } from '@/services/SpotTradingService';
import type { FuturesPosition, OpenPositionRequest } from '@/services/FuturesService';
import type { ConvertQuote, ConvertHistory } from '@/services/ConvertService';
import type { StakingProduct, StakingPosition } from '@/services/StakingService';
import type { LaunchpadProject, LaunchpadSubscription } from '@/services/LaunchpadService';
import type { CryptoWallet, WalletType, WalletTransferRequest } from '@/services/CryptoWalletService';
import type { FeeTier, UserVolume } from '@/services/FeeTierService';
import type { P2PAdvertisement, P2POrder, P2PMessage, CreateAdRequest } from '@/services/P2PService';
import { loadDemoState, updateDemoState, getDemoWallet, DEMO_USER_ID, uid } from './demoStore';
import { CRYPTO_PAIRS, getPairPrice, getPairDef, synthesizeOrderBook, crossRate, getCryptoPrice } from './demoMarket';

const now = () => new Date().toISOString();
const FEE = 0.001; // 0.1%

// ---------------------------------------------------------------------------
// Spot
// ---------------------------------------------------------------------------

export const DemoSpot = {
  getTradingPairs(): TradingPair[] {
    return CRYPTO_PAIRS.map(p => ({
      id: p.id, base_currency: p.base, quote_currency: p.quote,
      min_order_size: 0.0001, max_order_size: 1000000,
      price_precision: 2, quantity_precision: 6,
      maker_fee: FEE, taker_fee: FEE, is_active: true, created_at: now(),
    }));
  },

  getPairById(pairId: string): TradingPair | null {
    return this.getTradingPairs().find(p => p.id === pairId) ?? null;
  },

  /** Fill any resting limit orders the live price has crossed. */
  runMatching() {
    const state = loadDemoState();
    const crossed = state.spotOrders.filter(o =>
      (o.status === 'open' || o.status === 'partially_filled') && o.order_type === 'limit' && o.price &&
      ((o.side === 'buy' && getPairPrice(o.pair_id) <= o.price) ||
       (o.side === 'sell' && getPairPrice(o.pair_id) >= o.price)));
    crossed.forEach(o => this.settleLimitFill(o.id));
  },

  settleLimitFill(orderId: string) {
    updateDemoState(s => {
      const o = s.spotOrders.find(x => x.id === orderId);
      if (!o || o.status === 'filled' || o.status === 'cancelled' || !o.price) return;
      const pair = getPairDef(o.pair_id);
      if (!pair) return;
      const remaining = o.quantity - o.filled_quantity;
      if (o.side === 'buy') {
        const cost = remaining * o.price;
        const quoteW = getDemoWallet(s, pair.quote, 'spot');
        quoteW.locked_balance = Math.max(0, quoteW.locked_balance - cost);
        const baseW = getDemoWallet(s, pair.base, 'spot');
        baseW.available_balance += remaining * (1 - FEE);
      } else {
        const baseW = getDemoWallet(s, pair.base, 'spot');
        baseW.locked_balance = Math.max(0, baseW.locked_balance - remaining);
        const quoteW = getDemoWallet(s, pair.quote, 'spot');
        quoteW.available_balance += remaining * o.price * (1 - FEE);
      }
      o.filled_quantity = o.quantity;
      o.remaining_quantity = 0;
      o.average_fill_price = o.price;
      o.status = 'filled';
      o.updated_at = now();
    });
  },

  getOrderBook(pairId: string): OrderBook {
    this.runMatching();
    const synth = synthesizeOrderBook(pairId);
    const state = loadDemoState();
    const mine = state.spotOrders.filter(o => o.pair_id === pairId && (o.status === 'open' || o.status === 'partially_filled') && o.price);
    const bids = [...synth.bids];
    const asks = [...synth.asks];
    mine.forEach(o => {
      const level = { price: o.price!, quantity: o.quantity - o.filled_quantity, total: o.price! * (o.quantity - o.filled_quantity) };
      (o.side === 'buy' ? bids : asks).push(level);
    });
    bids.sort((a, b) => b.price - a.price);
    asks.sort((a, b) => a.price - b.price);
    return { bids: bids.slice(0, 20), asks: asks.slice(0, 20), lastPrice: synth.lastPrice, spread: asks[0] && bids[0] ? asks[0].price - bids[0].price : undefined };
  },

  placeOrder(userId: string, pairId: string, side: 'buy' | 'sell', orderType: 'market' | 'limit' | 'stop_limit', quantity: number, price?: number, stopPrice?: number, timeInForce: 'GTC' | 'IOC' | 'FOK' = 'GTC'): { success: boolean; orderId?: string; error?: string } {
    const pair = getPairDef(pairId);
    if (!pair) return { success: false, error: 'Unknown trading pair' };
    if (!quantity || quantity <= 0) return { success: false, error: 'Quantity must be positive' };
    const state = loadDemoState();
    const livePrice = getPairPrice(pairId);
    const execPrice = orderType === 'market' ? livePrice : price;
    if (!execPrice) return { success: false, error: 'Price is required for limit orders' };

    const quoteW = getDemoWallet(state, pair.quote, 'spot');
    const baseW = getDemoWallet(state, pair.base, 'spot');

    if (orderType === 'market') {
      if (side === 'buy') {
        const cost = quantity * livePrice;
        if (quoteW.available_balance < cost) return { success: false, error: `Insufficient ${pair.quote} balance` };
      } else if (baseW.available_balance < quantity) {
        return { success: false, error: `Insufficient ${pair.base} balance` };
      }
      const order: SpotOrder = {
        id: uid('ord'), user_id: userId, pair_id: pairId, side, order_type: orderType,
        price: undefined, quantity, filled_quantity: quantity, remaining_quantity: 0,
        average_fill_price: livePrice, status: 'filled', time_in_force: timeInForce,
        created_at: now(), updated_at: now(),
      };
      updateDemoState(s => {
        const q = getDemoWallet(s, pair.quote, 'spot');
        const b = getDemoWallet(s, pair.base, 'spot');
        if (side === 'buy') { q.available_balance -= quantity * livePrice; b.available_balance += quantity * (1 - FEE); }
        else { b.available_balance -= quantity; q.available_balance += quantity * livePrice * (1 - FEE); }
        s.spotOrders.unshift(order);
      });
      return { success: true, orderId: order.id };
    }

    // Limit / stop-limit: reserve funds
    if (side === 'buy') {
      const cost = quantity * execPrice;
      if (quoteW.available_balance < cost) return { success: false, error: `Insufficient ${pair.quote} balance` };
    } else if (baseW.available_balance < quantity) {
      return { success: false, error: `Insufficient ${pair.base} balance` };
    }
    const order: SpotOrder = {
      id: uid('ord'), user_id: userId, pair_id: pairId, side, order_type: orderType,
      price: execPrice, stop_price: stopPrice, quantity, filled_quantity: 0, remaining_quantity: quantity,
      status: 'open', time_in_force: timeInForce, created_at: now(), updated_at: now(),
    };
    updateDemoState(s => {
      if (side === 'buy') {
        const q = getDemoWallet(s, pair.quote, 'spot');
        q.available_balance -= quantity * execPrice; q.locked_balance += quantity * execPrice;
      } else {
        const b = getDemoWallet(s, pair.base, 'spot');
        b.available_balance -= quantity; b.locked_balance += quantity;
      }
      s.spotOrders.unshift(order);
    });
    // A limit order priced through the market fills immediately.
    this.runMatching();
    return { success: true, orderId: order.id };
  },

  cancelOrder(orderId: string): { success: boolean; error?: string } {
    const state = loadDemoState();
    const o = state.spotOrders.find(x => x.id === orderId);
    if (!o) return { success: false, error: 'Order not found' };
    const pair = getPairDef(o.pair_id);
    updateDemoState(s => {
      const ord = s.spotOrders.find(x => x.id === orderId)!;
      const remaining = ord.quantity - ord.filled_quantity;
      if (pair && remaining > 0) {
        if (ord.side === 'buy' && ord.price) {
          const q = getDemoWallet(s, pair.quote, 'spot');
          q.locked_balance = Math.max(0, q.locked_balance - remaining * ord.price);
          q.available_balance += remaining * ord.price;
        } else {
          const b = getDemoWallet(s, pair.base, 'spot');
          b.locked_balance = Math.max(0, b.locked_balance - remaining);
          b.available_balance += remaining;
        }
      }
      ord.status = 'cancelled';
      ord.updated_at = now();
    });
    return { success: true };
  },

  getOpenOrders(userId: string, pairId?: string): SpotOrder[] {
    this.runMatching();
    return loadDemoState().spotOrders.filter(o =>
      o.user_id === userId && (o.status === 'open' || o.status === 'partially_filled') && (!pairId || o.pair_id === pairId));
  },

  getOrderHistory(userId: string, limit = 50): SpotOrder[] {
    this.runMatching();
    return loadDemoState().spotOrders.filter(o => o.user_id === userId).slice(0, limit);
  },
};

// ---------------------------------------------------------------------------
// Futures
// ---------------------------------------------------------------------------

export const DemoFutures = {
  /** Evaluate liquidation / TP / SL for open positions at live prices. */
  evaluatePositions() {
    const state = loadDemoState();
    state.futuresPositions.filter(p => p.status === 'open').forEach(p => {
      const price = getCryptoPrice(p.symbol.replace('USDT', '').replace('PERP', '') || 'BTC');
      const liq = p.liquidation_price;
      if (liq && ((p.side === 'long' && price <= liq) || (p.side === 'short' && price >= liq))) {
        this.settle(p.id, liq, 'liquidated');
      } else if (p.take_profit && ((p.side === 'long' && price >= p.take_profit) || (p.side === 'short' && price <= p.take_profit))) {
        this.settle(p.id, p.take_profit, 'closed');
      } else if (p.stop_loss && ((p.side === 'long' && price <= p.stop_loss) || (p.side === 'short' && price >= p.stop_loss))) {
        this.settle(p.id, p.stop_loss, 'closed');
      }
    });
  },

  settle(positionId: string, exitPrice: number, status: 'closed' | 'liquidated') {
    let pnl = 0;
    updateDemoState(s => {
      const p = s.futuresPositions.find(x => x.id === positionId);
      if (!p || p.status !== 'open') return;
      const diff = p.side === 'long' ? exitPrice - p.entry_price : p.entry_price - exitPrice;
      pnl = diff * p.quantity;
      const usdt = getDemoWallet(s, 'USDT', 'spot');
      usdt.locked_balance = Math.max(0, usdt.locked_balance - p.margin);
      usdt.available_balance += Math.max(p.margin + pnl, 0);
      p.status = status;
      p.realized_pnl = pnl;
      p.unrealized_pnl = 0;
      p.closed_at = now();
      p.updated_at = now();
    });
    return pnl;
  },

  getPositions(userId: string, status?: 'open' | 'closed' | 'liquidated'): FuturesPosition[] {
    this.evaluatePositions();
    return loadDemoState().futuresPositions.filter(p => p.user_id === userId && (!status || p.status === status));
  },

  getPositionHistory(userId: string, limit = 50): FuturesPosition[] {
    this.evaluatePositions();
    return loadDemoState().futuresPositions
      .filter(p => p.user_id === userId && p.status !== 'open')
      .slice(0, limit);
  },

  openPosition(userId: string, req: OpenPositionRequest, calcLiq: (e: number, l: number, s: 'long' | 'short') => number): { success: boolean; positionId?: string; error?: string } {
    if (req.leverage < 1 || req.leverage > 125) return { success: false, error: 'Leverage must be between 1 and 125' };
    const margin = (req.quantity * req.entryPrice) / req.leverage;
    const state = loadDemoState();
    const usdt = getDemoWallet(state, 'USDT', 'spot');
    if (usdt.available_balance < margin) return { success: false, error: 'Insufficient USDT margin balance' };
    const position: FuturesPosition = {
      id: uid('fut'), user_id: userId, symbol: req.symbol, side: req.side,
      entry_price: req.entryPrice, quantity: req.quantity, leverage: req.leverage,
      margin, liquidation_price: calcLiq(req.entryPrice, req.leverage, req.side),
      take_profit: req.takeProfit, stop_loss: req.stopLoss,
      unrealized_pnl: 0, realized_pnl: 0, status: 'open', created_at: now(), updated_at: now(),
    };
    updateDemoState(s => {
      const w = getDemoWallet(s, 'USDT', 'spot');
      w.available_balance -= margin;
      w.locked_balance += margin;
      s.futuresPositions.unshift(position);
    });
    return { success: true, positionId: position.id };
  },

  closePosition(positionId: string, exitPrice: number): { success: boolean; pnl?: number; error?: string } {
    const p = loadDemoState().futuresPositions.find(x => x.id === positionId);
    if (!p || p.status !== 'open') return { success: false, error: 'Position not open' };
    const pnl = this.settle(positionId, exitPrice, 'closed');
    return { success: true, pnl };
  },

  updateTpSl(positionId: string, takeProfit?: number, stopLoss?: number): { success: boolean; error?: string } {
    updateDemoState(s => {
      const p = s.futuresPositions.find(x => x.id === positionId);
      if (p) {
        if (takeProfit !== undefined) p.take_profit = takeProfit;
        if (stopLoss !== undefined) p.stop_loss = stopLoss;
        p.updated_at = now();
      }
    });
    return { success: true };
  },
};

// ---------------------------------------------------------------------------
// Convert
// ---------------------------------------------------------------------------

export const DemoConvert = {
  getQuote(fromCurrency: string, toCurrency: string, fromAmount: number): ConvertQuote {
    const rate = crossRate(fromCurrency, toCurrency);
    const fee = fromAmount * 0.001;
    const toAmount = (fromAmount - fee) * rate;
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + 10);
    return { fromCurrency, toCurrency, fromAmount, toAmount, rate, fee, expiresAt };
  },

  executeConvert(userId: string, fromCurrency: string, toCurrency: string, fromAmount: number): { success: boolean; toAmount?: number; error?: string } {
    const state = loadDemoState();
    const from = getDemoWallet(state, fromCurrency, 'spot');
    if (from.available_balance < fromAmount) return { success: false, error: `Insufficient ${fromCurrency} balance` };
    const quote = this.getQuote(fromCurrency, toCurrency, fromAmount);
    const record: ConvertHistory = {
      id: uid('cnv'), user_id: userId, from_currency: fromCurrency, to_currency: toCurrency,
      from_amount: fromAmount, to_amount: quote.toAmount, rate: quote.rate, fee: quote.fee,
      status: 'completed', created_at: now(),
    };
    updateDemoState(s => {
      getDemoWallet(s, fromCurrency, 'spot').available_balance -= fromAmount;
      getDemoWallet(s, toCurrency, 'spot').available_balance += quote.toAmount;
      s.convertHistory.unshift(record);
    });
    return { success: true, toAmount: quote.toAmount };
  },

  getHistory(userId: string, limit = 50): ConvertHistory[] {
    return loadDemoState().convertHistory.filter(h => h.user_id === userId).slice(0, limit);
  },
};

// ---------------------------------------------------------------------------
// Staking / Earn
// ---------------------------------------------------------------------------

const STAKING_PRODUCTS: StakingProduct[] = [
  { id: 'stk-btc-flex', currency: 'BTC', name: 'BTC Flexible', type: 'flexible', apy: 3.2, min_amount: 0.001, total_pool: 250, is_active: true, created_at: now(), updated_at: now() },
  { id: 'stk-btc-90', currency: 'BTC', name: 'BTC Locked 90 Days', type: 'locked', apy: 5.8, min_amount: 0.005, lock_period_days: 90, total_pool: 120, is_active: true, created_at: now(), updated_at: now() },
  { id: 'stk-eth-flex', currency: 'ETH', name: 'ETH Flexible', type: 'flexible', apy: 4.1, min_amount: 0.01, total_pool: 3200, is_active: true, created_at: now(), updated_at: now() },
  { id: 'stk-eth-180', currency: 'ETH', name: 'ETH Locked 180 Days', type: 'locked', apy: 6.4, min_amount: 0.05, lock_period_days: 180, total_pool: 1500, is_active: true, created_at: now(), updated_at: now() },
  { id: 'stk-usdt-flex', currency: 'USDT', name: 'USDT Flexible', type: 'flexible', apy: 6.5, min_amount: 10, total_pool: 5000000, is_active: true, created_at: now(), updated_at: now() },
  { id: 'stk-usdt-90', currency: 'USDT', name: 'USDT Locked 90 Days', type: 'locked', apy: 9.2, min_amount: 100, lock_period_days: 90, total_pool: 2000000, is_active: true, created_at: now(), updated_at: now() },
  { id: 'stk-sol-flex', currency: 'SOL', name: 'SOL Flexible', type: 'flexible', apy: 7.3, min_amount: 0.1, total_pool: 85000, is_active: true, created_at: now(), updated_at: now() },
  { id: 'stk-bnb-flex', currency: 'BNB', name: 'BNB Flexible', type: 'flexible', apy: 2.8, min_amount: 0.01, total_pool: 42000, is_active: true, created_at: now(), updated_at: now() },
];

function accruedFor(position: StakingPosition, product?: StakingProduct): number {
  if (!product) return position.accrued_interest;
  const days = Math.max((Date.now() - new Date(position.last_interest_date).getTime()) / 86400000, 0);
  // Demo accrual runs at an accelerated-but-plausible rate: real APY on the
  // elapsed time, with a small minimum so a demo session shows earnings.
  return position.accrued_interest + position.amount * (product.apy / 100) * (days / 365);
}

export const DemoStaking = {
  getProducts(): StakingProduct[] { return STAKING_PRODUCTS.filter(p => p.is_active); },
  getProduct(id: string) { return STAKING_PRODUCTS.find(p => p.id === id); },

  getMyPositions(userId: string): StakingPosition[] {
    return loadDemoState().stakingPositions
      .filter(p => p.user_id === userId)
      .map(p => ({ ...p, product: this.getProduct(p.product_id), accrued_interest: accruedFor(p, this.getProduct(p.product_id)) }));
  },

  stake(userId: string, productId: string, amount: number, autoRestake: boolean): { success: boolean; positionId?: string; error?: string } {
    const product = this.getProduct(productId);
    if (!product) return { success: false, error: 'Product not found' };
    if (amount < product.min_amount) return { success: false, error: `Minimum stake is ${product.min_amount} ${product.currency}` };
    if (product.max_amount && amount > product.max_amount) return { success: false, error: `Maximum stake is ${product.max_amount} ${product.currency}` };
    const state = loadDemoState();
    if (getDemoWallet(state, product.currency, 'spot').available_balance < amount) {
      return { success: false, error: `Insufficient ${product.currency} balance` };
    }
    const position: StakingPosition = {
      id: uid('stk'), user_id: userId, product_id: productId, amount, accrued_interest: 0,
      status: 'active', start_date: now(), last_interest_date: now(), auto_restake: autoRestake,
      end_date: product.lock_period_days ? new Date(Date.now() + product.lock_period_days * 86400000).toISOString() : undefined,
      created_at: now(), updated_at: now(),
    };
    updateDemoState(s => {
      getDemoWallet(s, product.currency, 'spot').available_balance -= amount;
      getDemoWallet(s, product.currency, 'earn').available_balance += amount;
      s.stakingPositions.unshift(position);
    });
    return { success: true, positionId: position.id };
  },

  unstake(positionId: string): { success: boolean; error?: string } {
    const state = loadDemoState();
    const pos = state.stakingPositions.find(p => p.id === positionId);
    if (!pos || pos.status !== 'active') return { success: false, error: 'Position not active' };
    const product = this.getProduct(pos.product_id);
    const earned = accruedFor(pos, product);
    updateDemoState(s => {
      const p = s.stakingPositions.find(x => x.id === positionId)!;
      const currency = product?.currency ?? 'USDT';
      getDemoWallet(s, currency, 'earn').available_balance = Math.max(0, getDemoWallet(s, currency, 'earn').available_balance - p.amount);
      const spot = getDemoWallet(s, currency, 'spot');
      spot.available_balance += p.amount + earned;
      p.status = 'withdrawn';
      p.accrued_interest = earned;
      p.updated_at = now();
    });
    return { success: true };
  },

  claimInterest(positionId: string): { success: boolean; amount?: number; error?: string } {
    const state = loadDemoState();
    const pos = state.stakingPositions.find(p => p.id === positionId);
    if (!pos || pos.status !== 'active') return { success: false, error: 'Position not active' };
    const product = this.getProduct(pos.product_id);
    const earned = accruedFor(pos, product);
    if (earned <= 0) return { success: false, error: 'No interest accrued yet' };
    updateDemoState(s => {
      const p = s.stakingPositions.find(x => x.id === positionId)!;
      getDemoWallet(s, product?.currency ?? 'USDT', 'spot').available_balance += earned;
      p.accrued_interest = 0;
      p.last_interest_date = now();
      p.updated_at = now();
    });
    return { success: true, amount: earned };
  },
};

// ---------------------------------------------------------------------------
// Launchpad
// ---------------------------------------------------------------------------

function launchpadProjects(): LaunchpadProject[] {
  const day = 86400000;
  const t = Date.now();
  const base = { payment_currency: 'USDT', created_at: now(), updated_at: now() };
  return [
    { ...base, id: 'lp-kst', name: 'Kopala Solar Token', symbol: 'KST', description: 'Tokenised participation in community solar mini-grids across the Copperbelt. Demo project — not a real offering.', total_tokens: 10000000, price_per_token: 0.25, min_purchase: 10, max_purchase: 5000, tokens_sold: 6400000, status: 'active', start_time: new Date(t - 2 * day).toISOString(), end_time: new Date(t + 3 * day).toISOString(), distribution_time: new Date(t + 5 * day).toISOString() },
    { ...base, id: 'lp-zbc', name: 'ZamBean Coffee Token', symbol: 'ZBC', description: 'Supports smallholder coffee value chains in Northern Province. Demo project — not a real offering.', total_tokens: 5000000, price_per_token: 0.4, min_purchase: 25, max_purchase: 2500, tokens_sold: 0, status: 'upcoming', start_time: new Date(t + 5 * day).toISOString(), end_time: new Date(t + 12 * day).toISOString() },
    { ...base, id: 'lp-lge', name: 'Lusaka Green Energy', symbol: 'LGE', description: 'Urban waste-to-energy pilot participation token. Demo project — not a real offering.', total_tokens: 8000000, price_per_token: 0.15, min_purchase: 10, max_purchase: 10000, tokens_sold: 8000000, status: 'completed', start_time: new Date(t - 20 * day).toISOString(), end_time: new Date(t - 10 * day).toISOString(), distribution_time: new Date(t - 8 * day).toISOString() },
  ];
}

export const DemoLaunchpad = {
  getProjects(status?: 'upcoming' | 'active' | 'completed'): LaunchpadProject[] {
    const all = launchpadProjects();
    return status ? all.filter(p => p.status === status) : all;
  },
  getProject(id: string) { return launchpadProjects().find(p => p.id === id) ?? null; },

  getMySubscriptions(userId: string): LaunchpadSubscription[] {
    return loadDemoState().launchpadSubscriptions
      .filter(s => s.user_id === userId)
      .map(s => ({ ...s, project: this.getProject(s.project_id) ?? undefined }));
  },

  subscribe(userId: string, projectId: string, amount: number): { success: boolean; subscriptionId?: string; error?: string } {
    const project = this.getProject(projectId);
    if (!project) return { success: false, error: 'Project not found' };
    if (project.status !== 'active') return { success: false, error: 'This project is not open for subscription' };
    if (amount < project.min_purchase) return { success: false, error: `Minimum purchase is ${project.min_purchase} ${project.payment_currency}` };
    if (amount > project.max_purchase) return { success: false, error: `Maximum purchase is ${project.max_purchase} ${project.payment_currency}` };
    const state = loadDemoState();
    if (getDemoWallet(state, project.payment_currency, 'spot').available_balance < amount) {
      return { success: false, error: `Insufficient ${project.payment_currency} balance` };
    }
    const sub: LaunchpadSubscription = {
      id: uid('lps'), user_id: userId, project_id: projectId, committed_amount: amount,
      tokens_allocated: amount / project.price_per_token, payment_status: 'paid',
      tokens_claimed: false, created_at: now(), updated_at: now(),
    };
    updateDemoState(s => {
      getDemoWallet(s, project.payment_currency, 'spot').available_balance -= amount;
      s.launchpadSubscriptions.unshift(sub);
    });
    return { success: true, subscriptionId: sub.id };
  },

  claimTokens(subscriptionId: string): { success: boolean; error?: string } {
    const state = loadDemoState();
    const sub = state.launchpadSubscriptions.find(s => s.id === subscriptionId);
    if (!sub) return { success: false, error: 'Subscription not found' };
    if (sub.tokens_claimed) return { success: false, error: 'Tokens already claimed' };
    const project = this.getProject(sub.project_id);
    if (!project || project.status !== 'completed') return { success: false, error: 'Tokens are not available for claim yet' };
    updateDemoState(s => {
      const x = s.launchpadSubscriptions.find(y => y.id === subscriptionId)!;
      x.tokens_claimed = true;
      x.updated_at = now();
      getDemoWallet(s, project.symbol, 'spot').available_balance += x.tokens_allocated;
    });
    return { success: true };
  },
};

// ---------------------------------------------------------------------------
// Crypto wallets
// ---------------------------------------------------------------------------

export const DemoWallets = {
  getWallets(userId: string): CryptoWallet[] {
    return loadDemoState().cryptoWallets.filter(w => w.user_id === userId);
  },
  getWalletsByType(userId: string, type: WalletType): CryptoWallet[] {
    return this.getWallets(userId).filter(w => w.wallet_type === type);
  },
  getOrCreateWallet(userId: string, currency: string, type: WalletType): CryptoWallet {
    const state = loadDemoState();
    const existing = state.cryptoWallets.find(w => w.user_id === userId && w.currency === currency && w.wallet_type === type);
    if (existing) return existing;
    let created!: CryptoWallet;
    updateDemoState(s => { created = getDemoWallet(s, currency, type); });
    return created;
  },
  transferBetweenWallets(userId: string, req: WalletTransferRequest): { success: boolean; error?: string } {
    if (req.amount <= 0) return { success: false, error: 'Amount must be positive' };
    const state = loadDemoState();
    const from = getDemoWallet(state, req.currency, req.fromWallet);
    if (from.available_balance < req.amount) return { success: false, error: 'Insufficient balance' };
    updateDemoState(s => {
      getDemoWallet(s, req.currency, req.fromWallet).available_balance -= req.amount;
      getDemoWallet(s, req.currency, req.toWallet).available_balance += req.amount;
    });
    return { success: true };
  },
  depositToWallet(userId: string, currency: string, type: WalletType, amount: number): { success: boolean; error?: string } {
    updateDemoState(s => { getDemoWallet(s, currency, type).available_balance += amount; });
    return { success: true };
  },
  getTotalBalance(userId: string, currency: string): number {
    return this.getWallets(userId).filter(w => w.currency === currency)
      .reduce((sum, w) => sum + w.available_balance + w.locked_balance, 0);
  },
  getOverviewBalances(userId: string): Record<string, { spot: number; funding: number; earn: number; total: number }> {
    const result: Record<string, { spot: number; funding: number; earn: number; total: number }> = {};
    this.getWallets(userId).forEach(w => {
      if (!result[w.currency]) result[w.currency] = { spot: 0, funding: 0, earn: 0, total: 0 };
      const bal = w.available_balance + w.locked_balance;
      result[w.currency][w.wallet_type] = bal;
      result[w.currency].total += bal;
    });
    return result;
  },
};

// ---------------------------------------------------------------------------
// Fee tiers
// ---------------------------------------------------------------------------

const FEE_TIERS: FeeTier[] = [
  { id: 'tier-0', tier_name: 'Regular', tier_level: 0, min_30d_volume: 0, maker_fee: 0.001, taker_fee: 0.001, withdrawal_limit_daily: 50000, api_rate_limit: 1200 },
  { id: 'tier-1', tier_name: 'VIP 1', tier_level: 1, min_30d_volume: 100000, maker_fee: 0.0009, taker_fee: 0.0009, withdrawal_limit_daily: 250000, api_rate_limit: 2400 },
  { id: 'tier-2', tier_name: 'VIP 2', tier_level: 2, min_30d_volume: 500000, maker_fee: 0.0008, taker_fee: 0.0008, withdrawal_limit_daily: 1000000, api_rate_limit: 4800 },
];

export const DemoFees = {
  getFeeTiers(): FeeTier[] { return FEE_TIERS; },
  getUserVolume(userId: string): UserVolume {
    const orders = loadDemoState().spotOrders.filter(o => o.user_id === userId && o.status === 'filled');
    const volume = orders.reduce((sum, o) => sum + o.quantity * (o.average_fill_price ?? o.price ?? 0), 0);
    const tier = [...FEE_TIERS].reverse().find(t => volume >= t.min_30d_volume) ?? FEE_TIERS[0];
    return { volume_30d: volume, volume_all_time: volume, trades_count_30d: orders.length, current_tier: tier };
  },
};

// ---------------------------------------------------------------------------
// P2P
// ---------------------------------------------------------------------------

export const DemoP2P = {
  // NOTE: getters return snapshot copies, never live store references.
  // Returning the store's own objects let in-place mutations (e.g. the demo
  // counterparty marking an order paid via updateDemoState) silently mutate
  // React Query's cached data too — structural sharing then saw "no change"
  // on every poll/refetch and the UI never re-rendered in place.
  getAdvertisements(type?: 'buy' | 'sell', cryptoCurrency?: string, fiatCurrency?: string): P2PAdvertisement[] {
    return loadDemoState().p2pAds
      .filter(a => a.is_active && a.available_amount > 0)
      .filter(a => !type || a.type === type)
      .filter(a => !cryptoCurrency || a.crypto_currency === cryptoCurrency)
      .filter(a => !fiatCurrency || a.fiat_currency === fiatCurrency)
      .sort((a, b) => type === 'sell' ? b.price - a.price : a.price - b.price)
      .map(a => ({ ...a, payment_methods: [...a.payment_methods] }));
  },

  getMyAdvertisements(userId: string): P2PAdvertisement[] {
    return loadDemoState().p2pAds.filter(a => a.user_id === userId)
      .map(a => ({ ...a, payment_methods: [...a.payment_methods] }));
  },

  createAdvertisement(userId: string, req: CreateAdRequest): { success: boolean; id?: string; error?: string } {
    if (!req.price || req.price <= 0) return { success: false, error: 'Price must be positive' };
    const ad: P2PAdvertisement = {
      id: uid('pad'), user_id: userId, ...req, is_active: true,
      completion_rate: 100, avg_release_time: 10, created_at: now(), updated_at: now(),
      profile: { username: 'You', avatar_url: null },
    };
    updateDemoState(s => { s.p2pAds.unshift(ad); });
    return { success: true, id: ad.id };
  },

  updateAdvertisement(adId: string, updates: Partial<CreateAdRequest>): { success: boolean; error?: string } {
    updateDemoState(s => {
      const ad = s.p2pAds.find(a => a.id === adId);
      if (ad) Object.assign(ad, updates, { updated_at: now() });
    });
    return { success: true };
  },

  createOrder(advertisementId: string, buyerId: string, sellerId: string, cryptoAmount: number, fiatAmount: number, price: number, paymentMethod: string, cryptoCurrency: string, fiatCurrency: string): { success: boolean; orderId?: string; error?: string } {
    const state = loadDemoState();
    const ad = state.p2pAds.find(a => a.id === advertisementId);
    if (!ad || !ad.is_active) return { success: false, error: 'Advertisement is no longer active' };
    if (fiatAmount < ad.min_amount || fiatAmount > ad.max_amount) {
      return { success: false, error: `Amount must be between ${ad.min_amount} and ${ad.max_amount} ${fiatCurrency}` };
    }
    if (cryptoAmount > ad.available_amount) return { success: false, error: 'Amount exceeds the available liquidity' };

    const userIsSeller = sellerId === DEMO_USER_ID;
    if (userIsSeller) {
      // Escrow: lock the seller's crypto up front.
      const w = getDemoWallet(state, cryptoCurrency, 'spot');
      if (w.available_balance < cryptoAmount) return { success: false, error: `Insufficient ${cryptoCurrency} balance to sell` };
    }

    const expiresAt = new Date(Date.now() + 15 * 60000);
    const order: P2POrder = {
      id: uid('p2p'), advertisement_id: advertisementId, buyer_id: buyerId, seller_id: sellerId,
      crypto_currency: cryptoCurrency, fiat_currency: fiatCurrency, crypto_amount: cryptoAmount,
      fiat_amount: fiatAmount, price, payment_method: paymentMethod,
      status: 'in_progress', payment_status: 'pending', escrow_released: false,
      buyer_confirmed_payment: false, seller_confirmed_receipt: false, chat_enabled: true,
      expires_at: expiresAt.toISOString(), created_at: now(), updated_at: now(),
    };
    updateDemoState(s => {
      if (userIsSeller) {
        const w = getDemoWallet(s, cryptoCurrency, 'spot');
        w.available_balance -= cryptoAmount;
        w.locked_balance += cryptoAmount;
      }
      s.p2pOrders.unshift(order);
    });

    if (!userIsSeller) {
      // Demo merchant counterparty: nothing to automate until the buyer pays;
      // release is simulated in confirmPayment below.
    } else {
      // Demo merchant buyer pays shortly after the order opens.
      setTimeout(() => {
        updateDemoState(s => {
          const o = s.p2pOrders.find(x => x.id === order.id);
          if (o && o.status === 'in_progress' && o.payment_status === 'pending') {
            o.buyer_confirmed_payment = true;
            o.payment_status = 'paid';
            o.updated_at = now();
          }
        });
      }, 6000);
    }
    return { success: true, orderId: order.id };
  },

  getMyOrders(userId: string): P2POrder[] {
    return loadDemoState().p2pOrders.filter(o => o.buyer_id === userId || o.seller_id === userId)
      .map(o => ({ ...o }));
  },

  getOrder(orderId: string): P2POrder | null {
    const o = loadDemoState().p2pOrders.find(x => x.id === orderId);
    return o ? { ...o } : null;
  },

  confirmPayment(orderId: string): { success: boolean; error?: string } {
    const order = this.getOrder(orderId);
    if (!order) return { success: false, error: 'Order not found' };
    updateDemoState(s => {
      const o = s.p2pOrders.find(x => x.id === orderId)!;
      o.buyer_confirmed_payment = true;
      o.payment_status = 'paid';
      o.status = 'in_progress';
      o.updated_at = now();
    });
    // Demo merchant seller releases escrow shortly after payment is marked.
    if (order.buyer_id === DEMO_USER_ID) {
      setTimeout(() => { this.releaseEscrow(orderId); }, 5000);
    }
    return { success: true };
  },

  releaseEscrow(orderId: string): { success: boolean; error?: string } {
    const order = this.getOrder(orderId);
    if (!order || order.status === 'completed' || order.status === 'cancelled') {
      return { success: false, error: 'Order cannot be released' };
    }
    updateDemoState(s => {
      const o = s.p2pOrders.find(x => x.id === orderId)!;
      const ad = s.p2pAds.find(a => a.id === o.advertisement_id);
      if (ad) ad.available_amount = Math.max(0, ad.available_amount - o.crypto_amount);
      if (o.seller_id === DEMO_USER_ID) {
        // User sold: escrowed crypto leaves the locked balance for good.
        const w = getDemoWallet(s, o.crypto_currency, 'spot');
        w.locked_balance = Math.max(0, w.locked_balance - o.crypto_amount);
      }
      if (o.buyer_id === DEMO_USER_ID) {
        // User bought: crypto lands in the spot wallet.
        getDemoWallet(s, o.crypto_currency, 'spot').available_balance += o.crypto_amount;
      }
      o.seller_confirmed_receipt = true;
      o.escrow_released = true;
      o.payment_status = 'released';
      o.status = 'completed';
      o.completed_at = now();
      o.updated_at = now();
    });
    return { success: true };
  },

  cancelOrder(orderId: string): { success: boolean; error?: string } {
    updateDemoState(s => {
      const o = s.p2pOrders.find(x => x.id === orderId);
      if (!o || o.status === 'completed') return;
      if (o.seller_id === DEMO_USER_ID && !o.escrow_released) {
        const w = getDemoWallet(s, o.crypto_currency, 'spot');
        w.locked_balance = Math.max(0, w.locked_balance - o.crypto_amount);
        w.available_balance += o.crypto_amount;
      }
      o.status = 'cancelled';
      o.updated_at = now();
    });
    return { success: true };
  },

  openDispute(orderId: string, reason: string): { success: boolean; error?: string } {
    updateDemoState(s => {
      const o = s.p2pOrders.find(x => x.id === orderId);
      if (o) { o.status = 'disputed'; o.dispute_reason = reason; o.updated_at = now(); }
    });
    return { success: true };
  },

  getMessages(orderId: string): P2PMessage[] {
    return loadDemoState().p2pMessages.filter(m => m.order_id === orderId).map(m => ({ ...m }));
  },

  sendMessage(orderId: string, senderId: string, message: string, attachmentUrl?: string): { success: boolean; error?: string } {
    updateDemoState(s => {
      s.p2pMessages.push({
        id: uid('msg'), order_id: orderId, sender_id: senderId, message,
        attachment_url: attachmentUrl, is_read: false, created_at: now(),
      });
    });
    return { success: true };
  },
};
