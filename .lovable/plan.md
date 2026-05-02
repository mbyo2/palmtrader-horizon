
# Palm Cacia – Full Production Release Plan

Goal: Get Palm Cacia ready to ship to the world with (1) all user roles & workflows verified end-to-end, (2) a free/open-source cryptocurrency wallet stack replacing any paid dependency, and (3) hardened compliance, security, and observability.

---

## 1. Open-Source Crypto Wallet Stack

Replace any paid/closed wallet provider with free, self-hostable, open-source tooling.

**Chosen stack (all free + OSS):**
- **Wallet generation & signing:** `bitcoinjs-lib` (BTC), `ethers v6` (ETH/EVM/USDT-ERC20/BNB Smart Chain), `@solana/web3.js` (SOL), `tronweb` (TRX/USDT-TRC20). MIT/Apache licensed.
- **Address derivation:** BIP39 + BIP32 HD wallets (`bip39`, `bip32`) — one master seed per user, encrypted at rest with AES-256-GCM (key from `WALLET_MASTER_KEY` secret).
- **Public chain data (free tiers, no paid keys):**
  - BTC: `blockstream.info` public REST API
  - ETH/EVM: public RPC (`https://eth.llamarpc.com`, `https://rpc.ankr.com/eth`) + Etherscan free tier (optional)
  - SOL: `https://api.mainnet-beta.solana.com`
  - TRX: `https://api.trongrid.io`
- **Price feeds:** CoinGecko free public API (already partially used) as fallback to existing Alpaca/Finnhub.

**New edge function:** `crypto-wallet`
- Actions: `generate_address`, `get_balance`, `get_deposits`, `broadcast_withdrawal`, `estimate_fee`.
- All private keys derived per-request from encrypted seed in DB; never logged, never returned to client.

**New tables (migration):**
- `crypto_wallet_seeds` (user_id, encrypted_seed, salt, iv) — RLS: user-only select via SECURITY DEFINER function only; service role for edge function.
- `crypto_addresses` (user_id, currency, network, address, derivation_path, created_at) — user can read own.
- `crypto_deposits` (user_id, currency, tx_hash, amount, confirmations, status, credited_at).
- `crypto_withdrawals` (user_id, currency, to_address, amount, fee, tx_hash, status, requested_at).

**Frontend:** Extend existing `CryptoWalletService` + Exchange page with a "Deposit" tab (shows address + QR via `qrcode` npm) and "Withdraw" tab (address + amount + 2FA confirm). Reuses `WithdrawalWhitelistService`.

---

## 2. Role-Based Workflow Coverage

Roles in system: `admin`, `moderator`, `premium`, `user` (+ account_status: pending/active/restricted/suspended, kyc_status).

**Workflows to verify per role:**

| Workflow | user | premium | moderator | admin |
|---|---|---|---|---|
| Sign up + auto profile/wallet init | ✓ | ✓ | ✓ | ✓ |
| KYC (Didit) submit + approval gating | ✓ | ✓ | ✓ | ✓ |
| Demo trading ($100k reset) | ✓ | ✓ | ✓ | ✓ |
| Live spot/forex/crypto trade (Alpaca sandbox) | KYC-gated | ✓ | ✓ | ✓ |
| Futures (125x), Options | premium-gated | ✓ | ✓ | ✓ |
| Deposit (MTN/Airtel/Zamtel/Zanaco) | ✓ | ✓ | ✓ | ✓ |
| Withdraw (with 2FA + whitelist) | ✓ | ✓ | ✓ | ✓ |
| Crypto deposit/withdraw (new OSS stack) | ✓ | ✓ | ✓ | ✓ |
| Price alerts, watchlist, copy trading | ✓ | ✓ | ✓ | ✓ |
| Compliance alerts review | – | – | ✓ | ✓ |
| User mgmt, role assignment, KYC override | – | – | – | ✓ |
| Admin dashboard / SuperUserDashboard | – | – | – | ✓ |

**Test approach:**
- Create 4 seeded test users (one per role) via SQL migration (idempotent).
- Add Deno tests per edge function (`alpaca-broker`, `alpaca-market-data`, `banking`, `crypto-wallet`, `didit-kyc`, `compliance-alert`, `trading-api`).
- Add Vitest unit tests for critical hooks (`useAuth`, `useTradingAccount`, `useWallet`, `useOrderExecution`).
- Manual QA checklist run via browser tool against preview for each role.

---

## 3. Backend Hardening

- Audit every edge function for: CORS, JWT validation via `getUser(token)` (not `getClaims`), Zod input validation, structured error responses.
- Run `supabase--linter` and fix all RLS warnings.
- Confirm `user_roles` is the sole source of role truth (no `account_details.role` checks bypassing RBAC).
- Add rate limiting on financial endpoints (`banking`, `crypto-wallet`, `alpaca-broker` order placement) using existing `rate_limits` table + cleanup function.
- Add `audit_logs` writes for: withdrawals, role changes, KYC overrides, admin actions.

---

## 4. Frontend Production Polish

- Wire all "Coming Soon"/mock states to real services (audit `MockMarketDataService` references and remove from production paths).
- Ensure `TradingErrorBoundary` wraps: Exchange, Crypto, Portfolio, Trading, Futures, Options pages.
- SEO: verify `react-helmet-async` tags on every public route (`/`, `/about`, `/markets`, `/help`, `/privacy`, `/terms`).
- PWA: confirm `service-worker.js` caches shell, offline page works, install prompt fires.
- Accessibility: keyboard nav + ARIA on Navbar, MobileNav, forms.
- Mobile: re-test swipe nav, pull-to-refresh, bottom-sheet quick trade at 375px.

---

## 5. Compliance (Zambia)

- Ensure Securities Act 2016 disclosures present on landing + signup.
- KYC required before any live (non-demo) trade or fiat/crypto withdrawal — enforce server-side in `banking`, `alpaca-broker`, `crypto-wallet`.
- AML: log all deposits/withdrawals > ZMW 50,000 equivalent to `compliance_alerts`; auto-notify moderators.
- No Stripe; only MTN/Airtel/Zamtel/Zanaco rails (already in place).

---

## 6. Observability & Release

- Add structured logging in all edge functions (request id, user id, action, latency).
- Confirm Edge Function logs accessible; document log links per function.
- Smoke-test publish flow to `palmtrader-horizon.lovable.app`.
- Final security scan + memory update.

---

## Execution Order (when approved)

1. Migration: create crypto wallet tables + RLS + seed test users.
2. Add `WALLET_MASTER_KEY` secret (will request from you).
3. Build `crypto-wallet` edge function (OSS libs, no paid APIs).
4. Frontend: Crypto Deposit/Withdraw UI + QR.
5. Audit & fix all edge functions (auth, CORS, validation, rate limiting).
6. Add Deno + Vitest test suites; run them.
7. Browser-tool QA pass for all 4 roles across all workflows.
8. Run Supabase linter + security scan; fix findings; update security memory.
9. Final smoke test + ready-to-publish handoff.

## Secrets I will need from you

- `WALLET_MASTER_KEY` — any 32+ char random string (I will generate one if you prefer). Used to encrypt user seed phrases at rest.

Everything else (chain RPCs, CoinGecko, Alpaca sandbox, Didit, Finnhub, AlphaVantage) is already configured or uses free public endpoints — no new paid keys required.
