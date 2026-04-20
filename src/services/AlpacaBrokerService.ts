import { supabase } from "@/integrations/supabase/client";

export interface AlpacaOnboardingPayload {
  contact: {
    email_address: string;
    phone_number: string;
    street_address: string[];
    city: string;
    state?: string;
    postal_code: string;
    country: string;
  };
  identity: {
    given_name: string;
    family_name: string;
    date_of_birth: string; // YYYY-MM-DD
    tax_id: string;
    tax_id_type: string; // e.g. "USA_SSN" or "NOT_SPECIFIED"
    country_of_citizenship: string;
    country_of_birth: string;
    country_of_tax_residence: string;
    funding_source: string[]; // e.g. ["employment_income"]
  };
  disclosures: {
    is_control_person: boolean;
    is_affiliated_exchange_or_finra: boolean;
    is_politically_exposed: boolean;
    immediate_family_exposed: boolean;
  };
  agreements: Array<{
    agreement: string; // e.g. "margin_agreement", "account_agreement", "customer_agreement"
    signed_at: string; // ISO
    ip_address: string;
  }>;
}

export interface AlpacaPlaceOrderInput {
  symbol: string;
  qty: number;
  side: "buy" | "sell";
  type?: "market" | "limit" | "stop" | "stop_limit";
  time_in_force?: "day" | "gtc" | "ioc" | "fok";
  limit_price?: number;
  stop_price?: number;
}

async function call<T = unknown>(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("alpaca-broker", {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message);
  if (data && (data as { error?: string }).error) {
    throw new Error((data as { error: string }).error);
  }
  return data as T;
}

export const AlpacaBrokerService = {
  createAccount: (payload: AlpacaOnboardingPayload) => call("create_account", payload as unknown as Record<string, unknown>),
  getAccount: () => call<{ ok: boolean; linked: boolean; account?: any }>("get_account"),
  getPositions: () => call<{ ok: boolean; linked: boolean; positions: any[] }>("get_positions"),
  getOrders: (status: "all" | "open" | "closed" = "all", limit = 50) =>
    call<{ ok: boolean; linked: boolean; orders: any[] }>("get_orders", { status, limit }),
  placeOrder: (input: AlpacaPlaceOrderInput) => call<{ ok: boolean; order: any }>("place_order", input as unknown as Record<string, unknown>),
  cancelOrder: (order_id: string) => call("cancel_order", { order_id }),
  getQuote: (symbol: string) => call<{ ok: boolean; quote: any }>("get_quote", { symbol }),
  createAchRelationship: (payload: {
    account_owner_name: string;
    bank_account_type: "CHECKING" | "SAVINGS";
    bank_account_number: string;
    bank_routing_number: string;
  }) => call("create_ach_relationship", payload),
  createTransfer: (payload: { relationship_id: string; amount: number; direction?: "INCOMING" | "OUTGOING" }) =>
    call("create_transfer", payload),
};
