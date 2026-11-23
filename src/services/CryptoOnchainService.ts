import { supabase } from "@/integrations/supabase/client";
import { isDemoSync } from "@/services/demo/DemoBackend";
import { loadDemoState, updateDemoState } from "@/services/demo/demoStore";

// --- Demo-mode on-chain wallet ------------------------------------------------
// Deterministic demo deposit addresses + withdrawals against the demo spot
// wallets. Real on-chain operation needs the `crypto-wallet` edge function
// on the connected backend (see FEATURE-STATUS.md).
function demoAddress(currency: string, network: string): string {
  let h = 0;
  const seed = `palmtrader-demo-${currency}-${network}`;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hex = (n: number) => Array.from({ length: n }, (_, i) => "0123456789abcdef"[(h >> (i % 8)) & 15]).join("");
  switch (network) {
    case "BITCOIN": return `bc1qdemo${hex(30)}`;
    case "ETHEREUM": case "ERC20": case "BSC": case "BEP20": return `0x${hex(40)}`;
    case "SOLANA": return `Demo${hex(38)}`;
    case "TRC20": return `TDemo${hex(28)}`;
    default: return `demo-${currency.toLowerCase()}-${hex(24)}`;
  }
}

const WITHDRAWALS_KEY = "palmtrader:demo-withdrawals:v1";
function loadWithdrawals(): CryptoWithdrawal[] {
  try { return JSON.parse(localStorage.getItem(WITHDRAWALS_KEY) || "[]"); } catch { return []; }
}
function saveWithdrawal(w: CryptoWithdrawal) {
  try { localStorage.setItem(WITHDRAWALS_KEY, JSON.stringify([w, ...loadWithdrawals()])); } catch { /* ignore */ }
}


export type CryptoNetwork =
  | "BITCOIN"
  | "ETHEREUM"
  | "ERC20"
  | "BSC"
  | "BEP20"
  | "TRC20"
  | "SOLANA";

export interface CryptoAddress {
  currency: string;
  network: string;
  address: string;
  derivation_path: string;
}

export interface CryptoBalance {
  address: string;
  balance: string;
  decimals: number;
}

export interface CryptoWithdrawal {
  id: string;
  currency: string;
  network: string;
  to_address: string;
  amount: string;
  status: string;
  tx_hash?: string;
  requested_at: string;
}

async function call(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("crypto-wallet", {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message);
  if (data?.error) {
    throw new Error(typeof data.error === "string" ? data.error : "Wallet error");
  }
  return data;
}

export const CryptoOnchainService = {
  async generateAddress(currency: string, network: CryptoNetwork) {
    if (isDemoSync()) {
      return { success: true as const, address: demoAddress(currency, network), derivation_path: "m/84'/0'/0'/0/0" };
    }
    return call("generate_address", { currency, network }) as Promise<{
      success: true;
      address: string;
      derivation_path: string;
    }>;
  },

  async getBalance(currency: string, network: CryptoNetwork) {
    if (isDemoSync()) {
      const w = loadDemoState().cryptoWallets.find(x => x.currency === currency && x.wallet_type === "spot");
      const bal = w ? w.available_balance + w.locked_balance : 0;
      return { success: true as const, address: demoAddress(currency, network), balance: String(bal), decimals: 8 };
    }
    return call("get_balance", { currency, network }) as Promise<
      { success: true } & CryptoBalance
    >;
  },

  async listAddresses(): Promise<CryptoAddress[]> {
    if (isDemoSync()) return [];
    const r = await call("list_addresses");
    return r.addresses ?? [];
  },

  async requestWithdrawal(
    currency: string,
    network: CryptoNetwork,
    to_address: string,
    amount: string,
  ) {
    if (isDemoSync()) {
      const amt = parseFloat(amount);
      if (!amt || amt <= 0) throw new Error("Enter a valid amount");
      const w = loadDemoState().cryptoWallets.find(x => x.currency === currency && x.wallet_type === "spot");
      if (!w || w.available_balance < amt) throw new Error(`Insufficient ${currency} balance for this withdrawal`);
      updateDemoState(s => {
        const wallet = s.cryptoWallets.find(x => x.currency === currency && x.wallet_type === "spot");
        if (wallet) wallet.available_balance -= amt;
      });
      const withdrawal: CryptoWithdrawal = {
        id: `wd-${Date.now().toString(36)}`, currency, network,
        to_address, amount, status: "pending_review", requested_at: new Date().toISOString(),
      };
      saveWithdrawal(withdrawal);
      return { success: true as const, withdrawal };
    }
    return call("request_withdrawal", {
      currency,
      network,
      to_address,
      amount,
    }) as Promise<{ success: true; withdrawal: CryptoWithdrawal }>;
  },

  async listDeposits() {
    if (isDemoSync()) return [];
    const r = await call("list_deposits");
    return r.deposits ?? [];
  },

  async listWithdrawals(): Promise<CryptoWithdrawal[]> {
    if (isDemoSync()) return loadWithdrawals();
    const r = await call("list_withdrawals");
    return r.withdrawals ?? [];
  },
};
