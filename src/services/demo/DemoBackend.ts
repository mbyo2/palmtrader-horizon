/**
 * DemoBackend — the single switch that decides where PalmTrader Horizon's
 * service layer reads and writes.
 *
 * - A live Supabase session exists  → services use Supabase exactly as before.
 * - No session (or an explicit override) → services use the local demo layer
 *   (`demoStore` + `demoMarket`), so the whole frontend works end-to-end
 *   before the production Supabase credentials are supplied.
 *
 * Override for development: localStorage `palmtrader:backend` = 'demo' | 'supabase'.
 * When the CEO's Supabase project is connected, signed-in users automatically
 * take the Supabase path; this file is the only place that decision lives.
 */
import { supabase } from '@/integrations/supabase/client';
import { DEMO_USER_ID } from './demoStore';

export { DEMO_USER_ID };

const OVERRIDE_KEY = 'palmtrader:backend';

let hasSession = false;
let sessionChecked = false;
let sessionPromise: Promise<boolean> | null = null;

function override(): 'demo' | 'supabase' | null {
  try {
    const v = localStorage.getItem(OVERRIDE_KEY);
    return v === 'demo' || v === 'supabase' ? v : null;
  } catch {
    return null;
  }
}

/** Called by the auth provider whenever the Supabase session changes. */
export function setDemoSessionState(sessionExists: boolean) {
  hasSession = sessionExists;
  sessionChecked = true;
}

/** Synchronous best-known answer (defaults to demo until a session is proven). */
export function isDemoSync(): boolean {
  const o = override();
  if (o) return o === 'demo';
  return !hasSession;
}

/** Authoritative async check used by the service layer. */
export async function isDemo(): Promise<boolean> {
  const o = override();
  if (o) return o === 'demo';
  if (sessionChecked) return !hasSession;
  if (!sessionPromise) {
    sessionPromise = supabase.auth.getSession()
      .then(({ data }) => {
        hasSession = !!data.session;
        sessionChecked = true;
        return !hasSession;
      })
      .catch(() => true);
  }
  return sessionPromise;
}

/** The user id services should act on: real user when signed in, demo user otherwise. */
export async function getEffectiveUserId(): Promise<string> {
  if (await isDemo()) return DEMO_USER_ID;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? DEMO_USER_ID;
}

/** Minimal Supabase-User-shaped object used for the demo session in useAuth. */
export function buildDemoUser() {
  return {
    id: DEMO_USER_ID,
    email: 'demo@palmtrader.local',
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: { provider: 'demo' },
    user_metadata: { first_name: 'Demo', last_name: 'Trader', full_name: 'Demo Trader' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
