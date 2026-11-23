-- Backend reconciliation follow-up (2026-11-23): provision public.profiles on
-- signup. handle_new_user only created account_details, leaving profiles at
-- 0 rows for every user (verified live: 2 real users, 0 profiles rows), which
-- silently empties the social surfaces that read profiles (UserFollowSystem).
-- Additive: the trigger now also inserts the profiles row (idempotent).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.account_details (id) values (new.id)
  on conflict (id) do nothing;
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$function$;

-- Backfill for existing users (2 at time of writing).
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;
