import { supabase } from "@/integrations/supabase/client";

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
    return call("generate_address", { currency, network }) as Promise<{
      success: true;
      address: string;
      derivation_path: string;
    }>;
  },

  async getBalance(currency: string, network: CryptoNetwork) {
    return call("get_balance", { currency, network }) as Promise<
      { success: true } & CryptoBalance
    >;
  },

  async listAddresses(): Promise<CryptoAddress[]> {
    const r = await call("list_addresses");
    return r.addresses ?? [];
  },

  async requestWithdrawal(
    currency: string,
    network: CryptoNetwork,
    to_address: string,
    amount: string,
  ) {
    return call("request_withdrawal", {
      currency,
      network,
      to_address,
      amount,
    }) as Promise<{ success: true; withdrawal: CryptoWithdrawal }>;
  },

  async listDeposits() {
    const r = await call("list_deposits");
    return r.deposits ?? [];
  },

  async listWithdrawals(): Promise<CryptoWithdrawal[]> {
    const r = await call("list_withdrawals");
    return r.withdrawals ?? [];
  },
};
