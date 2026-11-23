/**
 * DemoStore — the local, persistent state behind PalmTrader Horizon's demo mode.
 *
 * One JSON document in localStorage holds every demo collection (wallets,
 * orders, positions, ads, subscriptions…). All demo service implementations
 * read and write through here, which is what keeps balances consistent across
 * Spot / Futures / Convert / Earn / Launchpad / P2P / Portfolio: they all move
 * the same wallets.
 *
 * When the real Supabase backend is connected (DemoBackend reports a live
 * session), none of this is used.
 */
import type { CryptoWallet, WalletType } from '@/services/CryptoWalletService';
import type { SpotOrder } from '@/services/SpotTradingService';
import type { FuturesPosition } from '@/services/FuturesService';
import type { P2PAdvertisement, P2POrder, P2PMessage } from '@/services/P2PService';
import type { ConvertHistory } from '@/services/ConvertService';
import type { StakingPosition } from '@/services/StakingService';
import type { LaunchpadSubscription } from '@/services/LaunchpadService';
import type { TradingAccount } from '@/services/TradingAccountService';
import type { Order as StockOrder } from '@/hooks/useOrders';

export const DEMO_USER_ID = 'demo-user';
export const DEMO_EVENT = 'palmtrader:demo-updated';

export interface StockPosition {
  symbol: string;
  name: string;
  currency: 'USD' | 'ZMW';
  quantity: number;
  averagePrice: number;
}

export interface DemoPriceAlert {
  id: string;
  user_id: string;
  symbol: string;
  target_price: number;
  condition: 'above' | 'below';
  is_active: boolean;
  is_triggered: boolean;
  created_at: string;
}

export interface DemoOptionsTrade {
  id: string;
  user_id: string;
  symbol: string;
  option_type: 'call' | 'put';
  strike_price: number;
  expiration_date: string;
  premium: number;
  quantity: number;
  side: 'buy' | 'sell';
  status: 'open' | 'closed' | 'exercised' | 'expired';
  created_at: string;
}

export interface DemoIpoApplication {
  id: string;
  user_id: string;
  ipo_id: string;
  shares_requested: number;
  amount: number;
  status: 'pending' | 'allocated' | 'rejected';
  created_at: string;
}

export interface DemoState {
  version: number;
  cryptoWallets: CryptoWallet[];
  spotOrders: SpotOrder[];
  futuresPositions: FuturesPosition[];
  p2pAds: P2PAdvertisement[];
  p2pOrders: P2POrder[];
  p2pMessages: P2PMessage[];
  convertHistory: ConvertHistory[];
  stakingPositions: StakingPosition[];
  launchpadSubscriptions: LaunchpadSubscription[];
  tradingAccounts: TradingAccount[];
  stockCash: { USD: number; ZMW: number };
  stockPositions: StockPosition[];
  stockOrders: StockOrder[];
  watchlist: string[];
  priceAlerts: DemoPriceAlert[];
  optionsTrades: DemoOptionsTrade[];
  ipoApplications: DemoIpoApplication[];
  followedTraders: string[];
}

const STORAGE_KEY = 'palmtrader:demo-state:v1';
const now = () => new Date().toISOString();
export const uid = (prefix = 'demo') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

function wallet(currency: string, type: WalletType, available: number, locked = 0): CryptoWallet {
  return {
    id: uid('wal'), user_id: DEMO_USER_ID, currency, wallet_type: type,
    available_balance: available, locked_balance: locked, created_at: now(), updated_at: now(),
  };
}

