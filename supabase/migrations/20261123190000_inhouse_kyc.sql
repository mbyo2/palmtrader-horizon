-- In-house KYC (replaces Didit): guided document + live-selfie submission,
-- human review by admins. Additive only.
create table if not exists public.kyc_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check (document_type in ('nrc', 'passport')),
  document_number text not null,
  first_name text not null,
  last_name text not null,
  phone text,
  date_of_birth date,
  document_file_path text not null,
  selfie_file_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kyc_applications_user_id_idx on public.kyc_applications (user_id, created_at desc);
create index if not exists kyc_applications_status_idx on public.kyc_applications (status, created_at desc);

alter table public.kyc_applications enable row level security;

drop policy if exists "Users can view own KYC applications" on public.kyc_applications;
create policy "Users can view own KYC applications"
  on public.kyc_applications for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can submit own KYC applications" on public.kyc_applications;
create policy "Users can submit own KYC applications"
  on public.kyc_applications for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

drop policy if exists "Admins can manage all KYC applications" on public.kyc_applications;
create policy "Admins can manage all KYC applications"
  on public.kyc_applications for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Scoped grants (RLS remains the row-level gate; never TO public).
grant select, insert on public.kyc_applications to authenticated;
grant select, insert, update, delete on public.kyc_applications to service_role;

-- Admin review: one atomic decision that flips the application, the account
-- status and the legacy verification record together.
create or replace function public.review_kyc_application(
  p_application_id uuid,
  p_decision text,
  p_reason text default null
)
returns public.kyc_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.kyc_applications;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only admins can review KYC applications' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;
  if p_decision = 'rejected' and coalesce(trim(p_reason), '') = '' then
    raise exception 'A reason is required when rejecting an application';
  end if;

  update public.kyc_applications
     set status = p_decision,
         rejection_reason = case when p_decision = 'rejected' then trim(p_reason) else null end,
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   where id = p_application_id and status = 'pending'
   returning * into v_app;

  if not found then
    raise exception 'Application not found or already reviewed';
  end if;

  update public.account_details
     set kyc_status = p_decision::public.kyc_status
   where id = v_app.user_id;

  insert into public.kyc_verifications (
    user_id, verification_level, identity_verified,
    last_verification_date, verification_notes
  ) values (
    v_app.user_id,
    case when p_decision = 'approved' then 'basic' else 'none' end,
    p_decision = 'approved',
    now(),
    case when p_decision = 'approved'
         then 'Identity verified by PalmCacia in-house review'
         else 'Identity verification rejected by PalmCacia in-house review: ' || trim(coalesce(p_reason, ''))
    end
  )
  on conflict (user_id) do update
     set verification_level = excluded.verification_level,
         identity_verified = excluded.identity_verified,
         last_verification_date = excluded.last_verification_date,
         verification_notes = excluded.verification_notes,
         updated_at = now();

  return v_app;
end;
$$;

grant execute on function public.review_kyc_application(uuid, text, text) to authenticated;
