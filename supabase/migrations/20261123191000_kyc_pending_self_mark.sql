-- Allow a user to mark their OWN kyc_status as 'pending' when they submit
-- identity documents for in-house review. 'pending' grants nothing (limits
-- key off an approved review); 'approved'/'rejected', role and
-- account_status stay locked to admins/service_role exactly as before.
create or replace function public.prevent_account_details_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- Allow service_role and admins to change everything
  if auth.role() = 'service_role' or public.is_admin(auth.uid()) then
    return new;
  end if;

  -- Lock privileged fields for regular users
  if new.role is distinct from old.role
     or new.account_status is distinct from old.account_status then
    raise exception 'Not authorized to modify role, account_status, or kyc_status';
  end if;

  -- kyc_status: the only self-service transition is *to* 'pending'
  -- (the user has submitted documents and is awaiting human review).
  if new.kyc_status is distinct from old.kyc_status
     and new.kyc_status <> 'pending' then
    raise exception 'Not authorized to modify role, account_status, or kyc_status';
  end if;

  return new;
end;
$function$;
