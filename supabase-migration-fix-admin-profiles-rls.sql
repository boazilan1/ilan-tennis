-- The "Admin views all profiles" policy checked auth.jwt()->>'role', which is
-- the Postgres session role ("authenticated") and is never "admin" — Supabase
-- doesn't set a custom JWT claim for app-level roles out of the box. So this
-- policy never actually matched, and an admin querying `profiles` only ever
-- got their own row back (via the `auth.uid() = id` fallback), leaving every
-- other user's name/phone/email blank in the admin panel.
--
-- Every other admin-visibility policy in this schema (enrollments, players)
-- correctly checks the `profiles.role` column via a subquery instead. Doing
-- that directly inside a policy ON the profiles table itself would recurse
-- (a policy on profiles querying profiles), so we go through a SECURITY
-- DEFINER helper function, which runs as the function owner and therefore
-- isn't itself subject to the RLS it's being used to evaluate.

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "Admin views all profiles" on profiles;
create policy "Admin views all profiles" on profiles
  for all
  using (is_admin() or auth.uid() = id);
