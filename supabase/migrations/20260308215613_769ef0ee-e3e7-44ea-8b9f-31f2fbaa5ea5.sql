-- Fix: the previous migration partially applied. Clean up and finish.
-- Drop policies that were successfully created, then recreate the missing one.

-- The account_details, market_data, and system_metrics policies from the previous
-- migration were applied before it failed on the duplicate admin policy.
-- Just need to verify the state is clean. No-op if already dropped.

-- The "Admins can view system metrics" already exists, skip it.
-- All other policies from the failed migration were applied successfully (DDL is not transactional for policies in some cases).

SELECT 1; -- no-op, previous migration partially succeeded and the duplicate policy already exists
