-- Backend reconciliation (2026-11-23): close the gaps between the frontend's
-- signed-in Supabase calls and the live schema of project hvrcchjbqumlknaboczh.
-- Additive only. Live inventory: ~/workspace/palmtrader-horizon-work/BACKEND-INVENTORY.md
-- Gaps closed: missing tables fee_tiers / user_trading_volumes /
-- withdrawal_whitelist; phantom account_details columns; missing admin RPCs
-- get_table_rls_status / get_auth_config.

-- 1. fee_tiers — reference data read by FeeTierService (signed-in spot fees).
create table if not exists public.fee_tiers (
  id uuid primary key default gen_random_uuid(),
  tier_name text not null,
  tier_level integer not null unique,
  min_30d_volume numeric not null default 0,
  maker_fee numeric not null default 0,
  taker_fee numeric not null default 0,
  withdrawal_limit_daily numeric not null default 0,
  api_rate_limit integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.fee_tiers enable row level security;
drop policy if exists "Authenticated users can view fee tiers" on public.fee_tiers;
create policy "Authenticated users can view fee tiers"
  on public.fee_tiers for select to authenticated using (true);
grant select on public.fee_tiers to authenticated;

insert into public.fee_tiers (tier_name, tier_level, min_30d_volume, maker_fee, taker_fee, withdrawal_limit_daily, api_rate_limit)
values
  ('Regular', 0, 0, 0.001, 0.001, 50000, 1200),
  ('VIP 1', 1, 100000, 0.0009, 0.0009, 250000, 2400),
  ('VIP 2', 2, 500000, 0.0008, 0.0008, 1000000, 4800)
on conflict (tier_level) do nothing;

-- 2. user_trading_volumes — read by FeeTierService.getUserVolume; written server-side only.
create table if not exists public.user_trading_volumes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  volume_30d numeric not null default 0,
  volume_all_time numeric not null default 0,
  trades_count_30d integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.user_trading_volumes enable row level security;
drop policy if exists "Users can view their own trading volumes" on public.user_trading_volumes;
create policy "Users can view their own trading volumes"
  on public.user_trading_volumes for select to authenticated using (auth.uid() = user_id);
grant select on public.user_trading_volumes to authenticated;

-- 3. withdrawal_whitelist — full owner CRUD via WithdrawalWhitelistService.
create table if not exists public.withdrawal_whitelist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  address_label text not null,
  currency text not null,
  address text not null,
  network text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.withdrawal_whitelist enable row level security;
drop policy if exists "Users can view their own whitelist" on public.withdrawal_whitelist;
create policy "Users can view their own whitelist"
  on public.withdrawal_whitelist for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can add to their own whitelist" on public.withdrawal_whitelist;
create policy "Users can add to their own whitelist"
  on public.withdrawal_whitelist for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update their own whitelist" on public.withdrawal_whitelist;
create policy "Users can update their own whitelist"
  on public.withdrawal_whitelist for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can remove from their own whitelist" on public.withdrawal_whitelist;
create policy "Users can remove from their own whitelist"
  on public.withdrawal_whitelist for delete to authenticated using (auth.uid() = user_id);
grant select, insert, update, delete on public.withdrawal_whitelist to authenticated;

-- 4. account_details phantom columns used by WithdrawalWhitelistService.
alter table public.account_details
  add column if not exists anti_phishing_code text,
  add column if not exists withdrawal_whitelist_enabled boolean not null default false;

-- 5. Admin-gated RPCs used by SecurityScanService.
create or replace function public.get_table_rls_status()
returns table (table_name text, rls_enabled boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    return;
  end if;
  return query
    select t.tablename::text, t.rowsecurity
    from pg_tables t
    where t.schemaname = 'public'
    order by t.tablename;
end;
$$;
grant execute on function public.get_table_rls_status() to authenticated;

create or replace function public.get_auth_config()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    return null;
  end if;
  -- Effective values read from the project's live auth config on 2026-11-23
  -- (signups open, email autoconfirm on, JWT 3600s, platform-default
  -- password_min_length 6 — no override set on this project).
  return jsonb_build_object(
    'password_min_length', 6,
    'mailer_autoconfirm', true,
    'disable_signup', false,
    'jwt_exp', 3600
  );
end;
$$;
grant execute on function public.get_auth_config() to authenticated;