function seedState(): DemoState {
  const t = now();
  return {
    version: 1,
    cryptoWallets: [
      wallet('USDT', 'spot', 25000),
      wallet('BTC', 'spot', 0.35),
      wallet('ETH', 'spot', 2.5),
      wallet('BNB', 'spot', 4),
      wallet('SOL', 'spot', 25),
      wallet('ZMW', 'spot', 15000),
      wallet('USD', 'funding', 1000),
      wallet('ZMW', 'funding', 50000),
      wallet('USDT', 'funding', 2500),
      wallet('USDT', 'earn', 0),
      wallet('BTC', 'earn', 0),
      wallet('ETH', 'earn', 0),
    ],
    spotOrders: [],
    futuresPositions: [],
    p2pAds: [
      { id: 'pad-1', user_id: 'merchant-kabwe', type: 'sell', crypto_currency: 'USDT', fiat_currency: 'ZMW', price: 25.85, min_amount: 100, max_amount: 25000, available_amount: 8500, payment_methods: ['MTN MoMo', 'Airtel Money'], terms: 'Payment within 15 minutes. Release after confirmation.', is_active: true, completion_rate: 98.6, avg_release_time: 8, created_at: t, updated_at: t, profile: { username: 'KabweTrader', avatar_url: null } },
      { id: 'pad-2', user_id: 'merchant-lsk', type: 'sell', crypto_currency: 'USDT', fiat_currency: 'ZMW', price: 25.92, min_amount: 250, max_amount: 50000, available_amount: 22000, payment_methods: ['Zanaco Bank', 'MTN MoMo'], is_active: true, completion_rate: 99.4, avg_release_time: 5, created_at: t, updated_at: t, profile: { username: 'LusakaExchange', avatar_url: null } },
      { id: 'pad-3', user_id: 'merchant-ndola', type: 'sell', crypto_currency: 'BTC', fiat_currency: 'ZMW', price: 2512400, min_amount: 500, max_amount: 100000, available_amount: 0.42, payment_methods: ['Airtel Money', 'FNB Bank'], is_active: true, completion_rate: 97.9, avg_release_time: 12, created_at: t, updated_at: t, profile: { username: 'CopperbeltCrypto', avatar_url: null } },
      { id: 'pad-4', user_id: 'merchant-sol', type: 'buy', crypto_currency: 'USDT', fiat_currency: 'ZMW', price: 25.30, min_amount: 100, max_amount: 20000, available_amount: 12000, payment_methods: ['MTN MoMo'], is_active: true, completion_rate: 99.1, avg_release_time: 6, created_at: t, updated_at: t, profile: { username: 'SolweziBuys', avatar_url: null } },
      { id: 'pad-5', user_id: 'merchant-kitwe', type: 'buy', crypto_currency: 'ETH', fiat_currency: 'ZMW', price: 85500, min_amount: 500, max_amount: 60000, available_amount: 4.5, payment_methods: ['Airtel Money', 'Zanaco Bank'], is_active: true, completion_rate: 96.8, avg_release_time: 15, created_at: t, updated_at: t, profile: { username: 'KitweDigital', avatar_url: null } },
    ],
    p2pOrders: [],
    p2pMessages: [],
    convertHistory: [],
    stakingPositions: [],
    launchpadSubscriptions: [],
    tradingAccounts: [{
      id: 'demo-account-1', user_id: DEMO_USER_ID, account_number: 'PT-DEMO-100001',
      account_type: 'demo', account_name: 'Demo Account', currency: 'USD',
      balance: 100000, available_balance: 100000, reserved_balance: 0,
      leverage: 1, max_leverage: 1, min_deposit: 0, commission_per_lot: 0,
      spread_type: 'variable', min_spread: 0, margin_call_level: 50, stop_out_level: 20,
      is_active: true, is_verified: true, trading_disabled: false, trading_disabled_reason: null,
      sec_zambia_compliant: false, created_at: t, updated_at: t,
    }],
    stockCash: { USD: 100000, ZMW: 250000 },
    stockPositions: [
      { symbol: 'AAPL', name: 'Apple Inc.', currency: 'USD', quantity: 12, averagePrice: 196.40 },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', currency: 'USD', quantity: 20, averagePrice: 141.25 },
      { symbol: 'ZCCM', name: 'ZCCM Investment Holdings Plc', currency: 'ZMW', quantity: 500, averagePrice: 51.80 },
      { symbol: 'ZANACO', name: 'Zambia National Commercial Bank Plc', currency: 'ZMW', quantity: 4000, averagePrice: 4.62 },
    ],
    stockOrders: [],
    watchlist: ['AAPL', 'TSLA', 'NVDA', 'ZCCM', 'ATEL', 'BTC-USDT'],
    priceAlerts: [],
    optionsTrades: [],
    ipoApplications: [],
    followedTraders: [],
  };
}

let cache: DemoState | null = null;

export function loadDemoState(): DemoState {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed && parsed.version === 1) { cache = parsed; return cache; }
    }
  } catch { /* corrupted storage → reseed */ }
  cache = seedState();
  persist();
  return cache;
}

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cache)); } catch { /* storage full/blocked */ }
}

/** Mutate demo state, persist it, and notify subscribers / React Query. */
export function updateDemoState(mutator: (state: DemoState) => void): DemoState {
  const state = loadDemoState();
  mutator(state);
  persist();
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(DEMO_EVENT));
  return state;
}

export function subscribeDemoState(fn: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(DEMO_EVENT, fn);
  return () => window.removeEventListener(DEMO_EVENT, fn);
}

export function resetDemoState() {
  cache = seedState();
  persist();
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(DEMO_EVENT));
}

// ---------------------------------------------------------------------------
// Wallet helpers — the shared ledger every demo feature moves.
// ---------------------------------------------------------------------------

export function getDemoWallet(state: DemoState, currency: string, type: WalletType): CryptoWallet {
  let w = state.cryptoWallets.find(x => x.currency === currency && x.wallet_type === type);
  if (!w) {
    w = wallet(currency, type, 0);
    state.cryptoWallets.push(w);
  }
  return w;
}

export function walletBalance(currency: string, type: WalletType = 'spot'): { available: number; locked: number } {
  const w = getDemoWallet(loadDemoState(), currency, type);
  return { available: w.available_balance, locked: w.locked_balance };
}

/** Move available balance; returns false (no change) when insufficient. */
export function debitWallet(currency: string, type: WalletType, amount: number): boolean {
  const state = loadDemoState();
  const w = getDemoWallet(state, currency, type);
  if (w.available_balance < amount - 1e-9) return false;
  updateDemoState(s => {
    const ww = getDemoWallet(s, currency, type);
    ww.available_balance -= amount;
    ww.updated_at = now();
  });
  return true;
}

export function creditWallet(currency: string, type: WalletType, amount: number): void {
  updateDemoState(s => {
    const w = getDemoWallet(s, currency, type);
    w.available_balance += amount;
    w.updated_at = now();
  });
}
